import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission } from '@/lib/api-helper';

export async function GET(request: Request) {
  try {
    const { errorResponse } = await checkAuthAndPermission(request, 'reports', 'view');
    if (errorResponse) return errorResponse;

    const url = new URL(request.url);
    const buildingId = url.searchParams.get('buildingId') || undefined;

    // 1. Dispatch queries in parallel for maximum concurrency (dispatched to Neon Singapore from Vercel)
    const studentWhere: any = { status: 'ACTIVE' };
    if (buildingId) {
      studentWhere.bed = { buildingId };
    }
    const totalStudentsPromise = db.student.count({ where: studentWhere });

    const roomWhere: any = {};
    if (buildingId) {
      roomWhere.buildingId = buildingId;
    }
    const totalRoomsPromise = db.room.count({ where: roomWhere });
    
    const bedWhere: any = {};
    if (buildingId) {
      bedWhere.buildingId = buildingId;
    }
    const bedsPromise = db.bed.findMany({
      where: bedWhere,
      include: {
        building: true
      }
    });
    
    const paymentWhere: any = {};
    if (buildingId) {
      paymentWhere.student = {
        bed: { buildingId }
      };
    }
    const invoiceWhere: any = {};
    if (buildingId) {
      invoiceWhere.student = {
        bed: { buildingId }
      };
    }

    const paymentsPromise = db.payment.findMany({ where: paymentWhere });
    const expensesPromise = buildingId ? Promise.resolve([]) : db.expense.findMany();
    const invoicesPromise = db.invoice.findMany({ where: invoiceWhere });
    const oldestStudentPromise = db.student.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    // Execute concurrently
    const [
      totalStudents,
      totalRooms,
      beds,
      payments,
      expenses,
      invoices,
      oldestStudent
    ] = await Promise.all([
      totalStudentsPromise,
      totalRoomsPromise,
      bedsPromise,
      paymentsPromise,
      expensesPromise,
      invoicesPromise,
      oldestStudentPromise
    ]);

    // Cap all analytical data to dates before August 2026 (i.e. July 2026 and earlier)
    const capLimitDate = new Date('2026-08-01T00:00:00Z');

    const filteredInvoices = invoices.filter(inv => new Date(inv.createdAt) < capLimitDate);
    const filteredPayments = payments.filter(p => new Date(p.date) < capLimitDate);
    const filteredExpenses = expenses.filter(e => new Date(e.date) < capLimitDate);

    const oldestStudentDate = oldestStudent && new Date(oldestStudent.createdAt) < capLimitDate
      ? new Date(oldestStudent.createdAt)
      : new Date('2026-07-01T00:00:00Z');

    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(b => b.status === 'OCCUPIED').length;
    const availableBeds = beds.filter(b => b.status === 'AVAILABLE').length;
    const reservedBeds = beds.filter(b => b.status === 'RESERVED').length;
    const maintenanceBeds = beds.filter(b => b.status === 'MAINTENANCE').length;

    const totalInvoices = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingRent = filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0);
    const netIncome = totalInvoices - totalExpenses;

    // Calculate Today's Collections (capping today at July 31, 2026, meaning 0 today collections since we are in August)
    const todaysCollections = 0;

    // Calculate monthly values using July 2026 (the last active month before August 2026)
    const lastMonthStart = new Date('2026-07-01T00:00:00Z');
    const lastMonthEnd = new Date('2026-08-01T00:00:00Z');

    const monthlyRentCollections = filteredInvoices
      .filter(inv => new Date(inv.createdAt) >= lastMonthStart && new Date(inv.createdAt) < lastMonthEnd)
      .reduce((sum, inv) => sum + inv.total, 0);

    const monthlyCollectedPayments = filteredPayments
      .filter(p => new Date(p.date) >= lastMonthStart && new Date(p.date) < lastMonthEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    const monthlyExpenses = filteredExpenses
      .filter(e => new Date(e.date) >= lastMonthStart && new Date(e.date) < lastMonthEnd)
      .reduce((sum, e) => sum + e.amount, 0);

    // 3. Compile Monthly Trends (start from oldest entry capped up to July 2026)
    const startYearMonth = new Date(oldestStudentDate);
    startYearMonth.setDate(1);
    startYearMonth.setHours(0, 0, 0, 0);

    const monthlyTrendMap: { [key: string]: { month: string; revenue: number; expenses: number } } = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let currentIter = new Date(startYearMonth);
    const tempToday = new Date('2026-07-01T00:00:00Z');

    if (currentIter > tempToday) {
      currentIter = new Date(tempToday);
    }

    while (currentIter <= tempToday) {
      const key = `${currentIter.getFullYear()}-${String(currentIter.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[currentIter.getMonth()]} ${currentIter.getFullYear().toString().slice(-2)}`;
      monthlyTrendMap[key] = { month: label, revenue: 0, expenses: 0 };
      currentIter.setMonth(currentIter.getMonth() + 1);
    }

    // Populate revenue from generated invoices
    filteredInvoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrendMap[key]) {
        monthlyTrendMap[key].revenue += inv.total;
      }
    });

    // Populate expenses
    filteredExpenses.forEach(e => {
      const date = new Date(e.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrendMap[key]) {
        monthlyTrendMap[key].expenses += e.amount;
      }
    });

    const financialTrend = Object.values(monthlyTrendMap);

    // 4. Compile Expense Categories
    const expenseCategoriesMap: { [key: string]: number } = {};
    filteredExpenses.forEach(e => {
      expenseCategoriesMap[e.category] = (expenseCategoriesMap[e.category] || 0) + e.amount;
    });

    const expensesByCategory = Object.entries(expenseCategoriesMap).map(([category, amount]) => ({
      category,
      amount
    }));

    // 5. Compile Building occupancy statistics
    const buildingStatsMap: { [key: string]: { building: string; occupied: number; total: number } } = {};
    beds.forEach(b => {
      const buildingName = b.building.name;
      if (!buildingStatsMap[buildingName]) {
        buildingStatsMap[buildingName] = { building: buildingName, occupied: 0, total: 0 };
      }
      buildingStatsMap[buildingName].total += 1;
      if (b.status === 'OCCUPIED') {
        buildingStatsMap[buildingName].occupied += 1;
      }
    });

    const buildingOccupancy = Object.values(buildingStatsMap);

    return NextResponse.json({
      summary: {
        totalStudents,
        totalRooms,
        totalBeds,
        occupiedBeds,
        availableBeds,
        reservedBeds,
        maintenanceBeds,
        totalCollections: totalInvoices,
        totalExpenses,
        pendingRent,
        netIncome,
        todaysCollections,
        monthlyRentCollections,
        monthlyCollectedPayments,
        monthlyExpenses
      },
      charts: {
        financialTrend,
        expensesByCategory,
        buildingOccupancy
      }
    });
  } catch (error) {
    console.error('GET reports error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

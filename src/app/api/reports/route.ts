import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission } from '@/lib/api-helper';

export async function GET(request: Request) {
  try {
    const { errorResponse } = await checkAuthAndPermission(request, 'reports', 'view');
    if (errorResponse) return errorResponse;

    const url = new URL(request.url);
    const buildingId = url.searchParams.get('buildingId') || undefined;

    // 1. Fetch total counts
    const studentWhere: any = { status: 'ACTIVE' };
    if (buildingId) {
      studentWhere.bed = { buildingId };
    }
    const totalStudents = await db.student.count({ where: studentWhere });

    const roomWhere: any = {};
    if (buildingId) {
      roomWhere.buildingId = buildingId;
    }
    const totalRooms = await db.room.count({ where: roomWhere });
    
    // Beds status count
    const bedWhere: any = {};
    if (buildingId) {
      bedWhere.buildingId = buildingId;
    }
    const beds = await db.bed.findMany({
      where: bedWhere,
      include: {
        building: true
      }
    });
    
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(b => b.status === 'OCCUPIED').length;
    const availableBeds = beds.filter(b => b.status === 'AVAILABLE').length;
    const reservedBeds = beds.filter(b => b.status === 'RESERVED').length;
    const maintenanceBeds = beds.filter(b => b.status === 'MAINTENANCE').length;

    // 2. Fetch payments, expenses, and invoices for financial overview
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
    const payments = await db.payment.findMany({ where: paymentWhere });
    const expenses = buildingId ? [] : await db.expense.findMany();
    const invoices = await db.invoice.findMany({ where: invoiceWhere });

    const totalInvoices = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingRent = invoices.reduce((sum, inv) => sum + inv.balance, 0);
    const netIncome = totalInvoices - totalExpenses;

    // Calculate Today's Collections
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysCollections = payments
      .filter(p => new Date(p.date) >= today)
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate current month generated bills, collections & expenses
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRentCollections = invoices
      .filter(inv => new Date(inv.createdAt) >= firstDayOfMonth)
      .reduce((sum, inv) => sum + inv.total, 0);

    const monthlyCollectedPayments = payments
      .filter(p => new Date(p.date) >= firstDayOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    const monthlyExpenses = expenses
      .filter(e => new Date(e.date) >= firstDayOfMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    // 3. Compile Monthly Trends (start from when students were added)
    const oldestStudent = await db.student.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    const startYearMonth = oldestStudent ? new Date(oldestStudent.createdAt) : new Date();
    startYearMonth.setDate(1);
    startYearMonth.setHours(0, 0, 0, 0);

    const monthlyTrendMap: { [key: string]: { month: string; revenue: number; expenses: number } } = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let currentIter = new Date(startYearMonth);
    const tempToday = new Date(today.getFullYear(), today.getMonth(), 1);

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
    invoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrendMap[key]) {
        monthlyTrendMap[key].revenue += inv.total;
      }
    });

    // Populate expenses
    expenses.forEach(e => {
      const date = new Date(e.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrendMap[key]) {
        monthlyTrendMap[key].expenses += e.amount;
      }
    });

    const financialTrend = Object.values(monthlyTrendMap);

    // 4. Compile Expense Categories
    const expenseCategoriesMap: { [key: string]: number } = {};
    expenses.forEach(e => {
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

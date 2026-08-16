import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// GET all invoices (filtered by student/status, with security checks for students)
export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || '';
    const buildingId = searchParams.get('buildingId') || undefined;

    let studentIdFilter: string | undefined = undefined;

    if (user!.role === 'STUDENT') {
      // Find the student profile using user's phone
      const student = await db.student.findFirst({
        where: { phone: user!.phone }
      });
      if (!student) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      }
      studentIdFilter = student.id;
    } else {
      // Admin filter
      studentIdFilter = searchParams.get('studentId') || undefined;
    }

    const invoices = await db.invoice.findMany({
      where: {
        studentId: studentIdFilter,
        status,
        student: buildingId ? {
          bed: {
            buildingId
          }
        } : undefined,
        OR: search
          ? [
              { invoiceNumber: { contains: search } },
              { studentName: { contains: search } }
            ]
          : undefined
      },
      include: {
        payments: true,
        student: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('GET invoices error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST to manually generate an invoice (e.g. custom charge or manual rent bill)
export async function POST(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'invoices', 'create');
    if (errorResponse) return errorResponse;

    const { studentId, amount, dueDate, subtotal, lateFee, discount, description, billingPeriodStart, billingPeriodEnd } = await request.json();

    if (!studentId || !amount || !dueDate) {
      return NextResponse.json({ error: 'Student ID, amount, and due date are required' }, { status: 400 });
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { bed: { include: { room: true } } }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const rentAmount = parseFloat(amount);
    const settings = await db.hostelSettings.findUnique({
      where: { id: 'GLOBAL' }
    }) || { invoicePrefix: 'INV-' };

    const today = new Date();
    const invoiceNumber = `${settings.invoicePrefix}${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInvoice = await db.invoice.create({
      data: {
        invoiceNumber,
        studentId,
        studentName: student.name,
        roomNumber: student.bed?.room.number || 'N/A',
        bedName: student.bed?.name || 'N/A',
        billingPeriodStart: billingPeriodStart ? new Date(billingPeriodStart) : today,
        billingPeriodEnd: billingPeriodEnd ? new Date(billingPeriodEnd) : today,
        dueDate: new Date(dueDate),
        subtotal: parseFloat(subtotal) || rentAmount,
        lateFee: parseFloat(lateFee) || 0,
        discount: parseFloat(discount) || 0,
        total: rentAmount,
        balance: rentAmount,
        status: 'PENDING'
      }
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'CREATE_INVOICE',
      'INVOICES',
      `Manually generated invoice "${invoiceNumber}" for student "${student.name}" (Amount: ${rentAmount})`
    );

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('POST invoice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// GET all invoices (filtered by student/status, with security checks for students)
export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'student-self');
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

    if (student.status === 'PAUSED') {
      return NextResponse.json({ error: 'Cannot generate invoice. This student profile is currently PAUSED.' }, { status: 400 });
    }

    const rentAmount = parseFloat(amount);
    const settings = await db.hostelSettings.findUnique({
      where: { id: 'GLOBAL' }
    }) || { invoicePrefix: 'INV-' };

    const today = new Date();
    const invoiceNumber = `${settings.invoicePrefix}${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInvoice = await db.$transaction(async (tx) => {
      // Find all previous unpaid invoices
      const unpaidInvoices = await tx.invoice.findMany({
        where: {
          studentId,
          status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
          balance: { gt: 0 }
        }
      });
      const arrearsAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0);

      const subtotalVal = parseFloat(subtotal) || rentAmount;
      const lateFeeVal = parseFloat(lateFee) || 0;
      const discountVal = parseFloat(discount) || 0;
      const totalVal = subtotalVal + arrearsAmount + lateFeeVal - discountVal;

      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          studentId,
          studentName: student.name,
          roomNumber: student.bed?.room.number || 'N/A',
          bedName: student.bed?.name || 'N/A',
          billingPeriodStart: billingPeriodStart ? new Date(billingPeriodStart) : today,
          billingPeriodEnd: billingPeriodEnd ? new Date(billingPeriodEnd) : today,
          dueDate: new Date(dueDate),
          subtotal: subtotalVal,
          arrears: arrearsAmount,
          lateFee: lateFeeVal,
          discount: discountVal,
          total: totalVal,
          balance: totalVal,
          status: 'PENDING'
        }
      });

      // Clear balance and mark old invoices as paid so they aren't double counted
      if (unpaidInvoices.length > 0) {
        await tx.invoice.updateMany({
          where: {
            id: { in: unpaidInvoices.map(inv => inv.id) }
          },
          data: {
            balance: 0,
            status: 'PAID'
          }
        });
      }

      return created;
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

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// GET payment transactions list (filtered, with student restrictions)
export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let studentIdFilter: string | undefined = undefined;

    if (user!.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { phone: user!.phone }
      });
      if (!student) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      }
      studentIdFilter = student.id;
    } else {
      studentIdFilter = searchParams.get('studentId') || undefined;
    }

    const payments = await db.payment.findMany({
      where: {
        studentId: studentIdFilter,
        OR: search
          ? [
              { paymentId: { contains: search } },
              { recordedBy: { contains: search } }
            ]
          : undefined
      },
      include: {
        student: true,
        invoice: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('GET payments error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST to log a payment and update the corresponding invoice
export async function POST(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'payments', 'create');
    if (errorResponse) return errorResponse;

    const { invoiceId, amount, method, notes, discount } = await request.json();

    if (!invoiceId || amount === undefined || !method) {
      return NextResponse.json({ error: 'Invoice ID, payment amount, and payment method are required' }, { status: 400 });
    }

    const paymentAmount = parseFloat(amount) || 0;
    const paymentDiscount = parseFloat(discount) || 0;

    if (paymentAmount < 0) {
      return NextResponse.json({ error: 'Payment amount cannot be negative' }, { status: 400 });
    }
    if (paymentDiscount < 0) {
      return NextResponse.json({ error: 'Discount amount cannot be negative' }, { status: 400 });
    }
    if (paymentAmount + paymentDiscount <= 0) {
      return NextResponse.json({ error: 'Either payment amount or discount must be greater than zero' }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Fetch invoice
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.balance <= 0) {
        throw new Error('This invoice is already fully paid');
      }

      if (paymentAmount + paymentDiscount > invoice.balance) {
        throw new Error(`The sum of payment and discount (₹${paymentAmount + paymentDiscount}) exceeds the remaining balance (₹${invoice.balance})`);
      }

      const newDiscount = invoice.discount + paymentDiscount;
      const newTotal = invoice.total - paymentDiscount;
      const newPaidAmount = invoice.paidAmount + paymentAmount;
      const newBalance = Math.max(0, newTotal - newPaidAmount);

      let invoiceStatus = 'PARTIALLY_PAID';
      if (newBalance <= 0) {
        invoiceStatus = 'PAID';
      }

      // 2. Update Invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          discount: newDiscount,
          total: newTotal,
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: invoiceStatus
        }
      });

      // 3. Generate transaction ref
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = Math.floor(1000 + Math.random() * 9000);
      const paymentId = `PAY-${dateStr}-${rand}`;

      // 4. Create Payment record
      const payment = await tx.payment.create({
        data: {
          paymentId,
          studentId: invoice.studentId,
          invoiceId,
          amount: paymentAmount,
          method,
          notes: notes || '',
          recordedBy: currentUser!.name
        }
      });

      // Fetch student phone and global settings for WhatsApp dispatch
      const student = await tx.student.findUnique({
        where: { id: invoice.studentId }
      });
      const settings = await tx.hostelSettings.findUnique({
        where: { id: 'GLOBAL' }
      }) || { hostelName: 'Home Stay Hostel', phone: '+91 98765 43210' };

      const whatsappEnabled = settings && (settings as any).whatsappEnabled !== undefined ? (settings as any).whatsappEnabled : true;
      if (whatsappEnabled && student) {
        const receiptMsg = `Hello ${student.name},\nThank you for your payment! We have successfully recorded your fee payment.\n\nReceipt Details:\n- Payment ID: ${paymentId}\n- Invoice Number: ${invoice.invoiceNumber}\n- Paid Amount: ₹${paymentAmount.toLocaleString('en-IN')}\n- Payment Method: ${method}\n- Date: ${new Date().toLocaleDateString('en-IN')}\n- Remaining Balance: ₹${newBalance.toLocaleString('en-IN')}\n- Status: ${invoiceStatus === 'PAID' ? 'FULLY PAID' : 'PARTIALLY PAID'}\n\nFor any billing concerns, contact: ${settings.phone || '+91 98765 43210'}.\n\nHomestay Management`;

        await tx.notification.create({
          data: {
            recipient: student.phone,
            type: 'WHATSAPP',
            title: 'Payment Receipt - ' + (settings.hostelName || 'Home Stay Hostel'),
            message: receiptMsg,
            status: 'SENT'
          }
        });
        
        console.log(`[WHATSAPP DISPATCH] Payment receipt notification sent to ${student.phone} for payment ${paymentId}.`);
      }

      return { payment, invoice: updatedInvoice };
    }, {
      maxWait: 20000,
      timeout: 40000
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'RECORD_PAYMENT',
      'PAYMENTS',
      `Recorded payment of ${paymentAmount} via ${method} for invoice "${result.invoice.invoiceNumber}"`
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('POST payment error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

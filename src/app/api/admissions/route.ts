import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// POST to allocate a bed to a student (Admission)
export async function POST(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'students', 'edit');
    if (errorResponse) return errorResponse;

    const { studentId, bedId, joiningDate, expectedCheckout, monthlyRent, securityDeposit } = await request.json();

    if (!studentId || !bedId || !joiningDate) {
      return NextResponse.json({ error: 'Student ID, bed ID, and joining date are required' }, { status: 400 });
    }

    const admissionResult = await db.$transaction(async (tx) => {
      // 1. Fetch Bed & Room
      const bed = await tx.bed.findUnique({
        where: { id: bedId },
        include: {
          room: {
            include: {
              building: true,
              floor: true
            }
          }
        }
      });

      if (!bed) {
        throw new Error('Bed not found');
      }

      if (bed.status !== 'AVAILABLE') {
        throw new Error(`Bed "${bed.name}" is not available (Status: ${bed.status})`);
      }

      // 2. Fetch Student
      const student = await tx.student.findUnique({
        where: { id: studentId },
        include: { bed: true }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      if (student.status === 'ACTIVE' || student.bed) {
        throw new Error(`Student is already active or allocated to Bed "${student.bed?.name || 'unknown'}"`);
      }

      const rentAmount = (monthlyRent !== undefined && monthlyRent !== null && monthlyRent !== '')
        ? (parseFloat(monthlyRent) || 0)
        : student.monthlyRent;
      const depositAmount = (securityDeposit !== undefined && securityDeposit !== null && securityDeposit !== '')
        ? (parseFloat(securityDeposit) || 0)
        : student.securityDeposit;

      // 3. Update Bed
      const updatedBed = await tx.bed.update({
        where: { id: bedId },
        data: {
          status: 'OCCUPIED',
          studentId: studentId
        }
      });

      // 4. Update Student
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: {
          status: 'ACTIVE',
          monthlyRent: rentAmount,
          securityDeposit: depositAmount,
          expectedCheckout: expectedCheckout ? new Date(expectedCheckout) : null
        }
      });

      // 5. Create Admission record
      const admission = await tx.admission.create({
        data: {
          studentId,
          bedId,
          bedName: bed.name,
          roomNumber: bed.room.number,
          buildingName: bed.room.building.name,
          floorNumber: bed.room.floor.number,
          rentAtAdmission: rentAmount,
          joiningDate: new Date(joiningDate),
          status: 'ACTIVE'
        }
      });

      // 6. Update Room occupancy status
      const roomBeds = await tx.bed.findMany({
        where: { roomId: bed.roomId }
      });
      const occupiedCount = roomBeds.filter(b => b.status === 'OCCUPIED').length;
      let roomStatus = 'AVAILABLE';
      if (occupiedCount === roomBeds.length) {
        roomStatus = 'FULL';
      } else if (occupiedCount > 0) {
        roomStatus = 'PARTIALLY_OCCUPIED';
      }

      await tx.room.update({
        where: { id: bed.roomId },
        data: { status: roomStatus }
      });

      // 7. Generate Initial Rent Invoice
      const settings = await tx.hostelSettings.findUnique({
        where: { id: 'GLOBAL' }
      }) || { invoicePrefix: 'INV-', defaultDueDateDay: 5 };

      const today = new Date();
      const invoiceNumber = `${settings.invoicePrefix}${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const billingPeriodStart = new Date(joiningDate);
      const billingPeriodEnd = new Date(joiningDate);
      // Next billing date is usually 1 month later or end of month
      billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

      const dueDate = calculateDueDateForMonth(joiningDate, today.getFullYear(), today.getMonth());
      if (dueDate < today) {
        // If due date for this month is passed, set to next month's due date
        const nextMonth = today.getMonth() + 1;
        const targetYear = today.getFullYear() + (nextMonth > 11 ? 1 : 0);
        const targetMonth = nextMonth % 12;
        const nextDueDate = calculateDueDateForMonth(joiningDate, targetYear, targetMonth);
        dueDate.setTime(nextDueDate.getTime());
      }

      // Check for any previous unpaid invoices (e.g. from registration fees or previous occupancy)
      const unpaidInvoices = await tx.invoice.findMany({
        where: {
          studentId,
          status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
          balance: { gt: 0 }
        }
      });
      const arrearsAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0);
      const totalVal = rentAmount + arrearsAmount;

      await tx.invoice.create({
        data: {
          invoiceNumber,
          studentId,
          studentName: student.name,
          roomNumber: bed.room.number,
          bedName: bed.name,
          billingPeriodStart,
          billingPeriodEnd,
          dueDate,
          subtotal: rentAmount,
          arrears: arrearsAmount,
          total: totalVal,
          balance: totalVal,
          status: 'PENDING'
        }
      });

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

      return { admission, updatedStudent, updatedBed };
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'ALLOCATE_BED',
      'STUDENTS',
      `Allocated Bed "${admissionResult.updatedBed.name}" in Room "${admissionResult.admission.roomNumber}" to Student "${admissionResult.updatedStudent.name}"`
    );

    return NextResponse.json(admissionResult, { status: 201 });
  } catch (error: any) {
    console.error('POST admission error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to check out a student and release their bed
export async function PUT(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'students', 'edit');
    if (errorResponse) return errorResponse;

    const { studentId, checkoutDate } = await request.json();

    if (!studentId || !checkoutDate) {
      return NextResponse.json({ error: 'Student ID and checkout date are required' }, { status: 400 });
    }

    const checkoutResult = await db.$transaction(async (tx) => {
      // 1. Fetch student and occupied bed
      const student = await tx.student.findUnique({
        where: { id: studentId },
        include: {
          bed: {
            include: {
              room: true
            }
          }
        }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      if (student.status !== 'ACTIVE' || !student.bed) {
        throw new Error('Student is not currently active in any room');
      }

      const bedId = student.bed.id;
      const roomId = student.bed.roomId;

      // 2. Release the bed
      await tx.bed.update({
        where: { id: bedId },
        data: {
          status: 'AVAILABLE',
          studentId: null
        }
      });

      // 3. Update Student profile
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: {
          status: 'CHECKED_OUT',
          expectedCheckout: new Date(checkoutDate)
        }
      });

      // 4. Update the active admission record
      const activeAdmission = await tx.admission.findFirst({
        where: {
          studentId,
          bedId,
          status: 'ACTIVE'
        }
      });

      if (activeAdmission) {
        await tx.admission.update({
          where: { id: activeAdmission.id },
          data: {
            status: 'COMPLETED',
            checkoutDate: new Date(checkoutDate)
          }
        });
      }

      // 5. Update Room occupancy status
      const roomBeds = await tx.bed.findMany({
        where: { roomId }
      });
      const occupiedCount = roomBeds.filter(b => b.status === 'OCCUPIED').length;
      let roomStatus = 'AVAILABLE';
      if (occupiedCount === roomBeds.length) {
        roomStatus = 'FULL';
      } else if (occupiedCount > 0) {
        roomStatus = 'PARTIALLY_OCCUPIED';
      }

      await tx.room.update({
        where: { id: roomId },
        data: { status: roomStatus }
      });

      return { student: updatedStudent, bedName: student.bed.name, roomNumber: student.bed.room.number };
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'CHECKOUT_STUDENT',
      'STUDENTS',
      `Checked out student "${checkoutResult.student.name}" from Bed "${checkoutResult.bedName}" (Room ${checkoutResult.roomNumber})`
    );

    return NextResponse.json({
      message: 'Student checked out successfully',
      student: checkoutResult.student
    });
  } catch (error: any) {
    console.error('PUT admission/checkout error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

function calculateDueDateForMonth(joiningDateStr: string | Date, targetYear: number, targetMonth: number): Date {
  const jDate = new Date(joiningDateStr);
  const joiningDay = jDate.getDate();
  
  // Find the last day of the target month
  const lastDayInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  
  const finalDay = joiningDay > lastDayInTargetMonth ? lastDayInTargetMonth : joiningDay;
  
  // Return Date set to the calculated day at 12:00 PM (noon) to prevent timezone fluctuations
  return new Date(targetYear, targetMonth, finalDay, 12, 0, 0);
}

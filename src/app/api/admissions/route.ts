import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';
import { hashPassword } from '@/lib/auth';
import { saveBase64Image } from '@/lib/upload';

// POST to allocate a bed to a student (Admission)
export async function POST(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'students', 'edit');
    if (errorResponse) return errorResponse;

    const { studentId, studentDetails, bedId, joiningDate, expectedCheckout, monthlyRent, securityDeposit } = await request.json();

    if ((!studentId && !studentDetails) || !bedId || !joiningDate) {
      return NextResponse.json({ error: 'Student information, bed ID, and joining date are required' }, { status: 400 });
    }

    const hashedPassword = studentDetails && studentDetails.phone ? await hashPassword(studentDetails.phone) : '';

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

      // Generate Custom Student ID based on building and room floor-wise beds sequence
      const buildings = await tx.building.findMany({
        orderBy: { name: 'asc' }
      });
      const buildingIndex = buildings.findIndex(b => b.id === bed.buildingId) + 1; // 1-based index

      const allBedsInBuilding = await tx.bed.findMany({
        where: { buildingId: bed.buildingId },
        include: {
          room: {
            include: {
              floor: true
            }
          }
        }
      });

      // Sort beds floor-wise, then room-wise, then bed-wise
      allBedsInBuilding.sort((a, b) => {
        const floorA = a.room.floor.number;
        const floorB = b.room.floor.number;
        if (floorA !== floorB) return floorA - floorB;

        const roomA = a.room.number;
        const roomB = b.room.number;
        const numA = parseInt(roomA);
        const numB = parseInt(roomB);
        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA !== numB) return numA - numB;
        } else {
          if (roomA !== roomB) return roomA.localeCompare(roomB);
        }

        return a.name.localeCompare(b.name);
      });

      const bedIdx = allBedsInBuilding.findIndex(b => b.id === bedId);
      if (bedIdx === -1) {
        throw new Error('Selected bed not found in building beds list');
      }
      const bedSequence = bedIdx + 1;
      const bedSeqStr = String(bedSequence).padStart(3, '0');
      const generatedStudentId = `STU${buildingIndex}${bedSeqStr}`;

      let activeStudentId = studentId;

      // 2. If new student, generate custom Student ID and create student profile
      if (studentDetails) {
        const {
          name,
          phone,
          email,
          dob,
          gender,
          address,
          emergencyContact,
          guardianName,
          guardianPhone,
          collegeOrCompany,
          courseOrDept,
          idNumber,
          idProofType,
          idProofUrl
        } = studentDetails;

        if (!name || !phone || !dob || !gender || !address || !emergencyContact || !guardianName || !guardianPhone || !idNumber || !idProofType) {
          throw new Error('Missing required student details');
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone.trim())) {
          throw new Error('Invalid student phone number. Must be a 10-digit Indian mobile number starting with 6-9');
        }

        if (guardianPhone && guardianPhone !== 'N/A' && !phoneRegex.test(guardianPhone.trim())) {
          throw new Error('Invalid guardian phone number. Must be a 10-digit Indian mobile number starting with 6-9');
        }

        // Check if student with phone already exists
        const existingStudent = await tx.student.findUnique({
          where: { phone }
        });
        if (existingStudent) {
          throw new Error('Student with this phone number is already registered');
        }

        // Check if student with email already exists
        if (email) {
          const existingEmailStudent = await tx.student.findFirst({
            where: { email }
          });
          if (existingEmailStudent) {
            throw new Error('A student with this email address is already registered');
          }

          const existingEmailUser = await tx.user.findFirst({
            where: { email }
          });
          if (existingEmailUser) {
            throw new Error('A user with this email address is already registered');
          }
        }

        // Check if user with phone already exists
        const existingUser = await tx.user.findUnique({
          where: { phone }
        });
        if (existingUser) {
          throw new Error('A user with this phone number is already registered');
        }

        activeStudentId = generatedStudentId;

        const studentTempPassword = await hashPassword(`${generatedStudentId}@123`);

        // Create student login credentials in User table
        await tx.user.create({
          data: {
            name,
            email: email || null,
            phone,
            password: studentTempPassword,
            role: 'STUDENT',
            status: 'ACTIVE'
          }
        });

        // Create student profile with custom ID
        const rentVal = (monthlyRent !== undefined && monthlyRent !== null && monthlyRent !== '')
          ? (parseFloat(monthlyRent) || 0)
          : 0;
        const depositVal = (securityDeposit !== undefined && securityDeposit !== null && securityDeposit !== '')
          ? (parseFloat(securityDeposit) || 0)
          : 0;

        const savedIdProofUrl = idProofUrl ? await saveBase64Image(idProofUrl, `aadhaar-${generatedStudentId}`) : null;

        await tx.student.create({
          data: {
            id: generatedStudentId,
            name,
            phone,
            email: email || null,
            dob,
            gender,
            address,
            emergencyContact,
            guardianName,
            guardianPhone,
            collegeOrCompany,
            courseOrDept,
            idNumber,
            idProofType,
            idProofUrl: savedIdProofUrl,
            monthlyRent: rentVal,
            securityDeposit: depositVal,
            expectedCheckout: expectedCheckout ? new Date(expectedCheckout) : null,
            admissionDate: new Date(joiningDate),
            status: 'ACTIVE'
          }
        });
      } else {
        // For existing student, update their ID to the custom generated Student ID
        if (studentId !== generatedStudentId) {
          // Update related documents to prevent foreign key errors
          await tx.document.updateMany({
            where: { studentId },
            data: { studentId: generatedStudentId }
          });

          // Run raw SQL to update the Student ID primary key
          await tx.$executeRaw`UPDATE "Student" SET id = ${generatedStudentId} WHERE id = ${studentId}`;
          activeStudentId = generatedStudentId;
        }
      }

      // 3. Fetch Student (if it was an existing student or newly created)
      const student = await tx.student.findUnique({
        where: { id: activeStudentId },
        include: { bed: true }
      });

      if (!student) {
        throw new Error('Student not found');
      }

      if (!studentDetails && (student.status === 'ACTIVE' || student.bed)) {
        throw new Error(`Student is already active or allocated to Bed "${student.bed?.name || 'unknown'}"`);
      }

      const rentAmount = (monthlyRent !== undefined && monthlyRent !== null && monthlyRent !== '')
        ? (parseFloat(monthlyRent) || 0)
        : student.monthlyRent;
      const depositAmount = (securityDeposit !== undefined && securityDeposit !== null && securityDeposit !== '')
        ? (parseFloat(securityDeposit) || 0)
        : student.securityDeposit;

      // 4. Update Bed
      const updatedBed = await tx.bed.update({
        where: { id: bedId },
        data: {
          status: 'OCCUPIED',
          studentId: activeStudentId
        }
      });

      // 5. Update Student status if existing student
      let updatedStudent = student;
      if (!studentDetails) {
        updatedStudent = await tx.student.update({
          where: { id: activeStudentId },
          data: {
            status: 'ACTIVE',
            monthlyRent: rentAmount,
            securityDeposit: depositAmount,
            expectedCheckout: expectedCheckout ? new Date(expectedCheckout) : null
          },
          include: { bed: true }
        });
      }

      // 6. Create Admission record
      const admission = await tx.admission.create({
        data: {
          studentId: activeStudentId,
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

      // 7. Update Room occupancy status
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

      // 8. Generate Initial Rent Invoice
      const dbSettings = await tx.hostelSettings.findUnique({
        where: { id: 'GLOBAL' }
      });
      const invoicePrefix = dbSettings?.invoicePrefix || 'INV-';
 
      const today = new Date();
      const invoiceNumber = `${invoicePrefix}${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const billingPeriodStart = new Date(joiningDate);
      const billingPeriodEnd = new Date(joiningDate);
      billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

      const dueDate = calculateDueDateForMonth(joiningDate, today.getFullYear(), today.getMonth());
      if (dueDate < today) {
        const nextMonth = today.getMonth() + 1;
        const targetYear = today.getFullYear() + (nextMonth > 11 ? 1 : 0);
        const targetMonth = nextMonth % 12;
        const nextDueDate = calculateDueDateForMonth(joiningDate, targetYear, targetMonth);
        dueDate.setTime(nextDueDate.getTime());
      }

      // Check for any previous unpaid invoices (e.g. from registration fees or previous occupancy)
      const unpaidInvoices = await tx.invoice.findMany({
        where: {
          studentId: activeStudentId,
          status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
          balance: { gt: 0 }
        }
      });
      const arrearsAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0);
      const totalVal = rentAmount + arrearsAmount;

      await tx.invoice.create({
        data: {
          invoiceNumber,
          studentId: activeStudentId,
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

      // Create WhatsApp notification record in Notification table for Admission Welcome
      const whatsappEnabled = dbSettings && dbSettings.whatsappEnabled !== undefined ? dbSettings.whatsappEnabled : true;
      if (whatsappEnabled) {
        let welcomeMsg = `Hello ${student.name},\nWelcome to ${dbSettings?.hostelName || 'Home Stay Hostel'}! Your bed allocation has been successfully completed.\n\nRoom details:\n- Block/Building: ${bed.room.building.name}\n- Floor: Floor ${bed.room.floor.number}\n- Room Number: Room ${bed.room.number}\n- Bed Name: ${bed.name}\n- Student ID: ${activeStudentId}\n\nFinancial terms:\n- Monthly Rent: ₹${rentAmount}\n- Security Deposit: ₹${depositAmount}\n- Joining Date: ${new Date(joiningDate).toLocaleDateString('en-IN')}\n\n`;
        
        if (studentDetails) {
          welcomeMsg += `Your portal login credentials are:\n- Portal URL: https://bmr-portal.vercel.app/login\n- Username: ${student.phone}\n- Temp Password: ${activeStudentId}@123\n\n`;
        } else {
          welcomeMsg += `You can login to the portal using your registered mobile number: https://bmr-portal.vercel.app/login\n\n`;
        }
        
        welcomeMsg += `For any queries, feel free to contact us through our official phone: ${dbSettings?.phone || '+91 98765 43210'}.\n\nHave a great stay!`;

        await tx.notification.create({
          data: {
            recipient: student.phone,
            type: 'WHATSAPP',
            title: 'Room Allocation Completed - ' + (dbSettings?.hostelName || 'Home Stay Hostel'),
            message: welcomeMsg,
            status: 'SENT'
          }
        });
        
        console.log(`[WHATSAPP DISPATCH] Admission welcome notification sent to ${student.phone} from PG profile number ${dbSettings?.phone || '+91 98765 43210'}.`);
      }

      return { admission, updatedStudent, updatedBed };
    }, {
      maxWait: 25000,
      timeout: 50000
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
    }, {
      maxWait: 25000,
      timeout: 50000
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

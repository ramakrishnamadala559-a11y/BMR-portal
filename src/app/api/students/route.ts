import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// GET all students with optional search filters
export async function GET(request: Request) {
  try {
    const { errorResponse } = await checkAuthAndPermission(request, 'students', 'view');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || undefined;
    const buildingId = searchParams.get('buildingId') || undefined;

    const statusCondition = status && status !== 'CHECKED_OUT'
      ? status
      : { not: 'CHECKED_OUT' };

    const students = await db.student.findMany({
      where: {
        status: statusCondition,
        bed: buildingId ? { buildingId } : undefined,
        OR: search
          ? [
              { name: { contains: search } },
              { phone: { contains: search } },
              { collegeOrCompany: { contains: search } },
              { idNumber: { contains: search } }
            ]
          : undefined
      },
      include: {
        bed: {
          include: {
            room: {
              include: {
                building: true
              }
            }
          }
        },
        invoices: {
          where: {
            status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error('GET students error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST to register a student and create their login credentials
export async function POST(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'students', 'create');
    if (errorResponse) return errorResponse;

    const data = await request.json();
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
      monthlyRent,
      securityDeposit,
      expectedCheckout,
      joiningDate
    } = data;

    if (!name || !phone || !dob || !gender || !address || !emergencyContact || !guardianName || !guardianPhone || !idNumber || !idProofType) {
      return NextResponse.json({ error: 'Missing required student details' }, { status: 400 });
    }

    const rent = parseFloat(monthlyRent) || 0;
    const deposit = parseFloat(securityDeposit) || 0;

    const result = await db.$transaction(async (tx) => {
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

      // Create student credentials in User table (default password is phone number)
      const hashedPassword = await hashPassword(phone);
      await tx.user.create({
        data: {
          name,
          email: email || null,
          phone,
          password: hashedPassword,
          role: 'STUDENT',
          status: 'ACTIVE'
        }
      });

      // Create student profile
      const newStudent = await tx.student.create({
        data: {
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
          monthlyRent: rent,
          securityDeposit: deposit,
          expectedCheckout: expectedCheckout ? new Date(expectedCheckout) : null,
          admissionDate: joiningDate ? new Date(joiningDate) : new Date(),
          status: 'INACTIVE' // Set to INACTIVE initially, will turn ACTIVE upon Bed Allocation
        }
      });

      // Get global hostel settings for PG phone number
      const settings = await tx.hostelSettings.findUnique({
        where: { id: 'GLOBAL' }
      });
      const hostelPhone = settings?.phone || '+91 98765 43210';
      const hostelName = settings?.hostelName || 'Home Stay Hostel';

      // Create WhatsApp notification record in Notification table
      await tx.notification.create({
        data: {
          recipient: phone,
          type: 'WHATSAPP',
          title: 'Welcome to ' + hostelName,
          message: `Hello ${name},\nWelcome to ${hostelName}! Your resident profile has been successfully created.\n\nYour login details are:\n- Portal URL: http://localhost:3000/login\n- Username: ${phone}\n- Temp Password: ${phone}\n\nYour rent parameters:\n- Monthly Rent: ₹${rent}\n- Security Deposit: ₹${deposit}\n\nFor any queries, contact us through our official phone: ${hostelPhone}.\n\nHave a great stay!`,
          status: 'SENT'
        }
      });

      console.log(`[WHATSAPP DISPATCH] Notification sent to ${phone} from PG profile number ${hostelPhone}.`);

      return newStudent;
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'REGISTER_STUDENT',
      'STUDENTS',
      `Registered student "${name}" with phone ${phone}`
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('POST student error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to edit student details and keep User login details synced
export async function PUT(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'students', 'edit');
    if (errorResponse) return errorResponse;

    const data = await request.json();
    const { id, name, phone, email, ...otherFields } = data;

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const currentStudent = await db.student.findUnique({
      where: { id }
    });

    if (!currentStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const result = await db.$transaction(async (tx) => {
      // If email is changing, check uniqueness
      if (email && email !== currentStudent.email) {
        const takenUser = await tx.user.findFirst({
          where: { email, phone: { not: currentStudent.phone } }
        });
        if (takenUser) {
          throw new Error('This email address is already registered by another user');
        }

        const takenStudent = await tx.student.findFirst({
          where: { email, id: { not: id } }
        });
        if (takenStudent) {
          throw new Error('This email address is already registered by another student');
        }
      }

      // If phone is changing, check uniqueness
      if (phone && phone !== currentStudent.phone) {
        const takenStudent = await tx.student.findFirst({
          where: { phone, id: { not: id } }
        });
        if (takenStudent) {
          throw new Error('This phone number is already registered by another student');
        }
      }

      // Sync name, phone, email, and password (if changed) in User table
      const userUpdateData: any = { name, email: email || null };
      if (phone && phone !== currentStudent.phone) {
        userUpdateData.phone = phone;
      }
      if (otherFields.password) {
        userUpdateData.password = await hashPassword(otherFields.password);
      }

      await tx.user.update({
        where: { phone: currentStudent.phone },
        data: userUpdateData
      });

      // Parse dates and floats
      const parsedFields: any = {};
      if (otherFields.monthlyRent !== undefined) parsedFields.monthlyRent = parseFloat(otherFields.monthlyRent) || 0;
      if (otherFields.securityDeposit !== undefined) parsedFields.securityDeposit = parseFloat(otherFields.securityDeposit) || 0;
      if (otherFields.expectedCheckout !== undefined) parsedFields.expectedCheckout = otherFields.expectedCheckout ? new Date(otherFields.expectedCheckout) : null;
      if (otherFields.dob !== undefined) parsedFields.dob = otherFields.dob;
      if (otherFields.gender !== undefined) parsedFields.gender = otherFields.gender;
      if (otherFields.address !== undefined) parsedFields.address = otherFields.address;
      if (otherFields.emergencyContact !== undefined) parsedFields.emergencyContact = otherFields.emergencyContact;
      if (otherFields.guardianName !== undefined) parsedFields.guardianName = otherFields.guardianName;
      if (otherFields.guardianPhone !== undefined) parsedFields.guardianPhone = otherFields.guardianPhone;
      if (otherFields.collegeOrCompany !== undefined) parsedFields.collegeOrCompany = otherFields.collegeOrCompany;
      if (otherFields.courseOrDept !== undefined) parsedFields.courseOrDept = otherFields.courseOrDept;
      if (otherFields.idNumber !== undefined) parsedFields.idNumber = otherFields.idNumber;
      if (otherFields.idProofType !== undefined) parsedFields.idProofType = otherFields.idProofType;
      if (otherFields.status !== undefined) parsedFields.status = otherFields.status;

      return tx.student.update({
        where: { id },
        data: {
          name,
          phone,
          email: email || null,
          ...parsedFields
        }
      });
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'UPDATE_STUDENT',
      'STUDENTS',
      `Updated profile of student "${result.name}"`
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('PUT student error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE student
export async function DELETE(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'students', 'delete');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const student = await db.student.findUnique({
      where: { id },
      include: { bed: true }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      // Release allocated bed if any
      if (student.bed) {
        await tx.bed.update({
          where: { id: student.bed.id },
          data: {
            status: 'AVAILABLE',
            studentId: null
          }
        });
      }

      // Delete user credentials
      try {
        await tx.user.delete({
          where: { phone: student.phone }
        });
      } catch (err) {
        console.warn(`User with phone ${student.phone} not found during student deletion:`, err);
      }

      // Delete student
      await tx.student.delete({
        where: { id }
      });
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'DELETE_STUDENT',
      'STUDENTS',
      `Deleted student record for "${student.name}"`
    );

    return NextResponse.json({ message: 'Student record deleted successfully' });
  } catch (error) {
    console.error('DELETE student error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, getUserFromRequest } from '@/lib/auth';

// Public GET to fetch student profile without login
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (!search) {
      return NextResponse.json({ error: 'Search query (Student ID or Phone) is required' }, { status: 400 });
    }

    const student = await db.student.findFirst({
      where: {
        OR: [
          { id: search },
          { phone: search }
        ]
      },
      include: {
        bed: {
          include: {
            room: {
              include: {
                building: true,
                floor: true
              }
            }
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Mask sensitive details for public retrieval to prevent data harvesting
    const maskPhone = (num: string) => {
      const cleaned = num.trim();
      return cleaned.length >= 7 ? `${cleaned.slice(0, 3)}******${cleaned.slice(-2)}` : '******';
    };

    const maskAadhaar = (num: string) => {
      const cleaned = num.replace(/[^a-zA-Z0-9]/g, '');
      return cleaned.length >= 4 ? `XXXX-XXXX-${cleaned.slice(-4)}` : 'XXXX-XXXX-XXXX';
    };

    const maskAddress = (addr: string) => {
      const cleaned = addr.trim();
      return cleaned.length > 10 ? `${cleaned.slice(0, 6)}... (Masked for privacy)` : 'Masked for privacy';
    };

    const sanitizedStudent = {
      ...student,
      idProofUrl: null, // Keep completely hidden
      idNumber: student.idNumber ? maskAadhaar(student.idNumber) : 'N/A',
      address: student.address ? maskAddress(student.address) : 'N/A',
      phone: student.phone ? maskPhone(student.phone) : 'N/A',
      guardianPhone: student.guardianPhone ? maskPhone(student.guardianPhone) : 'N/A',
      emergencyContact: student.emergencyContact ? maskPhone(student.emergencyContact) : 'N/A',
      guardianName: student.guardianName ? student.guardianName.slice(0, 2) + '******' : 'N/A',
      dob: student.dob ? 'XX-XX-XXXX' : 'N/A',
      securityDeposit: 0, // Hide financial details from public view
      monthlyRent: 0 // Hide rent details from public view
    };

    return NextResponse.json(sanitizedStudent);
  } catch (error) {
    console.error('Public GET student error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Public PUT to update student profile details without login
export async function PUT(request: Request) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized: Login required to update student profile data' }, { status: 401 });
    }

    const data = await request.json();
    const { id, name, phone, idNumber, address } = data;

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    if (!name || !phone || !address || !idNumber) {
      return NextResponse.json({ error: 'Missing required profile fields (name, phone, address, Aadhaar)' }, { status: 400 });
    }

    const currentStudent = await db.student.findUnique({
      where: { id }
    });

    if (!currentStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Students are only allowed to edit their own profile
    if (currentUser.role === 'STUDENT' && currentUser.phone !== currentStudent.phone) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify another student\'s profile' }, { status: 403 });
    }

    const result = await db.$transaction(async (tx) => {


      // If phone is changing, check uniqueness
      if (phone && phone !== currentStudent.phone) {
        const takenStudent = await tx.student.findFirst({
          where: { phone, id: { not: id } }
        });
        if (takenStudent) {
          throw new Error('This phone number is already registered by another student');
        }
        
        const takenUser = await tx.user.findFirst({
          where: { phone }
        });
        if (takenUser) {
          throw new Error('This phone number is already registered by another user');
        }
      }

      // Sync name, phone in User table if user exists
      const userUpdateData: any = { name };
      if (phone && phone !== currentStudent.phone) {
        userUpdateData.phone = phone;
      }

      const existingUser = await tx.user.findUnique({
        where: { phone: currentStudent.phone }
      });

      if (existingUser) {
        await tx.user.update({
          where: { phone: currentStudent.phone },
          data: userUpdateData
        });
      }

      // Update student profile
      return tx.student.update({
        where: { id },
        data: {
          name,
          phone,
          idNumber,
          address
        }
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Public PUT student error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

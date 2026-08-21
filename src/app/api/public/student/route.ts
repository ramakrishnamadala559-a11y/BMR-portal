import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

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

    return NextResponse.json(student);
  } catch (error) {
    console.error('Public GET student error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Public PUT to update student profile details without login
export async function PUT(request: Request) {
  try {
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

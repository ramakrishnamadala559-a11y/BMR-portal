import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { name, phone } = await request.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and Phone Number are required' }, { status: 400 });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      return NextResponse.json({ error: 'Invalid phone number. Must be a 10-digit mobile number' }, { status: 400 });
    }

    // Check if student already exists with this phone number
    const existingStudent = await db.student.findUnique({
      where: { phone: phone.trim() }
    });

    if (existingStudent) {
      return NextResponse.json({ error: 'This phone number is already registered' }, { status: 409 });
    }

    // Check if user already exists with this phone number
    const existingUser = await db.user.findUnique({
      where: { phone: phone.trim() }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'This phone number is already registered by another user' }, { status: 409 });
    }

    // Create the inactive student (representing a new pending booking)
    const newStudent = await db.student.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        dob: 'N/A',
        gender: 'MALE',
        address: 'N/A',
        emergencyContact: 'N/A',
        guardianName: 'N/A',
        guardianPhone: 'N/A',
        collegeOrCompany: 'N/A',
        courseOrDept: 'N/A',
        idNumber: 'N/A',
        idProofType: 'Aadhaar Card',
        status: 'INACTIVE',
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Booking request registered successfully!',
      student: newStudent
    });

  } catch (error: any) {
    console.error('Public booking creation error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

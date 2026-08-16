import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// GET the global hostel settings
export async function GET(request: Request) {
  try {


    const settings = await db.hostelSettings.upsert({
      where: { id: 'GLOBAL' },
      update: {},
      create: {
        id: 'GLOBAL',
        hostelName: 'Home Stay Hostel',
        address: '123 Luxury Road, Silicon Valley',
        phone: '+1234567890',
        email: 'contact@premiumhostel.com',
        defaultRent: 5000,
        defaultDueDateDay: 5,
        defaultLateFee: 200,
        invoicePrefix: 'INV-'
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to edit global settings
export async function PUT(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'settings', 'edit');
    if (errorResponse) return errorResponse;

    const data = await request.json();
    const {
      hostelName,
      logoUrl,
      address,
      phone,
      email,
      website,
      gstNumber,
      defaultRent,
      defaultDueDateDay,
      defaultLateFee,
      invoicePrefix,
      emailEnabled,
      smsEnabled,
      whatsappEnabled,
      showContactOnLogin
    } = data;

    const parsedRent = defaultRent !== undefined ? parseFloat(defaultRent) : undefined;
    const parsedLateFee = defaultLateFee !== undefined ? parseFloat(defaultLateFee) : undefined;
    const parsedDueDateDay = defaultDueDateDay !== undefined ? parseInt(defaultDueDateDay) : undefined;

    const updatedSettings = await db.hostelSettings.update({
      where: { id: 'GLOBAL' },
      data: {
        hostelName: hostelName !== undefined ? hostelName : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        address: address !== undefined ? address : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        website: website !== undefined ? website : undefined,
        gstNumber: gstNumber !== undefined ? gstNumber : undefined,
        defaultRent: parsedRent,
        defaultDueDateDay: parsedDueDateDay,
        defaultLateFee: parsedLateFee,
        invoicePrefix: invoicePrefix !== undefined ? invoicePrefix : undefined,
        emailEnabled: emailEnabled !== undefined ? emailEnabled : undefined,
        smsEnabled: smsEnabled !== undefined ? smsEnabled : undefined,
        whatsappEnabled: whatsappEnabled !== undefined ? whatsappEnabled : undefined,
        showContactOnLogin: showContactOnLogin !== undefined ? showContactOnLogin : undefined
      }
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'UPDATE_SETTINGS',
      'SETTINGS',
      `Updated hostel settings profile`
    );

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('PUT settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

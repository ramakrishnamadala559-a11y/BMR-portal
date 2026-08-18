import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { logActivity } from '@/lib/api-helper';

// In-memory cache for hot-reload safety
const globalRef = global as any;
if (!globalRef.otpCache) {
  globalRef.otpCache = new Map<string, { otp: string; expires: number }>();
}
const otpCache: Map<string, { otp: string; expires: number }> = globalRef.otpCache;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, identifier, otp } = body;

    if (!identifier) {
      return NextResponse.json({ error: 'Identifier (email/phone) is required' }, { status: 400 });
    }

    // Find user in DB
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier }
        ]
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'No registered account found with this identifier' }, { status: 404 });
    }

    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      return NextResponse.json(
        { error: `Your account is ${user.status.toLowerCase()}. Please contact the administrator.` },
        { status: 403 }
      );
    }

    // ACTION: SEND OTP
    if (action === 'send') {
      // Generate 6-digit random code
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Cache the OTP with 5 minute expiration
      otpCache.set(identifier, {
        otp: generatedOtp,
        expires: Date.now() + 5 * 60 * 1000
      });

      // Log activity to audit logs
      await logActivity(
        user.id,
        user.name,
        'OTP_REQUEST',
        'AUTH',
        `Generated login OTP for ${user.role.toLowerCase()}`
      );

      // Create a mock dispatch notification in database
      await db.notification.create({
        data: {
          recipient: user.phone,
          type: 'SMS',
          title: 'Home Stay Login Verification',
          message: `Your One-Time Password (OTP) for Home Stay Portal is ${generatedOtp}. Valid for 5 minutes.`,
          status: 'SENT'
        }
      });

      console.log(`[AUTH OTP DEBUG] Generated OTP for user ${user.name} (${identifier}): ${generatedOtp}`);

      return NextResponse.json({
        message: 'Verification code sent successfully!',
        testOtp: generatedOtp // Return for easy local sandbox copy-pasting
      });
    }

    // ACTION: VERIFY OTP
    if (action === 'verify') {
      if (!otp) {
        return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
      }

      const cached = otpCache.get(identifier);

      if (!cached) {
        return NextResponse.json({ error: 'No active verification request found. Please request a new code.' }, { status: 400 });
      }

      if (Date.now() > cached.expires) {
        otpCache.delete(identifier);
        return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
      }

      if (cached.otp !== otp) {
        return NextResponse.json({ error: 'Incorrect verification code. Please check and try again.' }, { status: 401 });
      }

      // Valid OTP: consume it
      otpCache.delete(identifier);

      // Generate JWT Token
      const token = signToken({
        userId: user.id,
        role: user.role,
        name: user.name,
        phone: user.phone
      });

      // Log success login
      await logActivity(
        user.id,
        user.name,
        'LOGIN',
        'AUTH',
        `Logged in successfully via OTP as ${user.role.toLowerCase()}`
      );

      const response = NextResponse.json({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      });

      // Set cookie
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid auth action request' }, { status: 400 });
  } catch (error: any) {
    console.error('OTP login endpoint error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/api-helper';

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (user) {
    await logActivity(
      user.userId,
      user.name,
      'LOGOUT',
      'AUTH',
      `Logged out successfully`
    );
  }

  const response = NextResponse.json({ message: 'Logout successful' });
  
  // Clear cookie by setting maxAge to 0
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });

  return response;
}

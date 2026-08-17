import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getUserFromRequest(request);
    if (!session) {
      const response = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      response.cookies.set('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });
      return response;
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: {
        permissions: true
      }
    });

    if (!user) {
      const response = NextResponse.json({ error: 'User not found' }, { status: 404 });
      response.cookies.set('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });
      return response;
    }

    let studentProfile = null;
    if (user.role === 'STUDENT') {
      studentProfile = await db.student.findFirst({
        where: { phone: user.phone },
        include: {
          bed: {
            include: {
              room: {
                include: {
                  building: true
                }
              }
            }
          }
        }
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        permissions: user.permissions.map(p => ({ module: p.module, action: p.action }))
      },
      studentProfile
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

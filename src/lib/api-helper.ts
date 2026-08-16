import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

export async function checkAuthAndPermission(
  req: Request,
  module?: string,
  action?: string
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return { user: null, errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  // Owner always has all permissions
  if (user.role === 'OWNER') {
    return { user, errorResponse: null };
  }

  // Student only allowed to access student-self endpoints
  if (user.role === 'STUDENT') {
    if (module === 'student-self') {
      return { user, errorResponse: null };
    }
    return { user: null, errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  // Check granular staff permissions in database
  if (module && action) {
    const permission = await db.permission.findFirst({
      where: {
        userId: user.userId,
        module,
        action,
      },
    });

    if (!permission) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: `Forbidden: Missing ${action} permission on ${module}` },
          { status: 403 }
        ),
      };
    }
  }

  return { user, errorResponse: null };
}

export async function logActivity(
  userId: string | null,
  userName: string,
  action: string,
  module: string,
  description: string
) {
  try {
    await db.activityLog.create({
      data: {
        userId,
        userName,
        action,
        module,
        description,
      },
    });
  } catch (error) {
    console.error('Failed to write activity log:', error);
  }
}

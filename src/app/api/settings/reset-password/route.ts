import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

export async function POST(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'settings', 'edit');
    if (errorResponse) return errorResponse;

    // Check if the current user is OWNER
    if (currentUser!.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden. Only the hostel owner can reset passwords.' }, { status: 403 });
    }

    const { targetUserId, phone, newPassword } = await request.json();

    if (!newPassword || newPassword.trim().length < 6) {
      return NextResponse.json({ error: 'A password of at least 6 characters is required.' }, { status: 400 });
    }

    let targetUser = null;
    if (targetUserId) {
      targetUser = await db.user.findUnique({
        where: { id: targetUserId }
      });
    } else if (phone) {
      targetUser = await db.user.findFirst({
        where: { phone }
      });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.user.update({
      where: { id: targetUser.id },
      data: { password: hashedPassword }
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'RESET_PASSWORD',
      'SETTINGS',
      `Owner reset password for user "${targetUser.name}" (${targetUser.role.toLowerCase()})`
    );

    return NextResponse.json({ success: true, message: `Password for ${targetUser.name} has been reset successfully.` });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

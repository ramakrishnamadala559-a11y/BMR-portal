import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission } from '@/lib/api-helper';

export async function GET(request: Request) {
  try {
    // Only administrators who can manage settings can view notifications dispatch log
    const { errorResponse } = await checkAuthAndPermission(request, 'settings', 'view');
    if (errorResponse) return errorResponse;

    const notifications = await db.notification.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Show latest 50 notifications
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('GET notifications error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

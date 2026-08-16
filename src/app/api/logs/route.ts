import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission } from '@/lib/api-helper';

export async function GET(request: Request) {
  try {
    // Only administrators who can manage settings can view logs
    const { errorResponse } = await checkAuthAndPermission(request, 'settings', 'view');
    if (errorResponse) return errorResponse;

    const logs = await db.activityLog.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Cap at latest 100 logs for efficiency
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('GET logs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

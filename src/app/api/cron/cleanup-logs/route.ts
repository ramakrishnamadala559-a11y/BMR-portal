import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // Secure the cron endpoint with CRON_SECRET if configured
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    
    if (cronSecret) {
      const isAuthorized = authHeader === `Bearer ${cronSecret}` || key === cronSecret;
      if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deleteResult = await db.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    console.log(`CRON: Cleaned up ${deleteResult.count} activity logs older than 30 days.`);

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      message: `Cleaned up ${deleteResult.count} activity logs older than 30 days.`
    });
  } catch (error) {
    console.error('CRON cleanup-logs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

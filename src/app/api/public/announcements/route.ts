import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetGroup = searchParams.get('targetGroup');

    const announcements = await db.announcement.findMany({
      where: targetGroup ? {
        OR: [
          { targetGroup: 'ALL' },
          { targetGroup }
        ]
      } : undefined,
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error('GET public announcements error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

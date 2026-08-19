import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetGroup = searchParams.get('targetGroup');
    const buildingName = searchParams.get('buildingName');
    const roomNumber = searchParams.get('roomNumber');
    const studentId = searchParams.get('studentId');

    // Build matching criteria
    const orConditions: any[] = [{ targetGroup: 'ALL' }];

    if (targetGroup) {
      orConditions.push({ targetGroup });
    }
    if (buildingName) {
      orConditions.push({ targetGroup: buildingName });
    }
    if (roomNumber) {
      orConditions.push({ targetGroup: `ROOM_${roomNumber}` });
    }
    if (studentId) {
      orConditions.push({ targetGroup: `STUDENT_${studentId}` });
    }

    const announcements = await db.announcement.findMany({
      where: {
        OR: orConditions
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error('GET public announcements error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

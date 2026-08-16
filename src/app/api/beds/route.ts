import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// GET beds (can be filtered by status or roomId)
export async function GET(request: Request) {
  try {
    const { errorResponse } = await checkAuthAndPermission(request, 'rooms', 'view');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') || undefined;
    const status = searchParams.get('status') || undefined;

    const beds = await db.bed.findMany({
      where: {
        roomId,
        status,
      },
      include: {
        room: {
          include: {
            floor: true
          }
        },
        building: true,
        student: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(beds);
  } catch (error) {
    console.error('GET beds error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to update bed status (e.g. maintenance, reserving a bed)
export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'rooms', 'edit');
    if (errorResponse) return errorResponse;

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Bed ID and status are required' }, { status: 400 });
    }

    const currentBed = await db.bed.findUnique({
      where: { id },
      include: { room: true }
    });

    if (!currentBed) {
      return NextResponse.json({ error: 'Bed not found' }, { status: 404 });
    }

    // Check validation: cannot toggle occupied beds
    if (currentBed.status === 'OCCUPIED' && status !== 'OCCUPIED') {
      return NextResponse.json(
        { error: 'Cannot change the status of an occupied bed directly. Please use the admissions/student checkout system.' },
        { status: 400 }
      );
    }

    if (status === 'OCCUPIED' && currentBed.status !== 'OCCUPIED') {
      return NextResponse.json(
        { error: 'Cannot set a bed to occupied directly. Please use the admission workflow.' },
        { status: 400 }
      );
    }

    const updatedBed = await db.bed.update({
      where: { id },
      data: { status },
      include: { room: true }
    });

    // Update room occupancy status if needed
    const allBedsInRoom = await db.bed.findMany({
      where: { roomId: currentBed.roomId }
    });

    const occupiedBedsCount = allBedsInRoom.filter(b => b.status === 'OCCUPIED').length;
    let roomStatus = 'AVAILABLE';
    if (occupiedBedsCount === allBedsInRoom.length) {
      roomStatus = 'FULL';
    } else if (occupiedBedsCount > 0) {
      roomStatus = 'PARTIALLY_OCCUPIED';
    }

    // Update the room status
    await db.room.update({
      where: { id: currentBed.roomId },
      data: { status: roomStatus }
    });

    await logActivity(
      user!.userId,
      user!.name,
      'UPDATE_BED_STATUS',
      'ROOMS',
      `Updated status of bed "${currentBed.name}" in Room "${currentBed.room.number}" to ${status.toLowerCase()}`
    );

    return NextResponse.json(updatedBed);
  } catch (error) {
    console.error('PUT bed error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

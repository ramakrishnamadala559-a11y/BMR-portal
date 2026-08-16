import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// GET rooms with optional filters
export async function GET(request: Request) {
  try {
    const { errorResponse } = await checkAuthAndPermission(request, 'rooms', 'view');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId') || undefined;
    const floorId = searchParams.get('floorId') || undefined;
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;

    const rooms = await db.room.findMany({
      where: {
        buildingId,
        floorId,
        status,
        type: type ? { contains: type } : undefined,
      },
      include: {
        building: true,
        floor: true,
        beds: {
          include: {
            student: true
          }
        }
      },
      orderBy: {
        number: 'asc'
      }
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('GET rooms error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST to create a room and its beds
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'rooms', 'create');
    if (errorResponse) return errorResponse;

    const { number, type, capacity, rent, status, facilities, floorId, buildingId } = await request.json();

    if (!number || !type || !capacity || !rent || !floorId || !buildingId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const roomCapacity = parseInt(capacity);
    const roomRent = parseFloat(rent);

    const room = await db.$transaction(async (tx) => {
      // Check if room already exists on this building
      const existing = await tx.room.findFirst({
        where: {
          buildingId,
          number
        }
      });

      if (existing) {
        throw new Error(`Room "${number}" already exists in this building`);
      }

      const newRoom = await tx.room.create({
        data: {
          number,
          type,
          capacity: roomCapacity,
          rent: roomRent,
          status: status || 'AVAILABLE',
          facilities: facilities || '',
          floorId,
          buildingId
        }
      });

      // Automatically create beds: "Bed A", "Bed B", "Bed C", etc.
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const bedData = Array.from({ length: roomCapacity }, (_, i) => ({
        name: `Bed ${alphabet[i] || i + 1}`,
        status: 'AVAILABLE',
        roomId: newRoom.id,
        buildingId
      }));

      await tx.bed.createMany({
        data: bedData
      });

      return tx.room.findUnique({
        where: { id: newRoom.id },
        include: { beds: true }
      });
    });

    await logActivity(
      user!.userId,
      user!.name,
      'CREATE_ROOM',
      'ROOMS',
      `Created room "${number}" (${type}) with capacity ${roomCapacity}`
    );

    return NextResponse.json(room, { status: 201 });
  } catch (error: any) {
    console.error('POST room error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to edit room details
export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'rooms', 'edit');
    if (errorResponse) return errorResponse;

    const { id, type, rent, status, facilities, capacity } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const currentRoom = await db.room.findUnique({
      where: { id },
      include: { beds: true }
    });

    if (!currentRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const updatedRoom = await db.$transaction(async (tx) => {
      // If capacity is changed, check if we need to add or remove beds
      if (capacity && parseInt(capacity) !== currentRoom.capacity) {
        const newCapacity = parseInt(capacity);
        const diff = newCapacity - currentRoom.capacity;

        if (diff > 0) {
          // Add beds
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const bedData = Array.from({ length: diff }, (_, i) => {
            const index = currentRoom.capacity + i;
            return {
              name: `Bed ${alphabet[index] || index + 1}`,
              status: 'AVAILABLE',
              roomId: id,
              buildingId: currentRoom.buildingId
            };
          });
          await tx.bed.createMany({ data: bedData });
        } else if (diff < 0) {
          // Remove beds: Only remove beds that are AVAILABLE
          const bedsToRemoveCount = Math.abs(diff);
          const availableBeds = currentRoom.beds.filter(b => b.status === 'AVAILABLE');

          if (availableBeds.length < bedsToRemoveCount) {
            throw new Error(`Cannot decrease capacity by ${bedsToRemoveCount}. Only ${availableBeds.length} beds are unoccupied.`);
          }

          // Remove the last N available beds
          const bedsToDel = availableBeds.slice(-bedsToRemoveCount);
          await tx.bed.deleteMany({
            where: {
              id: { in: bedsToDel.map(b => b.id) }
            }
          });
        }
      }

      return tx.room.update({
        where: { id },
        data: {
          type: type !== undefined ? type : undefined,
          rent: rent !== undefined ? parseFloat(rent) : undefined,
          status: status !== undefined ? status : undefined,
          facilities: facilities !== undefined ? facilities : undefined,
          capacity: capacity !== undefined ? parseInt(capacity) : undefined
        },
        include: { beds: true }
      });
    });

    await logActivity(
      user!.userId,
      user!.name,
      'UPDATE_ROOM',
      'ROOMS',
      `Updated room details for room "${updatedRoom.number}"`
    );

    return NextResponse.json(updatedRoom);
  } catch (error: any) {
    console.error('PUT room error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE room
export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'rooms', 'delete');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const room = await db.room.findUnique({
      where: { id },
      include: { beds: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if any beds are occupied
    const occupied = room.beds.some(b => b.status !== 'AVAILABLE');
    if (occupied) {
      return NextResponse.json({ error: 'Cannot delete room because one or more beds are occupied' }, { status: 400 });
    }

    await db.room.delete({
      where: { id }
    });

    await logActivity(
      user!.userId,
      user!.name,
      'DELETE_ROOM',
      'ROOMS',
      `Deleted room "${room.number}"`
    );

    return NextResponse.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('DELETE room error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

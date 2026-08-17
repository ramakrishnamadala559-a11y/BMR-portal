import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// POST to create a new floor in a building
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'rooms', 'create');
    if (errorResponse) return errorResponse;

    const { buildingId, number } = await request.json();

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    const building = await db.building.findUnique({
      where: { id: buildingId },
      include: { floors: true }
    });

    if (!building) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }

    // Determine the floor number
    let floorNumber: number;
    if (number !== undefined && number !== '') {
      floorNumber = parseInt(number);
    } else {
      // Find the next available sequential number
      const existingNumbers = building.floors.map(f => f.number);
      floorNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    }

    // Check if floor number already exists in this building
    const exists = await db.floor.findUnique({
      where: {
        buildingId_number: {
          buildingId,
          number: floorNumber
        }
      }
    });

    if (exists) {
      return NextResponse.json({ error: `Floor ${floorNumber} already exists in this building` }, { status: 400 });
    }

    const newFloor = await db.floor.create({
      data: {
        number: floorNumber,
        buildingId
      }
    });

    await logActivity(
      user!.userId,
      user!.name,
      'CREATE_FLOOR',
      'ROOMS',
      `Created Floor ${floorNumber} in building "${building.name}"`
    );

    return NextResponse.json(newFloor, { status: 201 });
  } catch (error: any) {
    console.error('POST floor error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to edit a floor number
export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'rooms', 'edit');
    if (errorResponse) return errorResponse;

    const { id, number } = await request.json();

    if (!id || number === undefined || number === '') {
      return NextResponse.json({ error: 'Floor ID and new number are required' }, { status: 400 });
    }

    const floor = await db.floor.findUnique({
      where: { id },
      include: { building: true }
    });

    if (!floor) {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 });
    }

    const newNumber = parseInt(number);

    // If no change, return early
    if (floor.number === newNumber) {
      return NextResponse.json(floor);
    }

    // Check if new number already exists in the same building
    const exists = await db.floor.findUnique({
      where: {
        buildingId_number: {
          buildingId: floor.buildingId,
          number: newNumber
        }
      }
    });

    if (exists) {
      return NextResponse.json({ error: `Floor ${newNumber} already exists in building "${floor.building.name}"` }, { status: 400 });
    }

    const updatedFloor = await db.floor.update({
      where: { id },
      data: { number: newNumber }
    });

    await logActivity(
      user!.userId,
      user!.name,
      'UPDATE_FLOOR',
      'ROOMS',
      `Updated Floor number from ${floor.number} to ${newNumber} in building "${floor.building.name}"`
    );

    return NextResponse.json(updatedFloor);
  } catch (error: any) {
    console.error('PUT floor error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a floor
export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'rooms', 'delete');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Floor ID is required' }, { status: 400 });
    }

    const floor = await db.floor.findUnique({
      where: { id },
      include: {
        building: true,
        rooms: {
          include: {
            beds: true
          }
        }
      }
    });

    if (!floor) {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 });
    }

    // Check if any beds on this floor are occupied, reserved, or in maintenance
    const occupied = floor.rooms.some(room =>
      room.beds.some(b => b.status !== 'AVAILABLE')
    );

    if (occupied) {
      return NextResponse.json({
        error: `Cannot delete Floor ${floor.number} because it contains occupied, reserved, or maintenance beds`
      }, { status: 400 });
    }

    await db.floor.delete({
      where: { id }
    });

    await logActivity(
      user!.userId,
      user!.name,
      'DELETE_FLOOR',
      'ROOMS',
      `Deleted Floor ${floor.number} from building "${floor.building.name}"`
    );

    return NextResponse.json({ message: 'Floor deleted successfully' });
  } catch (error: any) {
    console.error('DELETE floor error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

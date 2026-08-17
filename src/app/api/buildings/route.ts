import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// GET all buildings with their floors, rooms, and beds
export async function GET(request: Request) {
  try {
    const { errorResponse } = await checkAuthAndPermission(request);
    if (errorResponse) return errorResponse;

    const buildings = await db.building.findMany({
      include: {
        floors: {
          orderBy: {
            number: 'asc'
          },
          include: {
            rooms: {
              include: {
                beds: {
                  include: {
                    student: {
                      include: {
                        invoices: {
                          where: {
                            status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(buildings);
  } catch (error) {
    console.error('GET buildings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST to create a new building and pre-populate floors
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'rooms', 'create');
    if (errorResponse) return errorResponse;

    const { name, gender, description, floorsCount } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Building name is required' }, { status: 400 });
    }

    const count = parseInt(floorsCount) || 1;

    // Use Prisma transaction to create building and floors
    const building = await db.$transaction(async (tx) => {
      // Check if building already exists
      const existing = await tx.building.findUnique({
        where: { name }
      });
      if (existing) {
        throw new Error('Building with this name already exists');
      }

      const newBuilding = await tx.building.create({
        data: {
          name,
          gender: gender || 'COLIVING',
          description: description || ''
        }
      });

      // Create floors
      const floorData = Array.from({ length: count }, (_, i) => ({
        number: i + 1,
        buildingId: newBuilding.id
      }));

      await tx.floor.createMany({
        data: floorData
      });

      return tx.building.findUnique({
        where: { id: newBuilding.id },
        include: { floors: true }
      });
    });

    await logActivity(
      user!.userId,
      user!.name,
      'CREATE_BUILDING',
      'ROOMS',
      `Created building "${name}" with ${count} floors`
    );

    return NextResponse.json(building, { status: 201 });
  } catch (error: any) {
    console.error('POST building error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to update building details (e.g. assign warden)
export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'rooms', 'edit');
    if (errorResponse) return errorResponse;

    const { id, name, gender, description, wardenId } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    const currentBuilding = await db.building.findUnique({
      where: { id }
    });

    if (!currentBuilding) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (gender !== undefined) updateData.gender = gender;
    if (description !== undefined) updateData.description = description;
    if (wardenId !== undefined) updateData.wardenId = wardenId || null;

    const updatedBuilding = await db.building.update({
      where: { id },
      data: updateData
    });

    let actionDetail = `Updated building "${updatedBuilding.name}"`;
    if (wardenId !== undefined) {
      if (wardenId) {
        const wardenUser = await db.user.findUnique({ where: { id: wardenId } });
        actionDetail = `Assigned Warden "${wardenUser?.name || 'Unknown'}" to building "${updatedBuilding.name}"`;
      } else {
        actionDetail = `Removed Warden from building "${updatedBuilding.name}"`;
      }
    }

    await logActivity(
      user!.userId,
      user!.name,
      'UPDATE_BUILDING',
      'ROOMS',
      actionDetail
    );

    return NextResponse.json(updatedBuilding);
  } catch (error: any) {
    console.error('PUT building error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a building
export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'rooms', 'delete');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    const building = await db.building.findUnique({
      where: { id },
      include: {
        beds: true
      }
    });

    if (!building) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }

    // Check if any beds in this building are occupied, reserved, or in maintenance
    const occupied = building.beds.some(b => b.status !== 'AVAILABLE');
    if (occupied) {
      return NextResponse.json({
        error: 'Cannot delete building because it contains occupied, reserved, or maintenance beds'
      }, { status: 400 });
    }

    await db.building.delete({
      where: { id }
    });

    await logActivity(
      user!.userId,
      user!.name,
      'DELETE_BUILDING',
      'ROOMS',
      `Deleted building "${building.name}"`
    );

    return NextResponse.json({ message: 'Building deleted successfully' });
  } catch (error: any) {
    console.error('DELETE building error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}



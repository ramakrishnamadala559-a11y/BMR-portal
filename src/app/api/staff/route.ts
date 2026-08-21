import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// GET all staff members (users who are not students or owner, or all staff)
export async function GET(request: Request) {
  try {
    const { errorResponse } = await checkAuthAndPermission(request, 'settings', 'view');
    if (errorResponse) return errorResponse;

    const staff = await db.user.findMany({
      where: {
        role: { in: ['WARDEN', 'MANAGER', 'RECEPTIONIST'] }
      },
      include: {
        permissions: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error('GET staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST to create a staff member and setup default/custom permissions
export async function POST(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'settings', 'edit');
    if (errorResponse) return errorResponse;

    const { name, email, phone, role, password, status, permissions, buildingId } = await request.json();

    if (!name || !phone || !role || !password) {
      return NextResponse.json({ error: 'Name, phone, role, and password are required' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const newStaff = await db.$transaction(async (tx) => {
      // Check if phone or email already in use
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [
            { phone },
            { email: email ? email : undefined }
          ]
        }
      });

      if (existingUser) {
        throw new Error('A user with this phone or email already exists');
      }

      // Check if phone already registered by a student
      const existingStudent = await tx.student.findUnique({
        where: { phone }
      });

      if (existingStudent) {
        throw new Error('A student with this phone number is already registered');
      }

      const user = await tx.user.create({
        data: {
          name,
          email: email || null,
          phone,
          password: hashedPassword,
          role,
          status: status || 'ACTIVE',
          buildingId: buildingId || null
        }
      });

      // Insert permissions
      let permsToInsert: Array<{ module: string; action: string }> = [];

      if (permissions && Array.isArray(permissions)) {
        permsToInsert = permissions;
      } else {
        // Fallback default permissions based on role
        if (role === 'MANAGER') {
          const modules = ['students', 'rooms', 'payments', 'expenses', 'invoices', 'reports'];
          const actions = ['view', 'create', 'edit', 'delete'];
          modules.forEach(m => {
            actions.forEach(a => {
              permsToInsert.push({ module: m, action: a });
            });
          });
        } else if (role === 'WARDEN') {
          const modules = ['students', 'rooms', 'reports'];
          modules.forEach(m => permsToInsert.push({ module: m, action: 'view' }));
        } else if (role === 'RECEPTIONIST') {
          // Receptionist can create/edit students, view rooms, manage payments and invoices
          permsToInsert = [
            { module: 'students', action: 'view' },
            { module: 'students', action: 'create' },
            { module: 'students', action: 'edit' },
            { module: 'rooms', action: 'view' },
            { module: 'payments', action: 'view' },
            { module: 'payments', action: 'create' },
            { module: 'invoices', action: 'view' },
            { module: 'invoices', action: 'create' }
          ];
        }
      }

      if (permsToInsert.length > 0) {
        await tx.permission.createMany({
          data: permsToInsert.map(p => ({
            userId: user.id,
            module: p.module,
            action: p.action
          }))
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        include: { permissions: true }
      });
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'CREATE_STAFF',
      'STAFF',
      `Created staff member "${name}" as ${role.toLowerCase()}`
    );

    return NextResponse.json(newStaff, { status: 201 });
  } catch (error: any) {
    console.error('POST staff error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to edit staff profile details, status, and permissions
export async function PUT(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'settings', 'edit');
    if (errorResponse) return errorResponse;

    const { id, name, email, phone, role, status, password, permissions, buildingId } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const updatedStaff = await db.$transaction(async (tx) => {
      // If phone is changing, check uniqueness
      if (phone && phone !== targetUser.phone) {
        const takenPhone = await tx.user.findFirst({
          where: { phone, id: { not: id } }
        });
        if (takenPhone) {
          throw new Error('This phone number is already registered by another staff member');
        }

        const takenStudent = await tx.student.findUnique({
          where: { phone }
        });
        if (takenStudent) {
          throw new Error('This phone number is already registered by a student');
        }
      }

      // If email is changing, check uniqueness
      if (email && email !== targetUser.email) {
        const takenEmail = await tx.user.findFirst({
          where: { email, id: { not: id } }
        });
        if (takenEmail) {
          throw new Error('This email address is already registered by another staff member');
        }
      }

      // Handle password hashing if changing password
      let passHash = undefined;
      if (password) {
        passHash = await hashPassword(password);
      }

      // Update user details
      const user = await tx.user.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          email: email !== undefined ? email : undefined,
          phone: phone !== undefined ? phone : undefined,
          password: passHash,
          role: role !== undefined ? role : undefined,
          status: status !== undefined ? status : undefined,
          buildingId: buildingId !== undefined ? (buildingId || null) : undefined
        }
      });

      // Update permissions if provided
      if (permissions && Array.isArray(permissions)) {
        // Delete all old permissions
        await tx.permission.deleteMany({
          where: { userId: id }
        });

        // Insert new permissions
        await tx.permission.createMany({
          data: permissions.map((p: any) => ({
            userId: id,
            module: p.module,
            action: p.action
          }))
        });
      }

      return tx.user.findUnique({
        where: { id },
        include: { permissions: true }
      });
    });

    if (!updatedStaff) {
      return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
    }

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'UPDATE_STAFF',
      'STAFF',
      `Updated profile/permissions for staff member "${updatedStaff.name}"`
    );

    return NextResponse.json(updatedStaff);
  } catch (error: any) {
    console.error('PUT staff error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE staff member
export async function DELETE(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'settings', 'edit');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    if (id === currentUser!.userId) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const staffMember = await db.user.findUnique({
      where: { id }
    });

    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    if (staffMember.role === 'OWNER') {
      return NextResponse.json({ error: 'Cannot delete the Owner account' }, { status: 400 });
    }

    await db.user.delete({
      where: { id }
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'DELETE_STAFF',
      'STAFF',
      `Deleted staff member "${staffMember.name}" (${staffMember.role.toLowerCase()})`
    );

    return NextResponse.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('DELETE staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


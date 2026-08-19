import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// GET all announcements (for admin view)
export async function GET(request: Request) {
  try {
    const { errorResponse } = await checkAuthAndPermission(request, 'settings', 'view');
    if (errorResponse) return errorResponse;

    const announcements = await db.announcement.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error('GET announcements admin error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST to create an announcement and log it in activity log
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'settings', 'edit');
    if (errorResponse) return errorResponse;

    const data = await request.json();
    const { title, content, targetGroup } = data;

    if (!title || !content || !targetGroup) {
      return NextResponse.json({ error: 'Title, content, and target group are required' }, { status: 400 });
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        targetGroup,
        createdBy: user!.name
      }
    });

    // Write to audit log!
    await logActivity(
      user!.userId,
      user!.name,
      'CREATE_ANNOUNCEMENT',
      'SETTINGS',
      `Posted announcement: "${title}" (Target: ${targetGroup})`
    );

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error('POST announcement error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE an announcement and log it in activity log
export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await checkAuthAndPermission(request, 'settings', 'edit');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const announcement = await db.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    await db.announcement.delete({
      where: { id }
    });

    // Write to audit log!
    await logActivity(
      user!.userId,
      user!.name,
      'DELETE_ANNOUNCEMENT',
      'SETTINGS',
      `Deleted announcement: "${announcement.title}"`
    );

    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('DELETE announcement error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

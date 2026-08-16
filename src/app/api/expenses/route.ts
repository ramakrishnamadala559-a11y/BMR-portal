import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAuthAndPermission, logActivity } from '@/lib/api-helper';

// GET all expenses
export async function GET(request: Request) {
  try {
    const { errorResponse } = await checkAuthAndPermission(request, 'expenses', 'view');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const buildingId = searchParams.get('buildingId') || undefined;

    const expenses = await db.expense.findMany({
      where: {
        category,
        buildingId: buildingId ? buildingId : undefined
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('GET expenses error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST to create an expense
export async function POST(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'expenses', 'create');
    if (errorResponse) return errorResponse;

    const { amount, category, date, description, receiptUrl, buildingId } = await request.json();

    if (!amount || !category || !date || !description) {
      return NextResponse.json({ error: 'Amount, category, date, and description are required' }, { status: 400 });
    }

    const expenseAmount = parseFloat(amount);

    const expense = await db.expense.create({
      data: {
        amount: expenseAmount,
        category,
        buildingId: buildingId || null,
        date: new Date(date),
        description,
        receiptUrl: receiptUrl || null,
        addedBy: currentUser!.name
      }
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'ADD_EXPENSE',
      'EXPENSES',
      `Recorded expense of ${expenseAmount} under "${category}"`
    );

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('POST expense error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE expense
export async function DELETE(request: Request) {
  try {
    const { user: currentUser, errorResponse } = await checkAuthAndPermission(request, 'expenses', 'delete');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const expense = await db.expense.findUnique({
      where: { id }
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await db.expense.delete({
      where: { id }
    });

    await logActivity(
      currentUser!.userId,
      currentUser!.name,
      'DELETE_EXPENSE',
      'EXPENSES',
      `Deleted expense of ${expense.amount} under "${expense.category}"`
    );

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('DELETE expense error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

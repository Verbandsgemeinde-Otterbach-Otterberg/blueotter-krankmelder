import { NextRequest, NextResponse } from 'next/server';
import { updateEmployerOrder } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids)) {
      return NextResponse.json({ success: false, error: 'ids array required' }, { status: 400 });
    }
    updateEmployerOrder(ids.map((i: any) => Number(i)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating employer order:', error);
    return NextResponse.json({ success: false, error: 'Could not update order' }, { status: 500 });
  }
}

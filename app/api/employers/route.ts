import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployers, updateEmployer, deleteEmployer } from '@/app/lib/db';

export async function GET() {
  try {
    const employers = getAllEmployers();
    return NextResponse.json({ success: true, data: employers });
  } catch (error) {
    console.error('Error fetching all employers:', error);
    return NextResponse.json({ success: false, error: 'Could not load employers' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, active, color } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ success: false, error: 'ID and name required' }, { status: 400 });
    }
    updateEmployer(id, name, active, color || '#3B82F6');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating employer:', error);
    return NextResponse.json({ success: false, error: 'Could not update employer' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    }
    deleteEmployer(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employer:', error);
    return NextResponse.json({ success: false, error: 'Could not delete employer' }, { status: 500 });
  }
}
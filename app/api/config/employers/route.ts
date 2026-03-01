import { NextResponse } from 'next/server';
import { getAllEmployers, addEmployer } from '@/app/lib/db';

export async function GET() {
  try {
    const employers = getAllEmployers();
    const activeEmployers = employers
      .filter((e) => Boolean(e.active))
      .map((e) => ({ name: e.name, active: true }));
    const inactiveEmployers = employers
      .filter((e) => !Boolean(e.active))
      .map((e) => ({ name: e.name, active: false }));

    // Active employers first, inactive employers at the end.
    return NextResponse.json({ success: true, data: [...activeEmployers, ...inactiveEmployers] });
  } catch (error) {
    console.error('Error fetching employers:', error);
    return NextResponse.json(
      { success: false, error: 'Could not load employers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Employer name required' }, { status: 400 });
    }
    addEmployer(name);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding employer:', error);
    return NextResponse.json({ success: false, error: 'Could not add employer' }, { status: 500 });
  }
}

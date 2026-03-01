import { NextRequest, NextResponse } from 'next/server';
import { insertFeedback } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rating } = body;
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Ungültige Bewertung' }, { status: 400 });
    }

    insertFeedback(Math.round(rating), null, null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return NextResponse.json({ error: 'Fehler beim Speichern des Feedbacks' }, { status: 500 });
  }
}

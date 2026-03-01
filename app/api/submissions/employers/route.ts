import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();

    // Extract unique employers from submissions data_json
    const submissions = db.prepare('SELECT data_json FROM submissions').all() as any[];

    const employersSet = new Set<string>();
    
    submissions.forEach((submission) => {
      try {
        const data = JSON.parse(submission.data_json);
        if (data.employer && typeof data.employer === 'string') {
          employersSet.add(data.employer);
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    const employers = Array.from(employersSet).sort();

    return NextResponse.json({
      success: true,
      employers,
    });
  } catch (error) {
    console.error('Error fetching employers:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Arbeitgeber' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getConfiguredTimeZone } from '@/app/lib/server-timezone';
import { toIsoDateInTimeZone } from '@/app/lib/timezone';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all() as any[];
    const timeZone = getConfiguredTimeZone();

    const todayStr = toIsoDateInTimeZone(new Date(), timeZone);

    const matches: any[] = [];

    for (const row of rows) {
      try {
        const data = JSON.parse(row.data_json || '{}');
        // Check various possible date fields
        const simpleDate = data.date || data.start_date || data.from_date;
        const start = data.start_date || data.from_date;
        const end = data.end_date || data.to_date;

        // If single date fields equal today
        if (simpleDate && simpleDate.slice(0,10) === todayStr) {
          matches.push(row);
          continue;
        }

        // If a range covers today
        if (start && end) {
          const startDate = start.slice(0, 10);
          const endDate = end.slice(0, 10);
          if (todayStr >= startDate && todayStr <= endDate) {
            matches.push(row);
            continue;
          }
        }

        // Fallback: if created_at is today (recent submissions)
        if (row.created_at && toIsoDateInTimeZone(row.created_at, timeZone) === todayStr) {
          matches.push(row);
          continue;
        }
      } catch (err) {
        // ignore parse errors
        continue;
      }
    }

    return NextResponse.json({ success: true, data: matches.slice(0, 50) });
  } catch (error) {
    console.error('Error in /api/submissions/today', error);
    return NextResponse.json({ success: false, error: 'Fehler beim Abrufen' }, { status: 500 });
  }
}

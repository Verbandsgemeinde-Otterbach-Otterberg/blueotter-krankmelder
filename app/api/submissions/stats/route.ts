import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getConfiguredTimeZone } from '@/app/lib/server-timezone';
import { toIsoDateInTimeZone } from '@/app/lib/timezone';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const timeZone = getConfiguredTimeZone();

    const now = new Date();
    const today = toIsoDateInTimeZone(now, timeZone);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const prevWeekEnd = weekAgo;

    const prevMonthStart = new Date(now);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 2);
    const prevMonthEnd = monthAgo;

    const prevYearStart = new Date(now);
    prevYearStart.setFullYear(prevYearStart.getFullYear() - 2);
    const prevYearEnd = new Date(now);
    prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);

    const createdRows = db.prepare('SELECT created_at FROM submissions').all() as { created_at: string }[];
    const total = createdRows.length;

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let prevWeekCount = 0;
    let prevMonthCount = 0;
    let prevYearCount = 0;

    const parseCreatedAt = (value: string): Date | null => {
      if (!value) return null;
      let normalized = value.trim();
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
        normalized = `${normalized.replace(' ', 'T')}Z`;
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
        normalized = `${normalized}Z`;
      }
      const date = new Date(normalized);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    for (const row of createdRows) {
      const createdAt = parseCreatedAt(row.created_at);
      if (!createdAt) continue;

      if (toIsoDateInTimeZone(createdAt, timeZone) === today) {
        todayCount += 1;
      }
      if (createdAt >= weekAgo) {
        weekCount += 1;
      }
      if (createdAt >= monthAgo) {
        monthCount += 1;
      }
      if (createdAt >= prevWeekStart && createdAt < prevWeekEnd) {
        prevWeekCount += 1;
      }
      if (createdAt >= prevMonthStart && createdAt < prevMonthEnd) {
        prevMonthCount += 1;
      }
      if (createdAt >= prevYearStart && createdAt < prevYearEnd) {
        prevYearCount += 1;
      }
    }

    // By type
    const typeStmt = db.prepare('SELECT type, COUNT(*) as count FROM submissions GROUP BY type');
    const byType = typeStmt.all().reduce((acc: { [key: string]: number }, row: any) => {
      acc[row.type] = row.count;
      return acc;
    }, {});

    // By status
    const statusStmt = db.prepare('SELECT status, COUNT(*) as count FROM submissions GROUP BY status');
    const byStatus = statusStmt.all().reduce((acc: { [key: string]: number }, row: any) => {
      acc[row.status] = row.count;
      return acc;
    }, {});

    // By employer (extract from data_json)
    const employerStmt = db.prepare('SELECT data_json FROM submissions');
    const submissions = employerStmt.all() as { data_json: string }[];

    const byEmployer: { [key: string]: number } = {};
    submissions.forEach(sub => {
      try {
        const data = JSON.parse(sub.data_json);
        const employer = data.employer;
        if (employer) {
          byEmployer[employer] = (byEmployer[employer] || 0) + 1;
        }
      } catch (error) {
        // Skip invalid JSON
      }
    });

    const stats = {
      total,
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      byType,
      byStatus,
      byEmployer,
      trends: {
        prevWeek: prevWeekCount,
        prevMonth: prevMonthCount,
        prevYear: prevYearCount
      }
    };

    // Attach feedback stats if feedback table exists
    try {
      const fbStmt = db.prepare("SELECT COUNT(*) as count, AVG(rating) as avg FROM feedback");
      const fbRow = fbStmt.get() as any;
      const fbDistRows = db.prepare('SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating').all() as any[];
      const distribution: Record<string, number> = {};
      for (let i = 0; i <= 5; i++) distribution[i] = 0;
      fbDistRows.forEach(r => { distribution[String(r.rating)] = r.count; });
      (stats as any).feedback = {
        total: fbRow?.count || 0,
        avg: fbRow?.avg ? Number(fbRow.avg) : 0,
        distribution
      };
    } catch (err) {
      // ignore if feedback table missing
      (stats as any).feedback = { total: 0, avg: 0, distribution: { '0':0,'1':0,'2':0,'3':0,'4':0,'5':0 } };
    }

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching submission stats:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Statistiken' }, { status: 500 });
  }
}

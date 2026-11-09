import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/auth';
import { getDb } from '@/app/lib/db';
import { getConfiguredTimeZone } from '@/app/lib/server-timezone';
import { addCalendarDays, isCalendarDate, startOfDayInTimeZone } from '@/app/lib/timezone';

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const employer = searchParams.get('employer');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100') || 100, 1), 500);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0);
    const sort_field = searchParams.get('sort_field') || 'created_at';
    const sort_direction = searchParams.get('sort_direction') || 'desc';

    if ((start_date && !isCalendarDate(start_date)) || (end_date && !isCalendarDate(end_date)) ||
        (start_date && end_date && start_date > end_date)) {
      return NextResponse.json({ error: 'Ungültiger Datumsbereich' }, { status: 400 });
    }
    const timeZone = getConfiguredTimeZone();
    const startUtc = start_date ? startOfDayInTimeZone(start_date, timeZone) : null;
    const endUtc = end_date ? startOfDayInTimeZone(addCalendarDays(end_date, 1), timeZone) : null;
    const db = getDb();

    let query = 'SELECT * FROM submissions WHERE 1=1';
    const params: any[] = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (employee_name LIKE ? OR employee_email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (start_date) {
      query += ' AND julianday(created_at) >= julianday(?)';
      params.push(startUtc);
    }

    if (end_date) {
      query += ' AND julianday(created_at) < julianday(?)';
      params.push(endUtc);
    }

    if (employer) {
      query += ' AND data_json LIKE ?';
      params.push(`%"employer":"${employer}"%`);
    }

    // Validate sort_field
    const allowedSortFields = ['created_at', 'type', 'status', 'employee_name'];
    const validSortField = allowedSortFields.includes(sort_field) ? sort_field : 'created_at';
    const validSortDirection = sort_direction === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${validSortField} ${validSortDirection} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const submissions = stmt.all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM submissions WHERE 1=1';
    const countParams: any[] = [];

    if (type) {
      countQuery += ' AND type = ?';
      countParams.push(type);
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (search) {
      countQuery += ' AND (employee_name LIKE ? OR employee_email LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (start_date) {
      countQuery += ' AND julianday(created_at) >= julianday(?)';
      countParams.push(startUtc);
    }

    if (end_date) {
      countQuery += ' AND julianday(created_at) < julianday(?)';
      countParams.push(endUtc);
    }

    if (employer) {
      countQuery += ' AND data_json LIKE ?';
      countParams.push(`%"employer":"${employer}"%`);
    }

    const countStmt = db.prepare(countQuery);
    const { count } = countStmt.get(...countParams) as { count: number };

    return NextResponse.json({
      success: true,
      data: submissions,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Meldungen' }, { status: 500 });
  }
}

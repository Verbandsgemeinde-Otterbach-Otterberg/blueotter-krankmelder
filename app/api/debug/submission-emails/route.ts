import { NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        id,
        submission_id,
        action,
        details,
        created_at as timestamp
      FROM audit_log
      WHERE action IN ('email_sent_sb', 'email_sent_employee', 'email_failed_sb', 'email_failed_employee', 'password_request_sent', 'password_request_failed', 'password_request_error')
      ORDER BY created_at DESC
      LIMIT 100
    `).all() as any[];

    const formatted = rows.map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching submission email logs:', error);
    return NextResponse.json({ success: false, error: 'Fehler beim Laden' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { sendTestEmail } from '@/app/lib/email';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(
      "SELECT id, submission_id, action, details, created_at FROM audit_log WHERE action LIKE 'email_%' OR action LIKE 'email%' ORDER BY created_at DESC LIMIT 50"
    ).all();

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching email history:', error);
    return NextResponse.json({ success: false, error: 'Fehler beim Laden der E-Mail-Historie' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = body.to;
    const subject = body.subject || '[Test] Test-E-Mail aus Krankmeldungssystem';
    const html = body.html || '<p>Dies ist eine Test-E-Mail.</p>';

    if (!to) return NextResponse.json({ success: false, error: 'Empfänger fehlt' }, { status: 400 });

    const ok = await sendTestEmail(to, subject, html);
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ success: false, error: 'Fehler beim Senden der Test-E-Mail' }, { status: 500 });
  }
}

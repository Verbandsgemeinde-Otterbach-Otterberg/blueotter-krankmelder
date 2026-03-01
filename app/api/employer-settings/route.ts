import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployerSettings, setEmployerSettings, getAllEmployers } from '@/app/lib/db';

export async function GET() {
  try {
    // Return a merged list of all employers and any existing settings
    const employers = getAllEmployers();
    const settings = getAllEmployerSettings();

    const settingsMap: Record<string, any> = {};
    settings.forEach(s => {
      settingsMap[s.employer] = s;
    });

    const merged = employers.map(e => ({
      employer: e.name,
      sb_email: settingsMap[e.name]?.sb_email || null,
      sb_emails: settingsMap[e.name]?.sb_emails || [],
      subject_prefix: settingsMap[e.name]?.subject_prefix || null,
      send_global_copy: settingsMap[e.name]?.send_global_copy || false,
      active: !!e.active,
      color: e.color || '#3B82F6'
    }));

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    console.error('Error fetching employer settings:', error);
    return NextResponse.json({ success: false, error: 'Fehler beim Laden der Einstellungen' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { employer, sb_emails, sb_email, subject_prefix, send_global_copy } = await request.json();
    if (!employer) {
      return NextResponse.json({ success: false, error: 'Arbeitgeber erforderlich' }, { status: 400 });
    }
    // Prefer sb_emails (array). Accept comma-separated sb_email for backward compatibility.
    const emails = Array.isArray(sb_emails) ? sb_emails : (sb_email ? sb_email.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    setEmployerSettings(employer, emails, subject_prefix || '', send_global_copy);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving employer setting:', error);
    return NextResponse.json({ success: false, error: 'Fehler beim Speichern' }, { status: 500 });
  }
}
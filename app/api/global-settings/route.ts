import { NextRequest, NextResponse } from 'next/server';
import { getAllGlobalSettings, setMultipleGlobalSettings } from '@/app/lib/db';

export async function GET() {
  try {
    const allSettings = getAllGlobalSettings();
    
    // Build response with all settings from DB, fallback to ENV
    const settingsList = [
      'NEXT_PUBLIC_APP_NAME',
      'NEXT_PUBLIC_APP_SLOGAN',
      'TIMEZONE',
      'SB_EMAIL',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_FROM_EMAIL',
      'EMAIL_SUBJECT_PREFIX',
      'ADMIN_PASSWORD',
      // Security / Auth
      'PUBLIC_PASSWORD',
      'DASHBOARD_USER',
      'DASHBOARD_PASSWORD',
      // Public access token for bypassing password gate
      'PUBLIC_ACCESS_TOKEN',
      // File / retention
      'MAX_FILE_SIZE',
      'UPLOAD_DIR',
      'ALLOWED_FILE_TYPES',
      'FILE_RETENTION_DAYS'
    ];
    const defaultValues: Record<string, string> = {
      TIMEZONE: 'Europe/Berlin',
    };
    
    const data: Record<string, { value: string; source: 'DB' | 'ENV' }> = {};
    
    for (const key of settingsList) {
      const dbValue = allSettings[key];
      const envValue = process.env[key];
      const value = dbValue || envValue || defaultValues[key] || '';
      const source = dbValue ? 'DB' : envValue ? 'ENV' : 'ENV';
      data[key] = { value, source: source as 'DB' | 'ENV' };
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching global settings:', error);
    return NextResponse.json({ success: false, error: 'Fehler beim Laden der Einstellungen' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();
    setMultipleGlobalSettings(settings);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving global settings:', error);
    return NextResponse.json({ success: false, error: 'Fehler beim Speichern' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/auth';
import { getAllGlobalSettings, setMultipleGlobalSettings } from '@/app/lib/db';

// Secrets are never sent back to the browser; an empty value on save keeps the stored one.
const SECRET_KEYS = new Set(['SMTP_PASS', 'ADMIN_PASSWORD', 'PUBLIC_PASSWORD', 'DASHBOARD_PASSWORD', 'PUBLIC_ACCESS_TOKEN']);

const ALLOWED_KEYS = [
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

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const allSettings = getAllGlobalSettings();
    
    // Build response with all settings from DB, fallback to ENV
    const settingsList = ALLOWED_KEYS;
    const defaultValues: Record<string, string> = {
      TIMEZONE: 'Europe/Berlin',
    };
    
    const data: Record<string, { value: string; source: 'DB' | 'ENV' }> = {};
    
    for (const key of settingsList) {
      const dbValue = allSettings[key];
      const envValue = process.env[key];
      const value = dbValue || envValue || defaultValues[key] || '';
      const source = dbValue ? 'DB' : envValue ? 'ENV' : 'ENV';
      data[key] = { value: SECRET_KEYS.has(key) ? '' : value, source: source as 'DB' | 'ENV' };
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
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Ungültige Eingabe' }, { status: 400 });
    }
    const settings: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.includes(key) || typeof value !== 'string') continue;
      if (SECRET_KEYS.has(key) && value === '') continue;
      settings[key] = value;
    }
    setMultipleGlobalSettings(settings);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving global settings:', error);
    return NextResponse.json({ success: false, error: 'Fehler beim Speichern' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getGlobalSetting } from '@/app/lib/db';

/** Non-sensitive branding values for public pages. */
export async function GET() {
  const appName = getGlobalSetting('NEXT_PUBLIC_APP_NAME') || process.env.NEXT_PUBLIC_APP_NAME || '';
  const appSlogan = getGlobalSetting('NEXT_PUBLIC_APP_SLOGAN') || process.env.NEXT_PUBLIC_APP_SLOGAN || '';
  return NextResponse.json({ success: true, data: { appName, appSlogan } });
}

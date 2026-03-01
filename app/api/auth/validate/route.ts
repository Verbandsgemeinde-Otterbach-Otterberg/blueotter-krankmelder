import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSetting } from '@/app/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    // Load from DB first, fallback to .env
    const dashboardUser = getGlobalSetting('DASHBOARD_USER') || process.env.DASHBOARD_USER || '';
    const dashboardPassword = getGlobalSetting('DASHBOARD_PASSWORD') || process.env.DASHBOARD_PASSWORD || '';
    const publicPassword = getGlobalSetting('PUBLIC_PASSWORD') || process.env.PUBLIC_PASSWORD || '';

    if (typeof username !== 'undefined' && username !== null && username !== '') {
      // Admin login: require username + password
      if (username === dashboardUser && password === dashboardPassword) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: 'Invalid admin credentials' }, { status: 401 });
    }

    // Public login: only password required
    if (password === publicPassword) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  } catch (err) {
    console.error('Auth validate error', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

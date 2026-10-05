import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSetting } from '@/app/lib/db';
import {
  SESSION_COOKIE,
  REMEMBER_TTL_SECONDS,
  clientIp,
  createSessionToken,
  getAdminCredentials,
  rateLimit,
  safeCompare,
  sessionCookieOptions,
} from '@/app/lib/auth';

const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`login:${clientIp(req)}`, 10, WINDOW_MS) || !rateLimit('login:global', 100, WINDOW_MS)) {
      return NextResponse.json(
        { success: false, error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { username, password, remember } = body || {};

    if (typeof username !== 'undefined' && username !== null && username !== '') {
      // Admin login: require username + password, issue a server-side session
      const admin = getAdminCredentials();
      const userOk = safeCompare(username, admin.user);
      const passOk = safeCompare(password, admin.password);
      if (admin.user && admin.password && userOk && passOk) {
        const ttl = remember ? REMEMBER_TTL_SECONDS : undefined;
        const res = NextResponse.json({ success: true });
        res.cookies.set(SESSION_COOKIE, createSessionToken(String(username), ttl), sessionCookieOptions(ttl));
        return res;
      }
      return NextResponse.json({ success: false, error: 'Invalid admin credentials' }, { status: 401 });
    }

    // Public login: only password required
    const publicPassword = getGlobalSetting('PUBLIC_PASSWORD') || process.env.PUBLIC_PASSWORD || '';
    if (publicPassword && safeCompare(password, publicPassword)) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  } catch (err) {
    console.error('Auth validate error', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

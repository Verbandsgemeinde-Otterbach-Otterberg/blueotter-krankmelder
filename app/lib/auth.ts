import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getGlobalSetting } from '@/app/lib/db';

export const SESSION_COOKIE = 'sb-session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
export const REMEMBER_TTL_SECONDS = 7 * 24 * 60 * 60;
const DOWNLOAD_TTL_SECONDS = 60 * 60;

let cachedSecret: string | null = null;

/**
 * Signing secret: SESSION_SECRET from the environment, otherwise a random
 * secret generated once and persisted in the database.
 */
function getSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  if (cachedSecret) return cachedSecret;
  const db = getDb();
  const row = db.prepare("SELECT value FROM global_settings WHERE key = '_SESSION_SECRET'").get() as
    | { value: string }
    | undefined;
  if (row?.value) {
    cachedSecret = row.value;
    return row.value;
  }
  const generated = crypto.randomBytes(48).toString('hex');
  db.prepare(
    "INSERT OR IGNORE INTO global_settings (key, value, updated_at) VALUES ('_SESSION_SECRET', ?, CURRENT_TIMESTAMP)"
  ).run(generated);
  const stored = db.prepare("SELECT value FROM global_settings WHERE key = '_SESSION_SECRET'").get() as { value: string };
  cachedSecret = stored.value;
  return cachedSecret;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function safeCompare(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  return safeEqual(a, b);
}

export function getAdminCredentials() {
  return {
    user: getGlobalSetting('DASHBOARD_USER') || process.env.DASHBOARD_USER || '',
    password: getGlobalSetting('DASHBOARD_PASSWORD') || process.env.DASHBOARD_PASSWORD || '',
  };
}

/** Binds sessions to the current admin password, so changing it revokes all sessions. */
function credentialVersion(): string {
  const { user, password } = getAdminCredentials();
  return crypto.createHash('sha256').update(`${user}\n${password}`).digest('hex').slice(0, 16);
}

export function createSessionToken(username: string, ttlSeconds = SESSION_TTL_SECONDS): string {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Math.floor(Date.now() / 1000) + ttlSeconds, v: credentialVersion() })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): { username: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.exp !== 'number' || data.exp < Date.now() / 1000) return null;
    if (typeof data.v !== 'string' || !safeEqual(data.v, credentialVersion())) return null;
    return { username: String(data.u) };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  };
}

export function getSession(request: NextRequest): { username: string } | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Guard for admin-only routes. Returns an error response when the request is
 * not an authenticated admin session, or null when access is granted.
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  if (!getSession(request)) {
    return NextResponse.json({ success: false, error: 'Nicht autorisiert' }, { status: 401 });
  }
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && !sameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Ungültige Herkunft' }, { status: 403 });
  }
  return null;
}

/** Short-lived token that lets the submitter download the PDF of their own submission. */
export function createDownloadToken(submissionId: number | bigint): string {
  const exp = Math.floor(Date.now() / 1000) + DOWNLOAD_TTL_SECONDS;
  return `${exp}.${sign(`pdf:${submissionId}:${exp}`)}`;
}

export function verifyDownloadToken(submissionId: number, token: string | null): boolean {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sign(`pdf:${submissionId}:${exp}`), sig);
}

// --- simple in-memory rate limiter (per process) ---
const attempts = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

export function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}

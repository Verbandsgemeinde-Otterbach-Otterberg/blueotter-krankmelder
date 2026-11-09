import crypto from 'node:crypto';

export const HASHED_SETTING_KEYS = new Set([
  'DASHBOARD_PASSWORD', 'PUBLIC_PASSWORD', 'PUBLIC_ACCESS_TOKEN', 'ADMIN_PASSWORD',
]);

export function isSecretHash(value: string): boolean {
  return /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(value);
}

export function hashSecret(value: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(value, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifySecret(input: unknown, stored: string): boolean {
  if (typeof input !== 'string' || input.length > 4096 || !isSecretHash(stored)) return false;
  const [, salt, hash] = stored.split('$');
  const actual = crypto.scryptSync(input, salt, 64);
  return crypto.timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}

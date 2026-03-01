import { getGlobalSetting } from '@/app/lib/db';
import { DEFAULT_TIMEZONE, normalizeTimeZone } from '@/app/lib/timezone';

export function getConfiguredTimeZone(): string {
  const dbValue = getGlobalSetting('TIMEZONE');
  const envValue = process.env.TIMEZONE || process.env.TZ;
  return normalizeTimeZone(dbValue || envValue || DEFAULT_TIMEZONE);
}

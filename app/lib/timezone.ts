export const DEFAULT_TIMEZONE = 'Europe/Berlin';

const SQLITE_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toDate(input: string | number | Date): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'string') {
    const value = input.trim();
    if (SQLITE_TIMESTAMP_RE.test(value)) {
      return new Date(`${value.replace(' ', 'T')}Z`);
    }
  }
  return new Date(input);
}

export function isCalendarDate(value: string): boolean {
  return DATE_ONLY_RE.test(value) && !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
}

export function addCalendarDays(value: string, days: number): string {
  if (!isCalendarDate(value)) throw new Error('Ungültiges Datum');
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Find the first instant belonging to a calendar day in the selected zone.
// Searching UTC seconds handles 23/25-hour DST days without fixed offsets.
export function startOfDayInTimeZone(day: string, timeZone: string): string {
  if (!isCalendarDate(day)) throw new Error('Ungültiges Datum');
  const midnight = Date.parse(`${day}T00:00:00Z`) / 1000;
  let low = midnight - 36 * 3600;
  let high = midnight + 36 * 3600;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (toIsoDateInTimeZone(mid * 1000, timeZone) < day) low = mid + 1;
    else high = mid;
  }
  return new Date(low * 1000).toISOString();
}

export function simpleSubmissionDay(now: Date, timeZone: string): string | null {
  const day = toIsoDateInTimeZone(now, timeZone);
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday >= 1 && weekday <= 5 ? day : null;
}

export function normalizeTimeZone(value?: string | null): string {
  const candidate = (value || '').trim();
  if (!candidate) return DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat('de-DE', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function formatDateTimeInTimeZone(
  input: string | number | Date,
  timeZone: string
): string {
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return String(input);
  return date.toLocaleString('de-DE', { timeZone: normalizeTimeZone(timeZone) });
}

export function formatDateInTimeZone(
  input: string | number | Date,
  timeZone: string
): string {
  if (typeof input === 'string') {
    const value = input.trim();
    if (DATE_ONLY_RE.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}.${month}.${year}`;
    }
  }

  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return String(input);
  return date.toLocaleDateString('de-DE', { timeZone: normalizeTimeZone(timeZone) });
}

export function toIsoDateInTimeZone(
  input: string | number | Date,
  timeZone: string
): string {
  if (typeof input === 'string') {
    const value = input.trim();
    if (DATE_ONLY_RE.test(value)) return value;
  }

  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return String(input);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizeTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
}

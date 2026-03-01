export const DEFAULT_TIMEZONE = 'Europe/Berlin';

const SQLITE_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function toDate(input: string | number | Date): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'string') {
    const value = input.trim();
    if (SQLITE_TIMESTAMP_RE.test(value)) {
      return new Date(`${value.replace(' ', 'T')}Z`);
    }
  }
  return new Date(input);
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

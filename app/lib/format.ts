import { DEFAULT_TIMEZONE, formatDateInTimeZone } from './timezone';

export function formatDDMMYYYY(input?: string | Date | number | null): string {
  if (input === undefined || input === null || input === '') return '';
  return formatDateInTimeZone(input, DEFAULT_TIMEZONE);
}

export default formatDDMMYYYY;

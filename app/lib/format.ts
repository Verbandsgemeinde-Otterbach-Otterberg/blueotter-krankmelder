export function formatDDMMYYYY(input?: string | Date | number | null): string {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return String(input);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export default formatDDMMYYYY;

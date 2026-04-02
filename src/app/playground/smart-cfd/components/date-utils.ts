/**
 * Parse a date-only string (YYYY-MM-DD) as local midnight, avoiding
 * the UTC-interpretation bug in `new Date("2026-04-01")` which rolls
 * back a day for anyone west of UTC when displayed with toLocaleDateString.
 */
function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** "Apr 2, '26" */
export function formatDate(dateStr: string): string {
  const d = parseDateLocal(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

/** "Apr '26" */
export function formatShortDate(dateStr: string): string {
  const d = parseDateLocal(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

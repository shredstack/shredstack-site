// Timezone-safe helpers. Every displayed clock time and every stored mark is
// an absolute instant — never device-local — so the page reads correctly for
// a spectator anywhere, and math based on it is correct regardless of the
// viewer's own timezone.

export function zonedTimeToInstant(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(utcGuess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const hourPart = get('hour');
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hourPart === 24 ? 0 : hourPart,
    get('minute'),
    get('second')
  );
  const offset = asUTC - utcGuess;
  return new Date(utcGuess - offset);
}

export function getZonedDateParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function formatClock(date: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('hour')}:${get('minute')}:${get('second')}`;
}

export function formatDateLong(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** "9:15", "65:00" — unsigned minutes:seconds, no leading zero on minutes. */
export function formatMinSec(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

/** "+1:05" / "-0:12" — signed minutes:seconds. */
export function formatDelta(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '+';
  const s = Math.round(Math.abs(totalSeconds));
  return `${sign}${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

/** "15:59:15" — value for a native <input type="time" step="1">. */
export function formatTimeInputValue(date: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${hour}:${get('minute')}:${get('second')}`;
}

/** Parses a native <input type="time" step="1"> value ("HH:MM" or "HH:MM:SS"). */
export function parseTimeInputValue(
  value: string
): { hour: number; minute: number; second: number } | null {
  if (!value) return null;
  const parts = value.split(':').map(Number);
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  const [hour, minute, second = 0] = parts;
  return { hour, minute, second };
}

/** All dates are local calendar days keyed as YYYY-MM-DD. */

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function dayOfWeek(key: string): number {
  return fromKey(key).getDay();
}

/** The `n` day keys ending at `end` (inclusive), oldest first. */
export function lastNDays(end: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

export function startOfWeek(key: string, weekStart: 0 | 1): string {
  const dow = dayOfWeek(key);
  const delta = (dow - weekStart + 7) % 7;
  return addDays(key, -delta);
}

export function weekDays(key: string, weekStart: 0 | 1): string[] {
  const start = startOfWeek(key, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export function formatLong(key: string): string {
  const d = fromKey(key);
  return `${DAYS[d.getDay()].toUpperCase()}, ${MONTHS[d.getMonth()].toUpperCase()} ${d.getDate()}`;
}

export function dayInitial(key: string): string {
  return DAYS[dayOfWeek(key)][0];
}

/** How far through the day we are, 0..1. Used for the pace hint on Today. */
export function dayProgress(now = new Date()): number {
  const mins = now.getHours() * 60 + now.getMinutes();
  return Math.min(1, Math.max(0, mins / (24 * 60)));
}

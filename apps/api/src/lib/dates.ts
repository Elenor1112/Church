/** ISO 8601 week number (1–53) for a date. */
export function isoWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

/** Local YYYY-MM-DD for a date. */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns true when `date` falls on a Friday (local time). */
export function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

/**
 * Returns true when `date` is between 10:30 AM and 12:30 PM inclusive (local
 * time). These are the fixed scanning hours for every Friday meeting.
 */
export function isWithinScanWindow(date: Date): boolean {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  return totalMinutes >= 10 * 60 + 30 && totalMinutes <= 12 * 60 + 30;
}

/**
 * Date handling here is deliberately LOCAL-time throughout.
 *
 * `attendance.attendance_date` is written with `isoDate()` (local), so anything
 * that reads those keys back — absence windows, Friday walks — must use the same
 * basis. Mixing a UTC-derived key with a locally-written one puts check-ins made
 * near midnight on the wrong day, which previously made members who *did* attend
 * count as absent. Configure the process TZ (e.g. `TZ=Africa/Cairo`) so "local"
 * means the church's timezone rather than the host's.
 */

/** ISO 8601 week number (1–53) for a date, computed on the local calendar day. */
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

/**
 * Local "YYYY-MM-DD" keys for every Friday from `since` up to and including the
 * most recent one, newest first.
 *
 * Local — not UTC — so the keys line up exactly with what `isoDate()` wrote into
 * `attendance_date`. `since` is treated as a calendar day: a member who joined
 * ON a Friday is not counted absent for that same Friday.
 */
export function pastFridaysSince(since: Date, now: Date = new Date()): string[] {
  const fridays: string[] = [];
  // Most recent Friday on or before `now`, at local midday to stay clear of DST
  // transitions (a midnight anchor can shift a day when the clock jumps).
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() - 5 + 7) % 7));

  const sinceDay = new Date(since.getFullYear(), since.getMonth(), since.getDate(), 12).getTime();
  while (cursor.getTime() >= sinceDay) {
    fridays.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() - 7);
  }
  return fridays;
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

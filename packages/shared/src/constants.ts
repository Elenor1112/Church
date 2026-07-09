/** Shared domain constants for Church QR Attendance System. */

export const ROLES = ["member", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["pending", "approved", "rejected"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ADMIN_PERMISSIONS = [
  "can_scan",
  "can_scan_admins",
  "can_view_logs",
  "can_send_messages",
  "can_generate_reports",
] as const;
export type AdminPermissionKey = (typeof ADMIN_PERMISSIONS)[number];

/** The five fixed Friday categories. `slug` is stable; labels are bilingual. */
export const FRIDAY_CATEGORIES = [
  { slug: "contemporary_issues", labelAr: "قضايا معاصرة", labelEn: "Contemporary Issues" },
  { slug: "bible", labelAr: "كتاب مقدس", labelEn: "Holy Bible" },
  { slug: "spirituality", labelAr: "روحانيات", labelEn: "Spirituality" },
  { slug: "saints_lives", labelAr: "سير قديسين", labelEn: "Lives of Saints" },
  { slug: "free", labelAr: "حر", labelEn: "Free" },
] as const;

export type CategorySlug = (typeof FRIDAY_CATEGORIES)[number]["slug"];
export const CATEGORY_SLUGS = FRIDAY_CATEGORIES.map((c) => c.slug) as [
  CategorySlug,
  ...CategorySlug[],
];

/**
 * The "Free" (5th Friday) category does NOT count toward a set. Attendance can
 * still be recorded under it, but it never advances or completes a set.
 */
export const NON_SET_CATEGORY_SLUGS: CategorySlug[] = ["free"];

/** Categories that actually make up a set (everything except "Free"). */
export const SET_CATEGORY_SLUGS = CATEGORY_SLUGS.filter(
  (s) => !NON_SET_CATEGORY_SLUGS.includes(s),
);

/** Number of distinct categories required to complete one "set" (excludes "Free"). */
export const SET_SIZE = SET_CATEGORY_SLUGS.length;

/**
 * Announcement categories. `slug` is stable and used in the DB enum; labels are
 * bilingual. Admins pick one when sending an announcement; the member home feed
 * groups announcements into a section per category.
 */
export const ANNOUNCEMENT_CATEGORIES = [
  { slug: "trips", labelAr: "الرحلات", labelEn: "Trips" },
  { slug: "occasions", labelAr: "المناسبات", labelEn: "Occasions" },
  { slug: "custom", labelAr: "إعلانات", labelEn: "Announcements" },
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number]["slug"];
export const ANNOUNCEMENT_CATEGORY_SLUGS = ANNOUNCEMENT_CATEGORIES.map((c) => c.slug) as [
  AnnouncementCategory,
  ...AnnouncementCategory[],
];

/**
 * Residential areas (settlements) a member selects at registration. `slug` is
 * stable and stored in the DB enum; labels are bilingual and shown together in
 * the Area dropdown.
 */
export const AREAS = [
  { slug: "first_settlement", labelAr: "التجمع الأول", labelEn: "First Settlement" },
  { slug: "third_settlement", labelAr: "التجمع الثالث", labelEn: "Third Settlement" },
  { slug: "fifth_settlement", labelAr: "التجمع الخامس", labelEn: "Fifth Settlement" },
  { slug: "sixth_settlement", labelAr: "التجمع السادس", labelEn: "Sixth Settlement" },
] as const;

export type Area = (typeof AREAS)[number]["slug"];
export const AREA_SLUGS = AREAS.map((a) => a.slug) as [Area, ...Area[]];

// ---------------------------------------------------------------------------
// Meetings — scheduled by super admins; the scanner opens during their windows.
// ---------------------------------------------------------------------------

/** Day of week as JS getDay() index (0 = Sunday … 6 = Saturday). */
export const DAYS_OF_WEEK = [
  { value: 0, labelEn: "Sunday", labelAr: "الأحد" },
  { value: 1, labelEn: "Monday", labelAr: "الاثنين" },
  { value: 2, labelEn: "Tuesday", labelAr: "الثلاثاء" },
  { value: 3, labelEn: "Wednesday", labelAr: "الأربعاء" },
  { value: 4, labelEn: "Thursday", labelAr: "الخميس" },
  { value: 5, labelEn: "Friday", labelAr: "الجمعة" },
  { value: 6, labelEn: "Saturday", labelAr: "السبت" },
] as const;

export function dayLabel(value: number, lang: "en" | "ar" = "en"): string {
  const d = DAYS_OF_WEEK.find((x) => x.value === value);
  if (!d) return "";
  return lang === "ar" ? d.labelAr : d.labelEn;
}

/** "YYYY-MM-DD" date-only validation. */
export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Weekday (getDay index, 0 = Sunday) for a "YYYY-MM-DD" date, computed in a
 * timezone-safe way (parsed as local midday, not UTC). Returns null if malformed.
 */
export function dayOfWeekForDate(date: string): number | null {
  if (!DATE_ONLY_REGEX.test(date.trim())) return null;
  const [y, m, d] = date.trim().split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!, 12, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.getDay();
}

/**
 * Human label for a meeting's day: the specific date when set (e.g.
 * "Fri, Jul 10"), otherwise the recurring weekday name. Localized to en/ar.
 */
export function meetingDayLabel(
  meetingDate: string | null,
  dayOfWeek: number,
  lang: "en" | "ar" = "en",
): string {
  if (meetingDate && DATE_ONLY_REGEX.test(meetingDate)) {
    const [y, m, d] = meetingDate.split("-").map(Number);
    const dt = new Date(y!, m! - 1, d!, 12);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString(lang === "ar" ? "ar" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  }
  return dayLabel(dayOfWeek, lang);
}

/** Default Friday scan window — always active for backward compatibility. */
export const DEFAULT_MEETING = {
  name: "Holy Family Meeting",
  dayOfWeek: 5, // Friday
  startTime: "10:30",
  endTime: "12:30", // 10:30 AM – 12:30 PM
} as const;

export interface MeetingWindow {
  /**
   * Specific calendar date "YYYY-MM-DD". When set, the window is active ONLY on
   * this date (one-off meeting). When null/undefined, it falls back to the
   * recurring weekly `dayOfWeek` (legacy meetings + the default Friday window).
   */
  meetingDate?: string | null;
  dayOfWeek: number;
  /** "HH:MM" 24-hour, local time. */
  startTime: string;
  /** "HH:MM" 24-hour, local time. */
  endTime: string;
}

/** Local "YYYY-MM-DD" key for a Date (timezone-safe, not UTC). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse "HH:MM" into minutes-from-midnight; returns null if malformed. */
export function parseTimeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** True if `date`'s day + time falls inside the meeting's window (local time). */
export function isWithinMeetingWindow(meeting: MeetingWindow, date: Date): boolean {
  // Dated meetings open only on their exact date; undated ones recur weekly.
  if (meeting.meetingDate) {
    if (toDateKey(date) !== meeting.meetingDate) return false;
  } else if (date.getDay() !== meeting.dayOfWeek) {
    return false;
  }
  const start = parseTimeToMinutes(meeting.startTime);
  const end = parseTimeToMinutes(meeting.endTime);
  if (start == null || end == null) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return now >= start && now <= end;
}

/**
 * True if any meeting window (custom meetings + the always-on default Friday
 * window) is active at `date`. This is the single source of truth for whether
 * the scanner is open, shared by the API and the mobile app.
 */
export function isAnyMeetingActive(meetings: MeetingWindow[], date: Date): boolean {
  const windows: MeetingWindow[] = [DEFAULT_MEETING, ...meetings];
  return windows.some((m) => isWithinMeetingWindow(m, date));
}

/** Format "HH:MM" 24h as a 12-hour clock label, e.g. "10:30 AM". */
export function formatTime12h(time: string): string {
  const mins = parseTimeToMinutes(time);
  if (mins == null) return time;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Absence thresholds (counted as missed Friday meetings, derived from real
 * attendance records). A member appears in the "Absences" section once they
 * reach ABSENCE_ALERT_THRESHOLD missed Fridays, and becomes "Paused" at
 * PAUSE_THRESHOLD missed Fridays.
 */
export const ABSENCE_ALERT_THRESHOLD = 2;
export const PAUSE_THRESHOLD = 6;

/**
 * The Birthdays section shows members whose birthday fell within this many
 * calendar days up to and including today (7 = today + the 6 preceding days).
 */
export const BIRTHDAY_WINDOW_DAYS = 7;

/** Audiences an admin can target when sending an alert. */
export const ALERT_AUDIENCES = ["all", "absent_2", "absent_6"] as const;
export type AlertAudience = (typeof ALERT_AUDIENCES)[number];

export const NOTIFICATION_TYPES = [
  "approval",
  "rejection",
  "set_completed",
  "announcement",
  "alert",
  "attendance",
  "generic",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

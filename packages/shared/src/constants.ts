/** Shared domain constants for Church QR Attendance System. */

export const ROLES = ["member", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["pending", "approved", "rejected"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ADMIN_PERMISSIONS = [
  "can_scan",
  "can_view_logs",
  "can_send_messages",
  "can_generate_reports",
] as const;
export type AdminPermissionKey = (typeof ADMIN_PERMISSIONS)[number];

/** The four fixed Friday categories. `slug` is stable; labels are bilingual. */
export const FRIDAY_CATEGORIES = [
  { slug: "contemporary_issues", labelAr: "قضايا معاصرة", labelEn: "Contemporary Issues" },
  { slug: "bible", labelAr: "كتاب مقدس", labelEn: "Holy Bible" },
  { slug: "spirituality", labelAr: "روحانيات", labelEn: "Spirituality" },
  { slug: "saints_lives", labelAr: "سير قديسين", labelEn: "Lives of Saints" },
] as const;

export type CategorySlug = (typeof FRIDAY_CATEGORIES)[number]["slug"];
export const CATEGORY_SLUGS = FRIDAY_CATEGORIES.map((c) => c.slug) as [
  CategorySlug,
  ...CategorySlug[],
];

/** Number of distinct categories required to complete one "set". */
export const SET_SIZE = FRIDAY_CATEGORIES.length;

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

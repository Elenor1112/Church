import { z } from "zod";
import {
  ROLES,
  USER_STATUSES,
  ADMIN_PERMISSIONS,
  CATEGORY_SLUGS,
  NOTIFICATION_TYPES,
  ALERT_AUDIENCES,
  ANNOUNCEMENT_CATEGORY_SLUGS,
  AREA_SLUGS,
  DATE_ONLY_REGEX,
} from "./constants";

/** E.164-ish / local phone: digits, optional leading +, 7–15 chars. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

/** Birthday as YYYY-MM-DD. */
export const birthdaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use format YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

export const emailSchema = z.string().trim().email("Enter a valid email");

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(80),
  lastName: z.string().trim().min(1, "Required").max(80),
  phone: phoneSchema,
  area: z.enum(AREA_SLUGS, { required_error: "Required", invalid_type_error: "Required" }),
  addressDetails: z.string().trim().min(1, "Required").max(200),
  birthday: birthdaySchema,
  spousePhone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  email: emailSchema.optional().or(z.literal("").transform(() => undefined)),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const adminPermissionsSchema = z.object({
  can_scan: z.boolean(),
  can_scan_admins: z.boolean(),
  can_view_logs: z.boolean(),
  can_send_messages: z.boolean(),
  can_generate_reports: z.boolean(),
});
export type AdminPermissionsInput = z.infer<typeof adminPermissionsSchema>;

export const createUserSchema = registerSchema.extend({
  role: z.enum(ROLES).default("member"),
  status: z.enum(USER_STATUSES).default("approved"),
  permissions: adminPermissionsSchema.optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: phoneSchema.optional(),
  area: z.enum(AREA_SLUGS).optional(),
  addressDetails: z.string().trim().min(1).max(200).optional(),
  birthday: birthdaySchema.optional(),
  spousePhone: phoneSchema.nullable().optional(),
  email: emailSchema.nullable().optional(),
  profileImage: z.string().url().nullable().optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  password: passwordSchema.optional(),
  permissions: adminPermissionsSchema.optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateStatusSchema = z.object({
  status: z.enum(USER_STATUSES),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const scanSchema = z.object({
  qrToken: z.string().min(8, "Invalid QR token"),
  categorySlug: z.enum(CATEGORY_SLUGS),
});
export type ScanInput = z.infer<typeof scanSchema>;

/** Admin-attendance scan: no Friday category (admins don't accrue set progress). */
export const adminScanSchema = z.object({
  qrToken: z.string().min(8, "Invalid QR token"),
});
export type AdminScanInput = z.infer<typeof adminScanSchema>;

export const claimSetRewardSchema = z.object({
  setId: z.string().uuid(),
  /** Member QR token to verify the reward goes to the right member. */
  qrToken: z.string().min(8, "Invalid QR token").optional(),
});
export type ClaimSetRewardInput = z.infer<typeof claimSetRewardSchema>;

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4000),
  category: z.enum(ANNOUNCEMENT_CATEGORY_SLUGS).default("custom"),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const createAlertSchema = z.object({
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(4000),
  /** Recipient audience; resolved to concrete members server-side. */
  audience: z.enum(ALERT_AUDIENCES).default("all"),
});
export type CreateAlertInput = z.infer<typeof createAlertSchema>;

export const createAbsenceSchema = z.object({
  memberId: z.string().uuid(),
  date: birthdaySchema,
  reason: z.string().trim().max(500).optional(),
});
export type CreateAbsenceInput = z.infer<typeof createAbsenceSchema>;

export const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1),
});
export type MarkReadInput = z.infer<typeof markReadSchema>;

export const pushTokenSchema = z.object({
  token: z.string().min(1),
});

export const ADMIN_PERMISSION_KEYS = ADMIN_PERMISSIONS;
export const NOTIFICATION_TYPE_VALUES = NOTIFICATION_TYPES;

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------
export const createPollSchema = z.object({
  question: z.string().trim().min(1, "Required").max(500),
  options: z
    .array(z.string().trim().min(1, "Option cannot be empty").max(300))
    .min(2, "At least 2 options required")
    .max(10, "Maximum 10 options"),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});
export type CreatePollInput = z.infer<typeof createPollSchema>;

export const pollVoteSchema = z.object({
  optionId: z.string().uuid(),
});
export type PollVoteInput = z.infer<typeof pollVoteSchema>;

export const toggleActiveSchema = z.object({
  isActive: z.boolean(),
});
export type ToggleActiveInput = z.infer<typeof toggleActiveSchema>;

// ---------------------------------------------------------------------------
// Trivia
// ---------------------------------------------------------------------------
export const triviaQuestionSchema = z
  .object({
    question: z.string().trim().min(1, "Required").max(500),
    options: z
      .array(z.string().trim().min(1, "Option cannot be empty").max(300))
      .min(2, "At least 2 options required")
      .max(6, "Maximum 6 options"),
    correctIndex: z.number().int().min(0),
    points: z.number().int().min(1).max(1000).default(10),
  })
  .refine((q) => q.correctIndex < q.options.length, {
    message: "correctIndex out of range",
    path: ["correctIndex"],
  });
export type TriviaQuestionInput = z.infer<typeof triviaQuestionSchema>;

export const createTriviaSchema = z.object({
  title: z.string().trim().min(1, "Required").max(200),
  questions: z.array(triviaQuestionSchema).min(1, "At least 1 question required").max(50),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});
export type CreateTriviaInput = z.infer<typeof createTriviaSchema>;

export const triviaAnswerSchema = z.object({
  chosenIndex: z.number().int().min(0),
});
export type TriviaAnswerInput = z.infer<typeof triviaAnswerSchema>;

// ---------------------------------------------------------------------------
// Meetings (super admin)
// ---------------------------------------------------------------------------
const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;
const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h! * 60 + m!;
};

export const createMeetingSchema = z
  .object({
    name: z.string().trim().min(1, "Required").max(120),
    // Specific calendar date "YYYY-MM-DD"; the weekday is derived server-side.
    meetingDate: z.string().regex(DATE_ONLY_REGEX, "Pick a date"),
    // "HH:MM" 24-hour.
    startTime: z.string().regex(HHMM, "Use HH:MM (24-hour)"),
    endTime: z.string().regex(HHMM, "Use HH:MM (24-hour)"),
  })
  .refine((v) => toMinutes(v.endTime) > toMinutes(v.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  });
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

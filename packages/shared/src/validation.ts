import { z } from "zod";
import {
  ROLES,
  USER_STATUSES,
  ADMIN_PERMISSIONS,
  CATEGORY_SLUGS,
  NOTIFICATION_TYPES,
  ALERT_AUDIENCES,
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

export const claimSetRewardSchema = z.object({
  setId: z.string().uuid(),
});
export type ClaimSetRewardInput = z.infer<typeof claimSetRewardSchema>;

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4000),
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

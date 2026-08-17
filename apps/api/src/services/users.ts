import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index";
import { users, qrCodes, adminPermissions, notifications } from "../db/schema";
import { hashPassword, newQrToken } from "../lib/crypto";
import type { Role, UserStatus, AdminPermissionsInput, Area } from "@church/shared";
import { fanOutNotifications } from "./notify";

export class UserError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface CreateUserOpts {
  firstName: string;
  lastName: string;
  phone: string;
  area: Area;
  addressDetails: string;
  birthday: string;
  password: string;
  spousePhone?: string;
  email?: string;
  role?: Role;
  status?: UserStatus;
  permissions?: AdminPermissionsInput;
}

/** Create a user, generate their QR code, and (for admins) set permissions. */
export async function createUser(opts: CreateUserOpts) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, opts.phone))
    .limit(1);
  if (existing.length > 0) {
    throw new UserError(409, "An account with this phone number already exists");
  }

  const passwordHash = await hashPassword(opts.password);
  const role = opts.role ?? "member";
  const status = opts.status ?? "pending";

  const [created] = await db
    .insert(users)
    .values({
      firstName: opts.firstName,
      lastName: opts.lastName,
      phone: opts.phone,
      area: opts.area,
      addressDetails: opts.addressDetails,
      birthday: opts.birthday,
      spousePhone: opts.spousePhone ?? null,
      email: opts.email ?? null,
      passwordHash,
      role,
      status,
    })
    .returning();

  if (!created) throw new UserError(500, "Failed to create user");

  await db.insert(qrCodes).values({ userId: created.id, qrToken: newQrToken() });

  if (role === "admin") {
    const p = opts.permissions;
    await db.insert(adminPermissions).values({
      userId: created.id,
      canScan: p?.can_scan ?? true,
      canScanAdmins: p?.can_scan_admins ?? false,
      canViewLogs: p?.can_view_logs ?? true,
      canSendMessages: p?.can_send_messages ?? false,
      canGenerateReports: p?.can_generate_reports ?? false,
    });
  }

  return created;
}

/** Notify all admins + super admins that a new member needs approval. */
export async function notifyAdminsOfPendingMember(name: string) {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["admin", "super_admin"]));
  await fanOutNotifications(
    admins.map((a) => a.id),
    {
      title: "New Registration",
      message: `${name} registered and is awaiting approval.`,
      type: "approval",
    },
  );
}

/**
 * Retire every session issued before a privilege change, forcing the client to
 * re-authenticate and pick up the new role/status/permissions.
 */
export async function invalidateSessions(userId: string) {
  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function setPermissions(userId: string, p: AdminPermissionsInput) {
  const existing = await db
    .select({ id: adminPermissions.id })
    .from(adminPermissions)
    .where(eq(adminPermissions.userId, userId))
    .limit(1);
  const values = {
    canScan: p.can_scan,
    canScanAdmins: p.can_scan_admins,
    canViewLogs: p.can_view_logs,
    canSendMessages: p.can_send_messages,
    canGenerateReports: p.can_generate_reports,
  };
  if (existing.length > 0) {
    await db.update(adminPermissions).set(values).where(eq(adminPermissions.userId, userId));
  } else {
    await db.insert(adminPermissions).values({ userId, ...values });
  }
  // Permissions are cached client-side at login, so retire existing sessions.
  await invalidateSessions(userId);
}

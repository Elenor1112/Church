import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { users, adminPermissions } from "../db/schema";
import { verifyToken } from "../lib/crypto";
import type { AppEnv } from "../lib/context";
import type { Role, AdminPermissionKey } from "@church/shared";

/** Requires a valid Bearer token; loads the user into context. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing or invalid Authorization header" });
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) {
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }

  const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
  if (!user) {
    throw new HTTPException(401, { message: "User no longer exists" });
  }
  if (user.status === "rejected") {
    throw new HTTPException(403, { message: "Your account access has been revoked" });
  }

  c.set("user", user);
  await next();
});

/** Requires the authenticated user to have one of the given roles. */
export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!roles.includes(user.role)) {
      throw new HTTPException(403, { message: "Insufficient role" });
    }
    await next();
  });
}

const PERMISSION_COLUMN: Record<AdminPermissionKey, keyof typeof adminPermissions.$inferSelect> = {
  can_scan: "canScan",
  can_view_logs: "canViewLogs",
  can_send_messages: "canSendMessages",
  can_generate_reports: "canGenerateReports",
};

/**
 * Requires a specific admin permission. Super admins bypass all permission checks.
 * Admins must have the flag set in admin_permissions.
 */
export function requirePermission(permission: AdminPermissionKey) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (user.role === "super_admin") {
      await next();
      return;
    }
    if (user.role !== "admin") {
      throw new HTTPException(403, { message: "Admin access required" });
    }
    const [perms] = await db
      .select()
      .from(adminPermissions)
      .where(eq(adminPermissions.userId, user.id))
      .limit(1);
    if (!perms || !perms[PERMISSION_COLUMN[permission]]) {
      throw new HTTPException(403, { message: `Missing permission: ${permission}` });
    }
    await next();
  });
}

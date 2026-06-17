import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { users, adminPermissions } from "../db/schema";
import { createUserSchema, adminPermissionsSchema } from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { toPublicUser } from "../lib/serialize";
import { createUser, setPermissions, UserError } from "../services/users";
import type { AppEnv } from "../lib/context";

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use("*", requireAuth, requireRole("super_admin"));

/** Create an admin with explicit permissions. */
adminRoutes.post("/", async (c) => {
  const body = await parseBody(c, createUserSchema);
  try {
    const created = await createUser({
      ...body,
      role: "admin",
      status: "approved",
      permissions: body.permissions ?? {
        can_scan: true,
        can_view_logs: true,
        can_send_messages: false,
        can_generate_reports: false,
      },
    });
    return c.json({ user: toPublicUser(created) }, 201);
  } catch (err) {
    if (err instanceof UserError) return c.json({ error: err.message }, err.status as 409);
    throw err;
  }
});

/** Update an admin's permissions. */
adminRoutes.put("/:id/permissions", async (c) => {
  const id = c.req.param("id");
  const body = await parseBody(c, adminPermissionsSchema);
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return c.json({ error: "User not found" }, 404);
  await setPermissions(id, body);
  return c.json({ ok: true, permissions: body });
});

adminRoutes.get("/:id/permissions", async (c) => {
  const id = c.req.param("id");
  const [perms] = await db
    .select()
    .from(adminPermissions)
    .where(eq(adminPermissions.userId, id))
    .limit(1);
  return c.json({
    permissions: perms
      ? {
          can_scan: perms.canScan,
          can_view_logs: perms.canViewLogs,
          can_send_messages: perms.canSendMessages,
          can_generate_reports: perms.canGenerateReports,
        }
      : null,
  });
});

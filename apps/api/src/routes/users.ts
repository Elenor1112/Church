import { Hono } from "hono";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/index";
import { users, adminPermissions, notifications } from "../db/schema";
import {
  updateUserSchema,
  updateStatusSchema,
  createUserSchema,
  pushTokenSchema,
} from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { toPublicUser, toPermissions } from "../lib/serialize";
import { hashPassword } from "../lib/crypto";
import { createUser, setPermissions, UserError } from "../services/users";
import type { AppEnv } from "../lib/context";
import type { Role, UserStatus } from "@church/shared";

export const userRoutes = new Hono<AppEnv>();

userRoutes.use("*", requireAuth);

const adminOnly = requireRole("admin", "super_admin");

/** Save the caller's Expo push token. */
userRoutes.post("/me/push-token", async (c) => {
  const user = c.get("user");
  const { token } = await parseBody(c, pushTokenSchema);
  await db.update(users).set({ pushToken: token, updatedAt: new Date() }).where(eq(users.id, user.id));
  return c.json({ ok: true });
});

/** Update own profile. */
userRoutes.patch("/me", async (c) => {
  const user = c.get("user");
  const body = await parseBody(c, updateUserSchema);
  // Members cannot change their own role/status.
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.firstName !== undefined) patch.firstName = body.firstName;
  if (body.lastName !== undefined) patch.lastName = body.lastName;
  if (body.email !== undefined) patch.email = body.email;
  if (body.spousePhone !== undefined) patch.spousePhone = body.spousePhone;
  if (body.birthday !== undefined) patch.birthday = body.birthday;
  if (body.profileImage !== undefined) patch.profileImage = body.profileImage;
  if (body.password) patch.passwordHash = await hashPassword(body.password);

  const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
  return c.json({ user: toPublicUser(updated!) });
});

/** List/filter users (admin). ?role=&status=&q= */
userRoutes.get("/", adminOnly, async (c) => {
  const role = c.req.query("role") as Role | "all" | undefined;
  const status = c.req.query("status") as UserStatus | "all" | undefined;
  const q = c.req.query("q")?.trim();

  const conditions: SQL[] = [];
  if (role && role !== "all") conditions.push(eq(users.role, role));
  if (status && status !== "all") conditions.push(eq(users.status, status));
  if (q) {
    const like = `%${q}%`;
    const search = or(
      ilike(users.firstName, like),
      ilike(users.lastName, like),
      ilike(users.phone, like),
    );
    if (search) conditions.push(search);
  }

  const rows = await db
    .select()
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(500);

  return c.json({ users: rows.map(toPublicUser) });
});

/** Pending approvals count (admin). */
userRoutes.get("/pending/count", adminOnly, async (c) => {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.status, "pending"));
  return c.json({ count: row?.count ?? 0 });
});

/** Create a member or admin (admin/super_admin). */
userRoutes.post("/", adminOnly, async (c) => {
  const caller = c.get("user");
  const body = await parseBody(c, createUserSchema);
  // Only super admins may create admins/super_admins.
  if (body.role !== "member" && caller.role !== "super_admin") {
    return c.json({ error: "Only super admins can create staff accounts" }, 403);
  }
  try {
    const created = await createUser(body);
    return c.json({ user: toPublicUser(created) }, 201);
  } catch (err) {
    if (err instanceof UserError) return c.json({ error: err.message }, err.status as 409);
    throw err;
  }
});

userRoutes.get("/:id", adminOnly, async (c) => {
  const id = c.req.param("id");
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return c.json({ error: "User not found" }, 404);
  const [perms] = await db
    .select()
    .from(adminPermissions)
    .where(eq(adminPermissions.userId, id))
    .limit(1);
  return c.json({
    user: toPublicUser(user),
    permissions: toPermissions(perms),
  });
});

/** Update a user (admin can edit members; super admin can edit anyone). */
userRoutes.patch("/:id", adminOnly, async (c) => {
  const caller = c.get("user");
  const id = c.req.param("id");
  const body = await parseBody(c, updateUserSchema);

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return c.json({ error: "User not found" }, 404);

  const editingStaff = target.role !== "member" || (body.role && body.role !== "member");
  if (editingStaff && caller.role !== "super_admin") {
    return c.json({ error: "Only super admins can edit staff accounts" }, 403);
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ["firstName", "lastName", "phone", "email", "spousePhone", "birthday", "profileImage", "role", "status"] as const) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  if (body.password) patch.passwordHash = await hashPassword(body.password);

  const [updated] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  if (body.permissions && (body.role === "admin" || target.role === "admin")) {
    await setPermissions(id, body.permissions);
  }
  return c.json({ user: toPublicUser(updated!) });
});

/** Change a user's status (approve/reject/restore). */
userRoutes.patch("/:id/status", adminOnly, async (c) => {
  const caller = c.get("user");
  const id = c.req.param("id");
  const { status } = await parseBody(c, updateStatusSchema);

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return c.json({ error: "User not found" }, 404);

  // Reversing an approved->rejected or rejected->approved is super-admin only.
  const reversal =
    (target.status === "approved" && status === "rejected") ||
    (target.status === "rejected" && status === "approved");
  if (reversal && caller.role !== "super_admin") {
    return c.json({ error: "Only super admins can reverse a finalized decision" }, 403);
  }

  const [updated] = await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  // Notify the member of the decision.
  if (status === "approved" || status === "rejected") {
    await db.insert(notifications).values({
      userId: id,
      title: status === "approved" ? "Account Approved" : "Account Update",
      message:
        status === "approved"
          ? "Your account has been approved. Welcome!"
          : "Your account access has been updated. Please contact the church office.",
      type: status === "approved" ? "approval" : "rejection",
    });
  }
  return c.json({ user: toPublicUser(updated!) });
});

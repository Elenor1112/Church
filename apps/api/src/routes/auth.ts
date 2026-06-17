import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { users, adminPermissions } from "../db/schema";
import { registerSchema, loginSchema } from "@church/shared";
import { parseBody } from "../lib/validate";
import { verifyPassword, signToken } from "../lib/crypto";
import { toPublicUser, toPermissions } from "../lib/serialize";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { createUser, notifyAdminsOfPendingMember, UserError } from "../services/users";
import type { AppEnv } from "../lib/context";
import type { AuthResponse } from "@church/shared";

export const authRoutes = new Hono<AppEnv>();

const authLimiter = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "auth" });

authRoutes.post("/register", authLimiter, async (c) => {
  const body = await parseBody(c, registerSchema);
  try {
    const user = await createUser({
      ...body,
      role: "member",
      status: "pending",
    });
    await notifyAdminsOfPendingMember(`${user.firstName} ${user.lastName}`);
    const token = signToken({ sub: user.id, role: user.role });
    const res: AuthResponse = { token, user: toPublicUser(user), permissions: null };
    return c.json(res, 201);
  } catch (err) {
    if (err instanceof UserError) return c.json({ error: err.message }, err.status as 409);
    throw err;
  }
});

authRoutes.post("/login", authLimiter, async (c) => {
  const { phone, password } = await parseBody(c, loginSchema);
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: "Invalid phone number or password" }, 401);
  }
  if (user.status === "rejected") {
    return c.json({ error: "Your account access has been revoked" }, 403);
  }

  const [perms] =
    user.role === "admin"
      ? await db
          .select()
          .from(adminPermissions)
          .where(eq(adminPermissions.userId, user.id))
          .limit(1)
      : [];

  const token = signToken({ sub: user.id, role: user.role });
  const res: AuthResponse = {
    token,
    user: toPublicUser(user),
    permissions: toPermissions(perms),
  };
  return c.json(res);
});

authRoutes.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  const [perms] =
    user.role === "admin"
      ? await db
          .select()
          .from(adminPermissions)
          .where(eq(adminPermissions.userId, user.id))
          .limit(1)
      : [];
  return c.json({ user: toPublicUser(user), permissions: toPermissions(perms) });
});

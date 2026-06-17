import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index";
import { notifications } from "../db/schema";
import { markReadSchema } from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../lib/context";
import type { NotificationItem } from "@church/shared";

export const notificationRoutes = new Hono<AppEnv>();

notificationRoutes.use("*", requireAuth);

notificationRoutes.get("/", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(200);
  const items: NotificationItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    type: r.type,
    isRead: r.isRead,
    createdAt: r.createdAt.toISOString(),
  }));
  return c.json({ notifications: items });
});

notificationRoutes.get("/unread-count", async (c) => {
  const user = c.get("user");
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
  return c.json({ count: row?.count ?? 0 });
});

notificationRoutes.post("/read", async (c) => {
  const user = c.get("user");
  const { notificationIds } = await parseBody(c, markReadSchema);
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, user.id), inArray(notifications.id, notificationIds)),
    );
  return c.json({ ok: true });
});

notificationRoutes.post("/read-all", async (c) => {
  const user = c.get("user");
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, user.id));
  return c.json({ ok: true });
});

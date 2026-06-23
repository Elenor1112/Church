import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index";
import { announcements, notifications, users } from "../db/schema";
import { createAnnouncementSchema } from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth, requirePermission } from "../middleware/auth";
import { resolveAudienceMemberIds } from "../services/absences";
import type { AppEnv } from "../lib/context";
import type { Announcement } from "@church/shared";

export const announcementRoutes = new Hono<AppEnv>();

announcementRoutes.use("*", requireAuth);

announcementRoutes.get("/", async (c) => {
  const creator = users;
  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      createdBy: announcements.createdBy,
      firstName: creator.firstName,
      lastName: creator.lastName,
      createdAt: announcements.createdAt,
    })
    .from(announcements)
    .leftJoin(creator, eq(announcements.createdBy, creator.id))
    .orderBy(desc(announcements.createdAt))
    .limit(50);

  const items: Announcement[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    createdBy: r.createdBy,
    createdByName: r.firstName ? `${r.firstName} ${r.lastName}` : null,
    createdAt: r.createdAt.toISOString(),
  }));
  return c.json({ announcements: items });
});

announcementRoutes.post("/", requirePermission("can_send_messages"), async (c) => {
  const user = c.get("user");
  const body = await parseBody(c, createAnnouncementSchema);
  const [created] = await db
    .insert(announcements)
    .values({ title: body.title, body: body.body, createdBy: user.id })
    .returning();

  // Fan out a notification to every approved member. Reuses the same audience
  // resolver as alerts so both paths target an identical recipient set
  // (role = member, status = approved) — no duplicated targeting logic.
  const recipientIds = await resolveAudienceMemberIds("all");
  if (recipientIds.length > 0) {
    await db.insert(notifications).values(
      recipientIds.map((memberId) => ({
        userId: memberId,
        title: body.title,
        message: body.body,
        type: "announcement" as const,
      })),
    );
  }
  return c.json({ announcement: created }, 201);
});

announcementRoutes.delete("/:id", requirePermission("can_send_messages"), async (c) => {
  const id = c.req.param("id");
  await db.delete(announcements).where(eq(announcements.id, id));
  return c.json({ ok: true });
});

import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/index";
import { meetings, notifications } from "../db/schema";
import {
  createMeetingSchema,
  dayOfWeekForDate,
  meetingDayLabel,
  formatTime12h,
} from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth, requireApproved, requireRole } from "../middleware/auth";
import { resolveAudienceMemberIds } from "../services/absences";
import { fanOutNotifications } from "../services/notify";
import type { AppEnv } from "../lib/context";
import type { Meeting } from "@church/shared";

export const meetingRoutes = new Hono<AppEnv>();

meetingRoutes.use("*", requireAuth, requireApproved);

const serialize = (m: typeof meetings.$inferSelect): Meeting => ({
  id: m.id,
  name: m.name,
  meetingDate: m.meetingDate,
  dayOfWeek: m.dayOfWeek,
  startTime: m.startTime,
  endTime: m.endTime,
  createdBy: m.createdBy,
  createdAt: m.createdAt.toISOString(),
});

/** List all meetings (any authenticated user — read-only for members/admins). */
meetingRoutes.get("/", async (c) => {
  const rows = await db
    .select()
    .from(meetings)
    .orderBy(asc(meetings.dayOfWeek), asc(meetings.startTime));
  return c.json({ meetings: rows.map(serialize) });
});

/** Create a meeting (super admin only). */
meetingRoutes.post("/", requireRole("super_admin"), async (c) => {
  const admin = c.get("user");
  const body = await parseBody(c, createMeetingSchema);
  const dayOfWeek = dayOfWeekForDate(body.meetingDate);
  if (dayOfWeek == null) return c.json({ error: "Invalid meeting date" }, 400);
  const [created] = await db
    .insert(meetings)
    .values({
      name: body.name,
      meetingDate: body.meetingDate,
      dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      createdBy: admin.id,
    })
    .returning();

  // Notify every approved member of the new meeting. Same audience resolver and
  // fan-out pattern as announcements. Best-effort: a notification failure must
  // not fail the meeting creation itself.
  try {
    const when = `${meetingDayLabel(created!.meetingDate, created!.dayOfWeek)} · ${formatTime12h(created!.startTime)} – ${formatTime12h(created!.endTime)}`;
    const recipientIds = await resolveAudienceMemberIds("all");
    await fanOutNotifications(recipientIds, {
      title: created!.name,
      message: `New meeting scheduled: ${when}`,
      type: "generic",
    });
  } catch (err) {
    console.error("Failed to send meeting notifications:", err);
  }

  return c.json({ meeting: serialize(created!) }, 201);
});

/** Update a meeting (super admin only). */
meetingRoutes.patch("/:id", requireRole("super_admin"), async (c) => {
  const id = c.req.param("id");
  const body = await parseBody(c, createMeetingSchema);
  const dayOfWeek = dayOfWeekForDate(body.meetingDate);
  if (dayOfWeek == null) return c.json({ error: "Invalid meeting date" }, 400);
  const [updated] = await db
    .update(meetings)
    .set({
      name: body.name,
      meetingDate: body.meetingDate,
      dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
    })
    .where(eq(meetings.id, id))
    .returning();
  if (!updated) return c.json({ error: "Meeting not found" }, 404);
  return c.json({ meeting: serialize(updated) });
});

/** Delete a meeting (super admin only). */
meetingRoutes.delete("/:id", requireRole("super_admin"), async (c) => {
  const id = c.req.param("id");
  await db.delete(meetings).where(eq(meetings.id, id));
  return c.json({ ok: true });
});

import { Hono } from "hono";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index";
import { attendance, announcements, qrCodes, users, meetings } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { getSetProgress } from "../services/attendance";
import { newQrToken } from "../lib/crypto";
import { verseOfTheDay } from "../data/verses";
import type { AppEnv } from "../lib/context";

export const memberRoutes = new Hono<AppEnv>();

memberRoutes.use("*", requireAuth);

/** Member's own QR token. Creates one if missing. */
memberRoutes.get("/qr", async (c) => {
  const user = c.get("user");
  let [qr] = await db.select().from(qrCodes).where(eq(qrCodes.userId, user.id)).limit(1);
  if (!qr) {
    [qr] = await db.insert(qrCodes).values({ userId: user.id, qrToken: newQrToken() }).returning();
  }
  return c.json({ qrToken: qr!.qrToken, createdAt: qr!.createdAt.toISOString() });
});

/** Regenerate the member's QR token (invalidates the old one). */
memberRoutes.post("/qr/refresh", async (c) => {
  const user = c.get("user");
  const token = newQrToken();
  const existing = await db.select({ id: qrCodes.id }).from(qrCodes).where(eq(qrCodes.userId, user.id)).limit(1);
  if (existing.length) {
    await db.update(qrCodes).set({ qrToken: token, createdAt: new Date() }).where(eq(qrCodes.userId, user.id));
  } else {
    await db.insert(qrCodes).values({ userId: user.id, qrToken: token });
  }
  return c.json({ qrToken: token });
});

/** Aggregated home payload for the member dashboard. */
memberRoutes.get("/home", async (c) => {
  const user = c.get("user");

  const verse = verseOfTheDay();
  const progress = await getSetProgress(user.id);

  const [attCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attendance)
    .where(eq(attendance.memberId, user.id));

  const latestAnnouncements = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      category: announcements.category,
      createdAt: announcements.createdAt,
    })
    .from(announcements)
    .orderBy(desc(announcements.createdAt))
    .limit(30);

  const meetingRows = await db
    .select()
    .from(meetings)
    .orderBy(asc(meetings.dayOfWeek), asc(meetings.startTime));

  return c.json({
    greetingName: user.firstName,
    verse: { en: verse.textEn, refEn: verse.refEn, ar: verse.textAr, refAr: verse.refAr },
    meeting: {
      titleEn: "Holy Family Meeting",
      titleAr: " اجتماع العائلةالمقدسة",
      day: "Friday",
      time: "10:30 AM",
    },
    meetings: meetingRows.map((m) => ({
      id: m.id,
      name: m.name,
      meetingDate: m.meetingDate,
      dayOfWeek: m.dayOfWeek,
      startTime: m.startTime,
      endTime: m.endTime,
      createdBy: m.createdBy,
      createdAt: m.createdAt.toISOString(),
    })),
    attendanceCount: attCount?.count ?? 0,
    completedSets: user.completedSets,
    progress,
    announcements: latestAnnouncements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      category: a.category,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

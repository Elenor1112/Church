import { Hono } from "hono";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index";
import { attendance, announcements, qrCodes, users } from "../db/schema";
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
      createdAt: announcements.createdAt,
    })
    .from(announcements)
    .orderBy(desc(announcements.createdAt))
    .limit(5);

  return c.json({
    greetingName: user.firstName,
    verse: { en: verse.textEn, refEn: verse.refEn, ar: verse.textAr, refAr: verse.refAr },
    meeting: {
      titleEn: "Family Meeting",
      titleAr: "اجتماع العائلة",
      day: "Friday",
      time: "7:00 PM",
    },
    attendanceCount: attCount?.count ?? 0,
    completedSets: user.completedSets,
    progress,
    announcements: latestAnnouncements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

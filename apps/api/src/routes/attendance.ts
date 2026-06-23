import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index";
import { attendance, fridayCategories, users } from "../db/schema";
import { scanSchema, claimSetRewardSchema } from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth, requirePermission } from "../middleware/auth";
import {
  recordScan,
  claimSetReward,
  getSetProgress,
  AttendanceError,
} from "../services/attendance";
import { isoDate } from "../lib/dates";
import type { AppEnv } from "../lib/context";
import type { AttendanceRecord } from "@church/shared";

export const attendanceRoutes = new Hono<AppEnv>();

attendanceRoutes.use("*", requireAuth);

/** Admin scans a QR + selected category to check a member in. */
attendanceRoutes.post("/scan", requirePermission("can_scan"), async (c) => {
  const body = await parseBody(c, scanSchema);
  const admin = c.get("user");
  try {
    const result = await recordScan({
      qrToken: body.qrToken,
      categorySlug: body.categorySlug,
      adminId: admin.id,
    });
    return c.json({
      member: {
        id: result.member.id,
        name: `${result.member.firstName} ${result.member.lastName}`,
        profileImage: result.member.profileImage,
      },
      alreadyCheckedInToday: result.alreadyCheckedInToday,
      categoryNewlyCompleted: result.categoryNewlyCompleted,
      setCompleted: result.setCompleted,
    });
  } catch (err) {
    if (err instanceof AttendanceError) return c.json({ error: err.message }, err.status as 400);
    throw err;
  }
});

/** Today's check-in count (for scanner dashboard). */
attendanceRoutes.get("/today/count", requirePermission("can_scan"), async (c) => {
  const today = isoDate(new Date());
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attendance)
    .where(eq(attendance.attendanceDate, today));
  return c.json({ count: row?.count ?? 0 });
});

/** List attendance: ?range=today|month, optional ?q=search. */
attendanceRoutes.get("/", requirePermission("can_view_logs"), async (c) => {
  const range = c.req.query("range") ?? "today";
  const q = c.req.query("q")?.trim().toLowerCase();

  const now = new Date();
  const conditions = [];
  if (range === "month") {
    // Current calendar month, by attendance date.
    conditions.push(
      sql`date_trunc('month', ${attendance.attendanceDate}) = date_trunc('month', CURRENT_DATE)`,
    );
  } else {
    conditions.push(eq(attendance.attendanceDate, isoDate(now)));
  }

  const member = users;
  const rows = await db
    .select({
      id: attendance.id,
      memberId: attendance.memberId,
      firstName: member.firstName,
      lastName: member.lastName,
      adminId: attendance.adminId,
      categorySlug: fridayCategories.slug,
      checkedInAt: attendance.checkedInAt,
      weekNumber: attendance.weekNumber,
      yearNumber: attendance.yearNumber,
    })
    .from(attendance)
    .innerJoin(member, eq(attendance.memberId, member.id))
    .leftJoin(fridayCategories, eq(attendance.categoryId, fridayCategories.id))
    .where(and(...conditions))
    .orderBy(desc(attendance.checkedInAt))
    .limit(500);

  const records: AttendanceRecord[] = rows
    .map((r) => ({
      id: r.id,
      memberId: r.memberId,
      memberName: `${r.firstName} ${r.lastName}`,
      adminId: r.adminId,
      adminName: null,
      categorySlug: r.categorySlug,
      checkedInAt: r.checkedInAt.toISOString(),
      weekNumber: r.weekNumber,
      yearNumber: r.yearNumber,
    }))
    .filter((r) => !q || r.memberName.toLowerCase().includes(q));

  return c.json({ records });
});

/** Current member's set progress. */
attendanceRoutes.get("/progress", async (c) => {
  const user = c.get("user");
  const progress = await getSetProgress(user.id);
  return c.json(progress);
});

/** Admin claims/delivers a completed set reward. */
attendanceRoutes.post("/sets/claim", requirePermission("can_scan"), async (c) => {
  const { setId } = await parseBody(c, claimSetRewardSchema);
  const admin = c.get("user");
  try {
    await claimSetReward({ setId, adminId: admin.id });
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof AttendanceError) return c.json({ error: err.message }, err.status as 400);
    throw err;
  }
});

/** Pending set-reward claims across all members (for Comms tab). */
attendanceRoutes.get("/sets/pending", requirePermission("can_scan"), async (c) => {
  const { sets } = await import("../db/schema");
  const rows = await db
    .select({
      id: sets.id,
      memberId: sets.memberId,
      firstName: users.firstName,
      lastName: users.lastName,
      completedAt: sets.completedAt,
    })
    .from(sets)
    .innerJoin(users, eq(sets.memberId, users.id))
    .where(eq(sets.isRewardClaimed, false))
    .orderBy(desc(sets.completedAt));
  return c.json({
    sets: rows.map((r) => ({
      id: r.id,
      memberId: r.memberId,
      memberName: `${r.firstName} ${r.lastName}`,
      completedAt: r.completedAt.toISOString(),
    })),
  });
});

/** Current member's total attendance count. */
attendanceRoutes.get("/me/count", async (c) => {
  const user = c.get("user");
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attendance)
    .where(eq(attendance.memberId, user.id));
  return c.json({ count: row?.count ?? 0 });
});

import { Hono } from "hono";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index";
import { attendance, users, sets } from "../db/schema";
import { requireAuth, requirePermission, requireRole } from "../middleware/auth";
import { isoDate } from "../lib/dates";
import { toCsv } from "../lib/csv";
import type { AppEnv } from "../lib/context";
import type { DashboardStats } from "@church/shared";

export const reportRoutes = new Hono<AppEnv>();

reportRoutes.use("*", requireAuth);

/** CSV export of attendance for a range (?range=today|month). */
reportRoutes.get("/attendance.csv", requirePermission("can_generate_reports"), async (c) => {
  const range = c.req.query("range") ?? "month";
  const now = new Date();
  const where =
    range === "today"
      ? eq(attendance.attendanceDate, isoDate(now))
      : sql`date_trunc('month', ${attendance.attendanceDate}) = date_trunc('month', CURRENT_DATE)`;

  const rows = await db
    .select({
      memberName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      phone: users.phone,
      checkedInAt: attendance.checkedInAt,
      week: attendance.weekNumber,
      year: attendance.yearNumber,
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.memberId, users.id))
    .where(where)
    .orderBy(desc(attendance.checkedInAt));

  const csv = toCsv(
    ["Member", "Phone", "Checked In At", "Week", "Year"],
    rows.map((r) => [r.memberName, r.phone, r.checkedInAt.toISOString(), r.week, r.year]),
  );

  // Only `today` and `month` are valid ranges; anything else would otherwise be
  // reflected into the Content-Disposition header.
  const safeRange = range === "today" ? "today" : "month";
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="attendance-${safeRange}.csv"`);
  return c.body(csv);
});

/** Super-admin dashboard aggregate. */
reportRoutes.get("/dashboard", requireRole("super_admin"), async (c) => {
  const today = isoDate(new Date());

  const [members] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "member"));
  const [admins] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "admin"));
  const [todayCheckIns] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attendance)
    .where(eq(attendance.attendanceDate, today));
  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.status, "pending"));

  // Weekly attendance for the last 8 ISO weeks.
  const weekly = await db
    .select({
      year: attendance.yearNumber,
      week: attendance.weekNumber,
      count: sql<number>`count(*)::int`,
    })
    .from(attendance)
    .groupBy(attendance.yearNumber, attendance.weekNumber)
    .orderBy(desc(attendance.yearNumber), desc(attendance.weekNumber))
    .limit(8);

  // Recent activity: latest check-ins + completed sets.
  const recentCheckins = await db
    .select({
      id: attendance.id,
      name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      at: attendance.checkedInAt,
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.memberId, users.id))
    .orderBy(desc(attendance.checkedInAt))
    .limit(10);

  const stats: DashboardStats = {
    totalMembers: members?.count ?? 0,
    totalAdmins: admins?.count ?? 0,
    todayCheckIns: todayCheckIns?.count ?? 0,
    pendingApprovals: pending?.count ?? 0,
    weeklyAttendance: weekly
      .reverse()
      .map((w) => ({ week: `W${w.week}`, count: w.count })),
    recentActivity: recentCheckins.map((r) => ({
      id: r.id,
      text: `${r.name} checked in`,
      createdAt: r.at.toISOString(),
    })),
  };
  return c.json(stats);
});

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index";
import {
  attendance,
  fridayCategories,
  memberCategoryProgress,
  sets,
  notifications,
  users,
  qrCodes,
  meetings,
} from "../db/schema";
import { isoWeek, isoDate } from "../lib/dates";
import { SET_SIZE, NON_SET_CATEGORY_SLUGS, isAnyMeetingActive, isQrExpired } from "@church/shared";
import type { CategorySlug, MeetingWindow } from "@church/shared";
import { fanOutNotifications } from "./notify";

const NON_SET_SLUGS = NON_SET_CATEGORY_SLUGS as string[];

const SCAN_WINDOW_MESSAGE = "Scanning is only open during a scheduled meeting window.";

/**
 * True when the scanner should be open right now: the default Friday window is
 * always active, plus any super-admin-scheduled meeting whose day/time matches.
 */
export async function isScannerOpen(now: Date = new Date()): Promise<boolean> {
  const rows = await db
    .select({
      meetingDate: meetings.meetingDate,
      dayOfWeek: meetings.dayOfWeek,
      startTime: meetings.startTime,
      endTime: meetings.endTime,
    })
    .from(meetings);
  return isAnyMeetingActive(rows as MeetingWindow[], now);
}

export class AttendanceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface ScanResult {
  member: typeof users.$inferSelect;
  alreadyCheckedInToday: boolean;
  categoryNewlyCompleted: boolean;
  setCompleted: boolean;
}

/**
 * Record an attendance check-in from an admin scan.
 * - Resolves member by QR token.
 * - Prevents duplicate same-day check-in.
 * - Advances category progress; if all 4 done, creates a set + notifies admins.
 */
export async function recordScan(opts: {
  qrToken: string;
  categorySlug: CategorySlug;
  adminId: string;
}): Promise<ScanResult> {
  const { qrToken, categorySlug, adminId } = opts;

  const [qr] = await db.select().from(qrCodes).where(eq(qrCodes.qrToken, qrToken)).limit(1);
  if (!qr) throw new AttendanceError(404, "QR code not recognized");
  // Expired tokens are refused even though the row still exists — this is what
  // stops a screenshot from last week being scanned today.
  if (isQrExpired(qr.createdAt)) {
    throw new AttendanceError(410, "This QR code has expired. Ask the member to reopen their app.");
  }

  const [member] = await db.select().from(users).where(eq(users.id, qr.userId)).limit(1);
  if (!member) throw new AttendanceError(404, "Member not found");
  if (member.status !== "approved") {
    throw new AttendanceError(403, "Member is not approved");
  }

  const [category] = await db
    .select()
    .from(fridayCategories)
    .where(eq(fridayCategories.slug, categorySlug))
    .limit(1);
  if (!category) throw new AttendanceError(400, "Unknown category");

  const now = new Date();

  if (!(await isScannerOpen(now))) {
    throw new AttendanceError(403, SCAN_WINDOW_MESSAGE);
  }
  const today = isoDate(now);
  const { week, year } = isoWeek(now);

  // Duplicate same-day guard (also enforced by DB unique constraint).
  const [existing] = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(and(eq(attendance.memberId, member.id), eq(attendance.attendanceDate, today)))
    .limit(1);

  if (existing) {
    return {
      member,
      alreadyCheckedInToday: true,
      categoryNewlyCompleted: false,
      setCompleted: false,
    };
  }

  // The INSERT is the real gate. The SELECT above is a fast path for the common
  // case, but two rapid scans can both pass it; letting the unique constraint
  // decide means the loser gets the friendly "already checked in" result instead
  // of a 500 from a constraint violation.
  const inserted = await db
    .insert(attendance)
    .values({
      memberId: member.id,
      adminId,
      categoryId: category.id,
      attendanceDate: today,
      weekNumber: week,
      yearNumber: year,
    })
    .onConflictDoNothing({ target: [attendance.memberId, attendance.attendanceDate] })
    .returning({ id: attendance.id });

  if (inserted.length === 0) {
    // Another scan won the race — do not advance progress a second time.
    return {
      member,
      alreadyCheckedInToday: true,
      categoryNewlyCompleted: false,
      setCompleted: false,
    };
  }

  // Advance category progress (upsert -> completed).
  const [existingProgress] = await db
    .select()
    .from(memberCategoryProgress)
    .where(
      and(
        eq(memberCategoryProgress.memberId, member.id),
        eq(memberCategoryProgress.categoryId, category.id),
      ),
    )
    .limit(1);

  let categoryNewlyCompleted = false;
  if (!existingProgress) {
    await db.insert(memberCategoryProgress).values({
      memberId: member.id,
      categoryId: category.id,
      completed: true,
      completedAt: now,
    });
    categoryNewlyCompleted = true;
  } else if (!existingProgress.completed) {
    await db
      .update(memberCategoryProgress)
      .set({ completed: true, completedAt: now })
      .where(eq(memberCategoryProgress.id, existingProgress.id));
    categoryNewlyCompleted = true;
  }

  // Check if the set is now complete. "Free" never counts toward a set, so only
  // distinct non-free completed categories are tallied against SET_SIZE.
  let setCompleted = false;
  if (categoryNewlyCompleted && !NON_SET_SLUGS.includes(category.slug)) {
    const completedRows = await db
      .select({ slug: fridayCategories.slug })
      .from(memberCategoryProgress)
      .innerJoin(fridayCategories, eq(memberCategoryProgress.categoryId, fridayCategories.id))
      .where(
        and(
          eq(memberCategoryProgress.memberId, member.id),
          eq(memberCategoryProgress.completed, true),
        ),
      );

    const setCompletedCount = completedRows.filter((r) => !NON_SET_SLUGS.includes(r.slug)).length;
    if (setCompletedCount >= SET_SIZE) {
      await db.insert(sets).values({ memberId: member.id });
      setCompleted = true;
      await notifyAdminsOfSet(member);
    }
  }

  return { member, alreadyCheckedInToday: false, categoryNewlyCompleted, setCompleted };
}

interface AdminScanResult {
  admin: typeof users.$inferSelect;
  alreadyCheckedInToday: boolean;
}

/**
 * Record attendance for an ADMIN by scanning their QR. Unlike member scans this
 * has no Friday category and no set progress — it just logs a check-in. The
 * scanned user must be an admin/super_admin. Same Friday time window applies.
 */
export async function recordAdminScan(opts: {
  qrToken: string;
  scannedByAdminId: string;
}): Promise<AdminScanResult> {
  const { qrToken, scannedByAdminId } = opts;

  const [qr] = await db.select().from(qrCodes).where(eq(qrCodes.qrToken, qrToken)).limit(1);
  if (!qr) throw new AttendanceError(404, "QR code not recognized");
  if (isQrExpired(qr.createdAt)) {
    throw new AttendanceError(410, "This QR code has expired. Ask them to reopen their app.");
  }

  const [admin] = await db.select().from(users).where(eq(users.id, qr.userId)).limit(1);
  if (!admin) throw new AttendanceError(404, "User not found");
  if (admin.role !== "admin" && admin.role !== "super_admin") {
    throw new AttendanceError(400, "This QR belongs to a member, not an admin");
  }
  if (admin.status !== "approved") {
    throw new AttendanceError(403, "Admin is not approved");
  }

  const now = new Date();
  if (!(await isScannerOpen(now))) {
    throw new AttendanceError(403, SCAN_WINDOW_MESSAGE);
  }
  const today = isoDate(now);
  const { week, year } = isoWeek(now);

  const [existing] = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(and(eq(attendance.memberId, admin.id), eq(attendance.attendanceDate, today)))
    .limit(1);

  if (existing) {
    return { admin, alreadyCheckedInToday: true };
  }

  // No categoryId: admin attendance is not tied to a Friday set. As above, the
  // unique constraint settles concurrent scans rather than raising a 500.
  const inserted = await db
    .insert(attendance)
    .values({
      memberId: admin.id,
      adminId: scannedByAdminId,
      attendanceDate: today,
      weekNumber: week,
      yearNumber: year,
    })
    .onConflictDoNothing({ target: [attendance.memberId, attendance.attendanceDate] })
    .returning({ id: attendance.id });

  return { admin, alreadyCheckedInToday: inserted.length === 0 };
}

async function notifyAdminsOfSet(member: typeof users.$inferSelect) {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["admin", "super_admin"]));

  const memberName = `${member.firstName} ${member.lastName}`;
  await fanOutNotifications(
    admins.map((a) => a.id),
    {
      title: "🎁 Set Completed",
      message: `${memberName} completed a set of all four Friday categories.`,
      type: "set_completed",
    },
  );
}

/**
 * Claim/deliver the reward for a completed set: mark it claimed, reset the
 * member's category progress, and increment their completed-sets counter.
 */
export async function claimSetReward(opts: {
  setId: string;
  adminId: string;
  /** When provided, the scanned QR must resolve to the set's member (verification). */
  qrToken?: string;
}): Promise<void> {
  const { setId, adminId, qrToken } = opts;
  const [set] = await db.select().from(sets).where(eq(sets.id, setId)).limit(1);
  if (!set) throw new AttendanceError(404, "Set not found");
  if (set.isRewardClaimed) throw new AttendanceError(409, "Reward already claimed");

  // QR verification: the scanned member QR must belong to the member who
  // completed this set. Reuses the existing member QR codes (qr_codes table).
  if (qrToken !== undefined) {
    const [qr] = await db.select().from(qrCodes).where(eq(qrCodes.qrToken, qrToken)).limit(1);
    if (!qr) throw new AttendanceError(404, "QR code not recognized");
    if (qr.userId !== set.memberId) {
      throw new AttendanceError(422, "QR code does not match this member");
    }
  }

  // Atomic claim. The driver is neon-http, which has no interactive
  // transactions, so the UPDATE itself is the gate: a single statement flips the
  // flag only if it is still false. Two concurrent claims both pass the SELECT
  // above, but exactly one gets a row back here — the loser sees 409 and no
  // side effects run twice.
  const claimed = await db
    .update(sets)
    .set({ isRewardClaimed: true, rewardClaimedBy: adminId, rewardClaimedAt: new Date() })
    .where(and(eq(sets.id, setId), eq(sets.isRewardClaimed, false)))
    .returning({ id: sets.id });

  if (claimed.length === 0) throw new AttendanceError(409, "Reward already claimed");

  // Reset progress for the next cycle.
  await db
    .delete(memberCategoryProgress)
    .where(eq(memberCategoryProgress.memberId, set.memberId));

  // Increment in SQL, not read-modify-write, so concurrent claims for different
  // sets of the same member cannot lose an update.
  await db
    .update(users)
    .set({ completedSets: sql`${users.completedSets} + 1`, updatedAt: new Date() })
    .where(eq(users.id, set.memberId));

  // Notify the member.
  await db.insert(notifications).values({
    userId: set.memberId,
    title: "🎉 Reward Delivered",
    message: "Your completed set reward has been delivered. A new set has begun!",
    type: "set_completed",
  });
}

/** Build the member's current set progress view across all categories. */
export async function getSetProgress(memberId: string) {
  const categories = await db
    .select()
    .from(fridayCategories)
    .orderBy(fridayCategories.sortOrder);

  const progressRows = await db
    .select()
    .from(memberCategoryProgress)
    .where(eq(memberCategoryProgress.memberId, memberId));

  const completedByCat = new Map(progressRows.map((p) => [p.categoryId, p.completed]));

  // "Free" (5th Friday) is not part of a set, so it's excluded from progress.
  const cats = categories
    .filter((c) => !NON_SET_SLUGS.includes(c.slug))
    .map((c) => ({
      slug: c.slug,
      labelAr: c.labelAr,
      labelEn: c.labelEn,
      completed: completedByCat.get(c.id) ?? false,
    }));

  const [pendingReward] = await db
    .select({ id: sets.id })
    .from(sets)
    .where(and(eq(sets.memberId, memberId), eq(sets.isRewardClaimed, false)))
    .limit(1);

  return {
    completedCount: cats.filter((c) => c.completed).length,
    total: SET_SIZE,
    categories: cats,
    pendingRewardSetId: pendingReward?.id ?? null,
  };
}

/**
 * Per-category attendance breakdown for the member's own progress screen.
 *
 * `getSetProgress` only answers "is this category ticked in the set I'm working
 * on right now?" — and that state is wiped every time a reward is claimed. This
 * counts the raw attendance rows instead, so the member sees how many Fridays
 * they actually attended in each category over their whole history, not just
 * the current cycle.
 */
export async function getProgressDetail(memberId: string) {
  const categories = await db.select().from(fridayCategories).orderBy(fridayCategories.sortOrder);

  // All-time attendance per category. Rows with a null categoryId (admin
  // check-ins) simply don't join to a category and are excluded here; the
  // all-time total below counts them.
  const countRows = await db
    .select({
      categoryId: attendance.categoryId,
      attendedCount: sql<number>`count(*)::int`,
      lastAttendedDate: sql<string>`max(${attendance.attendanceDate})`,
    })
    .from(attendance)
    .where(eq(attendance.memberId, memberId))
    .groupBy(attendance.categoryId);

  const statsByCat = new Map(
    countRows
      .filter((r) => r.categoryId !== null)
      .map((r) => [
        r.categoryId!,
        { attendedCount: r.attendedCount, lastAttendedDate: r.lastAttendedDate },
      ]),
  );

  const progressRows = await db
    .select()
    .from(memberCategoryProgress)
    .where(eq(memberCategoryProgress.memberId, memberId));
  const completedByCat = new Map(progressRows.map((p) => [p.categoryId, p.completed]));

  const toDetail = (c: typeof fridayCategories.$inferSelect) => {
    const stats = statsByCat.get(c.id);
    return {
      slug: c.slug,
      labelAr: c.labelAr,
      labelEn: c.labelEn,
      attendedCount: stats?.attendedCount ?? 0,
      completedInCurrentSet: completedByCat.get(c.id) ?? false,
      lastAttendedDate: stats?.lastAttendedDate ?? null,
      countsTowardSet: !NON_SET_SLUGS.includes(c.slug),
    };
  };

  const setCats = categories.filter((c) => !NON_SET_SLUGS.includes(c.slug)).map(toDetail);
  // Non-set categories are only worth showing once they have something in them —
  // an always-empty "Free" row is noise on the member's progress sheet.
  const extraCats = categories
    .filter((c) => NON_SET_SLUGS.includes(c.slug))
    .map(toDetail)
    .filter((c) => c.attendedCount > 0);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attendance)
    .where(eq(attendance.memberId, memberId));

  const [member] = await db
    .select({ completedSets: users.completedSets })
    .from(users)
    .where(eq(users.id, memberId))
    .limit(1);

  const [pendingReward] = await db
    .select({ id: sets.id })
    .from(sets)
    .where(and(eq(sets.memberId, memberId), eq(sets.isRewardClaimed, false)))
    .limit(1);

  return {
    categories: setCats,
    extraCategories: extraCats,
    completedCount: setCats.filter((c) => c.completedInCurrentSet).length,
    total: SET_SIZE,
    totalAttendance: totalRow?.count ?? 0,
    completedSets: member?.completedSets ?? 0,
    pendingRewardSetId: pendingReward?.id ?? null,
  };
}

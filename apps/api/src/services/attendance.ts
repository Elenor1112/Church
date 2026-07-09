import { and, eq, inArray } from "drizzle-orm";
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
import { SET_SIZE, NON_SET_CATEGORY_SLUGS, isAnyMeetingActive } from "@church/shared";
import type { CategorySlug, MeetingWindow } from "@church/shared";

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

  await db.insert(attendance).values({
    memberId: member.id,
    adminId,
    categoryId: category.id,
    attendanceDate: today,
    weekNumber: week,
    yearNumber: year,
  });

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

  // Check if the set is now complete. "Free" (5th Friday) never counts toward a
  // set, so only distinct non-free completed categories are tallied.
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

  // No categoryId: admin attendance is not tied to a Friday set.
  await db.insert(attendance).values({
    memberId: admin.id,
    adminId: scannedByAdminId,
    attendanceDate: today,
    weekNumber: week,
    yearNumber: year,
  });

  return { admin, alreadyCheckedInToday: false };
}

async function notifyAdminsOfSet(member: typeof users.$inferSelect) {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["admin", "super_admin"]));

  if (admins.length === 0) return;
  const memberName = `${member.firstName} ${member.lastName}`;
  await db.insert(notifications).values(
    admins.map((a) => ({
      userId: a.id,
      title: "🎁 Set Completed",
      message: `${memberName} completed a set of all four Friday categories.`,
      type: "set_completed" as const,
    })),
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

  await db
    .update(sets)
    .set({ isRewardClaimed: true, rewardClaimedBy: adminId, rewardClaimedAt: new Date() })
    .where(eq(sets.id, setId));

  // Reset progress for the next cycle.
  await db
    .delete(memberCategoryProgress)
    .where(eq(memberCategoryProgress.memberId, set.memberId));

  // Increment completed-sets counter on the member.
  const [member] = await db
    .select({ completedSets: users.completedSets })
    .from(users)
    .where(eq(users.id, set.memberId))
    .limit(1);
  await db
    .update(users)
    .set({ completedSets: (member?.completedSets ?? 0) + 1, updatedAt: new Date() })
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

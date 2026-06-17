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
} from "../db/schema";
import { isoWeek, isoDate } from "../lib/dates";
import { SET_SIZE } from "@church/shared";
import type { CategorySlug } from "@church/shared";

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

  // Check if the set is now complete (all 4 distinct categories).
  let setCompleted = false;
  if (categoryNewlyCompleted) {
    const completedRows = await db
      .select({ id: memberCategoryProgress.id })
      .from(memberCategoryProgress)
      .where(
        and(
          eq(memberCategoryProgress.memberId, member.id),
          eq(memberCategoryProgress.completed, true),
        ),
      );

    if (completedRows.length >= SET_SIZE) {
      await db.insert(sets).values({ memberId: member.id });
      setCompleted = true;
      await notifyAdminsOfSet(member);
    }
  }

  return { member, alreadyCheckedInToday: false, categoryNewlyCompleted, setCompleted };
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
export async function claimSetReward(opts: { setId: string; adminId: string }): Promise<void> {
  const { setId, adminId } = opts;
  const [set] = await db.select().from(sets).where(eq(sets.id, setId)).limit(1);
  if (!set) throw new AttendanceError(404, "Set not found");
  if (set.isRewardClaimed) throw new AttendanceError(409, "Reward already claimed");

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

  const cats = categories.map((c) => ({
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

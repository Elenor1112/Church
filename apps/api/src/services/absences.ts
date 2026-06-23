import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index";
import { attendance, fridayCategories, memberCategoryProgress, users } from "../db/schema";
import { ABSENCE_ALERT_THRESHOLD, PAUSE_THRESHOLD } from "@church/shared";
import type { AbsentMember, AlertAudience } from "@church/shared";

/**
 * Absence model — meetings are held every Friday. A member is "absent" for a
 * past Friday when they were already an approved member on that Friday yet have
 * no attendance record for it. Everything below is derived from real
 * `attendance` rows in PostgreSQL; nothing is cached or stored.
 */

/** All past Fridays (UTC) on/after `since`, up to and including the most recent. */
function pastFridaysSince(since: Date): string[] {
  const fridays: string[] = [];
  const now = new Date();
  // Walk back from the most recent Friday (today if today is Friday).
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sun … 5 = Fri
  const back = (day - 5 + 7) % 7; // days since the last Friday
  d.setUTCDate(d.getUTCDate() - back);

  const sinceMidnight = Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate());
  while (d.getTime() >= sinceMidnight) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    fridays.push(`${y}-${m}-${dd}`);
    d.setUTCDate(d.getUTCDate() - 7);
  }
  return fridays;
}

interface MemberAbsence {
  memberId: string;
  memberName: string;
  phone: string;
  group: string | null;
  totalAbsences: number;
  status: AbsentMember["status"];
}

/**
 * Compute total Friday absences for every approved member, derived from the
 * attendance table. Returns one entry per approved member (including zero
 * absences) so callers can apply their own threshold.
 */
async function computeMemberAbsences(): Promise<MemberAbsence[]> {
  const members = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      createdAt: users.createdAt,
      status: users.status,
    })
    .from(users)
    .where(and(eq(users.role, "member"), eq(users.status, "approved")));

  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.id);

  // Friday attendance dates per member (only Fridays count toward absences).
  const attended = await db
    .select({
      memberId: attendance.memberId,
      date: attendance.attendanceDate,
    })
    .from(attendance)
    .where(
      and(
        inArray(attendance.memberId, memberIds),
        // 5 = Friday in Postgres `extract(dow ...)` (0 = Sunday).
        sql`extract(dow from ${attendance.attendanceDate}) = 5`,
      ),
    );

  const attendedByMember = new Map<string, Set<string>>();
  for (const row of attended) {
    let set = attendedByMember.get(row.memberId);
    if (!set) {
      set = new Set();
      attendedByMember.set(row.memberId, set);
    }
    set.add(row.date);
  }

  // Current group/class = the member's first completed category label.
  const progressRows = await db
    .select({
      memberId: memberCategoryProgress.memberId,
      labelEn: fridayCategories.labelEn,
    })
    .from(memberCategoryProgress)
    .innerJoin(fridayCategories, eq(memberCategoryProgress.categoryId, fridayCategories.id))
    .where(
      and(
        inArray(memberCategoryProgress.memberId, memberIds),
        eq(memberCategoryProgress.completed, true),
      ),
    );
  const groupByMember = new Map<string, string>();
  for (const row of progressRows) {
    if (!groupByMember.has(row.memberId)) groupByMember.set(row.memberId, row.labelEn);
  }

  return members.map((m) => {
    const createdAt = m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt);
    const expectedFridays = pastFridaysSince(createdAt);
    const attendedSet = attendedByMember.get(m.id) ?? new Set<string>();
    const totalAbsences = expectedFridays.reduce(
      (acc, friday) => acc + (attendedSet.has(friday) ? 0 : 1),
      0,
    );
    return {
      memberId: m.id,
      memberName: `${m.firstName} ${m.lastName}`,
      phone: m.phone,
      group: groupByMember.get(m.id) ?? null,
      totalAbsences,
      status: m.status,
    };
  });
}

/** Members with >= ABSENCE_ALERT_THRESHOLD absences (the Absences section). */
export async function getAbsentMembers(): Promise<AbsentMember[]> {
  const all = await computeMemberAbsences();
  return all
    .filter((m) => m.totalAbsences >= ABSENCE_ALERT_THRESHOLD)
    .sort((a, b) => b.totalAbsences - a.totalAbsences);
}

/** Members with >= PAUSE_THRESHOLD absences (the Paused Members section). */
export async function getPausedMembers(): Promise<AbsentMember[]> {
  const all = await computeMemberAbsences();
  return all
    .filter((m) => m.totalAbsences >= PAUSE_THRESHOLD)
    .sort((a, b) => b.totalAbsences - a.totalAbsences);
}

/** Live recipient counts per alert audience. */
export async function getAlertAudienceCounts(): Promise<{
  all: number;
  absent_2: number;
  absent_6: number;
}> {
  const [allRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "member"), eq(users.status, "approved")));

  const computed = await computeMemberAbsences();
  return {
    all: allRow?.count ?? 0,
    absent_2: computed.filter((m) => m.totalAbsences >= ABSENCE_ALERT_THRESHOLD).length,
    absent_6: computed.filter((m) => m.totalAbsences >= PAUSE_THRESHOLD).length,
  };
}

/** Resolve the concrete member IDs an alert audience targets. */
export async function resolveAudienceMemberIds(audience: AlertAudience): Promise<string[]> {
  if (audience === "all") {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "member"), eq(users.status, "approved")));
    return rows.map((r) => r.id);
  }
  const threshold = audience === "absent_6" ? PAUSE_THRESHOLD : ABSENCE_ALERT_THRESHOLD;
  const computed = await computeMemberAbsences();
  return computed.filter((m) => m.totalAbsences >= threshold).map((m) => m.memberId);
}

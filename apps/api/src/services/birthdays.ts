import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index";
import { fridayCategories, memberCategoryProgress, users } from "../db/schema";
import { BIRTHDAY_WINDOW_DAYS } from "@church/shared";
import type { BirthdayItem } from "@church/shared";

/**
 * Birthdays in the last `BIRTHDAY_WINDOW_DAYS` days — derived live from the
 * `users.birthday` column in PostgreSQL. The window is year-agnostic (birth
 * year is ignored when matching) and computed entirely in SQL so we never load
 * the whole roster into the API to filter it.
 *
 * The match is anchored to a "celebrated anniversary" expression that handles
 * the awkward cases:
 *   - Month boundary (e.g. today = Jul 3 still surfaces late-June birthdays).
 *   - Year boundary (e.g. today = Jan 3 still surfaces late-December birthdays)
 *     — covered by also testing last year's anniversary date.
 *   - Feb 29 birthdays in non-leap years are observed on Feb 28 (the
 *     `LEAST(day, days-in-that-February)` clamp below), so they still appear.
 */

/**
 * The member's birthday as it falls in `year`, clamped so Feb 29 collapses to
 * Feb 28 in non-leap years instead of producing an invalid date. Returns a
 * Postgres `date` expression.
 */
function anniversaryIn(year: ReturnType<typeof sql>) {
  // make_date(year, month, LEAST(day, last_day_of_that_month_for_this_birthday))
  // The inner make_date uses day 1 to find the real length of the target month.
  return sql`make_date(
    ${year}::int,
    extract(month from ${users.birthday})::int,
    LEAST(
      extract(day from ${users.birthday})::int,
      extract(day from (make_date(${year}::int, extract(month from ${users.birthday})::int, 1) + interval '1 month - 1 day'))::int
    )
  )`;
}

export async function getRecentBirthdays(): Promise<BirthdayItem[]> {
  const thisYear = sql`extract(year from current_date)::int`;
  const lastYear = sql`(extract(year from current_date)::int - 1)`;
  const thisYears = anniversaryIn(thisYear);
  const lastYears = anniversaryIn(lastYear);

  // The earliest day still inside the window (inclusive). With a 7-day window
  // this is current_date - 6.
  const windowStart = sql`current_date - make_interval(days => ${BIRTHDAY_WINDOW_DAYS - 1}::int)`;

  // The matched anniversary: prefer this year's; fall back to last year's so
  // late-December birthdays surface in early January.
  const celebrated = sql`CASE
    WHEN ${thisYears} BETWEEN ${windowStart} AND current_date THEN ${thisYears}
    WHEN ${lastYears} BETWEEN ${windowStart} AND current_date THEN ${lastYears}
    ELSE NULL
  END`;

  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      birthday: users.birthday,
      daysAgo: sql<number>`(current_date - (${celebrated}))::int`,
      age: sql<number>`(extract(year from (${celebrated})) - extract(year from ${users.birthday}))::int`,
    })
    .from(users)
    .where(
      and(
        eq(users.role, "member"),
        eq(users.status, "approved"),
        sql`${celebrated} IS NOT NULL`,
      ),
    )
    // Most recent birthday first (0 = today), oldest within the window last.
    .orderBy(sql`(current_date - (${celebrated}))::int asc`, users.firstName);

  if (rows.length === 0) return [];

  // Current group/class = the member's first completed category label
  // (same definition used by the Absences section).
  const memberIds = rows.map((r) => r.id);
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

  return rows.map((r) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`,
    phone: r.phone,
    birthday: r.birthday,
    monthDay: r.birthday.slice(5), // MM-DD
    daysAgo: r.daysAgo,
    age: r.age,
    group: groupByMember.get(r.id) ?? null,
  }));
}

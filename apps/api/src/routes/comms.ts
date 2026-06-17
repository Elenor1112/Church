import { Hono } from "hono";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index";
import { absences, users } from "../db/schema";
import { createAbsenceSchema } from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth, requirePermission } from "../middleware/auth";
import type { AppEnv } from "../lib/context";
import type { BirthdayItem, AbsenceItem } from "@church/shared";

export const commsRoutes = new Hono<AppEnv>();

commsRoutes.use("*", requireAuth);

/** Birthdays — virtual query derived from the birthday column, sorted by month/day. */
commsRoutes.get("/birthdays", requirePermission("can_send_messages"), async (c) => {
  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      birthday: users.birthday,
    })
    .from(users)
    .where(eq(users.status, "approved"))
    .orderBy(sql`to_char(${users.birthday}, 'MM-DD')`);

  const items: BirthdayItem[] = rows.map((r) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`,
    phone: r.phone,
    birthday: r.birthday,
    monthDay: r.birthday.slice(5), // MM-DD
  }));
  return c.json({ birthdays: items });
});

commsRoutes.get("/absences", requirePermission("can_send_messages"), async (c) => {
  const member = users;
  const rows = await db
    .select({
      id: absences.id,
      memberId: absences.memberId,
      firstName: member.firstName,
      lastName: member.lastName,
      date: absences.date,
      reason: absences.reason,
    })
    .from(absences)
    .innerJoin(member, eq(absences.memberId, member.id))
    .orderBy(desc(absences.date))
    .limit(200);

  const items: AbsenceItem[] = rows.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    memberName: `${r.firstName} ${r.lastName}`,
    date: r.date,
    reason: r.reason,
  }));
  return c.json({ absences: items });
});

commsRoutes.post("/absences", requirePermission("can_send_messages"), async (c) => {
  const body = await parseBody(c, createAbsenceSchema);
  const [created] = await db
    .insert(absences)
    .values({ memberId: body.memberId, date: body.date, reason: body.reason ?? null })
    .returning();
  return c.json({ absence: created }, 201);
});

import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index";
import { absences, users } from "../db/schema";
import { createAbsenceSchema } from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth, requireApproved, requirePermission } from "../middleware/auth";
import {
  getAbsentMembers,
  getPausedMembers,
  getAlertAudienceCounts,
} from "../services/absences";
import { getRecentBirthdays } from "../services/birthdays";
import type { AppEnv } from "../lib/context";
import type { AbsenceItem } from "@church/shared";

export const commsRoutes = new Hono<AppEnv>();

commsRoutes.use("*", requireAuth, requireApproved);

/**
 * Birthdays in the last 7 days — derived live from the `users.birthday` column,
 * year-agnostic and filtered/sorted in PostgreSQL. See services/birthdays.ts.
 */
commsRoutes.get("/birthdays", requirePermission("can_send_messages"), async (c) => {
  const birthdays = await getRecentBirthdays();
  return c.json({ birthdays });
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

/**
 * Members absent >= 2 Fridays — derived live from attendance records.
 * Powers the Communications → Absences section.
 */
commsRoutes.get("/absent-members", requirePermission("can_send_messages"), async (c) => {
  const members = await getAbsentMembers();
  return c.json({ members });
});

/**
 * Members absent >= 6 Fridays (Paused) — derived live from attendance records.
 * Powers the Communications → Paused Members section.
 */
commsRoutes.get("/paused-members", requirePermission("can_send_messages"), async (c) => {
  const members = await getPausedMembers();
  return c.json({ members });
});

/** Live recipient counts per alert audience (All / Absent 2 / Absent 6). */
commsRoutes.get("/alert-counts", requirePermission("can_send_messages"), async (c) => {
  const counts = await getAlertAudienceCounts();
  return c.json({ counts });
});

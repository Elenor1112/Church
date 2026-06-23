import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index";
import { alerts, notifications, readReceipts, users } from "../db/schema";
import { createAlertSchema } from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth, requirePermission } from "../middleware/auth";
import { resolveAudienceMemberIds } from "../services/absences";
import type { AppEnv } from "../lib/context";
import type { AlertItem } from "@church/shared";

export const alertRoutes = new Hono<AppEnv>();

alertRoutes.use("*", requireAuth);

/** Member-facing: alerts with this member's read status. */
alertRoutes.get("/", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select({
      id: alerts.id,
      title: alerts.title,
      message: alerts.message,
      createdBy: alerts.createdBy,
      createdAt: alerts.createdAt,
      readId: readReceipts.id,
    })
    .from(alerts)
    .leftJoin(
      readReceipts,
      and(eq(readReceipts.alertId, alerts.id), eq(readReceipts.memberId, user.id)),
    )
    .orderBy(desc(alerts.createdAt))
    .limit(100);

  const items: AlertItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    isRead: r.readId !== null,
  }));
  return c.json({ alerts: items });
});

/** Mark an alert read (creates a read receipt). */
alertRoutes.post("/:id/read", async (c) => {
  const user = c.get("user");
  const alertId = c.req.param("id");
  await db
    .insert(readReceipts)
    .values({ alertId, memberId: user.id })
    .onConflictDoNothing({ target: [readReceipts.alertId, readReceipts.memberId] });
  return c.json({ ok: true });
});

/**
 * Send a new alert to a chosen audience (all members / absent 2 / absent 6).
 * Recipients are resolved dynamically from the database; each gets a personal
 * notification while the alert row remains the canonical record for receipts.
 */
alertRoutes.post("/", requirePermission("can_send_messages"), async (c) => {
  const user = c.get("user");
  const body = await parseBody(c, createAlertSchema);

  const recipientIds = await resolveAudienceMemberIds(body.audience);

  const [created] = await db
    .insert(alerts)
    .values({ title: body.title, message: body.message, createdBy: user.id })
    .returning();

  if (created && recipientIds.length > 0) {
    await db.insert(notifications).values(
      recipientIds.map((memberId) => ({
        userId: memberId,
        title: body.title,
        message: body.message,
        type: "alert" as const,
      })),
    );
  }

  return c.json({ alert: created, recipientCount: recipientIds.length }, 201);
});

/** Read receipts for an alert (admin view). */
alertRoutes.get("/:id/receipts", requirePermission("can_send_messages"), async (c) => {
  const alertId = c.req.param("id");
  const rows = await db
    .select({
      memberId: readReceipts.memberId,
      firstName: users.firstName,
      lastName: users.lastName,
      readAt: readReceipts.readAt,
    })
    .from(readReceipts)
    .innerJoin(users, eq(readReceipts.memberId, users.id))
    .where(eq(readReceipts.alertId, alertId))
    .orderBy(desc(readReceipts.readAt));

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "member"), eq(users.status, "approved")));

  return c.json({
    totalRecipients: totalRow?.count ?? 0,
    readCount: rows.length,
    receipts: rows.map((r) => ({
      memberId: r.memberId,
      memberName: `${r.firstName} ${r.lastName}`,
      readAt: r.readAt.toISOString(),
    })),
  });
});

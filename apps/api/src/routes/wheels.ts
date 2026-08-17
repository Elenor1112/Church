import { Hono } from "hono";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index";
import { wheels, wheelSegments, wheelSpins, users } from "../db/schema";
import { createWheelSchema, toggleActiveSchema } from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth, requireApproved, requirePermission } from "../middleware/auth";
import { fanOutNotifications } from "../services/notify";
import type { AppEnv } from "../lib/context";
import type {
  WheelItem,
  WheelAdminItem,
  WheelSpinResult,
  WheelSegment,
  WheelSegmentAdmin,
} from "@church/shared";

export const wheelRoutes = new Hono<AppEnv>();

wheelRoutes.use("*", requireAuth, requireApproved);

type SegmentRow = typeof wheelSegments.$inferSelect;

/** Load every wheel's segments in one query, ordered, grouped by wheelId. */
async function loadSegments(wheelIds: string[]) {
  const byWheel = new Map<string, SegmentRow[]>();
  if (wheelIds.length === 0) return byWheel;
  const rows = await db
    .select()
    .from(wheelSegments)
    .where(inArray(wheelSegments.wheelId, wheelIds))
    .orderBy(asc(wheelSegments.sortOrder));
  for (const r of rows) {
    const list = byWheel.get(r.wheelId) ?? [];
    list.push(r);
    byWheel.set(r.wheelId, list);
  }
  return byWheel;
}

/** Public shape of a segment — deliberately omits `weight` so members cannot
 *  read the odds off the wire. */
function toPublicSegment(s: SegmentRow): WheelSegment {
  return { id: s.id, label: s.label, color: s.color, sortOrder: s.sortOrder };
}

/**
 * Pick a winning segment using the admin-set weights.
 *
 * A cumulative-weight walk over a single random draw: each segment owns a slice
 * of [0, totalWeight) proportional to its weight. Equal weights therefore give a
 * uniform wheel, which is what an admin gets by default.
 */
function pickWeighted(segments: SegmentRow[]): SegmentRow {
  const total = segments.reduce((sum, s) => sum + Math.max(1, s.weight), 0);
  let roll = Math.random() * total;
  for (const s of segments) {
    roll -= Math.max(1, s.weight);
    if (roll < 0) return s;
  }
  // Only reachable through floating-point drift at the very top of the range.
  return segments[segments.length - 1]!;
}

// ---------------------------------------------------------------------------
// Member: list active wheels, each with this member's own spin result
// ---------------------------------------------------------------------------
wheelRoutes.get("/", async (c) => {
  const user = c.get("user");
  const now = new Date();

  const rows = await db
    .select()
    .from(wheels)
    .where(eq(wheels.isActive, true))
    .orderBy(desc(wheels.createdAt))
    .limit(50);

  const visible = rows.filter((w) => !w.expiresAt || w.expiresAt > now);
  if (visible.length === 0) return c.json({ wheels: [] });

  const wheelIds = visible.map((w) => w.id);
  const segmentsByWheel = await loadSegments(wheelIds);

  // The caller's own spins — most recent first, so a re-spinnable wheel reports
  // the latest result.
  const mySpins = await db
    .select()
    .from(wheelSpins)
    .where(and(eq(wheelSpins.memberId, user.id), inArray(wheelSpins.wheelId, wheelIds)))
    .orderBy(desc(wheelSpins.spunAt));

  const mySpinByWheel = new Map<string, (typeof mySpins)[number]>();
  for (const s of mySpins) {
    if (!mySpinByWheel.has(s.wheelId)) mySpinByWheel.set(s.wheelId, s);
  }

  const items: WheelItem[] = visible.map((w) => {
    const segs = segmentsByWheel.get(w.id) ?? [];
    const spin = mySpinByWheel.get(w.id);
    const landedIndex = spin ? segs.findIndex((s) => s.id === spin.segmentId) : -1;
    return {
      id: w.id,
      title: w.title,
      description: w.description,
      isActive: w.isActive,
      onePerMember: w.onePerMember,
      expiresAt: w.expiresAt?.toISOString() ?? null,
      createdAt: w.createdAt.toISOString(),
      segments: segs.map(toPublicSegment),
      mySpin:
        spin && landedIndex >= 0
          ? {
              segmentId: spin.segmentId,
              label: segs[landedIndex]!.label,
              index: landedIndex,
              spunAt: spin.spunAt.toISOString(),
            }
          : null,
    };
  });

  return c.json({ wheels: items });
});

// ---------------------------------------------------------------------------
// Member: spin
//
// The server picks the landing segment and records it before responding; the app
// only animates to the index it is handed. That is what makes the result
// non-negotiable — a member cannot re-roll by discarding an animation.
// ---------------------------------------------------------------------------
wheelRoutes.post("/:id/spin", async (c) => {
  const user = c.get("user");
  const wheelId = c.req.param("id");
  const now = new Date();

  const [wheel] = await db.select().from(wheels).where(eq(wheels.id, wheelId)).limit(1);
  if (!wheel) return c.json({ error: "Wheel not found" }, 404);
  if (!wheel.isActive) return c.json({ error: "Wheel is closed" }, 400);
  if (wheel.expiresAt && wheel.expiresAt <= now) {
    return c.json({ error: "Wheel has expired" }, 400);
  }

  const segments = await db
    .select()
    .from(wheelSegments)
    .where(eq(wheelSegments.wheelId, wheelId))
    .orderBy(asc(wheelSegments.sortOrder));
  if (segments.length === 0) return c.json({ error: "Wheel has no segments" }, 400);

  if (wheel.onePerMember) {
    const [existing] = await db
      .select({ id: wheelSpins.id })
      .from(wheelSpins)
      .where(and(eq(wheelSpins.memberId, user.id), eq(wheelSpins.wheelId, wheelId)))
      .limit(1);
    if (existing) return c.json({ error: "Already spun this wheel" }, 409);
  }

  const winner = pickWeighted(segments);
  const index = segments.findIndex((s) => s.id === winner.id);

  const [spin] = await db
    .insert(wheelSpins)
    .values({ wheelId, segmentId: winner.id, memberId: user.id })
    .returning();
  if (!spin) return c.json({ error: "Failed to record spin" }, 500);

  const result: WheelSpinResult = {
    segmentId: winner.id,
    label: winner.label,
    index,
    spunAt: spin.spunAt.toISOString(),
  };
  return c.json(result);
});

// ---------------------------------------------------------------------------
// Admin: create a wheel with its segments
// ---------------------------------------------------------------------------
wheelRoutes.post("/", requirePermission("can_send_messages"), async (c) => {
  const admin = c.get("user");
  const body = await parseBody(c, createWheelSchema);

  const [created] = await db
    .insert(wheels)
    .values({
      title: body.title,
      description: body.description ?? null,
      createdBy: admin.id,
      isActive: true,
      onePerMember: body.onePerMember,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning();

  if (!created) return c.json({ error: "Failed to create wheel" }, 500);

  await db.insert(wheelSegments).values(
    body.segments.map((s, i) => ({
      wheelId: created.id,
      label: s.label,
      color: s.color ?? null,
      weight: s.weight,
      sortOrder: i,
    })),
  );

  // Notify all approved members.
  const members = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "member"), eq(users.status, "approved")));

  await fanOutNotifications(
    members.map((m) => m.id),
    { title: "🎡 New Spin Wheel", message: body.title, type: "generic" },
  );

  return c.json({ wheel: { id: created.id } }, 201);
});

// ---------------------------------------------------------------------------
// Admin: list all wheels with per-segment spin counts
// ---------------------------------------------------------------------------
wheelRoutes.get("/admin", requirePermission("can_send_messages"), async (c) => {
  const rows = await db.select().from(wheels).orderBy(desc(wheels.createdAt)).limit(100);
  if (rows.length === 0) return c.json({ wheels: [] });

  const wheelIds = rows.map((w) => w.id);
  const segmentsByWheel = await loadSegments(wheelIds);

  const counts = await db
    .select({ segmentId: wheelSpins.segmentId, count: sql<number>`count(*)::int` })
    .from(wheelSpins)
    .where(inArray(wheelSpins.wheelId, wheelIds))
    .groupBy(wheelSpins.segmentId);
  const countBySegment = new Map(counts.map((r) => [r.segmentId, r.count]));

  const items: WheelAdminItem[] = rows.map((w) => {
    const segs = segmentsByWheel.get(w.id) ?? [];
    const segments: WheelSegmentAdmin[] = segs.map((s) => ({
      ...toPublicSegment(s),
      weight: s.weight,
      spinCount: countBySegment.get(s.id) ?? 0,
    }));
    return {
      id: w.id,
      title: w.title,
      description: w.description,
      createdBy: w.createdBy,
      isActive: w.isActive,
      onePerMember: w.onePerMember,
      expiresAt: w.expiresAt?.toISOString() ?? null,
      createdAt: w.createdAt.toISOString(),
      segments,
      totalSpins: segments.reduce((sum, s) => sum + s.spinCount, 0),
    };
  });

  return c.json({ wheels: items });
});

// ---------------------------------------------------------------------------
// Admin: toggle active
// ---------------------------------------------------------------------------
wheelRoutes.patch("/:id", requirePermission("can_send_messages"), async (c) => {
  const wheelId = c.req.param("id");
  const body = await parseBody(c, toggleActiveSchema);
  await db.update(wheels).set({ isActive: body.isActive }).where(eq(wheels.id, wheelId));
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Admin: delete a wheel (segments and spins cascade)
// ---------------------------------------------------------------------------
wheelRoutes.delete("/:id", requirePermission("can_send_messages"), async (c) => {
  const wheelId = c.req.param("id");
  await db.delete(wheels).where(eq(wheels.id, wheelId));
  return c.json({ ok: true });
});

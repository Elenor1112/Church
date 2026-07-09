import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index";
import { polls, pollOptions, pollVotes, notifications, users } from "../db/schema";
import { createPollSchema, pollVoteSchema, toggleActiveSchema } from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth, requirePermission, requireRole } from "../middleware/auth";
import type { AppEnv } from "../lib/context";
import type { PollItem, PollAdminItem } from "@church/shared";

export const pollRoutes = new Hono<AppEnv>();

pollRoutes.use("*", requireAuth);

// ---------------------------------------------------------------------------
// Member: list active polls
// ---------------------------------------------------------------------------
pollRoutes.get("/", async (c) => {
  const user = c.get("user");
  const now = new Date();

  const rows = await db
    .select()
    .from(polls)
    .where(eq(polls.isActive, true))
    .orderBy(desc(polls.createdAt))
    .limit(50);

  const pollIds = rows.map((p) => p.id);
  if (pollIds.length === 0) return c.json({ polls: [] });

  const options = await db
    .select()
    .from(pollOptions)
    .where(inArray(pollOptions.pollId, pollIds))
    .orderBy(pollOptions.sortOrder);

  const myVotes = await db
    .select({ pollId: pollVotes.pollId, optionId: pollVotes.optionId })
    .from(pollVotes)
    .where(and(eq(pollVotes.memberId, user.id), inArray(pollVotes.pollId, pollIds)));

  const voteCounts = await db
    .select({ pollId: pollVotes.pollId, optionId: pollVotes.optionId, count: sql<number>`count(*)::int` })
    .from(pollVotes)
    .where(inArray(pollVotes.pollId, pollIds))
    .groupBy(pollVotes.pollId, pollVotes.optionId);

  const myVoteMap = new Map(myVotes.map((v) => [v.pollId, v.optionId]));
  const voteCountMap = new Map(voteCounts.map((v) => [`${v.pollId}:${v.optionId}`, v.count]));
  const totalVoteMap = new Map<string, number>();
  for (const v of voteCounts) {
    totalVoteMap.set(v.pollId, (totalVoteMap.get(v.pollId) ?? 0) + v.count);
  }

  const optionsByPoll = new Map<string, typeof options>();
  for (const opt of options) {
    const arr = optionsByPoll.get(opt.pollId) ?? [];
    arr.push(opt);
    optionsByPoll.set(opt.pollId, arr);
  }

  const items: PollItem[] = rows
    .filter((p) => !p.expiresAt || p.expiresAt > now)
    .map((p) => {
      const voted = myVoteMap.get(p.id) ?? null;
      const expired = p.expiresAt && p.expiresAt <= now;
      const showCounts = voted !== null || !!expired;
      const opts = optionsByPoll.get(p.id) ?? [];
      return {
        id: p.id,
        question: p.question,
        options: opts.map((o) => ({
          id: o.id,
          text: o.text,
          sortOrder: o.sortOrder,
          voteCount: showCounts ? (voteCountMap.get(`${p.id}:${o.id}`) ?? 0) : undefined,
        })),
        isActive: p.isActive,
        expiresAt: p.expiresAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        myVoteOptionId: voted,
        totalVotes: totalVoteMap.get(p.id) ?? 0,
      };
    });

  return c.json({ polls: items });
});

// ---------------------------------------------------------------------------
// Member: vote
// ---------------------------------------------------------------------------
pollRoutes.post("/:id/vote", async (c) => {
  const user = c.get("user");
  const pollId = c.req.param("id");
  const body = await parseBody(c, pollVoteSchema);

  const [poll] = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1);
  if (!poll) return c.json({ error: "Poll not found" }, 404);
  if (!poll.isActive) return c.json({ error: "Poll is closed" }, 400);
  if (poll.expiresAt && poll.expiresAt <= new Date()) {
    return c.json({ error: "Poll has expired" }, 400);
  }

  const [option] = await db
    .select()
    .from(pollOptions)
    .where(and(eq(pollOptions.id, body.optionId), eq(pollOptions.pollId, pollId)))
    .limit(1);
  if (!option) return c.json({ error: "Option not found for this poll" }, 400);

  const [existing] = await db
    .select({ id: pollVotes.id })
    .from(pollVotes)
    .where(and(eq(pollVotes.memberId, user.id), eq(pollVotes.pollId, pollId)))
    .limit(1);
  if (existing) return c.json({ error: "Already voted on this poll" }, 409);

  await db.insert(pollVotes).values({
    pollId,
    optionId: body.optionId,
    memberId: user.id,
  });

  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Admin: create poll
// ---------------------------------------------------------------------------
pollRoutes.post("/", requirePermission("can_send_messages"), async (c) => {
  const admin = c.get("user");
  const body = await parseBody(c, createPollSchema);

  const [created] = await db
    .insert(polls)
    .values({
      question: body.question,
      createdBy: admin.id,
      isActive: true,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning();

  if (!created) return c.json({ error: "Failed to create poll" }, 500);

  await db.insert(pollOptions).values(
    body.options.map((text, i) => ({ pollId: created.id, text, sortOrder: i })),
  );

  // Notify all approved members.
  const members = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "member"), eq(users.status, "approved")));

  if (members.length > 0) {
    await db.insert(notifications).values(
      members.map((m) => ({
        userId: m.id,
        title: "📊 New Poll",
        message: body.question,
        type: "generic" as const,
      })),
    );
  }

  return c.json({ poll: { id: created.id } }, 201);
});

// ---------------------------------------------------------------------------
// Admin: list all polls with stats
// ---------------------------------------------------------------------------
pollRoutes.get("/admin", requirePermission("can_send_messages"), async (c) => {
  const rows = await db.select().from(polls).orderBy(desc(polls.createdAt)).limit(100);

  if (rows.length === 0) return c.json({ polls: [] });
  const pollIds = rows.map((p) => p.id);

  const options = await db
    .select()
    .from(pollOptions)
    .where(inArray(pollOptions.pollId, pollIds))
    .orderBy(pollOptions.sortOrder);

  const voteCounts = await db
    .select({ pollId: pollVotes.pollId, optionId: pollVotes.optionId, count: sql<number>`count(*)::int` })
    .from(pollVotes)
    .where(inArray(pollVotes.pollId, pollIds))
    .groupBy(pollVotes.pollId, pollVotes.optionId);

  const voteCountMap = new Map(voteCounts.map((v) => [`${v.pollId}:${v.optionId}`, v.count]));
  const totalVoteMap = new Map<string, number>();
  for (const v of voteCounts) {
    totalVoteMap.set(v.pollId, (totalVoteMap.get(v.pollId) ?? 0) + v.count);
  }
  const optionsByPoll = new Map<string, typeof options>();
  for (const opt of options) {
    const arr = optionsByPoll.get(opt.pollId) ?? [];
    arr.push(opt);
    optionsByPoll.set(opt.pollId, arr);
  }

  const items: PollAdminItem[] = rows.map((p) => ({
    id: p.id,
    question: p.question,
    createdBy: p.createdBy,
    isActive: p.isActive,
    expiresAt: p.expiresAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    myVoteOptionId: null,
    totalVotes: totalVoteMap.get(p.id) ?? 0,
    options: (optionsByPoll.get(p.id) ?? []).map((o) => ({
      id: o.id,
      text: o.text,
      sortOrder: o.sortOrder,
      voteCount: voteCountMap.get(`${p.id}:${o.id}`) ?? 0,
    })),
  }));

  return c.json({ polls: items });
});

// ---------------------------------------------------------------------------
// Admin: toggle active
// ---------------------------------------------------------------------------
pollRoutes.patch("/:id", requirePermission("can_send_messages"), async (c) => {
  const pollId = c.req.param("id");
  const body = await parseBody(c, toggleActiveSchema);
  await db.update(polls).set({ isActive: body.isActive }).where(eq(polls.id, pollId));
  return c.json({ ok: true });
});

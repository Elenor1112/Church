import { Hono } from "hono";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index";
import { trivia, triviaQuestions, triviaAnswers, notifications, users } from "../db/schema";
import { createTriviaSchema, triviaAnswerSchema, toggleActiveSchema } from "@church/shared";
import { parseBody } from "../lib/validate";
import { requireAuth, requirePermission } from "../middleware/auth";
import type { AppEnv } from "../lib/context";
import type {
  TriviaItem,
  TriviaQuestionItem,
  TriviaAdminItem,
  TriviaAdminQuestionItem,
} from "@church/shared";

export const triviaRoutes = new Hono<AppEnv>();

triviaRoutes.use("*", requireAuth);

type QuestionRow = typeof triviaQuestions.$inferSelect;
type AnswerRow = typeof triviaAnswers.$inferSelect;

/** Load all questions for a set of trivia ids, ordered, grouped by triviaId. */
async function loadQuestions(triviaIds: string[]) {
  if (triviaIds.length === 0) return new Map<string, QuestionRow[]>();
  const rows = await db
    .select()
    .from(triviaQuestions)
    .where(inArray(triviaQuestions.triviaId, triviaIds))
    .orderBy(asc(triviaQuestions.sortOrder));
  const byTrivia = new Map<string, QuestionRow[]>();
  for (const r of rows) {
    const list = byTrivia.get(r.triviaId) ?? [];
    list.push(r);
    byTrivia.set(r.triviaId, list);
  }
  return byTrivia;
}

/** Per-question answer stats + the caller's own answers, keyed by questionId. */
async function loadAnswerStats(questionIds: string[], memberId: string) {
  const empty = {
    total: new Map<string, number>(),
    correct: new Map<string, number>(),
    mine: new Map<string, AnswerRow>(),
  };
  if (questionIds.length === 0) return empty;

  const totals = await db
    .select({ questionId: triviaAnswers.questionId, count: sql<number>`count(*)::int` })
    .from(triviaAnswers)
    .where(inArray(triviaAnswers.questionId, questionIds))
    .groupBy(triviaAnswers.questionId);

  const corrects = await db
    .select({ questionId: triviaAnswers.questionId, count: sql<number>`count(*)::int` })
    .from(triviaAnswers)
    .where(
      and(inArray(triviaAnswers.questionId, questionIds), eq(triviaAnswers.isCorrect, true)),
    )
    .groupBy(triviaAnswers.questionId);

  const mine = await db
    .select()
    .from(triviaAnswers)
    .where(
      and(eq(triviaAnswers.memberId, memberId), inArray(triviaAnswers.questionId, questionIds)),
    );

  return {
    total: new Map(totals.map((r) => [r.questionId, r.count])),
    correct: new Map(corrects.map((r) => [r.questionId, r.count])),
    mine: new Map(mine.map((a) => [a.questionId, a])),
  };
}

// ---------------------------------------------------------------------------
// Member: list active trivia quizzes with their questions
// ---------------------------------------------------------------------------
triviaRoutes.get("/", async (c) => {
  const user = c.get("user");
  const now = new Date();

  const rows = await db
    .select()
    .from(trivia)
    .where(eq(trivia.isActive, true))
    .orderBy(desc(trivia.createdAt))
    .limit(50);

  const visible = rows.filter((t) => !t.expiresAt || t.expiresAt > now);
  if (visible.length === 0) return c.json({ trivia: [] });

  const questionsByTrivia = await loadQuestions(visible.map((t) => t.id));
  const allQuestionIds = [...questionsByTrivia.values()].flat().map((q) => q.id);
  const stats = await loadAnswerStats(allQuestionIds, user.id);

  const items: TriviaItem[] = visible.map((t) => {
    const qs = questionsByTrivia.get(t.id) ?? [];
    const questions: TriviaQuestionItem[] = qs.map((q) => {
      const ans = stats.mine.get(q.id) ?? null;
      return {
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options) as string[],
        points: q.points,
        myAnswer: ans
          ? { chosenIndex: ans.chosenIndex, isCorrect: ans.isCorrect, pointsEarned: ans.pointsEarned }
          : null,
        // Reveal the correct answer only once this member has answered it.
        correctIndex: ans ? q.correctIndex : null,
        totalAnswers: stats.total.get(q.id) ?? 0,
        correctAnswers: stats.correct.get(q.id) ?? 0,
      };
    });
    return {
      id: t.id,
      title: t.title,
      isActive: t.isActive,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      questions,
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
    };
  });

  return c.json({ trivia: items });
});

// ---------------------------------------------------------------------------
// Member: answer a single question
// ---------------------------------------------------------------------------
triviaRoutes.post("/questions/:questionId/answer", async (c) => {
  const user = c.get("user");
  const questionId = c.req.param("questionId");
  const body = await parseBody(c, triviaAnswerSchema);

  const [question] = await db
    .select()
    .from(triviaQuestions)
    .where(eq(triviaQuestions.id, questionId))
    .limit(1);
  if (!question) return c.json({ error: "Question not found" }, 404);

  const [quiz] = await db.select().from(trivia).where(eq(trivia.id, question.triviaId)).limit(1);
  if (!quiz || !quiz.isActive) return c.json({ error: "Trivia is closed" }, 400);
  if (quiz.expiresAt && quiz.expiresAt <= new Date()) {
    return c.json({ error: "Trivia has expired" }, 400);
  }

  const options: string[] = JSON.parse(question.options);
  if (body.chosenIndex < 0 || body.chosenIndex >= options.length) {
    return c.json({ error: "Invalid option index" }, 400);
  }

  const [existing] = await db
    .select({ id: triviaAnswers.id })
    .from(triviaAnswers)
    .where(and(eq(triviaAnswers.memberId, user.id), eq(triviaAnswers.questionId, questionId)))
    .limit(1);
  if (existing) return c.json({ error: "Already answered this question" }, 409);

  const isCorrect = body.chosenIndex === question.correctIndex;
  const pointsEarned = isCorrect ? question.points : 0;

  await db.insert(triviaAnswers).values({
    questionId,
    memberId: user.id,
    chosenIndex: body.chosenIndex,
    isCorrect,
    pointsEarned,
  });

  return c.json({ isCorrect, correctIndex: question.correctIndex, pointsEarned });
});

// ---------------------------------------------------------------------------
// Admin: create a trivia quiz with one or more questions
// ---------------------------------------------------------------------------
triviaRoutes.post("/", requirePermission("can_send_messages"), async (c) => {
  const admin = c.get("user");
  const body = await parseBody(c, createTriviaSchema);

  const [created] = await db
    .insert(trivia)
    .values({
      title: body.title,
      createdBy: admin.id,
      isActive: true,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning();

  if (!created) return c.json({ error: "Failed to create trivia" }, 500);

  await db.insert(triviaQuestions).values(
    body.questions.map((q, i) => ({
      triviaId: created.id,
      question: q.question,
      options: JSON.stringify(q.options),
      correctIndex: q.correctIndex,
      points: q.points,
      sortOrder: i,
    })),
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
        title: "🧠 New Trivia",
        message: body.title,
        type: "generic" as const,
      })),
    );
  }

  return c.json({ trivia: { id: created.id } }, 201);
});

// ---------------------------------------------------------------------------
// Admin: list all trivia quizzes with per-question stats
// ---------------------------------------------------------------------------
triviaRoutes.get("/admin", requirePermission("can_send_messages"), async (c) => {
  const admin = c.get("user");
  const rows = await db.select().from(trivia).orderBy(desc(trivia.createdAt)).limit(100);
  if (rows.length === 0) return c.json({ trivia: [] });

  const questionsByTrivia = await loadQuestions(rows.map((t) => t.id));
  const allQuestionIds = [...questionsByTrivia.values()].flat().map((q) => q.id);
  const stats = await loadAnswerStats(allQuestionIds, admin.id);

  const items: TriviaAdminItem[] = rows.map((t) => {
    const qs = questionsByTrivia.get(t.id) ?? [];
    const questions: TriviaAdminQuestionItem[] = qs.map((q) => ({
      id: q.id,
      question: q.question,
      options: JSON.parse(q.options) as string[],
      points: q.points,
      correctIndex: q.correctIndex,
      myAnswer: null,
      totalAnswers: stats.total.get(q.id) ?? 0,
      correctAnswers: stats.correct.get(q.id) ?? 0,
    }));
    return {
      id: t.id,
      title: t.title,
      createdBy: t.createdBy,
      isActive: t.isActive,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      questions,
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
    };
  });

  return c.json({ trivia: items });
});

// ---------------------------------------------------------------------------
// Admin: toggle active
// ---------------------------------------------------------------------------
triviaRoutes.patch("/:id", requirePermission("can_send_messages"), async (c) => {
  const triviaId = c.req.param("id");
  const body = await parseBody(c, toggleActiveSchema);
  await db.update(trivia).set({ isActive: body.isActive }).where(eq(trivia.id, triviaId));
  return c.json({ ok: true });
});

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  date,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["member", "admin", "super_admin"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "approved", "rejected"]);
export const categorySlugEnum = pgEnum("category_slug", [
  "contemporary_issues",
  "bible",
  "spirituality",
  "saints_lives",
  "free",
]);
export const announcementCategoryEnum = pgEnum("announcement_category", [
  "trips",
  "occasions",
  "custom",
]);
export const areaEnum = pgEnum("area", [
  "first_settlement",
  "third_settlement",
  "fifth_settlement",
  "sixth_settlement",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "approval",
  "rejection",
  "set_completed",
  "announcement",
  "alert",
  "attendance",
  "generic",
]);

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    area: areaEnum("area").notNull().default("first_settlement"),
    addressDetails: varchar("address_details", { length: 200 }).notNull().default(""),
    birthday: date("birthday").notNull(),
    spousePhone: varchar("spouse_phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    profileImage: text("profile_image"),
    role: roleEnum("role").notNull().default("member"),
    status: userStatusEnum("status").notNull().default("pending"),
    completedSets: integer("completed_sets").notNull().default(0),
    pushToken: text("push_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    roleIdx: index("users_role_idx").on(t.role),
    statusIdx: index("users_status_idx").on(t.status),
  }),
);

// ---------------------------------------------------------------------------
// admin_permissions (one row per admin user)
// ---------------------------------------------------------------------------
export const adminPermissions = pgTable("admin_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  canScan: boolean("can_scan").notNull().default(false),
  canScanAdmins: boolean("can_scan_admins").notNull().default(false),
  canViewLogs: boolean("can_view_logs").notNull().default(false),
  canSendMessages: boolean("can_send_messages").notNull().default(false),
  canGenerateReports: boolean("can_generate_reports").notNull().default(false),
});

// ---------------------------------------------------------------------------
// qr_codes (one active token per member)
// ---------------------------------------------------------------------------
export const qrCodes = pgTable("qr_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  qrToken: varchar("qr_token", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// friday_categories (seeded with 4 fixed categories)
// ---------------------------------------------------------------------------
export const fridayCategories = pgTable("friday_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: categorySlugEnum("slug").notNull().unique(),
  labelAr: varchar("label_ar", { length: 120 }).notNull(),
  labelEn: varchar("label_en", { length: 120 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// attendance — one check-in per member per day enforced via partial unique idx
// (see migration). week/year computed at insert.
// ---------------------------------------------------------------------------
export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    adminId: uuid("admin_id").references(() => users.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => fridayCategories.id, {
      onDelete: "set null",
    }),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
    attendanceDate: date("attendance_date")
      .notNull()
      .default(sql`CURRENT_DATE`),
    weekNumber: integer("week_number").notNull(),
    yearNumber: integer("year_number").notNull(),
  },
  (t) => ({
    // Prevent duplicate attendance for the same member on the same day.
    uniqMemberDay: unique("attendance_member_day_uniq").on(t.memberId, t.attendanceDate),
    memberIdx: index("attendance_member_idx").on(t.memberId),
    dateIdx: index("attendance_date_idx").on(t.attendanceDate),
  }),
);

// ---------------------------------------------------------------------------
// member_category_progress — current in-progress set per member
// ---------------------------------------------------------------------------
export const memberCategoryProgress = pgTable(
  "member_category_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => fridayCategories.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    uniqMemberCategory: unique("progress_member_category_uniq").on(t.memberId, t.categoryId),
  }),
);

// ---------------------------------------------------------------------------
// sets — completed sets (all 4 categories done)
// ---------------------------------------------------------------------------
export const sets = pgTable("sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  isRewardClaimed: boolean("is_reward_claimed").notNull().default(false),
  rewardClaimedBy: uuid("reward_claimed_by").references(() => users.id, { onDelete: "set null" }),
  rewardClaimedAt: timestamp("reward_claimed_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    type: notificationTypeEnum("type").notNull().default("generic"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("notifications_user_idx").on(t.userId),
  }),
);

// ---------------------------------------------------------------------------
// announcements
// ---------------------------------------------------------------------------
export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  category: announcementCategoryEnum("category").notNull().default("custom"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// alerts + read_receipts
// ---------------------------------------------------------------------------
export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const readReceipts = pgTable(
  "read_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alertId: uuid("alert_id")
      .notNull()
      .references(() => alerts.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqAlertMember: unique("read_receipts_alert_member_uniq").on(t.alertId, t.memberId),
  }),
);

// ---------------------------------------------------------------------------
// absences
// ---------------------------------------------------------------------------
export const absences = pgTable("absences", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// polls + poll_options + poll_votes
// ---------------------------------------------------------------------------
export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: varchar("question", { length: 500 }).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollOptions = pgTable("poll_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  text: varchar("text", { length: 300 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const pollVotes = pgTable(
  "poll_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    votedAt: timestamp("voted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqMemberPoll: unique("poll_votes_member_poll_uniq").on(t.memberId, t.pollId),
  }),
);

// ---------------------------------------------------------------------------
// trivia (quiz) + trivia_questions + trivia_answers
// A trivia is a quiz containing one or more questions; each question has its
// own options, correct answer, and points. Answers are recorded per question.
// ---------------------------------------------------------------------------
export const trivia = pgTable("trivia", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const triviaQuestions = pgTable("trivia_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  triviaId: uuid("trivia_id")
    .notNull()
    .references(() => trivia.id, { onDelete: "cascade" }),
  question: varchar("question", { length: 500 }).notNull(),
  options: text("options").notNull(), // JSON array of strings
  correctIndex: integer("correct_index").notNull(),
  points: integer("points").notNull().default(10),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const triviaAnswers = pgTable(
  "trivia_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => triviaQuestions.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chosenIndex: integer("chosen_index").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    pointsEarned: integer("points_earned").notNull().default(0),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqMemberQuestion: unique("trivia_answers_member_question_uniq").on(t.memberId, t.questionId),
  }),
);

// ---------------------------------------------------------------------------
// meetings — scheduled by super admins; the scanner opens during their windows
// ---------------------------------------------------------------------------
export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  meetingDate: date("meeting_date"), // specific date "YYYY-MM-DD"; null = legacy weekly
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday … 6 = Saturday (derived from meetingDate)
  startTime: varchar("start_time", { length: 5 }).notNull(), // "HH:MM" 24h
  endTime: varchar("end_time", { length: 5 }).notNull().default("12:30"), // "HH:MM" 24h
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ one, many }) => ({
  permissions: one(adminPermissions, {
    fields: [users.id],
    references: [adminPermissions.userId],
  }),
  qrCode: one(qrCodes, { fields: [users.id], references: [qrCodes.userId] }),
  attendance: many(attendance),
  progress: many(memberCategoryProgress),
  sets: many(sets),
  notifications: many(notifications),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  member: one(users, { fields: [attendance.memberId], references: [users.id] }),
  admin: one(users, { fields: [attendance.adminId], references: [users.id] }),
  category: one(fridayCategories, {
    fields: [attendance.categoryId],
    references: [fridayCategories.id],
  }),
}));

export const progressRelations = relations(memberCategoryProgress, ({ one }) => ({
  member: one(users, { fields: [memberCategoryProgress.memberId], references: [users.id] }),
  category: one(fridayCategories, {
    fields: [memberCategoryProgress.categoryId],
    references: [fridayCategories.id],
  }),
}));

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type AttendanceRow = typeof attendance.$inferSelect;
export type CategoryRow = typeof fridayCategories.$inferSelect;
export type SetRow = typeof sets.$inferSelect;

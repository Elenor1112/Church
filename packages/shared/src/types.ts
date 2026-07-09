import type {
  Role,
  UserStatus,
  AdminPermissionKey,
  CategorySlug,
  NotificationType,
  AnnouncementCategory,
  Area,
} from "./constants";

/** Public-safe user shape returned by the API (never includes password hash). */
export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  area: Area;
  addressDetails: string;
  birthday: string; // YYYY-MM-DD
  spousePhone: string | null;
  email: string | null;
  profileImage: string | null;
  role: Role;
  status: UserStatus;
  completedSets: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPermissions {
  can_scan: boolean;
  can_scan_admins: boolean;
  can_view_logs: boolean;
  can_send_messages: boolean;
  can_generate_reports: boolean;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
  permissions: AdminPermissions | null;
}

export interface CategoryProgress {
  slug: CategorySlug;
  labelAr: string;
  labelEn: string;
  completed: boolean;
}

export interface SetProgress {
  completedCount: number;
  total: number;
  categories: CategoryProgress[];
  pendingRewardSetId: string | null;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  adminId: string | null;
  adminName: string | null;
  categorySlug: CategorySlug | null;
  checkedInAt: string;
  weekNumber: number;
  yearNumber: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  createdBy: string | null;
  createdAt: string;
  isRead: boolean;
}

export interface BirthdayItem {
  id: string;
  name: string;
  phone: string;
  birthday: string; // YYYY-MM-DD (original stored date, including birth year)
  monthDay: string; // MM-DD
  /** Whole-day offset from today (0 = today … 6 = six days ago). */
  daysAgo: number;
  /** Age the member turned on this birthday, derived from the stored year. */
  age: number;
  /** Current group/class label (first completed category), if any. */
  group: string | null;
}

export interface AbsenceItem {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  reason: string | null;
}

/**
 * A member surfaced by absence rules — total absences derived from missed
 * Friday meetings (real attendance records). Used by both the Absences
 * (>= 2) and Paused (>= 6) sections.
 */
export interface AbsentMember {
  memberId: string;
  memberName: string;
  phone: string;
  /** First completed category label (current group/class), if any. */
  group: string | null;
  totalAbsences: number;
  status: UserStatus;
}

/** Live recipient counts per alert audience, from database queries. */
export interface AlertAudienceCounts {
  all: number;
  absent_2: number;
  absent_6: number;
}

export interface DashboardStats {
  totalMembers: number;
  totalAdmins: number;
  todayCheckIns: number;
  pendingApprovals: number;
  weeklyAttendance: { week: string; count: number }[];
  recentActivity: { id: string; text: string; createdAt: string }[];
}

export interface ApiError {
  error: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------
export interface PollOption {
  id: string;
  text: string;
  sortOrder: number;
  /** Only populated after the member has voted or the poll has expired. */
  voteCount?: number;
}

export interface PollItem {
  id: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  /** ID of the option this member voted for, or null if not yet voted. */
  myVoteOptionId: string | null;
  totalVotes: number;
}

export interface PollAdminItem extends PollItem {
  createdBy: string | null;
}

// ---------------------------------------------------------------------------
// Trivia
// ---------------------------------------------------------------------------
/** One question within a trivia quiz, as seen by a member. */
export interface TriviaQuestionItem {
  id: string;
  question: string;
  options: string[];
  points: number;
  /** Null = not answered yet. */
  myAnswer: { chosenIndex: number; isCorrect: boolean; pointsEarned: number } | null;
  /** Only revealed after the member answers (or the quiz expired). */
  correctIndex: number | null;
  totalAnswers: number;
  correctAnswers: number;
}

export interface TriviaItem {
  id: string;
  title: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  questions: TriviaQuestionItem[];
  /** Sum of points across all questions. */
  totalPoints: number;
}

/** Admin view of a question — correctIndex is always revealed. */
export interface TriviaAdminQuestionItem extends Omit<TriviaQuestionItem, "correctIndex"> {
  correctIndex: number;
}

export interface TriviaAdminItem extends Omit<TriviaItem, "questions"> {
  createdBy: string | null;
  questions: TriviaAdminQuestionItem[];
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------
export interface Meeting {
  id: string;
  name: string;
  /** Specific calendar date "YYYY-MM-DD" (null for legacy weekly meetings). */
  meetingDate: string | null;
  /** 0 = Sunday … 6 = Saturday (JS getDay index; derived from meetingDate). */
  dayOfWeek: number;
  /** "HH:MM" 24-hour local start time. */
  startTime: string;
  /** "HH:MM" 24-hour local end time. */
  endTime: string;
  createdBy: string | null;
  createdAt: string;
}

export type { Role, UserStatus, AdminPermissionKey, CategorySlug, NotificationType };

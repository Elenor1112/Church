import type {
  Role,
  UserStatus,
  AdminPermissionKey,
  CategorySlug,
  NotificationType,
} from "./constants";

/** Public-safe user shape returned by the API (never includes password hash). */
export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
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
  birthday: string;
  monthDay: string; // MM-DD
}

export interface AbsenceItem {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  reason: string | null;
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

export type { Role, UserStatus, AdminPermissionKey, CategorySlug, NotificationType };

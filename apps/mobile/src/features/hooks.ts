import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type {
  AuthResponse,
  PublicUser,
  AdminPermissions,
  SetProgress,
  AttendanceRecord,
  NotificationItem,
  Announcement,
  AlertItem,
  BirthdayItem,
  AbsenceItem,
  DashboardStats,
  CategorySlug,
  Role,
  UserStatus,
} from "@church/shared";
import type { LoginInput, RegisterInput } from "@church/shared";

// ---- Auth ----
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<AuthResponse>("/api/auth/login", input, { auth: false }),
    onSuccess: (res) => setSession(res),
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post<AuthResponse>("/api/auth/register", input, { auth: false }),
    onSuccess: (res) => setSession(res),
  });
}

// ---- Member home ----
export interface MemberHome {
  greetingName: string;
  verse: { en: string; refEn: string; ar: string; refAr: string };
  meeting: { titleEn: string; titleAr: string; day: string; time: string };
  attendanceCount: number;
  completedSets: number;
  progress: SetProgress;
  announcements: { id: string; title: string; body: string; createdAt: string }[];
}

export function useMemberHome() {
  return useQuery({ queryKey: ["member-home"], queryFn: () => api.get<MemberHome>("/api/member/home") });
}

export function useSetProgress() {
  return useQuery({
    queryKey: ["set-progress"],
    queryFn: () => api.get<SetProgress>("/api/attendance/progress"),
  });
}

// ---- QR ----
export function useMyQr() {
  return useQuery({
    queryKey: ["my-qr"],
    queryFn: () => api.get<{ qrToken: string; createdAt: string }>("/api/member/qr"),
  });
}

export function useRefreshQr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ qrToken: string }>("/api/member/qr/refresh"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-qr"] }),
  });
}

// ---- Notifications ----
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ notifications: NotificationItem[] }>("/api/notifications"),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unread-count"],
    queryFn: () => api.get<{ count: number }>("/api/notifications/unread-count"),
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

// ---- Alerts ----
export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.get<{ alerts: AlertItem[] }>("/api/alerts"),
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/alerts/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useSendAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; message: string }) => api.post("/api/alerts", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

// ---- Announcements ----
export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.get<{ announcements: Announcement[] }>("/api/announcements"),
  });
}

export function useSendAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; body: string }) => api.post("/api/announcements", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["member-home"] });
    },
  });
}

// ---- Categories ----
export interface CategoryDTO {
  id: string;
  slug: CategorySlug;
  labelAr: string;
  labelEn: string;
}
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<{ categories: CategoryDTO[] }>("/api/categories"),
    staleTime: Infinity,
  });
}

// ---- Attendance / scanning ----
export interface ScanResponse {
  member: { id: string; name: string; profileImage: string | null };
  alreadyCheckedInToday: boolean;
  categoryNewlyCompleted: boolean;
  setCompleted: boolean;
}
export function useScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { qrToken: string; categorySlug: CategorySlug }) =>
      api.post<ScanResponse>("/api/attendance/scan", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["today-count"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["pending-sets"] });
    },
  });
}

export function useTodayCount() {
  return useQuery({
    queryKey: ["today-count"],
    queryFn: () => api.get<{ count: number }>("/api/attendance/today/count"),
  });
}

export function useAttendance(range: "today" | "week", q: string) {
  return useQuery({
    queryKey: ["attendance", range, q],
    queryFn: () =>
      api.get<{ records: AttendanceRecord[] }>(
        `/api/attendance?range=${range}&q=${encodeURIComponent(q)}`,
      ),
  });
}

export function usePendingSets() {
  return useQuery({
    queryKey: ["pending-sets"],
    queryFn: () =>
      api.get<{ sets: { id: string; memberId: string; memberName: string; completedAt: string }[] }>(
        "/api/attendance/sets/pending",
      ),
  });
}

export function useClaimReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (setId: string) => api.post("/api/attendance/sets/claim", { setId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-sets"] }),
  });
}

// ---- Users / members ----
export function useUsers(filters: {
  role: "all" | Role;
  status: "all" | UserStatus;
  q: string;
}) {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: () =>
      api.get<{ users: PublicUser[] }>(
        `/api/users?role=${filters.role}&status=${filters.status}&q=${encodeURIComponent(filters.q)}`,
      ),
  });
}

export function usePendingCount() {
  return useQuery({
    queryKey: ["pending-count"],
    queryFn: () => api.get<{ count: number }>("/api/users/pending/count"),
  });
}

export function useSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      api.patch<{ user: PublicUser }>(`/api/users/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["pending-count"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      api.post<{ user: PublicUser }>("/api/users", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      api.post<{ user: PublicUser }>("/api/admins", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateProfile() {
  const updateUser = useAuthStore((s) => s.updateUser);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      api.patch<{ user: PublicUser }>("/api/users/me", input),
    onSuccess: (res) => {
      updateUser(res.user);
      qc.invalidateQueries({ queryKey: ["member-home"] });
    },
  });
}

// ---- Comms ----
export function useBirthdays() {
  return useQuery({
    queryKey: ["birthdays"],
    queryFn: () => api.get<{ birthdays: BirthdayItem[] }>("/api/comms/birthdays"),
  });
}

export function useAbsences() {
  return useQuery({
    queryKey: ["absences"],
    queryFn: () => api.get<{ absences: AbsenceItem[] }>("/api/comms/absences"),
  });
}

// ---- Dashboard ----
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardStats>("/api/reports/dashboard"),
  });
}

export type { AdminPermissions };

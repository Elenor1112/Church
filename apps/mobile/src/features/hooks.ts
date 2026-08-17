import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type {
  AuthResponse,
  PublicUser,
  AdminPermissions,
  SetProgress,
  ProgressDetail,
  AttendanceRecord,
  NotificationItem,
  Announcement,
  AlertItem,
  BirthdayItem,
  AbsenceItem,
  AbsentMember,
  AlertAudienceCounts,
  AlertAudience,
  DashboardStats,
  CategorySlug,
  Role,
  UserStatus,
  PollItem,
  PollAdminItem,
  TriviaItem,
  TriviaAdminItem,
  WheelItem,
  WheelAdminItem,
  WheelSpinResult,
  AnnouncementCategory,
  Meeting,
} from "@church/shared";
import type {
  CreatePollInput,
  CreateTriviaInput,
  CreateWheelInput,
  CreateMeetingInput,
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
  meetings: Meeting[];
  attendanceCount: number;
  completedSets: number;
  progress: SetProgress;
  announcements: { id: string; title: string; body: string; category: AnnouncementCategory; createdAt: string }[];
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

/**
 * Per-category attendance breakdown for the signed-in member (all-time counts,
 * not just the current set). Only fetched when the progress sheet is opened.
 */
export function useProgressDetail(enabled = true) {
  return useQuery({
    queryKey: ["progress-detail"],
    queryFn: () => api.get<ProgressDetail>("/api/attendance/progress/detail"),
    enabled,
  });
}

// ---- QR ----
export function useMyQr() {
  return useQuery({
    queryKey: ["my-qr"],
    queryFn: () =>
      api.get<{ qrToken: string; createdAt: string; expiresAt: string }>("/api/member/qr"),
    // Tokens expire server-side, so refresh well inside the TTL. Without this a
    // QR screen left open overnight would display a code the scanner rejects.
    refetchInterval: 60 * 60_000, // hourly
    refetchOnWindowFocus: true,
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
    mutationFn: (input: { title: string; message: string; audience: AlertAudience }) =>
      api.post<{ recipientCount: number }>("/api/alerts", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
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
    mutationFn: (input: { title: string; body: string; category: AnnouncementCategory }) =>
      api.post("/api/announcements", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["member-home"] });
      // Publishing an announcement fans out notifications, so refresh those too.
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
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

/** Scan an admin's QR to record their attendance (no Friday category). */
export function useScanAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { qrToken: string }) =>
      api.post<ScanResponse>("/api/attendance/scan-admin", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["today-count"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useTodayCount() {
  return useQuery({
    queryKey: ["today-count"],
    queryFn: () => api.get<{ count: number }>("/api/attendance/today/count"),
  });
}

export function useAttendance(range: "today" | "month", q: string) {
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

export interface CompletedSet {
  id: string;
  memberId: string;
  memberName: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  completedAt: string;
}

export function useCompletedSets() {
  return useQuery({
    queryKey: ["completed-sets"],
    queryFn: () => api.get<{ sets: CompletedSet[] }>("/api/attendance/sets/completed"),
  });
}

export function useClaimReward() {
  const qc = useQueryClient();
  return useMutation({
    // qrToken (optional) verifies the scanned member QR matches the set's member.
    mutationFn: (input: { setId: string; qrToken?: string }) =>
      api.post("/api/attendance/sets/claim", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-sets"] });
      qc.invalidateQueries({ queryKey: ["completed-sets"] });
    },
  });
}

// ---- Users / members ----
export function useUsers(filters: {
  role: "all" | Role;
  status: "all" | UserStatus;
  q: string;
}) {
  return useQuery({
    // Spread into the key so it's compared by value, not by object identity —
    // a fresh `filters` object each render must not look like a new query.
    queryKey: ["users", filters.role, filters.status, filters.q],
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

/** Members absent >= 2 Fridays — derived live from attendance records. */
export function useAbsentMembers() {
  return useQuery({
    queryKey: ["absent-members"],
    queryFn: () => api.get<{ members: AbsentMember[] }>("/api/comms/absent-members"),
  });
}

/** Members absent >= 6 Fridays (Paused) — derived live from attendance records. */
export function usePausedMembers() {
  return useQuery({
    queryKey: ["paused-members"],
    queryFn: () => api.get<{ members: AbsentMember[] }>("/api/comms/paused-members"),
  });
}

/** Live recipient counts per alert audience. */
export function useAlertCounts() {
  return useQuery({
    queryKey: ["alert-counts"],
    queryFn: () => api.get<{ counts: AlertAudienceCounts }>("/api/comms/alert-counts"),
  });
}

// ---- Dashboard ----
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardStats>("/api/reports/dashboard"),
  });
}

// ---- Polls ----
export function usePolls() {
  return useQuery({
    queryKey: ["polls"],
    queryFn: () => api.get<{ polls: PollItem[] }>("/api/polls"),
  });
}

export function useAdminPolls() {
  return useQuery({
    queryKey: ["polls-admin"],
    queryFn: () => api.get<{ polls: PollAdminItem[] }>("/api/polls/admin"),
  });
}

export function useVotePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      api.post<{ ok: boolean }>(`/api/polls/${pollId}/vote`, { optionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}

export function useCreatePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePollInput) => api.post<{ poll: { id: string } }>("/api/polls", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["polls-admin"] });
    },
  });
}

export function useTogglePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch<{ ok: boolean }>(`/api/polls/${id}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["polls-admin"] });
      qc.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}

// ---- Trivia ----
export function useTrivia() {
  return useQuery({
    queryKey: ["trivia"],
    queryFn: () => api.get<{ trivia: TriviaItem[] }>("/api/trivia"),
  });
}

export function useAdminTrivia() {
  return useQuery({
    queryKey: ["trivia-admin"],
    queryFn: () => api.get<{ trivia: TriviaAdminItem[] }>("/api/trivia/admin"),
  });
}

export function useAnswerTrivia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, chosenIndex }: { questionId: string; chosenIndex: number }) =>
      api.post<{ isCorrect: boolean; correctIndex: number; pointsEarned: number }>(
        `/api/trivia/questions/${questionId}/answer`,
        { chosenIndex },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trivia"] });
    },
  });
}

export function useCreateTrivia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTriviaInput) =>
      api.post<{ trivia: { id: string } }>("/api/trivia", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trivia-admin"] });
    },
  });
}

export function useToggleTrivia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch<{ ok: boolean }>(`/api/trivia/${id}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trivia-admin"] });
      qc.invalidateQueries({ queryKey: ["trivia"] });
    },
  });
}

// ---- Spin wheel ----
export function useWheels() {
  return useQuery({
    queryKey: ["wheels"],
    queryFn: () => api.get<{ wheels: WheelItem[] }>("/api/wheels"),
  });
}

export function useAdminWheels() {
  return useQuery({
    queryKey: ["wheels-admin"],
    queryFn: () => api.get<{ wheels: WheelAdminItem[] }>("/api/wheels/admin"),
  });
}

/**
 * The server decides the landing segment, so the caller animates to the returned
 * `index` and only then reveals it. The wheel list is refreshed after the reveal
 * (not here) so the result card does not pop in mid-spin.
 */
export function useSpinWheel() {
  return useMutation({
    mutationFn: (wheelId: string) => api.post<WheelSpinResult>(`/api/wheels/${wheelId}/spin`, {}),
  });
}

export function useCreateWheel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWheelInput) =>
      api.post<{ wheel: { id: string } }>("/api/wheels", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wheels-admin"] });
    },
  });
}

export function useToggleWheel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch<{ ok: boolean }>(`/api/wheels/${id}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wheels-admin"] });
      qc.invalidateQueries({ queryKey: ["wheels"] });
    },
  });
}

export function useDeleteWheel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/wheels/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wheels-admin"] });
      qc.invalidateQueries({ queryKey: ["wheels"] });
    },
  });
}

// ---- Meetings ----
export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: () => api.get<{ meetings: Meeting[] }>("/api/meetings"),
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeetingInput) => api.post<{ meeting: Meeting }>("/api/meetings", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["member-home"] });
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/meetings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["member-home"] });
    },
  });
}

export type { AdminPermissions };

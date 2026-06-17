import { create } from "zustand";
import type { CategorySlug } from "@church/shared";

/** Scanner UI state: the category the admin currently has selected. */
interface AttendanceState {
  selectedCategory: CategorySlug | null;
  setSelectedCategory: (slug: CategorySlug) => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  selectedCategory: null,
  setSelectedCategory: (slug) => set({ selectedCategory: slug }),
}));

/** Lightweight notification UI state (server data lives in React Query). */
interface NotificationState {
  lastSeenAt: number | null;
  markSeen: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  lastSeenAt: null,
  markSeen: () => set({ lastSeenAt: Date.now() }),
}));

/** Member directory filters used by admin/super-admin screens. */
interface MemberFilterState {
  query: string;
  role: "all" | "member" | "admin" | "super_admin";
  status: "all" | "pending" | "approved" | "rejected";
  setQuery: (q: string) => void;
  setRole: (r: MemberFilterState["role"]) => void;
  setStatus: (s: MemberFilterState["status"]) => void;
  reset: () => void;
}

export const useMemberFilterStore = create<MemberFilterState>((set) => ({
  query: "",
  role: "all",
  status: "all",
  setQuery: (query) => set({ query }),
  setRole: (role) => set({ role }),
  setStatus: (status) => set({ status }),
  reset: () => set({ query: "", role: "all", status: "all" }),
}));

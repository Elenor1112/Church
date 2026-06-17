import { create } from "zustand";
import type { PublicUser, AdminPermissions, AuthResponse } from "@church/shared";
import { saveToken, getToken, clearToken } from "@/lib/storage";
import { api, configureApi } from "@/lib/api";

interface AuthState {
  token: string | null;
  user: PublicUser | null;
  permissions: AdminPermissions | null;
  hydrated: boolean;
  setSession: (res: AuthResponse) => Promise<void>;
  updateUser: (user: PublicUser) => void;
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  permissions: null,
  hydrated: false,

  setSession: async (res) => {
    await saveToken(res.token);
    set({ token: res.token, user: res.user, permissions: res.permissions });
  },

  updateUser: (user) => set({ user }),

  hydrate: async () => {
    const token = await getToken();
    if (!token) {
      set({ hydrated: true });
      return;
    }
    set({ token });
    try {
      const me = await api.get<{ user: PublicUser; permissions: AdminPermissions | null }>(
        "/api/auth/me",
      );
      set({ user: me.user, permissions: me.permissions, hydrated: true });
    } catch {
      await clearToken();
      set({ token: null, user: null, permissions: null, hydrated: true });
    }
  },

  signOut: async () => {
    await clearToken();
    set({ token: null, user: null, permissions: null });
  },
}));

// Wire the api client to the auth store (token injection + 401 handling).
configureApi({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => {
    void useAuthStore.getState().signOut();
  },
});

import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { registerForPushNotifications } from "@/lib/notifications";
import type { Role } from "@church/shared";

/** Redirects away if the user is missing or not in the allowed roles. */
export function useRoleGuard(allowed: Role[]) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/sign-in");
      return;
    }
    if (user.role === "member" && user.status !== "approved") {
      router.replace("/(auth)/pending");
      return;
    }
    if (!allowed.includes(user.role)) {
      router.replace("/");
    }
  }, [user, allowed, router]);

  // Best-effort push registration once authenticated.
  useEffect(() => {
    if (user) void registerForPushNotifications();
  }, [user]);

  return user;
}

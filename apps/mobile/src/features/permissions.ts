import { useAuthStore } from "@/store/authStore";
import type { AdminPermissionKey } from "@church/shared";

/** Super admins implicitly have every permission. */
export function useHasPermission(key: AdminPermissionKey): boolean {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return permissions?.[key] ?? false;
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const isSuper = user?.role === "super_admin";
  return {
    canScan: isSuper || (permissions?.can_scan ?? false),
    canScanAdmins: isSuper || (permissions?.can_scan_admins ?? false),
    canViewLogs: isSuper || (permissions?.can_view_logs ?? false),
    canSendMessages: isSuper || (permissions?.can_send_messages ?? false),
    canGenerateReports: isSuper || (permissions?.can_generate_reports ?? false),
  };
}

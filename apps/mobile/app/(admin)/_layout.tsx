import React from "react";
import { Tabs } from "expo-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useRoleGuard } from "@/features/useRoleGuard";
import { usePermissions } from "@/features/permissions";
import { usePendingCount } from "@/features/hooks";
import { makeTabBar } from "@/components/FloatingTabBar";

export default function AdminLayout() {
  const { t } = useI18n();
  useRoleGuard(["admin", "super_admin"]);
  const perms = usePermissions();
  const pending = usePendingCount();

  // Icons are the OUTLINE variants; the tab bar swaps to the filled glyph on
  // selection, so the active tab is legible without relying on colour alone.
  const TabBar = makeTabBar({
    scanner: { icon: "scan-outline", label: t("scanner") },
    attendance: { icon: "list-outline", label: t("attendance") },
    comms: { icon: "chatbubbles-outline", label: t("comms") },
    members: { icon: "people-outline", label: t("members"), badge: pending.data?.count },
    profile: { icon: "person-outline", label: t("profile") },
  });

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="scanner" options={{ href: perms.canScan ? undefined : null }} />
      <Tabs.Screen name="attendance" options={{ href: perms.canViewLogs ? undefined : null }} />
      <Tabs.Screen name="comms" options={{ href: perms.canSendMessages ? undefined : null }} />
      <Tabs.Screen name="members" />
      <Tabs.Screen name="profile" />
      {/* polls is not a visible tab; navigated to from comms */}
      <Tabs.Screen name="polls" options={{ href: null }} />
    </Tabs>
  );
}

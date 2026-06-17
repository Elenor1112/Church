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

  const TabBar = makeTabBar({
    scanner: { icon: "scan", label: t("scanner") },
    attendance: { icon: "list", label: t("attendance") },
    comms: { icon: "chatbubbles", label: t("comms") },
    members: { icon: "people", label: t("members"), badge: pending.data?.count },
    profile: { icon: "person", label: t("profile") },
  });

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="scanner" options={{ href: perms.canScan ? undefined : null }} />
      <Tabs.Screen name="attendance" options={{ href: perms.canViewLogs ? undefined : null }} />
      <Tabs.Screen name="comms" options={{ href: perms.canSendMessages ? undefined : null }} />
      <Tabs.Screen name="members" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

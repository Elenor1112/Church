import React from "react";
import { Tabs } from "expo-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useRoleGuard } from "@/features/useRoleGuard";
import { makeTabBar } from "@/components/FloatingTabBar";

export default function SuperLayout() {
  const { t } = useI18n();
  useRoleGuard(["super_admin"]);

  const TabBar = makeTabBar({
    dashboard: { icon: "grid", label: t("dashboard") },
    members: { icon: "people", label: t("memberCenter") },
    profile: { icon: "person", label: t("profile") },
  });

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="members" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

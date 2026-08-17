import React from "react";
import { Tabs } from "expo-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useRoleGuard } from "@/features/useRoleGuard";
import { makeTabBar } from "@/components/FloatingTabBar";

export default function SuperLayout() {
  const { t } = useI18n();
  useRoleGuard(["super_admin"]);

  // Icons are the OUTLINE variants; the tab bar swaps to the filled glyph on
  // selection, so the active tab is legible without relying on colour alone.
  const TabBar = makeTabBar({
    dashboard: { icon: "grid-outline", label: t("dashboard") },
    members: { icon: "people-outline", label: t("memberCenter") },
    meetings: { icon: "calendar-outline", label: t("meetings") },
    profile: { icon: "person-outline", label: t("profile") },
  });

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="members" />
      <Tabs.Screen name="meetings" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

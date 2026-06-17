import React from "react";
import { Tabs } from "expo-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useRoleGuard } from "@/features/useRoleGuard";
import { useUnreadCount } from "@/features/hooks";
import { makeTabBar } from "@/components/FloatingTabBar";

export default function MemberLayout() {
  const { t } = useI18n();
  useRoleGuard(["member", "admin", "super_admin"]);
  const unread = useUnreadCount();

  const TabBar = makeTabBar({
    home: { icon: "home", label: t("home") },
    qr: { icon: "qr-code", label: t("myQr") },
    alerts: { icon: "notifications", label: t("alerts"), badge: unread.data?.count },
    profile: { icon: "person", label: t("profile") },
  });

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="qr" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

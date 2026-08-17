import React from "react";
import { Tabs } from "expo-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useRoleGuard } from "@/features/useRoleGuard";
import { useUnreadCount, usePolls, useTrivia } from "@/features/hooks";
import { usePollsStore } from "@/store/uiStores";
import { makeTabBar } from "@/components/FloatingTabBar";

export default function MemberLayout() {
  const { t } = useI18n();
  useRoleGuard(["member", "admin", "super_admin"]);
  const unread = useUnreadCount();

  // Polls badge: count items created after lastSeenAt.
  const lastSeenAt = usePollsStore((s) => s.lastSeenAt);
  const pollsQuery = usePolls();
  const triviaQuery = useTrivia();
  const newPollsCount = (pollsQuery.data?.polls ?? []).filter(
    (p) => !lastSeenAt || new Date(p.createdAt).getTime() > lastSeenAt,
  ).length;
  const newTriviaCount = (triviaQuery.data?.trivia ?? []).filter(
    (t) => !lastSeenAt || new Date(t.createdAt).getTime() > lastSeenAt,
  ).length;
  const pollsBadge = newPollsCount + newTriviaCount || undefined;

  // Icons are the OUTLINE variants; the tab bar swaps to the filled glyph on
  // selection, so the active tab is legible without relying on colour alone.
  const TabBar = makeTabBar({
    home: { icon: "home-outline", label: t("home") },
    qr: { icon: "qr-code-outline", label: t("myQr") },
    polls: { icon: "stats-chart-outline", label: t("pollsTrivia"), badge: pollsBadge },
    alerts: { icon: "notifications-outline", label: t("alerts"), badge: unread.data?.count },
    profile: { icon: "person-outline", label: t("profile") },
  });

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="qr" />
      <Tabs.Screen name="polls" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

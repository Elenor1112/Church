import React from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "@/lib/time";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import {
  useNotifications,
  useAlerts,
  useMarkAllRead,
  useMarkAlertRead,
} from "@/features/hooks";
import {
  Screen,
  Card,
  Text,
  Badge,
  SectionHeader,
  EmptyState,
  SkeletonCard,
} from "@/components/ui";

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  approval: "checkmark-circle",
  rejection: "close-circle",
  set_completed: "gift",
  announcement: "megaphone",
  alert: "alert-circle",
  attendance: "checkmark-done",
  generic: "notifications",
};

export default function Alerts() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const notifications = useNotifications();
  const alerts = useAlerts();
  const markAllRead = useMarkAllRead();
  const markAlertRead = useMarkAlertRead();

  const loading = notifications.isLoading || alerts.isLoading;
  const notifs = notifications.data?.notifications ?? [];
  const alertItems = alerts.data?.alerts ?? [];
  const hasUnread = notifs.some((n) => !n.isRead);

  const refetch = () => {
    notifications.refetch();
    alerts.refetch();
  };

  return (
    <Screen
      refreshing={notifications.isRefetching || alerts.isRefetching}
      onRefresh={refetch}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="title">{t("alerts")}</Text>
        {hasUnread ? (
          <Pressable onPress={() => markAllRead.mutate()} hitSlop={8}>
            <Text tone="primary" variant="caption" weight="600">
              {t("markAllRead")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        <>
          {alertItems.length > 0 ? (
            <>
              <SectionHeader title={t("sendAlert").replace(t("send") + " ", "")} />
              {alertItems.map((a) => (
                <Pressable key={a.id} onPress={() => !a.isRead && markAlertRead.mutate(a.id)}>
                  <Card style={{ flexDirection: "row", gap: 12, opacity: a.isRead ? 0.7 : 1 }}>
                    <Ionicons name="alert-circle" size={22} color={colors.warning} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text weight="600">{a.title}</Text>
                      <Text variant="caption" tone="muted">
                        {a.message}
                      </Text>
                    </View>
                    {!a.isRead ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
                  </Card>
                </Pressable>
              ))}
            </>
          ) : null}

          {notifs.length === 0 && alertItems.length === 0 ? (
            <EmptyState icon="notifications-off-outline" title={t("noData")} />
          ) : (
            notifs.map((n) => (
              <Card key={n.id} style={{ flexDirection: "row", gap: 12, opacity: n.isRead ? 0.65 : 1 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: colors.primary + "16",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={TYPE_ICON[n.type] ?? "notifications"} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text weight="600">{n.title}</Text>
                  <Text variant="caption" tone="muted">
                    {n.message}
                  </Text>
                  <Text variant="small" tone="muted">
                    {formatDistanceToNow(n.createdAt)}
                  </Text>
                </View>
                {!n.isRead ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

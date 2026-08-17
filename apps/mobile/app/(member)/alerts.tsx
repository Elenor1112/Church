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
  ScreenHeader,
  Text,
  SectionHeader,
  EmptyState,
  SkeletonCard,
  ListRow,
  IconTile,
  type TileTone,
} from "@/components/ui";
import { spacing, staggerDelay } from "@/theme/tokens";

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  approval: "checkmark-circle",
  rejection: "close-circle",
  set_completed: "gift",
  announcement: "megaphone",
  alert: "alert-circle",
  attendance: "checkmark-done",
  generic: "notifications",
};

/**
 * Notification type drives the icon tint, so approvals read as positive and
 * rejections as negative at a glance — previously every notification used the
 * same brand tile and the type was only discoverable by reading the copy.
 */
const TYPE_TONE: Record<string, TileTone> = {
  approval: "success",
  rejection: "error",
  set_completed: "success",
  announcement: "info",
  alert: "warning",
  attendance: "success",
  generic: "neutral",
};

/** Unread marker. A dot alone is easy to miss, so it sits at a fixed position. */
function UnreadDot({ visible }: { visible: boolean }) {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
      }}
    />
  );
}

export default function Alerts() {
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
    <Screen refreshing={notifications.isRefetching || alerts.isRefetching} onRefresh={refetch}>
      <ScreenHeader
        title={t("alerts")}
        action={
          hasUnread ? (
            <Pressable
              onPress={() => markAllRead.mutate()}
              hitSlop={10}
              accessibilityRole="button"
              style={{ paddingVertical: spacing.xs }}
            >
              <Text variant="caption" tone="primary" weight="600">
                {t("markAllRead")}
              </Text>
            </Pressable>
          ) : null
        }
      />

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
              {alertItems.map((a, i) => (
                <View key={a.id} style={{ opacity: a.isRead ? 0.6 : 1 }}>
                  <ListRow
                    animateIn
                    delay={staggerDelay(i)}
                    onPress={() => {
                      if (!a.isRead) markAlertRead.mutate(a.id);
                    }}
                    leading={<IconTile icon="alert-circle" tone="warning" />}
                    title={a.title}
                    subtitle={a.message}
                    trailing={<UnreadDot visible={!a.isRead} />}
                  />
                </View>
              ))}
            </>
          ) : null}

          {notifs.length === 0 && alertItems.length === 0 ? (
            <EmptyState
              icon="notifications-off-outline"
              title={t("noData")}
              subtitle={t("awaitingApprovalBody")}
            />
          ) : (
            notifs.map((n, i) => (
              <View key={n.id} style={{ opacity: n.isRead ? 0.6 : 1 }}>
                <ListRow
                  animateIn
                  delay={staggerDelay(i)}
                  leading={
                    <IconTile
                      icon={TYPE_ICON[n.type] ?? "notifications"}
                      tone={TYPE_TONE[n.type] ?? "neutral"}
                    />
                  }
                  title={n.title}
                  subtitle={n.message}
                  meta={formatDistanceToNow(n.createdAt)}
                  trailing={<UnreadDot visible={!n.isRead} />}
                />
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

import React from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useDashboard } from "@/features/hooks";
import { formatDistanceToNow } from "@/lib/time";
import {
  Screen,
  ScreenHeader,
  Card,
  Text,
  StatCard,
  SectionHeader,
  SkeletonCard,
  ErrorState,
  EmptyState,
} from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { radius, spacing, hairline, duration } from "@/theme/tokens";

export default function Dashboard() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch, isRefetching } = useDashboard();

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <ScreenHeader overline={t("dashboard")} title={user?.firstName ?? ""} />

      {isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : isError || !data ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <StatCard
              icon="people-outline"
              label={t("totalMembers")}
              value={data.totalMembers}
              accent="primary"
              delay={0}
            />
            <StatCard
              icon="shield-outline"
              label={t("totalAdmins")}
              value={data.totalAdmins}
              accent="neutral"
              delay={60}
            />
          </View>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <StatCard
              icon="checkmark-done"
              label={t("todaysCheckins")}
              value={data.todayCheckIns}
              accent="success"
              delay={120}
            />
            <StatCard
              icon="hourglass-outline"
              label={t("pendingApprovals")}
              value={data.pendingApprovals}
              accent="warning"
              delay={180}
              badge={data.pendingApprovals > 0 ? String(data.pendingApprovals) : undefined}
            />
          </View>

          <SectionHeader title={t("weeklyAttendance")} />
          <Card animateIn delay={200}>
            <WeeklyChart data={data.weeklyAttendance} />
          </Card>

          <SectionHeader title={t("recentActivity")} />
          {data.recentActivity.length === 0 ? (
            <EmptyState icon="pulse-outline" title={t("noData")} />
          ) : (
            <Card animateIn delay={240}>
              {data.recentActivity.map((a, i) => {
                const isLast = i === data.recentActivity.length - 1;
                return (
                  <View key={a.id} style={{ flexDirection: "row", gap: spacing.md }}>
                    {/* Timeline rail: dot + connector, so successive events read
                        as a sequence rather than as separate rows. */}
                    <View style={{ alignItems: "center", width: 8 }}>
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 3.5,
                          backgroundColor: colors.borderStrong,
                          marginTop: 6,
                        }}
                      />
                      {!isLast ? (
                        <View
                          style={{ width: hairline, flex: 1, backgroundColor: colors.border }}
                        />
                      ) : null}
                    </View>
                    <View
                      style={{
                        flex: 1,
                        gap: spacing.xxs,
                        paddingBottom: isLast ? 0 : spacing.lg,
                      }}
                    >
                      <Text variant="caption">{a.text}</Text>
                      <Text variant="small" tone="subtle">
                        {formatDistanceToNow(a.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const CHART_HEIGHT = 120;

/**
 * Weekly attendance bars.
 *
 * The tallest bar is tinted as the accent and the rest stay neutral, so the peak
 * week is legible at a glance without painting every bar in brand colour. Value
 * labels use tabular figures so they don't jitter between renders.
 */
function WeeklyChart({ data }: { data: { week: string; count: number }[] }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  if (data.length === 0) {
    return (
      <Text variant="caption" tone="muted" center>
        {t("noData")}
      </Text>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: spacing.sm,
      }}
    >
      {data.map((d, i) => {
        const isPeak = d.count === max && d.count > 0;
        return (
          <View key={`${d.week}-${i}`} style={{ flex: 1, alignItems: "center", gap: spacing.sm }}>
            <Text variant="small" tone={isPeak ? "primary" : "subtle"} weight="600" tabular>
              {d.count}
            </Text>
            <View style={{ height: CHART_HEIGHT, justifyContent: "flex-end", width: "100%" }}>
              <Animated.View
                entering={FadeInDown.duration(duration.slow).delay(i * 50)}
                style={{
                  alignSelf: "center",
                  width: "64%",
                  // A visible floor so an empty week still reads as a bar at zero
                  // rather than as missing data.
                  height: Math.max((d.count / max) * CHART_HEIGHT, 3),
                  backgroundColor: isPeak ? colors.primary : colors.cardAlt,
                  borderWidth: hairline,
                  borderColor: isPeak ? colors.primary : colors.border,
                  borderRadius: radius.xs,
                }}
              />
            </View>
            <Text variant="small" tone="subtle" numberOfLines={1}>
              {d.week}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

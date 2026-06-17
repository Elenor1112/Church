import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useDashboard } from "@/features/hooks";
import { formatDistanceToNow } from "@/lib/time";
import {
  Screen,
  Card,
  Text,
  StatCard,
  SectionHeader,
  SkeletonCard,
  ErrorState,
  EmptyState,
} from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { radius } from "@/theme/tokens";

export default function Dashboard() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch, isRefetching } = useDashboard();

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View style={{ marginBottom: 4 }}>
        <Text tone="muted" variant="caption">{t("dashboard")}</Text>
        <Text variant="title">{user?.firstName} 👑</Text>
      </View>

      {isLoading ? (
        <><SkeletonCard /><SkeletonCard /></>
      ) : isError || !data ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatCard icon="people" label={t("totalMembers")} value={data.totalMembers} accent="primary" delay={0} />
            <StatCard icon="shield" label={t("totalAdmins")} value={data.totalAdmins} accent="gold" delay={60} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatCard icon="checkmark-done" label={t("todaysCheckins")} value={data.todayCheckIns} accent="success" delay={120} />
            <StatCard
              icon="hourglass"
              label={t("pendingApprovals")}
              value={data.pendingApprovals}
              accent="info"
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
            <Card animateIn delay={240} style={{ gap: 0 }}>
              {data.recentActivity.map((a, i) => (
                <View key={a.id} style={{ flexDirection: "row", gap: 12, paddingVertical: 10 }}>
                  <View style={{ alignItems: "center" }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
                    {i < data.recentActivity.length - 1 ? (
                      <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 }} />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 6 }}>
                    <Text variant="caption">{a.text}</Text>
                    <Text variant="small" tone="muted">{formatDistanceToNow(a.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

function WeeklyChart({ data }: { data: { week: string; count: number }[] }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  if (data.length === 0) return <Text tone="muted" center>{t("noData")}</Text>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 140, gap: 6 }}>
      {data.map((d, i) => (
        <View key={`${d.week}-${i}`} style={{ flex: 1, alignItems: "center", gap: 6 }}>
          <Text variant="small" tone="muted">{d.count}</Text>
          <Animated.View
            entering={FadeInDown.duration(400).delay(i * 60)}
            style={{
              width: "70%",
              height: Math.max((d.count / max) * 96, 4),
              backgroundColor: colors.primary,
              borderRadius: radius.sm,
            }}
          />
          <Text variant="small" tone="muted">{d.week}</Text>
        </View>
      ))}
    </View>
  );
}

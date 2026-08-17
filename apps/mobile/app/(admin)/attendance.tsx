import React, { useState } from "react";
import { Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useAttendance } from "@/features/hooks";
import { usePermissions } from "@/features/permissions";
import { API_URL } from "@/lib/api";
import { formatTime } from "@/lib/time";
import {
  Screen,
  ScreenHeader,
  Text,
  Input,
  Avatar,
  Badge,
  EmptyState,
  SkeletonCard,
  ErrorState,
  ListRow,
  SegmentedControl,
} from "@/components/ui";
import { spacing, iconSize, staggerDelay } from "@/theme/tokens";

export default function Attendance() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const perms = usePermissions();
  const [range, setRange] = useState<"today" | "month">("today");
  const [q, setQ] = useState("");
  const { data, isLoading, isError, refetch, isRefetching } = useAttendance(range, q);

  const records = data?.records ?? [];

  const exportCsv = () => {
    // Open the CSV endpoint in the browser with the bearer token query is not ideal;
    // here we rely on the share sheet via Linking to the authorized URL.
    Linking.openURL(`${API_URL}/api/reports/attendance.csv?range=${range}`);
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <ScreenHeader
        title={t("attendance")}
        subtitle={records.length > 0 ? `${records.length} ${t("records")}` : undefined}
        action={
          perms.canGenerateReports ? (
            <Pressable
              onPress={exportCsv}
              hitSlop={10}
              accessibilityRole="button"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
                paddingVertical: spacing.xs,
              }}
            >
              <Ionicons name="download-outline" size={iconSize.sm} color={colors.primary} />
              <Text variant="caption" tone="primary" weight="600">
                {t("export")}
              </Text>
            </Pressable>
          ) : null
        }
      />

      <SegmentedControl
        value={range}
        onChange={setRange}
        segments={[
          { value: "today", label: t("today") },
          { value: "month", label: t("thisMonth") },
        ]}
      />

      <Input
        icon="search"
        placeholder={t("search")}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : records.length === 0 ? (
        <EmptyState
          icon="clipboard-outline"
          title={t("noData")}
          subtitle={q ? undefined : t("scanWindowClosed")}
        />
      ) : (
        records.map((r, i) => (
          <ListRow
            key={r.id}
            animateIn
            delay={staggerDelay(i)}
            leading={<Avatar name={r.memberName} size={40} />}
            title={r.memberName}
            subtitle={`${formatTime(r.checkedInAt)} · W${r.weekNumber}`}
            trailing={
              r.categorySlug ? (
                <Badge label={r.categorySlug.replace("_", " ")} variant="neutral" />
              ) : null
            }
          />
        ))
      )}
    </Screen>
  );
}

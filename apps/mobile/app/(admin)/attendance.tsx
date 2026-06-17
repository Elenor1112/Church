import React, { useState } from "react";
import { View, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useAttendance } from "@/features/hooks";
import { usePermissions } from "@/features/permissions";
import { API_URL } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { formatTime } from "@/lib/time";
import {
  Screen,
  Card,
  Text,
  Input,
  Avatar,
  Badge,
  EmptyState,
  SkeletonCard,
  ErrorState,
} from "@/components/ui";
import { radius } from "@/theme/tokens";

export default function Attendance() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const perms = usePermissions();
  const token = useAuthStore((s) => s.token);
  const [range, setRange] = useState<"today" | "week">("today");
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
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="title">{t("attendance")}</Text>
        {perms.canGenerateReports ? (
          <Pressable onPress={exportCsv} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text tone="primary" weight="600">{t("export")}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Range segmented control */}
      <View style={{ flexDirection: "row", backgroundColor: colors.cardAlt, borderRadius: radius.pill, padding: 4 }}>
        {(["today", "week"] as const).map((r) => {
          const active = range === r;
          return (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={{ flex: 1, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: active ? colors.card : "transparent", alignItems: "center" }}
            >
              <Text weight="600" tone={active ? "primary" : "muted"}>
                {r === "today" ? t("today") : t("thisWeek")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input icon="search" placeholder={t("search")} value={q} onChangeText={setQ} autoCapitalize="none" />

      {isLoading ? (
        <><SkeletonCard /><SkeletonCard /></>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : records.length === 0 ? (
        <EmptyState icon="clipboard-outline" title={t("noData")} />
      ) : (
        records.map((r) => (
          <Card key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={r.memberName} size={42} />
            <View style={{ flex: 1 }}>
              <Text weight="600">{r.memberName}</Text>
              <Text variant="caption" tone="muted">
                {formatTime(r.checkedInAt)} · W{r.weekNumber}
              </Text>
            </View>
            {r.categorySlug ? <Badge label={r.categorySlug.replace("_", " ")} variant="info" /> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

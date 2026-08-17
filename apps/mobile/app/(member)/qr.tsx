import React, { useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/store/authStore";
import { useMyQr, useRefreshQr } from "@/features/hooks";
import { Screen, Text, Button, Avatar, Badge, ErrorState } from "@/components/ui";
import { radius, spacing, hairline, iconSize, duration } from "@/theme/tokens";

/**
 * The QR must scan reliably, so the code itself always sits on pure white with
 * a dark foreground regardless of theme — contrast here is a functional
 * requirement, not a style choice.
 */
const QR_SIZE = 200;
const QR_QUIET_ZONE = spacing.xl;

export default function MyQr() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useMyQr();
  const refresh = useRefreshQr();
  const qrRef = useRef(null);

  const fullName = `${user?.firstName} ${user?.lastName}`;

  return (
    <Screen contentContainerStyle={{ justifyContent: "center", flexGrow: 1 }} gap={spacing.xxl}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="title" center>
          {t("yourQrCode")}
        </Text>
        <Text variant="caption" tone="muted" center>
          {t("showToAdmin")}
        </Text>
      </View>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <Animated.View entering={FadeIn.duration(duration.slow)}>
          {/* The pass: identity above, code below, on one calm surface. */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: hairline,
              borderColor: colors.border,
              padding: spacing.xxl,
              alignItems: "center",
              gap: spacing.xl,
            }}
          >
            <View style={{ alignItems: "center", gap: spacing.md }}>
              <Avatar name={fullName} uri={user?.profileImage} size={64} />
              <View style={{ alignItems: "center", gap: spacing.sm }}>
                <Text variant="heading" center numberOfLines={1}>
                  {fullName}
                </Text>
                <Badge label={t("approved")} variant="success" dot />
              </View>
            </View>

            {/* Hairline divider separates identity from the scannable region. */}
            <View style={{ height: hairline, alignSelf: "stretch", backgroundColor: colors.border }} />

            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: radius.md,
                padding: QR_QUIET_ZONE,
                alignItems: "center",
                justifyContent: "center",
                minHeight: QR_SIZE + QR_QUIET_ZONE * 2,
                minWidth: QR_SIZE + QR_QUIET_ZONE * 2,
              }}
            >
              {isLoading || !data ? (
                <ActivityIndicator color={colors.muted} size="large" />
              ) : (
                <QRCode
                  value={data.qrToken}
                  size={QR_SIZE}
                  // Near-black on white: maximum scan reliability.
                  color="#15171C"
                  backgroundColor="#FFFFFF"
                  getRef={(c) => (qrRef.current = c)}
                  ecl="M"
                />
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Ionicons name="shield-checkmark-outline" size={iconSize.xs} color={colors.subtle} />
              <Text variant="small" tone="subtle">
                Secure token
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      <Button
        title={t("refreshQr")}
        variant="outline"
        loading={refresh.isPending}
        leftIcon={<Ionicons name="refresh" size={iconSize.sm} color={colors.ink} />}
        onPress={() => refresh.mutate()}
      />
    </Screen>
  );
}

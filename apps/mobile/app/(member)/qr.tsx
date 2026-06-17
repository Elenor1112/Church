import React, { useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/store/authStore";
import { useMyQr, useRefreshQr } from "@/features/hooks";
import { Screen, Text, Button, Avatar, Badge, ErrorState } from "@/components/ui";
import { radius } from "@/theme/tokens";

export default function MyQr() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useMyQr();
  const refresh = useRefreshQr();
  const qrRef = useRef(null);

  const fullName = `${user?.firstName} ${user?.lastName}`;

  return (
    <Screen contentContainerStyle={{ justifyContent: "center", flexGrow: 1 }}>
      <Text variant="title" center style={{ marginBottom: 8 }}>
        {t("yourQrCode")}
      </Text>
      <Text tone="muted" center style={{ marginBottom: 8 }}>
        {t("showToAdmin")}
      </Text>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <Animated.View entering={FadeIn.duration(400)}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: radius.lg, padding: 24, alignItems: "center", gap: 20 }}
          >
            <Avatar name={fullName} uri={user?.profileImage} size={72} />
            <Text variant="heading" tone="inverse" center>
              {fullName}
            </Text>
            <Badge label={t("approved")} variant="gold" />

            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: radius.md,
                padding: 20,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 232,
                minWidth: 232,
              }}
            >
              {isLoading || !data ? (
                <ActivityIndicator color={colors.primary} size="large" />
              ) : (
                <QRCode
                  value={data.qrToken}
                  size={192}
                  color={colors.primary}
                  backgroundColor="#fff"
                  getRef={(c) => (qrRef.current = c)}
                  ecl="M"
                />
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="shield-checkmark" size={14} color={colors.gold} />
              <Text variant="small" tone="inverse" style={{ opacity: 0.85 }}>
                Secure token · {fullName}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      <View style={{ marginTop: 20 }}>
        <Button
          title={t("refreshQr")}
          variant="outline"
          loading={refresh.isPending}
          leftIcon={<Ionicons name="refresh" size={18} color={colors.primary} />}
          onPress={() => refresh.mutate()}
        />
      </View>
    </Screen>
  );
}

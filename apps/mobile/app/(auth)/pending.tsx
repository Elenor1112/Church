import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/store/authStore";
import { Text, Button, IconTile } from "@/components/ui";
import { spacing, duration, screenGutter } from "@/theme/tokens";

export default function Pending() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const rejected = user?.status === "rejected";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: screenGutter + spacing.sm,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
    >
      {/* The message owns the vertical center; actions sit at the bottom where
          the thumb reaches them. */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Animated.View
          entering={FadeInDown.duration(duration.slow)}
          style={{ alignItems: "center", gap: spacing.lg }}
        >
          <IconTile
            icon={rejected ? "close-circle-outline" : "hourglass-outline"}
            tone={rejected ? "error" : "warning"}
            size="lg"
          />
          <View style={{ gap: spacing.sm }}>
            <Text variant="title" center>
              {rejected ? t("rejected") : t("awaitingApproval")}
            </Text>
            <Text variant="caption" tone="muted" center style={{ maxWidth: 300 }}>
              {rejected
                ? "Your account access has been updated. Please contact the church office."
                : t("awaitingApprovalBody")}
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={{ gap: spacing.md }}>
        <Button title={t("retry")} variant="outline" onPress={() => router.replace("/")} />
        <Button title={t("signOut")} variant="ghost" onPress={() => signOut()} />
      </View>
    </View>
  );
}

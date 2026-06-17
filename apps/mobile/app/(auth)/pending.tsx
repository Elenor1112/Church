import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/store/authStore";
import { Text, Button } from "@/components/ui";

export default function Pending() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const rejected = user?.status === "rejected";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 32, gap: 20 }}>
      <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: "center", gap: 20 }}>
        <View
          style={{
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: rejected ? colors.error + "18" : colors.gold + "22",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={rejected ? "close-circle-outline" : "hourglass-outline"}
            size={56}
            color={rejected ? colors.error : colors.gold}
          />
        </View>
        <Text variant="title" center>
          {rejected ? t("rejected") : t("awaitingApproval")}
        </Text>
        <Text tone="muted" center style={{ maxWidth: 300 }}>
          {rejected
            ? "Your account access has been updated. Please contact the church office."
            : t("awaitingApprovalBody")}
        </Text>
      </Animated.View>

      <View style={{ width: "100%", gap: 12, marginTop: 12 }}>
        <Button title={t("retry")} variant="outline" onPress={() => router.replace("/")} />
        <Button title={t("signOut")} variant="ghost" onPress={() => signOut()} />
      </View>
    </View>
  );
}

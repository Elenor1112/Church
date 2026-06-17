import React, { useEffect } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius } from "@/theme/tokens";
import { Text } from "./Typography";
import { Button } from "./Button";

export function EmptyState({
  icon = "file-tray-outline",
  title,
  subtitle,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 56, gap: 12 }}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: colors.cardAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={40} color={colors.muted} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      {subtitle ? (
        <Text tone="muted" center style={{ maxWidth: 280 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 56, gap: 16 }}>
      <Ionicons name="cloud-offline-outline" size={56} color="#DC2626" />
      <Text variant="heading" center>
        {t("somethingWrong")}
      </Text>
      {onRetry ? (
        <Button title={t("retry")} variant="outline" fullWidth={false} onPress={onRetry} />
      ) : null}
    </View>
  );
}

export function Skeleton({ height = 16, width = "100%", style }: { height?: number; width?: number | string; style?: object }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        { height, width: width as number, backgroundColor: colors.cardAlt, borderRadius: radius.sm },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        gap: 12,
      }}
    >
      <Skeleton height={20} width="60%" />
      <Skeleton height={14} width="100%" />
      <Skeleton height={14} width="80%" />
    </View>
  );
}

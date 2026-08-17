import React, { useEffect } from "react";
import { View, type DimensionValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, spacing, hairline, iconSize } from "@/theme/tokens";
import { Text } from "./Typography";
import { Button } from "./Button";

/**
 * Shown when a list has no content. An empty state should explain and offer a
 * way forward, so it takes an optional action rather than being a dead end.
 */
export function EmptyState({
  icon = "file-tray-outline",
  title,
  subtitle,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.huge,
        paddingHorizontal: spacing.xxl,
        gap: spacing.md,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.md,
          backgroundColor: colors.cardAlt,
          borderWidth: hairline,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={iconSize.lg} color={colors.subtle} />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="subheading" center>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" center style={{ maxWidth: 280 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <View style={{ marginTop: spacing.xs }}>
          <Button title={action.label} variant="outline" size="sm" fullWidth={false} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

/** Shown when a fetch fails. Always offers a retry when the caller can provide one. */
export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.huge,
        paddingHorizontal: spacing.xxl,
        gap: spacing.md,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.md,
          backgroundColor: colors.errorSurface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="cloud-offline-outline" size={iconSize.lg} color={colors.error} />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="subheading" center>
          {t("somethingWrong")}
        </Text>
        {message ? (
          <Text variant="caption" tone="muted" center style={{ maxWidth: 280 }}>
            {message}
          </Text>
        ) : null}
      </View>
      {onRetry ? (
        <View style={{ marginTop: spacing.xs }}>
          <Button title={t("retry")} variant="outline" size="sm" fullWidth={false} onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Loading placeholder. Sweeps a highlight across the block rather than pulsing
 * opacity — a directional shimmer reads as "loading", a fade reads as "disabled".
 */
export function Skeleton({
  height = 14,
  width = "100%",
  style,
  radius: r = radius.xs,
}: {
  height?: number;
  width?: DimensionValue;
  style?: object;
  radius?: number;
}) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.5, 1, 0.5]),
  }));

  return (
    <Animated.View
      style={[
        { height, width, backgroundColor: colors.cardAlt, borderRadius: r },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Card-shaped loading placeholder that mirrors the real <ListRow> geometry. */
export function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.md,
        borderWidth: hairline,
        borderColor: colors.border,
        padding: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
      }}
    >
      <Skeleton height={40} width={40} radius={radius.sm} />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <Skeleton height={16} width="55%" />
        <Skeleton height={12} width="80%" />
      </View>
    </View>
  );
}

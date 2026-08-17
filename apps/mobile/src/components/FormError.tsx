import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { spacing, radius, hairline, iconSize, duration } from "@/theme/tokens";
import { Text } from "@/components/ui";

/**
 * Form-level error banner (a failed submit, not a per-field validation message).
 *
 * Previously this was bare red centered text, which read as decoration and was
 * easy to miss above a large button. A bordered surface with an icon gives the
 * message a container the eye can land on, and it animates in so a submit
 * failure is noticed rather than silently appearing.
 *
 * Renders nothing when `message` is null, so callers can pass their error
 * directly without conditional wrapping.
 */
export function FormError({ message }: { message?: string | null }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  if (!message) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(duration.fast)}
      exiting={FadeOut.duration(duration.fast)}
      accessibilityRole="alert"
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "flex-start",
        gap: spacing.md,
        backgroundColor: colors.errorSurface,
        borderRadius: radius.sm,
        borderWidth: hairline,
        borderColor: colors.error,
        padding: spacing.md,
      }}
    >
      <Ionicons
        name="alert-circle"
        size={iconSize.md}
        color={colors.error}
        // Nudge to the cap-height of the first text line.
        style={{ marginTop: 1 }}
      />
      <View style={{ flex: 1 }}>
        <Text variant="caption" style={{ color: colors.error }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

import React from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { spacing, radius, hairline, iconSize, duration, touchTarget } from "@/theme/tokens";
import { Text } from "./Typography";

interface Props {
  title: string;
  subtitle?: string;
  /** Third line for low-priority metadata (timestamps, counts). */
  meta?: string;
  /** Leading slot — an IconTile, Avatar, or checkbox. */
  leading?: React.ReactNode;
  /** Trailing slot — a Badge, value, or switch. Ignored when `chevron`. */
  trailing?: React.ReactNode;
  /** Show a navigation chevron. Implies the row is tappable. */
  chevron?: boolean;
  onPress?: () => void;
  /** Content rendered under the main row (action buttons, progress bars). */
  children?: React.ReactNode;
  /** Render as a bare row instead of a bordered card. For rows inside a Card. */
  bare?: boolean;
  animateIn?: boolean;
  delay?: number;
}

/**
 * The canonical list item: leading · (title / subtitle / meta) · trailing.
 *
 * Standardises the row that member, meeting, announcement, alert, attendance,
 * and poll lists each built by hand. Text is `flex: 1` and truncates, so long
 * Arabic names can't push the trailing badge off-screen — a real bug in the
 * previous hand-built rows.
 */
export function ListRow({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  chevron,
  onPress,
  children,
  bare = false,
  animateIn = false,
  delay = 0,
}: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  const body = (
    <>
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: spacing.md,
          minHeight: leading ? undefined : touchTarget - spacing.lg * 2,
        }}
      >
        {leading}

        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="subheading" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {meta ? (
            <Text variant="small" tone="subtle" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>

        {chevron ? (
          <Ionicons
            name={isRTL ? "chevron-back" : "chevron-forward"}
            size={iconSize.md}
            color={colors.subtle}
          />
        ) : (
          trailing
        )}
      </View>
      {children}
    </>
  );

  const container = {
    backgroundColor: bare ? "transparent" : colors.card,
    borderRadius: bare ? 0 : radius.md,
    borderWidth: bare ? 0 : hairline,
    borderColor: colors.border,
    padding: bare ? 0 : spacing.lg,
    gap: children ? spacing.md : 0,
  };

  if (onPress) {
    const pressable = (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [container, pressed && { backgroundColor: colors.cardAlt }]}
      >
        {body}
      </Pressable>
    );
    return animateIn ? (
      <Animated.View entering={FadeInDown.duration(duration.base).delay(delay)}>
        {pressable}
      </Animated.View>
    ) : (
      pressable
    );
  }

  if (animateIn) {
    return (
      <Animated.View entering={FadeInDown.duration(duration.base).delay(delay)} style={container}>
        {body}
      </Animated.View>
    );
  }

  return <View style={container}>{body}</View>;
}

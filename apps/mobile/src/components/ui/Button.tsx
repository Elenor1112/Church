import React, { useCallback, useMemo } from "react";
import { Pressable, ActivityIndicator, View, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import {
  radius,
  controlHeight,
  spacing,
  duration,
  opacity,
  hairline,
  withAlpha,
} from "@/theme/tokens";
import { Text } from "./Typography";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * `primary`   — the one affirmative action on a screen.
 * `secondary` — a filled but quiet action; pairs beside primary.
 * `outline`   — equal-weight alternative (Cancel next to Save).
 * `ghost`     — tertiary/inline action, no container until pressed.
 * `danger`    — destructive confirmation only.
 * `gold`      — retained role name, now the accent tone.
 */
type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

interface Props extends Omit<PressableProps, "style"> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  haptic?: boolean;
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  haptic = true,
  disabled,
  onPress,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const pressed = useSharedValue(0);

  // Scale is subtle (0.98) — enough to feel tactile, not enough to look bouncy.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.02 }],
  }));

  const isDisabled = disabled || loading;

  const surface = useMemo(() => {
    const map: Record<Variant, { bg: string; border: string; fg: Parameters<typeof Text>[0]["tone"] }> = {
      primary: { bg: colors.primary, border: "transparent", fg: "inverse" },
      secondary: { bg: colors.primarySurface, border: "transparent", fg: "primary" },
      outline: { bg: "transparent", border: colors.border, fg: "ink" },
      ghost: { bg: "transparent", border: "transparent", fg: "primary" },
      danger: { bg: colors.error, border: "transparent", fg: "inverse" },
      gold: { bg: colors.gold, border: "transparent", fg: "inverse" },
    };
    return map[variant];
  }, [colors, variant]);

  const onPressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: duration.press });
  }, [pressed]);

  const onPressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: duration.fast });
  }, [pressed]);

  const handlePress = useCallback<NonNullable<PressableProps["onPress"]>>(
    (e) => {
      if (haptic) {
        void Haptics.impactAsync(
          variant === "danger"
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );
      }
      onPress?.(e);
    },
    [haptic, onPress, variant],
  );

  // The spinner replaces the label but the button keeps its width, so a
  // submitting form never reflows around it.
  const spinnerColor = surface.fg === "inverse" ? colors.onPrimary : colors.primary;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      style={[
        animatedStyle,
        {
          height: controlHeight[size],
          borderRadius: radius.sm,
          backgroundColor: surface.bg,
          borderWidth: variant === "outline" ? hairline : 0,
          borderColor: surface.border,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: isRTL ? "row-reverse" : "row",
          gap: spacing.sm,
          paddingHorizontal: size === "sm" ? spacing.md : spacing.xl,
          opacity: isDisabled ? opacity.disabled : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
      ]}
      // Ghost buttons have no resting container, so give them a press wash
      // instead of relying on scale alone for feedback.
      android_ripple={
        variant === "ghost" || variant === "outline"
          ? { color: withAlpha(colors.primary, 0.12), borderless: false }
          : undefined
      }
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text variant={size === "sm" ? "caption" : "subheading"} weight="600" tone={surface.fg}>
            {title}
          </Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </AnimatedPressable>
  );
}

import React from "react";
import { Pressable, ActivityIndicator, View, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { Text } from "./Typography";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

interface Props extends Omit<PressableProps, "style"> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  haptic?: boolean;
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = true,
  leftIcon,
  haptic = true,
  disabled,
  onPress,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const heights: Record<Size, number> = { sm: 40, md: 52, lg: 58 };
  const isDisabled = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.primaryLight,
    outline: "transparent",
    ghost: "transparent",
    danger: colors.error,
    gold: colors.gold,
  };
  const fg: Record<Variant, "inverse" | "primary" | "ink"> = {
    primary: "inverse",
    secondary: "inverse",
    outline: "primary",
    ghost: "primary",
    danger: "inverse",
    gold: "ink",
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      onPress={(e) => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={[
        animatedStyle,
        {
          height: heights[size],
          borderRadius: radius.pill,
          backgroundColor: bg[variant],
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 24,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant] === "inverse" ? "#fff" : colors.primary} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text variant={size === "lg" ? "heading" : "body"} weight="600" tone={fg[variant]}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

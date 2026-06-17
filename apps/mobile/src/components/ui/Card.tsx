import React from "react";
import { View, type ViewProps } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { shadow as shadowTokens, radius } from "@/theme/tokens";

interface CardProps extends ViewProps {
  elevation?: "soft" | "medium" | "large" | "none";
  padded?: boolean;
  animateIn?: boolean;
  delay?: number;
}

export function Card({
  children,
  style,
  elevation = "soft",
  padded = true,
  animateIn = false,
  delay = 0,
  ...rest
}: CardProps) {
  const { colors } = useTheme();
  const base = {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...(padded ? { padding: 16 } : null),
    ...(elevation !== "none" ? shadowTokens[elevation] : null),
  };

  if (animateIn) {
    return (
      <Animated.View entering={FadeInDown.duration(280).delay(delay)} style={[base, style]} {...rest}>
        {children}
      </Animated.View>
    );
  }
  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}

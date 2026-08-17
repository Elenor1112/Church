import React, { useMemo } from "react";
import { View, Pressable, type ViewProps } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { shadow as shadowTokens, radius, spacing, duration, hairline } from "@/theme/tokens";

type Elevation = "none" | "soft" | "medium" | "large";

interface CardProps extends ViewProps {
  elevation?: Elevation;
  padded?: boolean;
  animateIn?: boolean;
  delay?: number;
  /**
   * Recessed variant — sits *below* the background plane instead of above it.
   * Use for grouped/secondary content so not every block competes as a card.
   */
  inset?: boolean;
  /** Makes the whole card a press target with built-in feedback. */
  onPress?: () => void;
}

/**
 * The default content surface.
 *
 * Separation comes from a hairline border plus a very soft shadow — not from a
 * heavy drop shadow. In dark mode the shadow reads as nothing, so the border
 * and the surface lightness carry the elevation instead.
 */
export function Card({
  children,
  style,
  elevation = "soft",
  padded = true,
  animateIn = false,
  delay = 0,
  inset = false,
  onPress,
  ...rest
}: CardProps) {
  const { colors } = useTheme();

  const base = useMemo(
    () => ({
      backgroundColor: inset ? colors.cardAlt : colors.card,
      borderRadius: radius.md,
      borderWidth: hairline,
      borderColor: colors.border,
      ...(padded ? { padding: spacing.lg } : null),
      // An inset card is recessed; a shadow would contradict that.
      ...(!inset && elevation !== "none" ? shadowTokens[elevation] : null),
    }),
    [colors, inset, padded, elevation],
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  if (animateIn) {
    return (
      <Animated.View
        entering={FadeInDown.duration(duration.base).delay(delay)}
        style={[base, style]}
        {...rest}
      >
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

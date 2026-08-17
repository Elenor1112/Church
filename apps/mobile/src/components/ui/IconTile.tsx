import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, iconSize, withAlpha } from "@/theme/tokens";

export type TileTone = "primary" | "neutral" | "success" | "warning" | "error" | "info" | "gold";
type Size = "sm" | "md" | "lg";

const BOX: Record<Size, number> = { sm: 32, md: 40, lg: 48 };
const GLYPH: Record<Size, number> = { sm: iconSize.sm, md: iconSize.md, lg: iconSize.lg };

/**
 * Icon in a soft tinted container — the leading element for list rows, stat
 * cards, and meeting cards.
 *
 * Was hand-built in ~15 places with inconsistent box sizes (40/42/44/48),
 * radii, and hardcoded `color + "22"` tints. The tint here derives from the
 * theme, so it stays correct in dark mode where a flat 13% alpha over a
 * near-black surface reads as invisible.
 */
export function IconTile({
  icon,
  tone = "primary",
  size = "md",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: TileTone;
  size?: Size;
}) {
  const { colors, isDark } = useTheme();

  const fg: Record<TileTone, string> = {
    primary: colors.primary,
    neutral: colors.muted,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    gold: colors.gold,
  };

  const surface: Record<TileTone, string> = {
    primary: colors.primarySurface,
    neutral: colors.cardAlt,
    success: colors.successSurface,
    warning: colors.warningSurface,
    error: colors.errorSurface,
    info: colors.infoSurface,
    gold: colors.primarySurface,
  };

  const box = BOX[size];

  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: radius.sm,
        // Dark mode: the dedicated status surfaces already carry the right
        // lightness; light mode uses them directly too. An alpha wash is only
        // needed where no surface token exists.
        backgroundColor: surface[tone] ?? withAlpha(fg[tone], isDark ? 0.18 : 0.1),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={GLYPH[size]} color={fg[tone]} />
    </View>
  );
}

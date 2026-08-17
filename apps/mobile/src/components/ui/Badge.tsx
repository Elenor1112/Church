import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing, hairline, withAlpha } from "@/theme/tokens";
import { Text } from "./Typography";

type Variant = "neutral" | "success" | "warning" | "error" | "info" | "gold" | "primary";

interface Props {
  label: string;
  variant?: Variant;
  /**
   * Add a leading status dot. Useful when a badge's meaning is status rather
   * than category — the dot carries the signal for users who can't rely on hue.
   */
  dot?: boolean;
}

/**
 * Compact status label.
 *
 * Colors come from the theme's status surfaces rather than the hardcoded RGBA
 * strings the previous version used, so badges are legible in dark mode instead
 * of washing out against near-black cards.
 */
export function Badge({ label, variant = "neutral", dot = false }: Props) {
  const { colors } = useTheme();

  const map: Record<Variant, { bg: string; fg: string }> = {
    neutral: { bg: colors.cardAlt, fg: colors.muted },
    success: { bg: colors.successSurface, fg: colors.success },
    warning: { bg: colors.warningSurface, fg: colors.warning },
    error: { bg: colors.errorSurface, fg: colors.error },
    info: { bg: colors.infoSurface, fg: colors.info },
    gold: { bg: colors.primarySurface, fg: colors.gold },
    primary: { bg: colors.primarySurface, fg: colors.primary },
  };

  const c = map[variant];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        backgroundColor: c.bg,
        borderRadius: radius.xs,
        borderWidth: hairline,
        // A faint same-hue border keeps the chip defined on surfaces that share
        // its lightness (e.g. a neutral badge on an inset card).
        borderColor: withAlpha(c.fg, 0.16),
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        alignSelf: "flex-start",
      }}
    >
      {dot ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.fg }} />
      ) : null}
      <Text variant="small" weight="600" style={{ color: c.fg }}>
        {label}
      </Text>
    </View>
  );
}

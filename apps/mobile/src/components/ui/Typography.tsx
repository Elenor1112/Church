import React, { useMemo } from "react";
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { typography, type TypeVariant } from "@/theme/tokens";

type Tone =
  | "ink"
  | "muted"
  | "subtle"
  | "primary"
  | "inverse"
  | "error"
  | "success"
  | "warning"
  | "info"
  /** Retained role name; now resolves to the accent. */
  | "gold";

type Weight = "400" | "500" | "600" | "700";

interface Props extends TextProps {
  variant?: TypeVariant;
  tone?: Tone;
  weight?: Weight;
  center?: boolean;
  /** Uppercase with the overline's tracking. Pairs with `variant="overline"`. */
  uppercase?: boolean;
  /**
   * Tabular figures — digits share a fixed advance width so numbers don't
   * jitter as they change. Use for counters, metrics, and timers.
   */
  tabular?: boolean;
}

/**
 * The only text primitive. Every string in the app renders through this so the
 * type scale, line height, tracking, color, and RTL direction stay consistent.
 *
 * Line height ships with the variant rather than being set at call sites — the
 * previous version omitted it entirely, which is what made dense screens feel
 * cramped and made Arabic (taller glyphs at the same point size) clip.
 */
export function Text({
  variant = "body",
  tone = "ink",
  weight,
  center,
  uppercase,
  tabular,
  style,
  children,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  const toneColor: Record<Tone, string> = {
    ink: colors.ink,
    muted: colors.muted,
    subtle: colors.subtle,
    primary: colors.primary,
    inverse: colors.onPrimary,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
    gold: colors.gold,
  };

  const step = typography[variant];

  const resolved = useMemo<TextStyle>(
    () => ({
      fontSize: step.fontSize,
      lineHeight: step.lineHeight,
      letterSpacing: step.letterSpacing,
      fontWeight: weight ?? step.fontWeight,
      color: toneColor[tone],
      textAlign: center ? "center" : isRTL ? "right" : "left",
      writingDirection: isRTL ? "rtl" : "ltr",
      ...(uppercase ? { textTransform: "uppercase" as const } : null),
      ...(tabular ? { fontVariant: ["tabular-nums" as const] } : null),
    }),
    // `toneColor` is rebuilt each render; depending on the resolved value keeps
    // the memo honest without adding an object to the dep list.
    [step, weight, toneColor[tone], center, isRTL, uppercase, tabular],
  );

  return (
    <RNText style={[resolved, style]} {...rest}>
      {children}
    </RNText>
  );
}

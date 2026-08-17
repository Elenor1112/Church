import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "./Typography";

type Tone = "primary" | "success" | "warning" | "error" | "neutral";

interface Props {
  /** 0–100. Clamped. */
  percent: number;
  tone?: Tone;
  /** Label above the bar (e.g. the option text). */
  label?: string;
  /** Right-aligned value above the bar (e.g. "12 (40%)"). */
  value?: string;
  height?: number;
}

/**
 * Horizontal progress/share bar with an optional label row.
 *
 * Replaces the hand-built track+fill pairs in the admin poll results, trivia
 * accuracy meters, and wheel odds — each of which used a different height,
 * radius, and track color.
 */
export function MeterBar({ percent, tone = "primary", label, value, height = 6 }: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  const fill: Record<Tone, string> = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    neutral: colors.borderStrong,
  };

  const pct = Math.min(Math.max(percent, 0), 100);

  return (
    <View style={{ gap: spacing.sm }}>
      {label || value ? (
        <View
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          {label ? (
            <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
          {value ? (
            <Text variant="small" tone="muted" weight="600" tabular>
              {value}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          height,
          borderRadius: radius.pill,
          backgroundColor: colors.cardAlt,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${pct}%`,
            backgroundColor: fill[tone],
            borderRadius: radius.pill,
          }}
        />
      </View>
    </View>
  );
}

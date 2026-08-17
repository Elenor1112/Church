import React from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, spacing, hairline, iconSize, withAlpha } from "@/theme/tokens";
import { Text } from "./Typography";

/**
 * `idle`     — not yet answered/voted.
 * `selected` — this is the user's choice, no verdict shown (polls).
 * `correct`  — the right answer (trivia, after answering).
 * `wrong`    — the user's incorrect choice (trivia).
 */
export type OptionState = "idle" | "selected" | "correct" | "wrong";

interface Props {
  label: string;
  state?: OptionState;
  /** Circle marker (single-choice) vs. square (quiz answer). */
  shape?: "circle" | "square";
  /** 0–100 fill showing result share. Renders behind the label. */
  percent?: number;
  /** Trailing text, e.g. "42%". */
  trailing?: string;
  disabled?: boolean;
  onPress?: () => void;
}

/**
 * A single selectable answer — used by poll options and trivia answers, which
 * previously each hand-rolled the same marker + border + result-bar logic with
 * different radii and alpha values.
 *
 * State is conveyed by an icon inside the marker as well as by color, so a
 * correct/incorrect verdict is still readable without color vision.
 */
export function OptionRow({
  label,
  state = "idle",
  shape = "circle",
  percent,
  trailing,
  disabled,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  const accent: Record<OptionState, string> = {
    idle: colors.border,
    selected: colors.primary,
    correct: colors.success,
    wrong: colors.error,
  };

  const fill: Record<OptionState, string> = {
    idle: "transparent",
    selected: colors.primarySurface,
    correct: colors.successSurface,
    wrong: colors.errorSurface,
  };

  const marker = accent[state];
  const showBar = percent != null && percent > 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: state !== "idle", disabled: !!disabled }}
      style={{
        borderRadius: radius.sm,
        overflow: "hidden",
        borderWidth: hairline,
        borderColor: state === "idle" ? colors.border : marker,
        backgroundColor: state === "idle" ? colors.card : fill[state],
      }}
    >
      {/* Result bar sits behind the content so the label stays readable. */}
      {showBar ? (
        <View
          style={{
            position: "absolute",
            [isRTL ? "right" : "left"]: 0,
            top: 0,
            bottom: 0,
            width: `${Math.min(Math.max(percent, 0), 100)}%`,
            backgroundColor: withAlpha(state === "idle" ? colors.muted : marker, 0.14),
          }}
        />
      ) : null}

      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          padding: spacing.md,
          gap: spacing.md,
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: shape === "circle" ? 10 : radius.xs,
            borderWidth: hairline * 1.5,
            borderColor: marker,
            backgroundColor: state === "idle" ? "transparent" : marker,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {state === "correct" ? (
            <Ionicons name="checkmark" size={iconSize.xs} color={colors.onPrimary} />
          ) : state === "wrong" ? (
            <Ionicons name="close" size={iconSize.xs} color={colors.onPrimary} />
          ) : state === "selected" ? (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: shape === "circle" ? 4 : 2,
                backgroundColor: colors.onPrimary,
              }}
            />
          ) : null}
        </View>

        <Text variant="caption" style={{ flex: 1 }}>
          {label}
        </Text>

        {trailing ? (
          <Text variant="caption" tone="muted" weight="600" tabular>
            {trailing}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

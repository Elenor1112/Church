import React from "react";
import { View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, spacing, hairline, controlHeight } from "@/theme/tokens";
import { Text } from "./Typography";

export interface Segment<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  segments: Segment<T>[];
  onChange: (value: T) => void;
}

/**
 * Equal-width view switcher for 2–4 mutually exclusive modes (Polls / Trivia /
 * Wheel, Today / Week).
 *
 * Distinct from <FilterChips>: chips filter a list and can be many; a segmented
 * control swaps what the screen shows and is always a small fixed set. The
 * active segment lifts off a recessed track rather than filling with a
 * saturated color.
 */
export function SegmentedControl<T extends string>({ value, segments, onChange }: Props<T>) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  return (
    <View
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        backgroundColor: colors.cardAlt,
        borderRadius: radius.sm,
        borderWidth: hairline,
        borderColor: colors.border,
        padding: spacing.xs,
        gap: spacing.xs,
      }}
    >
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(s.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              height: controlHeight.sm,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.xs,
              backgroundColor: active ? colors.card : "transparent",
              ...(active
                ? {
                    shadowColor: "#0B0D12",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 2,
                    elevation: 1,
                  }
                : null),
            }}
          >
            <Text
              variant="caption"
              weight="600"
              tone={active ? "ink" : "muted"}
              numberOfLines={1}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

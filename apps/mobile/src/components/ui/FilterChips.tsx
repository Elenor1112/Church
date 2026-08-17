import React, { useCallback } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, spacing, hairline, screenGutter, touchTarget, iconSize } from "@/theme/tokens";
import { Text } from "./Typography";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  /** Optional trailing count, e.g. "Pending 4". */
  count?: number;
  /** Optional leading icon. */
  icon?: keyof typeof Ionicons.glyphMap;
}

interface Props<T extends string> {
  value: T;
  options: ChipOption<T>[];
  onChange: (value: T) => void;
  /**
   * Horizontally scroll instead of wrapping. Use when there are more than ~4
   * options so the row stays one line and doesn't push content down.
   */
  scrollable?: boolean;
  /** Let a scrollable row bleed to the screen edges. Requires `scrollable`. */
  bleed?: boolean;
}

/**
 * Single-select filter row.
 *
 * Replaces the ad-hoc pill rows that were re-implemented in the member
 * directory, attendance, comms, and both polls screens — each with slightly
 * different padding, radius, and active colors.
 *
 * Selection reads as a filled accent chip; unselected chips are outlined rather
 * than filled grey, so the active state wins on contrast instead of on hue.
 */
export function FilterChips<T extends string>({
  value,
  options,
  onChange,
  scrollable = false,
  bleed = false,
}: Props<T>) {
  const { isRTL } = useI18n();

  const content = options.map((o) => (
    <Chip key={o.value} option={o} active={o.value === value} onPress={() => onChange(o.value)} />
  ));

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // RTL: reverse so the first chip sits on the right where reading starts.
        style={bleed ? { marginHorizontal: -screenGutter } : undefined}
        contentContainerStyle={{
          flexDirection: isRTL ? "row-reverse" : "row",
          gap: spacing.sm,
          paddingHorizontal: bleed ? screenGutter : 0,
        }}
      >
        {content}
      </ScrollView>
    );
  }

  return (
    <View
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        flexWrap: "wrap",
        gap: spacing.sm,
      }}
    >
      {content}
    </View>
  );
}

function Chip<T extends string>({
  option,
  active,
  onPress,
}: {
  option: ChipOption<T>;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    void Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      // hitSlop lifts the effective target to the 44pt floor without making the
      // chip itself visually chunky.
      hitSlop={{ top: 6, bottom: 6 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        minHeight: touchTarget - 12,
        justifyContent: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.primary : "transparent",
        borderWidth: hairline,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      {option.icon ? (
        <Ionicons
          name={option.icon}
          size={iconSize.sm}
          color={active ? colors.onPrimary : colors.muted}
        />
      ) : null}
      <Text variant="caption" weight="600" tone={active ? "inverse" : "muted"}>
        {option.count != null ? `${option.label}  ${option.count}` : option.label}
      </Text>
    </Pressable>
  );
}

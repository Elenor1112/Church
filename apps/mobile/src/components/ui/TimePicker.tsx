import React, { useMemo, useState } from "react";
import { View, Pressable, ScrollView, StyleSheet, Keyboard, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { formatTime12h } from "@church/shared";
import { radius, spacing, typography, iconSize, hairline } from "@/theme/tokens";
import { Text } from "./Typography";
import { FieldShell } from "./FieldShell";
import { PickerSheet } from "./PickerSheet";

interface Props {
  label?: string;
  /** Title shown in the picker header. Falls back to `label`. */
  title?: string;
  placeholder?: string;
  /** Selected time as "HH:MM" 24-hour, or undefined when unset. */
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Slot granularity in minutes (default 30). */
  stepMinutes?: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Time field rendered as selectable slots. Matches <Input>/<Select> via
 * <FieldShell>; the slot grid opens through <PickerSheet> (see that file for
 * the Android nested-Modal constraint). Stores "HH:MM" 24-hour; displays
 * 12-hour labels.
 */
export function TimePicker({
  label,
  title,
  placeholder,
  value,
  onChange,
  error,
  hint,
  required,
  icon,
  stepMinutes = 30,
}: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const slots = useMemo(() => {
    const out: string[] = [];
    for (let mins = 0; mins < 24 * 60; mins += stepMinutes) {
      out.push(`${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`);
    }
    return out;
  }, [stepMinutes]);

  const pick = (slot: string) => {
    onChange(slot);
    setOpen(false);
  };

  // Close the keyboard before opening the picker sheet so the picker's own
  // Modal never has to share the screen (and touch handling) with it.
  const openPicker = () => {
    Keyboard.dismiss();
    setOpen(true);
  };

  return (
    <>
      <Pressable onPress={openPicker} accessibilityRole="button" accessibilityLabel={label}>
        <FieldShell label={label} error={error} hint={hint} required={required}>
          {icon ? <Ionicons name={icon} size={iconSize.md} color={colors.subtle} /> : null}
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: typography.body.fontSize,
              color: value ? colors.ink : colors.subtle,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {value ? formatTime12h(value) : placeholder ?? ""}
          </Text>
          <Ionicons name="time-outline" size={iconSize.md} color={colors.subtle} />
        </FieldShell>
      </Pressable>

      <PickerSheet visible={open} onClose={() => setOpen(false)} title={title ?? label ?? ""}>
        <ScrollView
          style={{ maxHeight: screenH * 0.6 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.xxl,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {slots.map((slot) => {
              const active = slot === value;
              return (
                <Pressable
                  key={slot}
                  onPress={() => pick(slot)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    width: "31%",
                    alignItems: "center",
                    paddingVertical: spacing.md,
                    borderRadius: radius.sm,
                    borderWidth: hairline,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.card,
                  }}
                >
                  <Text variant="caption" tabular weight={active ? "600" : "400"} tone={active ? "inverse" : "ink"}>
                    {formatTime12h(slot)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </PickerSheet>
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.sm,
  },
});

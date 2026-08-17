import React, { useState } from "react";
import { View, Pressable, ScrollView, Keyboard, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, spacing, typography, iconSize, hairline } from "@/theme/tokens";
import { Text } from "./Typography";
import { FieldShell } from "./FieldShell";
import { PickerSheet } from "./PickerSheet";

export interface SelectOption<T extends string> {
  value: T;
  /** Shown as the primary line. */
  label: string;
  /** Optional secondary line. */
  sublabel?: string;
}

interface Props<T extends string> {
  label?: string;
  /** Title shown in the picker sheet header. */
  title?: string;
  placeholder?: string;
  value: T | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Dropdown field. Matches <Input> exactly because both render through
 * <FieldShell>; the options open in a self-contained native <Modal> via
 * <PickerSheet> (see that file for the Android nested-Modal constraint).
 */
export function Select<T extends string>({
  label,
  title,
  placeholder,
  value,
  options,
  onChange,
  error,
  hint,
  required,
  icon,
}: Props<T>) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  // Close the keyboard before opening the picker sheet so the picker's own
  // Modal never has to share the screen (and touch handling) with it.
  const openPicker = () => {
    Keyboard.dismiss();
    setOpen(true);
  };

  const pick = (v: T) => {
    onChange(v);
    setOpen(false);
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
              color: selected ? colors.ink : colors.subtle,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {selected ? selected.label : placeholder ?? ""}
          </Text>
          <Ionicons name="chevron-down" size={iconSize.md} color={colors.subtle} />
        </FieldShell>
      </Pressable>

      <PickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={title ?? label ?? ""}
      >
        <ScrollView
          style={{ maxHeight: screenH * 0.6 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.xxl,
            paddingBottom: insets.bottom + spacing.xxl,
            gap: spacing.sm,
          }}
          showsVerticalScrollIndicator={false}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => pick(opt.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: spacing.md,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.sm,
                  borderWidth: hairline,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primarySurface : colors.card,
                }}
              >
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <Text
                    variant="subheading"
                    tone={active ? "primary" : "ink"}
                    style={{ textAlign: isRTL ? "right" : "left" }}
                  >
                    {opt.label}
                  </Text>
                  {opt.sublabel ? (
                    <Text
                      variant="caption"
                      tone="muted"
                      style={{ textAlign: isRTL ? "right" : "left" }}
                    >
                      {opt.sublabel}
                    </Text>
                  ) : null}
                </View>
                {active ? (
                  <Ionicons name="checkmark-circle" size={iconSize.lg} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </PickerSheet>
    </>
  );
}

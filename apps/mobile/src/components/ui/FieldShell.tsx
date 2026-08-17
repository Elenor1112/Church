import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius, controlHeight, hairline } from "@/theme/tokens";
import { Text } from "./Typography";

interface Props {
  label?: string;
  error?: string;
  /** Helper text under the field. Hidden while an error is showing. */
  hint?: string;
  /** Marks the field required with a subtle indicator next to the label. */
  required?: boolean;
  focused?: boolean;
  /** Top-align the control row (multiline fields grow downward). */
  alignTop?: boolean;
  children: React.ReactNode;
}

/**
 * Shared chrome for every form control: label, bordered container, error/hint.
 *
 * Input, Select, DatePicker, and TimePicker each re-implemented this with
 * slightly different border widths (1.5 vs 1), heights (52 vs 48), and label
 * styles — so a form mixing them never lined up. They now all render through
 * this, which means a single change restyles every field in the app.
 */
export function FieldShell({
  label,
  error,
  hint,
  required,
  focused,
  alignTop,
  children,
}: Props) {
  const { colors } = useTheme();

  // Error outranks focus: a focused field with a validation error must still
  // read as invalid.
  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

  return (
    <View style={{ gap: spacing.sm }}>
      {label ? (
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          <Text variant="caption" weight="500" tone="muted">
            {label}
          </Text>
          {required ? (
            <Text variant="caption" tone="error">
              *
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: alignTop ? "flex-start" : "center",
          gap: spacing.md,
          backgroundColor: colors.card,
          borderRadius: radius.sm,
          borderWidth: hairline,
          borderColor,
          // A focus ring instead of a thicker border — the border width stays
          // constant so the field never shifts its neighbours on focus.
          ...(focused && !error
            ? {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.18,
                shadowRadius: 4,
                elevation: 0,
              }
            : null),
          paddingHorizontal: spacing.md,
          paddingVertical: alignTop ? spacing.md : 0,
          minHeight: controlHeight.lg,
        }}
      >
        {children}
      </View>

      {error ? (
        <Text variant="small" tone="error">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" tone="subtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

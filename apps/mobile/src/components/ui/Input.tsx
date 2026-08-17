import React, { forwardRef, useCallback, useState } from "react";
import { TextInput, Pressable, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { typography, iconSize, touchTarget } from "@/theme/tokens";
import { FieldShell } from "./FieldShell";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  secure?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, hint, required, secure, icon, style, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>(
    (e) => {
      setFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback<NonNullable<TextInputProps["onBlur"]>>(
    (e) => {
      setFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      focused={focused}
      alignTop={multiline}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={iconSize.md}
          color={focused ? colors.primary : colors.subtle}
        />
      ) : null}

      <TextInput
        ref={ref}
        multiline={multiline}
        style={[
          {
            flex: 1,
            color: colors.ink,
            fontSize: typography.body.fontSize,
            // No lineHeight on single-line inputs: Android vertically mis-centers
            // the caret when lineHeight is set on a fixed-height TextInput.
            ...(multiline ? { lineHeight: typography.body.lineHeight } : null),
            textAlign: isRTL ? "right" : "left",
            writingDirection: isRTL ? "rtl" : "ltr",
            // Single-line stretches to the row's min height via alignSelf, not
            // height: "100%" — the shell only sets minHeight, so a percentage
            // height resolves against no definite parent height and collapses
            // the input to a 0pt tap target inside a full-size-looking box.
            alignSelf: multiline ? undefined : "stretch",
            // Strip the default Android underline padding so text aligns with
            // the icon baseline.
            paddingVertical: 0,
          },
          style,
        ]}
        placeholderTextColor={colors.subtle}
        secureTextEntry={hidden}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
      />

      {secure ? (
        <Pressable
          onPress={() => setHidden((h) => !h)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={hidden ? "Show password" : "Hide password"}
          style={{ minWidth: touchTarget / 2, alignItems: "flex-end" }}
        >
          <Ionicons
            name={hidden ? "eye-outline" : "eye-off-outline"}
            size={iconSize.md}
            color={colors.subtle}
          />
        </Pressable>
      ) : null}
    </FieldShell>
  );
});

import React, { forwardRef, useState } from "react";
import { View, TextInput, Pressable, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius } from "@/theme/tokens";
import { Text } from "./Typography";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  secure?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, secure, icon, style, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="caption" tone="muted" weight="500">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: colors.card,
          borderRadius: radius.sm,
          borderWidth: 1.5,
          borderColor: error ? colors.error : focused ? colors.primary : colors.border,
          paddingHorizontal: 14,
          height: 52,
        }}
      >
        {icon ? <Ionicons name={icon} size={20} color={colors.muted} /> : null}
        <TextInput
          ref={ref}
          style={[
            {
              flex: 1,
              color: colors.ink,
              fontSize: 16,
              textAlign: isRTL ? "right" : "left",
              height: "100%",
            },
            style,
          ]}
          placeholderTextColor={colors.muted}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons name={hidden ? "eye-off" : "eye"} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="small" tone="error">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

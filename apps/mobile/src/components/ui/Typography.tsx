import React from "react";
import { Text as RNText, type TextProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { fontSize } from "@/theme/tokens";

type Variant = "display" | "title" | "heading" | "body" | "caption" | "small";
type Tone = "ink" | "muted" | "primary" | "gold" | "inverse" | "error" | "success";

interface Props extends TextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: "400" | "500" | "600" | "700";
  center?: boolean;
}

export function Text({
  variant = "body",
  tone = "ink",
  weight,
  center,
  style,
  children,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  const toneColor: Record<Tone, string> = {
    ink: colors.ink,
    muted: colors.muted,
    primary: colors.primary,
    gold: colors.gold,
    inverse: "#FFFFFF",
    error: colors.error,
    success: colors.success,
  };

  const defaultWeight: Record<Variant, "400" | "600" | "700"> = {
    display: "700",
    title: "700",
    heading: "600",
    body: "400",
    caption: "400",
    small: "400",
  };

  return (
    <RNText
      style={[
        {
          fontSize: fontSize[variant],
          color: toneColor[tone],
          fontWeight: weight ?? defaultWeight[variant],
          textAlign: center ? "center" : isRTL ? "right" : "left",
          writingDirection: isRTL ? "rtl" : "ltr",
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

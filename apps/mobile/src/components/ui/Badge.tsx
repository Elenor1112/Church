import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { Text } from "./Typography";

type Variant = "neutral" | "success" | "warning" | "error" | "info" | "gold";

export function Badge({ label, variant = "neutral" }: { label: string; variant?: Variant }) {
  const { colors } = useTheme();
  const map: Record<Variant, { bg: string; fg: string }> = {
    neutral: { bg: colors.border, fg: colors.ink },
    success: { bg: "rgba(22,163,74,0.15)", fg: colors.success },
    warning: { bg: "rgba(245,158,11,0.16)", fg: colors.warning },
    error: { bg: "rgba(220,38,38,0.14)", fg: colors.error },
    info: { bg: "rgba(37,99,235,0.14)", fg: colors.info },
    gold: { bg: "rgba(212,175,55,0.18)", fg: "#8a6d12" },
  };
  const c = map[variant];
  return (
    <View
      style={{
        backgroundColor: c.bg,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <Text variant="small" weight="600" style={{ color: c.fg }}>
        {label}
      </Text>
    </View>
  );
}

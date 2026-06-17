import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { Text } from "./Typography";
import { useTheme } from "@/theme/ThemeProvider";

export function StatCard({
  icon,
  label,
  value,
  accent = "primary",
  delay = 0,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  accent?: "primary" | "gold" | "success" | "info";
  delay?: number;
  badge?: string;
}) {
  const { colors } = useTheme();
  const accentColor = {
    primary: colors.primary,
    gold: colors.gold,
    success: colors.success,
    info: colors.info,
  }[accent];

  return (
    <Card animateIn delay={delay} style={{ flex: 1, gap: 10, minWidth: 140 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: accentColor + "22",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={22} color={accentColor} />
        </View>
        {badge ? (
          <View
            style={{
              backgroundColor: colors.error,
              borderRadius: 999,
              minWidth: 22,
              height: 22,
              paddingHorizontal: 6,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text variant="small" tone="inverse" weight="700">
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="display" style={{ fontSize: 28 }}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </Card>
  );
}

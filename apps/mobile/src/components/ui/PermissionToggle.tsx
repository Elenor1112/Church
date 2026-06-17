import React from "react";
import { View, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Card } from "./Card";
import { Text } from "./Typography";

export function PermissionToggle({
  icon,
  title,
  description,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  return (
    <Card padded style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 14 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: colors.primary + "18",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="600">{title}</Text>
        <Text variant="small" tone="muted">
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#fff"
      />
    </Card>
  );
}

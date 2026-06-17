import React from "react";
import { View } from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { Text } from "./Typography";

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { isRTL } = useI18n();
  return (
    <View
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
        marginTop: 4,
      }}
    >
      <Text variant="heading">{title}</Text>
      {action}
    </View>
  );
}

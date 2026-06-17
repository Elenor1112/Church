import React from "react";
import { View, Image } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Typography";

export function Avatar({
  name,
  uri,
  size = 48,
}: {
  name: string;
  uri?: string | null;
  size?: number;
}) {
  const { colors } = useTheme();
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.border }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text tone="inverse" weight="700" style={{ fontSize: size * 0.38 }}>
        {initials || "?"}
      </Text>
    </View>
  );
}

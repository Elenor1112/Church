import React, { useMemo } from "react";
import { View, Image } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { hairline, radius } from "@/theme/tokens";
import { Text } from "./Typography";

interface Props {
  name: string;
  uri?: string | null;
  size?: number;
  /** Ring around the avatar — marks the signed-in user or a selection. */
  ring?: boolean;
}

/**
 * Deterministic tint index from a name, so a given person keeps the same avatar
 * color everywhere in the app. Low-saturation slate-adjacent hues only — this
 * adds recognisability without reintroducing chroma noise into a neutral system.
 */
const TINTS = [
  { light: "#E7EAF3", dark: "#2A2F3D", ink: "#4A5468" },
  { light: "#E6EDEA", dark: "#232F2B", ink: "#43604F" },
  { light: "#F0E9E6", dark: "#332A26", ink: "#6B5346" },
  { light: "#E9E8F0", dark: "#2A2836", ink: "#544E6B" },
  { light: "#E6EBF0", dark: "#242C34", ink: "#41556B" },
  { light: "#F0E8EC", dark: "#332730", ink: "#6B4A5B" },
] as const;

function tintFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length]!;
}

export function Avatar({ name, uri, size = 40, ring = false }: Props) {
  const { colors, isDark } = useTheme();

  const initials = useMemo(
    () =>
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join(""),
    [name],
  );

  const tint = useMemo(() => tintFor(name), [name]);

  // Squircle rather than a circle at larger sizes: it echoes the card radius
  // and reads as more contemporary than a plain circle.
  const shape = {
    width: size,
    height: size,
    borderRadius: size >= 56 ? radius.lg : size / 2,
    ...(ring ? { borderWidth: hairline * 2, borderColor: colors.primary } : null),
  };

  if (uri) {
    return <Image source={{ uri }} style={[shape, { backgroundColor: colors.cardAlt }]} />;
  }

  return (
    <View
      style={[
        shape,
        {
          backgroundColor: isDark ? tint.dark : tint.light,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Text
        weight="600"
        style={{
          fontSize: size * 0.36,
          lineHeight: size * 0.44,
          color: isDark ? colors.ink : tint.ink,
        }}
      >
        {initials || "?"}
      </Text>
    </View>
  );
}

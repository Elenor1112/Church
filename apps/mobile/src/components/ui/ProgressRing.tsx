import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Typography";

/** Circular progress for "x of 4 categories" set progress. */
export function ProgressRing({
  progress,
  total,
  size = 96,
  stroke = 9,
}: {
  progress: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? progress / total : 0;
  const dash = c * pct;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.gold}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text variant="title">{progress}</Text>
      <Text variant="small" tone="muted">
        / {total}
      </Text>
    </View>
  );
}

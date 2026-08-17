import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { duration } from "@/theme/tokens";
import { Text } from "./Typography";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  progress: number;
  total: number;
  size?: number;
  stroke?: number;
}

/**
 * Circular progress for "x of 4 categories" set progress.
 *
 * The arc animates from empty on mount so completing a category reads as
 * progress being made, not as a static figure. Stroke is thinner than before —
 * a heavy ring competed with the number inside it.
 */
export function ProgressRing({ progress, total, size = 88, stroke = 6 }: Props) {
  const { colors } = useTheme();

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(Math.max(progress / total, 0), 1) : 0;

  const animated = useSharedValue(0);
  useEffect(() => {
    animated.value = withTiming(pct, {
      duration: duration.slow,
      easing: Easing.out(Easing.cubic),
    });
  }, [pct, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - animated.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.cardAlt}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text variant="title" tabular>
          {progress}
        </Text>
        <Text variant="caption" tone="subtle" tabular>
          /{total}
        </Text>
      </View>
    </View>
  );
}

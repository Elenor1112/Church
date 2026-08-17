import React, { useImperativeHandle, useMemo, useRef, forwardRef } from "react";
import { View } from "react-native";
import Svg, { G, Path, Circle, Text as SvgText, Polygon } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Fallback slice fills, cycled when a segment has no admin-chosen color.
 *
 * Muted, evenly-spaced hues at a consistent lightness so adjacent slices stay
 * distinguishable without any one of them shouting. Admin-authored colors
 * always win over these.
 */
const PALETTE = [
  "#4A57B8",
  "#3F7D6B",
  "#8A5A3C",
  "#6B4A7D",
  "#3A6B8C",
  "#8A5568",
  "#5A6B3F",
  "#7A5230",
  "#455A8A",
  "#2F7566",
  "#7D4A57",
  "#5B5F8A",
];

/** Full turns spun before settling — enough to read as a real spin, not a nudge. */
const FULL_TURNS = 5;
const SPIN_MS = 4200;

export interface SpinWheelHandle {
  /**
   * Rotate so `index` ends up under the pointer, then invoke `onSettled`.
   * Calling this again while a spin is in flight is ignored by the caller.
   */
  spinTo: (index: number, onSettled: () => void) => void;
}

interface Props {
  segments: { id: string; label: string; color: string | null }[];
  size?: number;
  /** Highlights the winning slice once a result is known. */
  highlightIndex?: number | null;
}

/** Point on the wheel circle at `angle` degrees, measured clockwise from 12 o'clock. */
function pointAt(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** SVG wedge path for the slice spanning [startAngle, endAngle]. */
function wedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  // A single path cannot describe a full circle with one arc, so a lone segment
  // is drawn as two half-circles joined at the bottom.
  if (endAngle - startAngle >= 360) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const start = pointAt(cx, cy, r, startAngle);
  const end = pointAt(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

/** Trim a label so it stays inside its slice; thinner slices get fewer chars. */
function fitLabel(label: string, sliceCount: number): string {
  const max = sliceCount <= 4 ? 18 : sliceCount <= 8 ? 12 : 8;
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

/**
 * A spinnable prize wheel.
 *
 * The wheel is drawn once and animated purely by rotating its container, so the
 * SVG never re-renders mid-spin. The pointer sits at 12 o'clock; landing on a
 * segment means rotating until that segment's midpoint is under the pointer,
 * which is why the target rotation is negative (the wheel turns clockwise and
 * carries the segment backwards into place).
 */
export const SpinWheel = forwardRef<SpinWheelHandle, Props>(function SpinWheel(
  { segments, size = 280, highlightIndex = null },
  ref,
) {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);
  // Kept outside shared value so successive spins keep accumulating turns
  // instead of snapping back to zero between them.
  const turns = useRef(0);

  const count = segments.length;
  const sliceAngle = count > 0 ? 360 / count : 360;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;

  const slices = useMemo(
    () =>
      segments.map((seg, i) => {
        const start = i * sliceAngle;
        const end = start + sliceAngle;
        const mid = start + sliceAngle / 2;
        // Labels sit two-thirds out from the hub and rotate to run along the
        // slice, so they stay readable as the wheel fills up.
        const labelPos = pointAt(cx, cy, r * 0.62, mid);
        return {
          key: seg.id,
          path: wedgePath(cx, cy, r, start, end),
          fill: seg.color ?? PALETTE[i % PALETTE.length]!,
          label: fitLabel(seg.label, count),
          labelX: labelPos.x,
          labelY: labelPos.y,
          labelRotation: mid,
        };
      }),
    [segments, sliceAngle, cx, cy, r, count],
  );

  useImperativeHandle(ref, () => ({
    spinTo(index, onSettled) {
      if (count === 0) return;
      turns.current += FULL_TURNS;
      // Negative: rotating the wheel clockwise brings the segment at `index`
      // backwards up to the pointer at 12 o'clock.
      const target = turns.current * 360 - (index * sliceAngle + sliceAngle / 2);
      rotation.value = withTiming(
        target,
        { duration: SPIN_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(onSettled)();
        },
      );
    },
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (count === 0) return null;

  return (
    <View style={{ width: size, height: size + 18, alignItems: "center" }}>
      {/* Pointer at 12 o'clock — outside the rotating container so it stays put. */}
      <Svg width={26} height={18} style={{ zIndex: 2, marginBottom: -6 }}>
        <Polygon points="13,18 0,0 26,0" fill={colors.gold} stroke={colors.ink} strokeWidth={1} />
      </Svg>

      <Animated.View style={animatedStyle}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((s, i) => (
              <Path
                key={s.key}
                d={s.path}
                fill={s.fill}
                stroke={highlightIndex === i ? colors.gold : "#FFFFFF"}
                strokeWidth={highlightIndex === i ? 4 : 1.5}
                opacity={highlightIndex !== null && highlightIndex !== i ? 0.55 : 1}
              />
            ))}
            {slices.map((s) => (
              <SvgText
                key={`${s.key}-label`}
                x={s.labelX}
                y={s.labelY}
                fill="#FFFFFF"
                fontSize={count > 8 ? 10 : 12}
                fontWeight="700"
                textAnchor="middle"
                alignmentBaseline="middle"
                transform={`rotate(${s.labelRotation}, ${s.labelX}, ${s.labelY})`}
              >
                {s.label}
              </SvgText>
            ))}
            {/* Hub */}
            <Circle cx={cx} cy={cy} r={size * 0.09} fill={colors.card} stroke={colors.gold} strokeWidth={3} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
});

import React, { useEffect } from "react";
import { View, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/theme/ThemeProvider";
import { shadow, spacing, radius, hairline, duration, spring, touchTarget } from "@/theme/tokens";
import { Text } from "@/components/ui/Typography";

interface TabMeta {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
}

/**
 * Floating bottom navigation.
 *
 * Sits inside the safe area with a hairline border and a soft shadow rather
 * than the previous heavy drop shadow — it should feel like a surface resting
 * on the content, not hovering far above it. Icons switch between outline and
 * filled variants on selection so the active tab is legible without relying on
 * colour alone.
 */
export function makeTabBar(meta: Record<string, TabMeta>) {
  return function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    return (
      <View
        style={{
          position: "absolute",
          left: spacing.lg,
          right: spacing.lg,
          bottom: insets.bottom > 0 ? insets.bottom : spacing.md,
          flexDirection: "row",
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: hairline,
          borderColor: colors.border,
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.sm,
          justifyContent: "space-around",
          ...shadow.large,
        }}
      >
        {state.routes.map((route, index) => {
          const m = meta[route.name];
          if (!m) return null;
          const focused = state.index === index;
          return (
            <TabItem
              key={route.key}
              meta={m}
              focused={focused}
              activeColor={colors.primary}
              inactiveColor={colors.subtle}
              activeSurface={colors.primarySurface}
              badgeBg={colors.error}
              badgeFg={colors.onPrimary}
              onPress={() => {
                void Haptics.selectionAsync();
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            />
          );
        })}
      </View>
    );
  };
}

/** Ionicons ships `x` and `x-outline`; strip the suffix to get the filled name. */
function filledIcon(name: keyof typeof Ionicons.glyphMap): keyof typeof Ionicons.glyphMap {
  const base = name.replace(/-outline$/, "");
  return (base in Ionicons.glyphMap ? base : name) as keyof typeof Ionicons.glyphMap;
}

function TabItem({
  meta,
  focused,
  activeColor,
  inactiveColor,
  activeSurface,
  badgeBg,
  badgeFg,
  onPress,
}: {
  meta: TabMeta;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
  activeSurface: string;
  badgeBg: string;
  badgeFg: string;
  onPress: () => void;
}) {
  const active = useSharedValue(focused ? 1 : 0);

  // Drive the spring from an effect, not the render body: a shared-value write
  // during render fires for renders that get discarded (concurrent/StrictMode)
  // and restarts on every unrelated re-render, which left icons mid-scale.
  useEffect(() => {
    active.value = withSpring(focused ? 1 : 0, spring);
  }, [focused, active]);

  const pressed = useSharedValue(0);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scaleX: interpolate(active.value, [0, 1], [0.75, 1]) }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.06 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: duration.press });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: duration.fast });
      }}
      accessibilityRole="tab"
      accessibilityLabel={meta.label}
      accessibilityState={{ selected: focused }}
      style={{ flex: 1, alignItems: "center", minHeight: touchTarget, justifyContent: "center" }}
    >
      {/* Selection pill animates independently of the icon so it can scale in
          horizontally without distorting the glyph. */}
      <Animated.View
        pointerEvents="none"
        style={[
          pillStyle,
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: spacing.xs,
            right: spacing.xs,
            borderRadius: radius.sm,
            backgroundColor: activeSurface,
          },
        ]}
      />

      <Animated.View
        style={[
          contentStyle,
          { alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: spacing.xs },
        ]}
      >
        <View>
          <Ionicons
            name={focused ? filledIcon(meta.icon) : meta.icon}
            size={22}
            color={focused ? activeColor : inactiveColor}
          />
          {meta.badge && meta.badge > 0 ? (
            <View
              style={{
                position: "absolute",
                top: -3,
                // Nudged clear of the glyph's optical edge.
                right: -7,
                minWidth: 15,
                height: 15,
                paddingHorizontal: 3,
                borderRadius: radius.pill,
                backgroundColor: badgeBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                weight="700"
                style={{
                  fontSize: 9,
                  lineHeight: Platform.OS === "ios" ? 11 : 12,
                  color: badgeFg,
                }}
              >
                {meta.badge > 9 ? "9+" : meta.badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          variant="small"
          weight={focused ? "600" : "500"}
          numberOfLines={1}
          style={{ color: focused ? activeColor : inactiveColor, fontSize: 10, lineHeight: 13 }}
        >
          {meta.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

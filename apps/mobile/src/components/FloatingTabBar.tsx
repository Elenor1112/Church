import React from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/theme/ThemeProvider";
import { shadow } from "@/theme/tokens";
import { Text } from "@/components/ui/Typography";

interface TabMeta {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
}

export function makeTabBar(meta: Record<string, TabMeta>) {
  return function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    return (
      <View
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: insets.bottom > 0 ? insets.bottom : 12,
          flexDirection: "row",
          backgroundColor: colors.card,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 8,
          paddingVertical: 8,
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
              color={colors.primary}
              inactive={colors.muted}
              badgeBg={colors.error}
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

function TabItem({
  meta,
  focused,
  color,
  inactive,
  badgeBg,
  onPress,
}: {
  meta: TabMeta;
  focused: boolean;
  color: string;
  inactive: string;
  badgeBg: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(focused ? 1 : 0.9);
  scale.value = withSpring(focused ? 1 : 0.9, { damping: 14, stiffness: 180 });
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} style={{ flex: 1, alignItems: "center" }}>
      <Animated.View
        style={[
          animatedStyle,
          {
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            paddingVertical: 6,
            paddingHorizontal: 4,
            borderRadius: 999,
            backgroundColor: focused ? color + "16" : "transparent",
            width: "100%",
          },
        ]}
      >
        <View>
          <Ionicons name={meta.icon} size={22} color={focused ? color : inactive} />
          {meta.badge && meta.badge > 0 ? (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -8,
                minWidth: 16,
                height: 16,
                paddingHorizontal: 3,
                borderRadius: 8,
                backgroundColor: badgeBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text variant="small" tone="inverse" weight="700" style={{ fontSize: 9 }}>
                {meta.badge > 9 ? "9+" : meta.badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="small" weight={focused ? "600" : "400"} style={{ color: focused ? color : inactive, fontSize: 10 }}>
          {meta.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

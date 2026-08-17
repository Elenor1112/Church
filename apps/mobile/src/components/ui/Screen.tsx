import React from "react";
import { View, ScrollView, RefreshControl, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { screenGutter, spacing } from "@/theme/tokens";

/**
 * Bottom clearance for the floating tab bar so the last item is never trapped
 * beneath it. Tab bar height (~56) + its bottom offset + breathing room.
 */
const TAB_BAR_CLEARANCE = 96;

interface ScreenProps extends ScrollViewProps {
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  /**
   * Set false on screens with no floating tab bar (auth, fullscreen scanner) so
   * content isn't padded for a bar that isn't there.
   */
  tabBarInset?: boolean;
  /** Vertical rhythm between direct children. Defaults to 16. */
  gap?: number;
}

/**
 * Screen container: owns safe-area insets, the horizontal gutter, the vertical
 * rhythm between blocks, and pull-to-refresh.
 *
 * Screens should not set their own outer padding — that's what made gutters
 * drift between screens. Pass content and let this align it.
 */
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  padded = true,
  tabBarInset = true,
  gap = spacing.lg,
  contentContainerStyle,
  ...rest
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const frame = {
    paddingTop: insets.top + spacing.sm,
    paddingHorizontal: padded ? screenGutter : 0,
    paddingBottom: tabBarInset ? insets.bottom + TAB_BAR_CLEARANCE : insets.bottom + spacing.xxl,
  };

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[{ flex: 1 }, frame]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[frame, { gap }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      // Momentum on iOS makes long member/attendance lists feel native.
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.muted}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        ) : undefined
      }
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

import React from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/components/ui";
import { radius } from "@/theme/tokens";

interface AppSheetProps {
  title: string;
  onClose: () => void;
  /** Scrollable body content (form fields, etc.). */
  children: React.ReactNode;
  /** Fixed footer, e.g. Cancel / Save buttons. */
  footer?: React.ReactNode;
  /** Fraction of screen height the body may occupy before scrolling. */
  bodyMaxHeightRatio?: number;
}

/**
 * Bottom sheet content for the overlay host. Render this from `overlay.open`
 * with `variant: "sheet"` — the host handles the backdrop, slide-up animation,
 * backdrop/back-button dismissal, and bottom anchoring.
 *
 * Layout mirrors the previous modal: fixed header, scrollable body bounded by an
 * explicit pixel maxHeight (so the column can't collapse to 0 under Fabric),
 * and a fixed footer padded for the bottom safe area.
 */
export function AppSheet({ title, onClose, children, footer, bodyMaxHeightRatio = 0.62 }: AppSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  return (
    <Pressable
      // Swallow taps so they don't fall through to the backdrop.
      onPress={(e) => e.stopPropagation()}
      style={{
        backgroundColor: colors.background,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        maxHeight: screenH * 0.92,
      }}
    >
      <View style={styles.header}>
        <Text variant="heading">{title}</Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView
        style={{ maxHeight: screenH * bodyMaxHeightRatio }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>

      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + 12, borderTopColor: colors.border },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  body: { paddingHorizontal: 24, paddingBottom: 16, gap: 16 },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

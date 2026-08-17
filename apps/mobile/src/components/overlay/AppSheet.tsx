import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/components/ui";
import { radius, spacing, iconSize, hairline } from "@/theme/tokens";

interface AppSheetProps {
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  onClose: () => void;
  /** Scrollable body content (form fields, etc.). */
  children: React.ReactNode;
  /** Fixed footer, e.g. Cancel / Save buttons. */
  footer?: React.ReactNode;
  /** Fraction of screen height the body occupies (fixed — never measure-snaps). */
  bodyMaxHeightRatio?: number;
}

/**
 * Bottom-sheet content for the overlay host. Rendered inside a native <Modal>,
 * so touch + keyboard handling are reliable.
 *
 * Rendered inside a native <Modal>, so KeyboardAvoidingView works correctly and
 * does NOT intercept touches (the portal-layer problem is gone). The body uses a
 * FIXED height so the sheet never measure-snaps/jumps.
 */
export function AppSheet({
  title,
  subtitle,
  onClose,
  children,
  footer,
  bodyMaxHeightRatio = 0.55,
}: AppSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        borderTopWidth: hairline,
        borderColor: colors.border,
        maxHeight: screenH * 0.92,
      }}
    >
      {/* Grabber — the affordance that says this panel is dismissible. */}
      <View
        style={{
          alignSelf: "center",
          width: 36,
          height: 4,
          borderRadius: radius.pill,
          backgroundColor: colors.borderStrong,
          marginTop: spacing.md,
        }}
      />

      <View style={styles.header}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="heading">{title}</Text>
          {subtitle ? (
            <Text variant="caption" tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onClose} hitSlop={16} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={iconSize.lg} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView
        style={{ maxHeight: screenH * bodyMaxHeightRatio }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        // "always" so a tap reaches the control on the first touch even while
        // the keyboard is open ("handled" eats the first tap to dismiss it).
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        // Extra bottom space so the focused field can scroll clear of the
        // keyboard instead of being hidden behind it.
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>

      {footer ? (
        <View
          style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, borderTopColor: colors.border }]}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg, gap: spacing.lg },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

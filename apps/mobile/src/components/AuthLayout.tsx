import React from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, duration, screenGutter } from "@/theme/tokens";
import { CrossLogo, Text } from "@/components/ui";

interface Props {
  title: string;
  subtitle?: string;
  /** Small line above the title — the church name. */
  eyebrow?: string;
  /** Center the block vertically (sign-in) vs. top-align it (long forms). */
  centered?: boolean;
  children: React.ReactNode;
  /** Pinned below the form, e.g. the language toggle. */
  footer?: React.ReactNode;
}

/**
 * Shared shell for the signed-out screens.
 *
 * Sign-in, register, and pending each rebuilt this keyboard/scroll/branding
 * stack with different paddings and logo sizes. One shell means the mark sits
 * in the same place as you move between them, so the transition feels like one
 * flow rather than three unrelated pages.
 */
export function AuthLayout({
  title,
  subtitle,
  eyebrow,
  centered = false,
  children,
  footer,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* "always": with the keyboard open the default eats the first tap just to
          dismiss it, so controls appeared to need two taps. */}
      {/* Deliberately no justifyContent: "center" here, even for `centered`.
          Centering re-resolves every child's position whenever the ScrollView's
          height changes, and the keyboard opening is exactly such a change. That
          relayout moved the focused input out from under Android's soft-input
          handler mid-focus, which dropped focus, closed the keyboard, restored
          the layout, and let the next tap start the cycle again — the field
          flickered instead of accepting input. `centered` is now approximated
          with top padding, which is a fixed offset and so survives a resize. */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: screenGutter + spacing.sm,
          paddingTop: insets.top + (centered ? spacing.xxxl * 2 : spacing.xxxl),
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.xxl,
        }}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInUp.duration(duration.slow)}
          style={{ alignItems: "center", gap: spacing.lg }}
        >
          <CrossLogo size={64} />
          <View style={{ gap: spacing.xs }}>
            {eyebrow ? (
              <Text variant="overline" tone="muted" uppercase center>
                {eyebrow}
              </Text>
            ) : null}
            <Text variant="title" center>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" tone="muted" center style={{ maxWidth: 320 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Animated.View>

        {/* Plain View, not Animated.View with an entering animation. The form
            contains TextInputs; when the keyboard opens, KeyboardAvoidingView
            resizes this subtree, and a node still carrying an entering
            animation gets torn down and recreated by the layout-animation
            manager. That detaches the focused input, so the keyboard flashed
            open and shut. The branding block above animates safely because
            nothing in it takes focus. */}
        <View style={{ gap: spacing.lg }}>{children}</View>

        {/* A fixed margin, not marginTop: "auto" — "auto" is computed from the
            leftover space in the scroll container, so it moves every time the
            keyboard resizes that container. See the note above. */}
        {footer ? <View style={{ marginTop: spacing.xxl }}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

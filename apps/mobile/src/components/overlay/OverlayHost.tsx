import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useOverlayContext } from "./OverlayProvider";
import type { OverlayInstance } from "./types";

/**
 * Renders the overlay stack. Mount this ONCE at the app root.
 *
 * Each overlay is a self-contained native React Native <Modal>. There is no
 * shared portal layer, no Reanimated, no gesture-handler, and no absolutely-
 * positioned `box-none` wrapper — those were the source of every touch freeze.
 * A native <Modal> opens its own window with correct, isolated hit-testing and
 * keyboard handling on both Android and iOS.
 */
export function OverlayHost() {
  const { _stack } = useOverlayContext();
  if (_stack.length === 0) return null;
  // Render ONLY the topmost instance. Android supports one reliably hit-testable
  // Modal window at a time: when a second overlay opens while a closing one is
  // still mounted (the 280ms exit window), the stale window stays in the
  // hierarchy and swallows touches over the visible sheet. Keying on the id also
  // guarantees a fresh Modal per instance rather than a reused, half-torn-down one.
  const top = _stack[_stack.length - 1]!;
  return <OverlayLayer key={top.id} instance={top} />;
}

function OverlayLayer({ instance }: { instance: OverlayInstance }) {
  const { close } = useOverlayContext();
  const { colors } = useTheme();

  const beginClose = () => close(instance.id);

  // sheet → content pinned to bottom (spacer above only)
  // dialog → content centered (spacer above AND below)
  // other → content pinned to top (spacer below only)
  const align =
    instance.variant === "sheet" ? "flex-end" : instance.variant === "dialog" ? "center" : "flex-start";

  return (
    <Modal
      visible={instance.visible}
      transparent
      animationType={instance.variant === "sheet" ? "slide" : "fade"}
      statusBarTranslucent
      onRequestClose={instance.dismissOnBackButton ? beginClose : undefined}
    >
      {/* Layout as a flex column of NON-OVERLAPPING siblings: a dismiss spacer
          before the content (and, for centered dialogs, one after too). The
          backdrop tint lives on the layer itself. Because the spacers are flex
          siblings — NOT an absoluteFill on top of the content — they can never
          cover the form fields and swallow their touches. */}
      <View style={[styles.layer, { backgroundColor: colors.scrim }]}>
        {align !== "flex-start" ? (
          <Pressable
            style={styles.spacer}
            onPress={instance.dismissOnBackdrop ? beginClose : undefined}
            accessibilityRole="button"
            accessibilityLabel="Close overlay"
          />
        ) : null}
        {/* Content — a plain View that receives touches normally. No overlap
            with any Pressable, no box-none, no Reanimated, no gestures. */}
        <View style={styles.content}>
          {instance.render({ close: beginClose })}
        </View>
        {align !== "flex-end" ? (
          <Pressable
            style={styles.spacer}
            onPress={instance.dismissOnBackdrop ? beginClose : undefined}
            accessibilityRole="button"
            accessibilityLabel="Close overlay"
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1 },
  // Fills the empty area around the content; tapping it dismisses. Never
  // overlaps the content, so it cannot intercept the form's touches.
  spacer: { flex: 1, width: "100%" },
  content: { width: "100%" },
});

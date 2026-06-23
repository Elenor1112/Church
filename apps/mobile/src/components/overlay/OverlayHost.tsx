import React, { useEffect } from "react";
import { BackHandler, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useOverlayContext } from "./OverlayProvider";
import type { OverlayInstance } from "./types";

const ANIM_IN = 220;
const ANIM_OUT = 180;

/**
 * Renders the overlay stack. Mount this ONCE at the app root, as a sibling
 * placed AFTER the navigator so it paints above every screen and the tab bar.
 *
 * Each overlay is a full-screen absolute layer (no native <Modal>): a dimmed
 * backdrop plus the content, animated with Reanimated. Because the layer is
 * sized with explicit window width/height (not flex/absoluteFill), it resolves
 * on the first layout pass and never enters the Fabric re-measure loop that
 * froze the old modal screens.
 */
export function OverlayHost() {
  const { _stack } = useOverlayContext();
  if (_stack.length === 0) return null;
  return (
    <>
      {_stack.map((instance) => (
        <OverlayLayer key={instance.id} instance={instance} />
      ))}
    </>
  );
}

function OverlayLayer({ instance }: { instance: OverlayInstance }) {
  const { close, _remove } = useOverlayContext();
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  const beginClose = () => close(instance.id);

  // Animate in on mount; animate out when `visible` flips to false, then unmount.
  // Keyed on `visible` only — progress/_remove/id are stable for an instance.
  useEffect(() => {
    if (instance.visible) {
      progress.value = withTiming(1, { duration: ANIM_IN, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = withTiming(
        0,
        { duration: ANIM_OUT, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(_remove)(instance.id);
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.visible]);

  // Android hardware back button closes this overlay if it's dismissible.
  useEffect(() => {
    if (!instance.dismissOnBackButton) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (instance.visible) {
        close(instance.id);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [instance.visible, instance.dismissOnBackButton, instance.id, close]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  // Sheet slides up from the bottom; dialog/fullscreen fade + scale gently.
  const contentStyle = useAnimatedStyle(() => {
    if (instance.variant === "sheet") {
      return { transform: [{ translateY: (1 - progress.value) * height }] };
    }
    return {
      opacity: progress.value,
      transform: [{ scale: 0.96 + progress.value * 0.04 }],
    };
  });

  const justifyContent =
    instance.variant === "sheet" ? "flex-end" : instance.variant === "dialog" ? "center" : "flex-start";

  return (
    <View
      // Explicit window dimensions — never flex:1 / absoluteFill — so the layer
      // resolves on the first pass and can't oscillate under Fabric.
      style={[styles.layer, { width, height, justifyContent }]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        pointerEvents={instance.visible ? "auto" : "none"}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={instance.dismissOnBackdrop ? beginClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Close overlay"
        />
      </Animated.View>

      <Animated.View
        style={[instance.variant === "fullscreen" ? { width, height } : undefined, contentStyle]}
        pointerEvents="box-none"
      >
        {instance.render({ close: beginClose })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", top: 0, left: 0 },
  backdrop: { backgroundColor: "rgba(0,0,0,0.5)" },
});

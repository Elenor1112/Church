import React from "react";
import { View, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing, iconSize, shadow } from "@/theme/tokens";
import { Text } from "./Typography";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** "sheet" slides from the bottom; "center" fades in centered (calendars). */
  placement?: "sheet" | "center";
  children: React.ReactNode;
}

/**
 * Modal chrome shared by Select, DatePicker, and TimePicker.
 *
 * IMPORTANT (behavioral, do not change): this is a self-contained native
 * <Modal> with NO `statusBarTranslucent`. These pickers are opened from inside
 * other Modals (e.g. the Create-user sheet); on Android a statusBarTranslucent
 * Modal nested in another Modal offsets touch coordinates and every control
 * inside becomes untappable. The backdrop is a plain Pressable painted behind
 * plain-View content — no Reanimated, no gesture-handler, no `box-none`.
 */
export function PickerSheet({ visible, onClose, title, placement = "sheet", children }: Props) {
  const { colors } = useTheme();
  const centered = placement === "center";

  return (
    <Modal
      visible={visible}
      transparent
      animationType={centered ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View
        style={[
          centered ? styles.centerLayer : styles.sheetLayer,
          { backgroundColor: colors.scrim },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        <View
          style={[
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            centered ? styles.centerContent : styles.sheetContent,
            shadow.large,
          ]}
        >
          {/* Grabber: the affordance that says "this can be dismissed". */}
          {!centered ? (
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
          ) : null}

          <View style={[styles.header, centered && styles.headerCentered]}>
            <Text variant="heading">{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={iconSize.lg} color={colors.muted} />
            </Pressable>
          </View>

          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetLayer: { flex: 1, justifyContent: "flex-end" },
  centerLayer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
  },
  sheetContent: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  centerContent: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 360,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  // The centered container already applies its own padding.
  headerCentered: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
});

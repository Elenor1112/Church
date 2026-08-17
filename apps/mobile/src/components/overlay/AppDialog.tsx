import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { Card, Text, Button, IconTile, type TileTone } from "@/components/ui";
import { spacing, iconSize } from "@/theme/tokens";

interface DialogAction {
  label: string;
  onPress: () => void;
  /** Button style. "danger" renders the destructive variant. */
  variant?: "primary" | "outline" | "danger";
  loading?: boolean;
}

interface AppDialogProps {
  title?: string;
  message?: string;
  onClose: () => void;
  /** Render an explicit X close button in the top-right. Defaults to false
   *  (backdrop tap and the hardware back button still close the dialog). */
  showCloseButton?: boolean;
  /**
   * Optional Ionicon shown above the title. `tone` selects the tint from the
   * theme; `color` is accepted for back-compat with existing call sites and is
   * ignored in favour of the tone.
   */
  icon?: { name: keyof typeof Ionicons.glyphMap; color?: string; tone?: TileTone };
  /** Action buttons (e.g. Cancel / Confirm). Rendered in a row. */
  actions?: DialogAction[];
  /** Arbitrary custom body, rendered below the message. */
  children?: React.ReactNode;
}

/**
 * Centered dialog content for the overlay host. Render from `overlay.open` with
 * `variant: "dialog"`. Use for confirmations, delete/approve prompts, and small
 * result cards. The host supplies the backdrop, fade+scale animation, and
 * dismissal handling.
 */
export function AppDialog({
  title,
  message,
  onClose,
  showCloseButton,
  icon,
  actions,
  children,
}: AppDialogProps) {
  const { colors } = useTheme();

  // A destructive confirmation stacks its buttons: side-by-side equal-width
  // buttons make it too easy to hit the wrong one on a narrow screen.
  const hasDanger = actions?.some((a) => a.variant === "danger");
  const stacked = hasDanger || (actions?.length ?? 0) > 2;

  return (
    <View style={{ paddingHorizontal: spacing.xxl, width: "100%" }}>
      <Card elevation="large" style={{ gap: spacing.lg, padding: spacing.xxl }}>
        {showCloseButton ? (
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ position: "absolute", top: spacing.md, right: spacing.md, zIndex: 1 }}
          >
            <Ionicons name="close" size={iconSize.md} color={colors.muted} />
          </Pressable>
        ) : null}

        {icon ? (
          <View style={{ alignItems: "center" }}>
            <IconTile icon={icon.name} tone={icon.tone ?? "primary"} size="lg" />
          </View>
        ) : null}

        {title || message ? (
          <View style={{ gap: spacing.sm }}>
            {title ? (
              <Text variant="heading" center>
                {title}
              </Text>
            ) : null}
            {message ? (
              <Text variant="caption" tone="muted" center>
                {message}
              </Text>
            ) : null}
          </View>
        ) : null}

        {children}

        {actions && actions.length > 0 ? (
          <View
            style={{
              flexDirection: stacked ? "column-reverse" : "row",
              gap: spacing.sm,
              marginTop: spacing.xs,
            }}
          >
            {actions.map((a) => (
              <View key={a.label} style={stacked ? undefined : { flex: 1 }}>
                <Button
                  title={a.label}
                  variant={a.variant ?? "primary"}
                  loading={a.loading}
                  onPress={a.onPress}
                />
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

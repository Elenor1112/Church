import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { Card, Text, Button } from "@/components/ui";

interface DialogAction {
  label: string;
  onPress: () => void;
  /** Button style. "danger" renders the destructive (red) variant. */
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
  /** Optional Ionicon shown above the title. */
  icon?: { name: keyof typeof Ionicons.glyphMap; color: string };
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
export function AppDialog({ title, message, onClose, showCloseButton, icon, actions, children }: AppDialogProps) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={(e) => e.stopPropagation()} style={{ paddingHorizontal: 24, width: "100%" }}>
      <Card style={{ gap: 16, paddingVertical: 24 }}>
        {showCloseButton ? (
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ position: "absolute", top: 12, right: 12, zIndex: 1 }}
          >
            <Ionicons name="close" size={22} color={colors.muted} />
          </Pressable>
        ) : null}
        {icon ? (
          <View style={{ alignItems: "center" }}>
            <Ionicons name={icon.name} size={56} color={icon.color} />
          </View>
        ) : null}
        {title ? (
          <Text variant="heading" center>
            {title}
          </Text>
        ) : null}
        {message ? (
          <Text tone="muted" center>
            {message}
          </Text>
        ) : null}
        {children}
        {actions && actions.length > 0 ? (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            {actions.map((a) => (
              <View key={a.label} style={{ flex: 1 }}>
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
    </Pressable>
  );
}

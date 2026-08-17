import React from "react";
import { View, Switch, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { spacing, radius, hairline } from "@/theme/tokens";
import { Text } from "./Typography";
import { IconTile } from "./IconTile";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

/**
 * A single permission with a switch.
 *
 * Rendered as an inset row rather than an elevated Card: these appear as a
 * stacked group inside a form, and a column of shadowed cards made the sheet
 * look like a pile of unrelated objects. `description` is often empty — the
 * layout collapses cleanly when it is.
 */
export function PermissionToggle({ icon, title, description, value, onChange }: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  return (
    <View
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        gap: spacing.md,
        backgroundColor: colors.cardAlt,
        borderRadius: radius.sm,
        borderWidth: hairline,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
      }}
    >
      <IconTile icon={icon} tone={value ? "primary" : "neutral"} size="sm" />

      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="caption" weight="600">
          {title}
        </Text>
        {description ? (
          <Text variant="small" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={Platform.OS === "android" ? colors.card : undefined}
        ios_backgroundColor={colors.borderStrong}
        // The stock switch is oversized next to 14pt text on Android.
        style={Platform.OS === "android" ? { transform: [{ scale: 0.9 }] } : undefined}
      />
    </View>
  );
}

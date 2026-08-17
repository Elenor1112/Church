import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius, hairline } from "@/theme/tokens";
import { Card } from "./Card";
import { Text } from "./Typography";
import { IconTile, type TileTone } from "./IconTile";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  accent?: TileTone;
  delay?: number;
  /** Small count badge, e.g. unread alerts. */
  badge?: string;
}

/**
 * A single metric.
 *
 * The value is the point of the card, so it gets the largest type and sits
 * directly above its label with no competing elements. The icon is demoted to a
 * quiet identifier rather than a decorative colour block — previously the tinted
 * icon was as visually loud as the number it was labelling.
 */
export function StatCard({ icon, label, value, accent = "primary", delay = 0, badge }: Props) {
  const { colors } = useTheme();

  return (
    <Card animateIn delay={delay} style={{ flex: 1, gap: spacing.md, minWidth: 140 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <IconTile icon={icon} tone={accent} size="sm" />
        {badge ? (
          <View
            style={{
              backgroundColor: colors.errorSurface,
              borderRadius: radius.pill,
              borderWidth: hairline,
              borderColor: colors.error,
              minWidth: 20,
              paddingHorizontal: spacing.xs,
              paddingVertical: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text variant="small" weight="700" style={{ color: colors.error }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.xxs }}>
        <Text variant="metric" tabular>
          {value}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Card>
  );
}

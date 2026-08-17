import React from "react";
import { View } from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { spacing } from "@/theme/tokens";
import { Text } from "./Typography";

interface Props {
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Trailing control — a "See all" button, count, or filter. */
  action?: React.ReactNode;
}

/**
 * Labels a group of content. Sits directly on the background (no container) so
 * the eye reads it as a divider between blocks rather than as another card.
 */
export function SectionHeader({ title, subtitle, action }: Props) {
  const { isRTL } = useI18n();
  return (
    <View
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        // Pull tight to the content below, generous above: the header belongs
        // to what follows it, not to what precedes it.
        marginTop: spacing.sm,
        marginBottom: -spacing.xs,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="heading">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

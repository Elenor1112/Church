import React from "react";
import { View } from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { spacing } from "@/theme/tokens";
import { Text } from "./Typography";

interface Props {
  title: string;
  subtitle?: string;
  /** Small uppercase label above the title (e.g. a role or context). */
  overline?: string;
  /** Trailing control — avatar, icon button, or action. */
  action?: React.ReactNode;
  /** Leading element rendered before the text block (e.g. an Avatar). */
  leading?: React.ReactNode;
}

/**
 * The title block at the top of a screen.
 *
 * Every screen previously hand-rolled this with different sizes and margins,
 * which is the main reason screens didn't feel like one app. One component, one
 * rhythm: overline → title → subtitle, with an optional leading and trailing slot.
 */
export function ScreenHeader({ title, subtitle, overline, action, leading }: Props) {
  const { isRTL } = useI18n();
  return (
    <View
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        gap: spacing.md,
        marginBottom: spacing.xs,
      }}
    >
      {leading}
      <View style={{ flex: 1, gap: spacing.xxs }}>
        {overline ? (
          <Text variant="overline" tone="muted" uppercase>
            {overline}
          </Text>
        ) : null}
        <Text variant="title">{title}</Text>
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

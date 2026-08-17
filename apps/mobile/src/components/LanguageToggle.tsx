import React from "react";
import { View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing, hairline, touchTarget } from "@/theme/tokens";
import { Text } from "@/components/ui/Typography";

const LANGS = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
] as const;

/**
 * Language segmented control.
 *
 * Shows each language in its own script rather than "EN / ع" — a reader looking
 * for Arabic should see Arabic, not a Latin abbreviation of it. The full labels
 * also give the control a real touch target.
 */
export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.cardAlt,
        borderRadius: radius.sm,
        borderWidth: hairline,
        borderColor: colors.border,
        padding: spacing.xs,
        alignSelf: "center",
        gap: spacing.xs,
      }}
    >
      {LANGS.map((l) => {
        const active = lang === l.code;
        return (
          <Pressable
            key={l.code}
            onPress={() => {
              void Haptics.selectionAsync();
              setLang(l.code);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              minHeight: touchTarget - spacing.md,
              justifyContent: "center",
              paddingHorizontal: spacing.lg,
              borderRadius: radius.xs,
              backgroundColor: active ? colors.card : "transparent",
              // The active segment lifts off the track instead of relying on a
              // saturated fill.
              ...(active
                ? {
                    shadowColor: "#0B0D12",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 2,
                    elevation: 1,
                  }
                : null),
            }}
          >
            <Text variant="caption" weight="600" tone={active ? "ink" : "muted"}>
              {l.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

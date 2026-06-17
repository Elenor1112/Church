import React from "react";
import { View, Pressable } from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/components/ui/Typography";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.cardAlt,
        borderRadius: 999,
        padding: 4,
        alignSelf: "center",
      }}
    >
      {(["en", "ar"] as const).map((l) => {
        const active = lang === l;
        return (
          <Pressable
            key={l}
            onPress={() => setLang(l)}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: active ? colors.primary : "transparent",
            }}
          >
            <Text weight="600" style={{ color: active ? "#fff" : colors.muted }}>
              {l === "en" ? "EN" : "ع"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

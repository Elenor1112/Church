import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, hairline } from "@/theme/tokens";

/**
 * App mark: a soft-cornered tile with a cross glyph.
 *
 * Flat and neutral rather than a gradient badge — a single quiet mark reads as
 * more considered than a glossy one, and it keeps the auth screens calm.
 */
export function CrossLogo({ size = 72 }: { size?: number }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.lg,
        backgroundColor: colors.primary,
        borderWidth: hairline,
        borderColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ width: size * 0.44, height: size * 0.44 }}>
        <Svg width="100%" height="100%" viewBox="0 0 24 24">
          <Path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6V2z" fill={colors.onPrimary} />
        </Svg>
      </View>
    </View>
  );
}

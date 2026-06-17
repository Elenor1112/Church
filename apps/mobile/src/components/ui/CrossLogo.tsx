import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

/** Circular maroon badge with a soft white cross. */
export function CrossLogo({ size = 84 }: { size?: number }) {
  return (
    <LinearGradient
      colors={["#8B1E2D", "#6B0F1A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#6B0F1A",
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}
    >
      <View style={{ width: size * 0.5, height: size * 0.5 }}>
        <Svg width="100%" height="100%" viewBox="0 0 24 24">
          <Path
            d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6V2z"
            fill="#FFFFFF"
            opacity={0.96}
          />
        </Svg>
      </View>
    </LinearGradient>
  );
}

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme as useRNColorScheme, Appearance } from "react-native";
import { colorScheme as nwColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors, type ThemeColors } from "./tokens";

type Mode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: Mode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (m: Mode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "theme.mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useRNColorScheme();
  const [mode, setModeState] = useState<Mode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") setModeState(v);
    });
  }, []);

  const isDark = mode === "system" ? system === "dark" : mode === "dark";

  useEffect(() => {
    nwColorScheme.set(mode === "system" ? "system" : mode);
  }, [mode]);

  const setMode = (m: Mode) => {
    setModeState(m);
    void AsyncStorage.setItem(STORAGE_KEY, m);
    if (m !== "system") Appearance.setColorScheme?.(m);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, isDark, colors: isDark ? darkColors : lightColors, setMode }),
    [mode, isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

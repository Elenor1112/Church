import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { strings, type Lang, type StringKey } from "./strings";

interface I18nContextValue {
  lang: Lang;
  isRTL: boolean;
  t: (key: StringKey) => string;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "app.lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "en" || v === "ar") setLangState(v);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    void AsyncStorage.setItem(STORAGE_KEY, l);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      isRTL: lang === "ar",
      t: (key) => strings[lang][key] ?? strings.en[key] ?? key,
      setLang,
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

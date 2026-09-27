"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, dictionaries, Dictionary, Locale, locales } from "./config";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const COOKIE_KEY = "diff_locale";

function readCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`${COOKIE_KEY}=(en|es)`));
  return (match?.[1] as Locale) ?? null;
}

function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return defaultLocale;
  const lang = navigator.language?.slice(0, 2);
  return (locales as readonly string[]).includes(lang) ? (lang as Locale) : defaultLocale;
}

export function LocaleProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? defaultLocale);

  useEffect(() => {
    if (initialLocale) return;
    const cookieLocale = readCookieLocale();
    setLocaleState(cookieLocale ?? detectBrowserLocale());
  }, [initialLocale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    document.cookie = `${COOKIE_KEY}=${l}; path=/; max-age=31536000`;
  };

  const value = useMemo(() => ({ locale, setLocale, t: dictionaries[locale] }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

import en from "./dictionaries/en.json";
import es from "./dictionaries/es.json";

export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const dictionaries: Record<Locale, typeof en> = { en, es };

export type Dictionary = typeof en;

/** Adding a new language: drop a new dictionaries/<locale>.json with the
 * same keys as en.json, then add it to `locales` and `dictionaries` above. */

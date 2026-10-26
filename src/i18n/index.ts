import { en, type Dictionary } from "./en";
import { ru } from "./ru";

export const locales = ["en", "ru"] as const;
export type Locale = (typeof locales)[number];

export function getDictionary(locale: Locale): Dictionary {
  return locale === "ru" ? ru : en;
}

export function switchLocalePath(pathname: string, locale: Locale): string {
  const withoutLocale = pathname.replace(/^\/(?:en|ru)(?=\/|$)/, "");
  return `/${locale}${withoutLocale || "/"}`;
}

export { en, ru };
export type { Dictionary };

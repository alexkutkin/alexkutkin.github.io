import { en, type Dictionary } from "./en";
import { ru } from "./ru";
import { locales, type Locale } from "../site";

const dictionaries = { en, ru };
const localePrefix = new RegExp(`^/(?:${locales.join("|")})(?=/|$)`);

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function switchLocalePath(pathname: string, locale: Locale): string {
  const withoutLocale = pathname.replace(localePrefix, "");
  return `/${locale}${withoutLocale || "/"}`;
}

export { locales, defaultLocale, type Locale } from "../site";
export type { Dictionary };

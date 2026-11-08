import { getCollection, type CollectionEntry } from "astro:content";
import { locales, type Locale } from "../site";

export type ArticleEntry = CollectionEntry<"articles">;

export function articleSlug(entry: ArticleEntry) {
  return entry.id.slice(entry.id.lastIndexOf("/") + 1);
}

let pending: Promise<ArticleEntry[]> | undefined;

async function loadArticles() {
  pending ??= (async () => {
    const entries = await getCollection("articles");
    const byKey = new Map<string, ArticleEntry[]>();

    for (const entry of entries) {
      const group = byKey.get(entry.data.translationKey) ?? [];
      group.push(entry);
      byKey.set(entry.data.translationKey, group);
    }

    for (const [key, group] of byKey) {
      const langs = group.map((entry) => entry.data.lang).sort().join(",");
      if (langs !== [...locales].sort().join(",")) {
        throw new Error(
          `translationKey "${key}" needs exactly one article per locale (${locales.join(", ")}); found ${langs || "none"}`,
        );
      }

      const slugs = new Set(group.map(articleSlug));
      if (slugs.size !== 1) {
        throw new Error(
          `translationKey "${key}" uses different article slugs: ${[...slugs].join(", ")}`,
        );
      }
    }

    return entries;
  })();

  return pending;
}

export async function getArticles(lang: Locale) {
  const entries = await loadArticles();
  return entries
    .filter((entry) => entry.data.lang === lang)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

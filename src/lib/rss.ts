import rss from "@astrojs/rss";
import { render } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { getDictionary, type Locale } from "../i18n";
import { articleSlug, getArticles } from "./articles";

export async function createArticleFeed(lang: Locale, site?: URL) {
  const t = getDictionary(lang);
  const notes = await getArticles(lang);
  const container = await AstroContainer.create();

  const items = await Promise.all(
    notes.map(async (entry) => {
      const { Content } = await render(entry);
      return {
        title: entry.data.title,
        description: entry.data.description,
        pubDate: entry.data.date,
        link: `/${lang}/article/${articleSlug(entry)}/`,
        content: await container.renderToString(Content),
      };
    }),
  );

  return rss({
    title: t.rssTitle,
    description: t.meta.homeDescription,
    site: site ?? "https://alexkutkin.github.io",
    items,
    customData: `<language>${lang}</language>`,
  });
}

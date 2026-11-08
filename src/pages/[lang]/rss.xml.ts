import type { APIRoute, GetStaticPaths } from "astro";
import { createArticleFeed } from "../../lib/rss";
import { locales, type Locale } from "../../site";

export const getStaticPaths = (() => locales.map((lang) => ({
  params: { lang },
  props: { lang },
}))) satisfies GetStaticPaths;

export const GET: APIRoute<{ lang: Locale }> = ({ props, site }) =>
  createArticleFeed(props.lang, site);

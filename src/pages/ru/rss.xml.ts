import { createArticleFeed } from "../../lib/rss";

export function GET(context: { site?: URL }) {
  return createArticleFeed("ru", context.site);
}

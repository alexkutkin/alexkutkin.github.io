import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readArticleInventory } from "./article-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { published, fixtures } = readArticleInventory();
const pageSize = 10;

for (const lang of Object.keys(published)) {
  const expected = published[lang];
  const output = path.join(root, "dist", lang);
  const articleDir = path.join(output, "article");
  const routes = fs.existsSync(articleDir) ? fs.readdirSync(articleDir).sort() : [];
  assert.deepEqual(routes, expected, `${lang}: only published articles should have routes`);

  const feed = fs.readFileSync(path.join(output, "rss.xml"), "utf8");
  const items = feed.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const feedSlugs = items.map((item) => {
    const link = item.match(/<link>(.*?)<\/link>/)?.[1];
    assert.ok(link, `${lang}: every RSS item needs a link`);
    return new URL(link).pathname.match(new RegExp(`^/${lang}/article/([^/]+)/$`))?.[1];
  }).sort();
  assert.deepEqual(feedSlugs, expected, `${lang}: RSS must contain each published article once`);

  const articleLinks = new Set();
  const pageCount = Math.max(1, Math.ceil(expected.length / pageSize));
  const extraPages = fs.readdirSync(output, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(extraPages, Array.from({ length: pageCount - 1 }, (_, index) => String(index + 2)).sort(), `${lang}: exact pagination routes`);
  let listedCount = 0;
  for (let page = 1; page <= pageCount; page += 1) {
    const homePage = path.join(output, page === 1 ? "" : String(page), "index.html");
    const html = fs.readFileSync(homePage, "utf8");
    const pageLinks = new Set();
    for (const match of html.matchAll(new RegExp(`href="/${lang}/article/([^/]+)/"`, "g"))) {
      articleLinks.add(match[1]);
      pageLinks.add(match[1]);
    }
    assert.equal(pageLinks.size, Math.min(pageSize, Math.max(0, expected.length - (page - 1) * pageSize)), `${lang}: article count on page ${page}`);
    listedCount += pageLinks.size;
  }
  assert.equal(listedCount, expected.length, `${lang}: articles should be listed once`);
  assert.deepEqual([...articleLinks].sort(), expected, `${lang}: only published articles should be listed`);

  for (const slug of fixtures[lang]) {
    assert.ok(!feed.includes(`/article/${slug}/`), `${lang}: fixture ${slug} leaked into RSS`);
  }
  console.log(`${lang}: ${expected.length} published article(s); no fixture routes, listings or RSS items`);
}
assert.deepEqual(published.en, published.ru, "Both locales publish the same article slugs");

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const lang of ["en", "ru"]) {
  const published = fs.readdirSync(path.join(root, "src/content/articles", lang))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -3))
    .sort();
  const output = path.join(root, "dist", lang);
  const routes = fs.readdirSync(path.join(output, "article")).sort();
  assert.deepEqual(routes, published, `${lang}: only published articles should have routes`);

  const feed = fs.readFileSync(path.join(output, "rss.xml"), "utf8");
  assert.equal((feed.match(/<item>/g) ?? []).length, published.length, `${lang}: RSS item count`);

  const articleLinks = new Set();
  const homePages = [path.join(output, "index.html")];
  for (const entry of fs.readdirSync(output, { withFileTypes: true })) {
    if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
      homePages.push(path.join(output, entry.name, "index.html"));
    }
  }
  for (const homePage of homePages) {
    const html = fs.readFileSync(homePage, "utf8");
    for (const match of html.matchAll(new RegExp(`href="/${lang}/article/([^/]+)/"`, "g"))) {
      articleLinks.add(match[1]);
    }
  }
  assert.deepEqual([...articleLinks].sort(), published, `${lang}: only published articles should be listed`);

  const fixtures = fs.readdirSync(path.join(root, "tests/fixtures/articles", lang))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -3));
  for (const slug of fixtures) {
    assert.ok(!feed.includes(`/article/${slug}/`), `${lang}: fixture ${slug} leaked into RSS`);
  }
  if (published.length <= 10) {
    assert.ok(!fs.existsSync(path.join(output, "2")), `${lang}: unnecessary second page`);
  }
  console.log(`${lang}: ${published.length} published article(s); no fixture routes, listings or RSS items`);
}

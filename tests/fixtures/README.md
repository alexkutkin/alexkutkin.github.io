# Article fixtures

`articles/en` and `articles/ru` contain the former demonstration posts. They are
test content, not the author's publications. Normal development, builds, article
routes and RSS read only `src/content/articles`.

The existing site verification harness includes these fixtures in its temporary
build by setting `VERIFY_ARTICLE_FIXTURES=1`. They exercise pagination, long-form
Markdown, nested lists, images, wide tables, code and Mermaid, including a broken
diagram. Source files stay outside the published content directory.

Run the browser checks from Git Bash:

```sh
node scripts/verify.mjs --suite site --port 4330
```

The harness writes its verification build into that run's
`artifacts/verification/<run-id>/site` directory and serves it from there.
It does not overwrite the public `dist` output. The public build currently has
one article in each language: `why-i-built-pastehatch`.

After a normal build, check that only published articles reached HTML and RSS:

```sh
npm run build
node scripts/verify-public-content.mjs
```

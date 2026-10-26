# Site routes and content

The built site has a root redirect, two localized homes, pagination, eleven articles per locale, a CV per locale, RSS feeds, and one English 404 page. Both locales share the same article slugs.

## Sub-features

- `root-redirect`: saved locale wins; otherwise a Russian browser goes to `/ru/`, any other language to `/en/`; without JavaScript the root shows both locale links.
- `home`: each home lists ten notes, page 2 lists the remaining one, dates use the locale format, and pagination marks the current page.
- `article`: every article renders localized metadata, body, and an optional figure; the complex article adds nested lists, a quote, a scrolling table, a long link, a scrolling code block, and one valid plus one broken Mermaid diagram.
- `cv`: each CV shows experience, education, skills, and languages from Markdown, with no language switch on the 404 page.
- `navigation`: the header marks the current section, the language switch keeps the current page and slug, and the skip link reaches `main`.
- `themes`: system, light, and dark persist across pages and re-render Mermaid.
- `feeds`: each locale publishes an RSS feed with eleven full-text items.
- `not-found`: `/404.html` returns the custom page; missing routes return HTTP 404.

## Preconditions

- Start a fresh run with `node scripts/verify.mjs --suite site --port 4321` from the repository root. The harness builds and previews the site and runs the doctor before the browser.
- Use the run's `http://host.docker.internal:4321/` browser URL, unless `--base-url` was configured for the same owned port.
- The expected app identity is `Alex Kutkin personal site`.

## Driving it

The browser visits every route, then reads document metadata, visible text, links, images, and computed layout. It also changes locale and theme through the visible controls, presses Tab, waits for Mermaid to render and for the broken diagram to preserve its source, and resizes to a mobile viewport to detect horizontal overflow.

Observable proof is `browser/report.json` (599 checks on the current site), `browser/screenshots/`, `browser/aria-snapshot.txt`, and `browser/trace.zip`. The report also records the internal-link audit, console errors, and page errors.

## Gotchas

- The browser runs in Docker, so `localhost` points at the container. The default host alias is `host.docker.internal`.
- A busy port is a hard failure. Pick another port; the harness will not attach to an existing server.
- Article dates are fixed test data; the report compares locale formatting, not the wall clock.
- The root redirect is client-side by design. Do not expect an HTTP redirect from a static host.

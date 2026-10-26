# Alex Kutkin's site

A minimal static site built with Astro.

## Commands

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Build the static site into `dist/`:

```sh
npm run build
```

Preview the latest build locally:

```sh
npm run preview
```

## Content checks

Published articles live in `src/content/articles`. Demonstration posts are kept
separately in `tests/fixtures/articles` for layout, pagination and Mermaid checks.
See [the fixture instructions](tests/fixtures/README.md) for the browser harness.

Check the normal build for accidental test content:

```sh
npm run build
node scripts/verify-public-content.mjs
```

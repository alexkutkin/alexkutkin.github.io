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

The development server listens on the local network at port 4321. To view it
on a phone connected to the same Wi-Fi network, open
`http://<computer-LAN-IP>:4321/ru/` (or `/en/`). Use the computer's LAN IPv4
address, not `localhost`.

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

For iPhone layout checks, `scripts/verify-mobile.cjs` runs in the existing
Playwright container with WebKit installed. It checks both languages and themes
at 320, 375, 390 and 430 CSS pixels, including the header, portrait spacing,
language switching, CV and article. These are browser/device emulation checks,
not tests on a physical iPhone.

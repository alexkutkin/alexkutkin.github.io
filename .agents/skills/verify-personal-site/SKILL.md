---
name: verify-personal-site
description: "Build Alex Kutkin's Astro site and prove every public route in Chromium."
disable-model-invocation: true
---

# Verify Alex Kutkin's personal site

Prove the built static site in a real Chromium browser. The `site` suite covers both locales, pagination, all eleven articles, the CV, the 404 page, RSS, themes, keyboard focus, Mermaid, and mobile layout.

## Launch

From the repository root, run:

```sh
node scripts/verify.mjs --suite site --port 4321
```

The `site` suite runs `astro build`, starts the built site with `astro preview --host 0.0.0.0 --port 4321 --ignore-lock`, and drives it through the container. It refuses an occupied port and only stops the child PID it started. Change `--port` to choose a different port; `BASE_URL` and `PORT` are also accepted. The browser URL defaults to `http://host.docker.internal:<port>`.

The `foundation` suite still exists as a quick scaffold check; it serves the dev server and checks only app identity, title, heading, and keyboard focus. Use `site` for anything user-visible.

The script waits for the doctor to prove that the server PID owns the listener and serves this app, then runs the browser drive and copies the evidence. The browser runs in the existing `playwright-sandbox-1` container through `docker exec` and `docker cp`; the harness neither starts nor stops the container.

## Doctor

The doctor is read-only. It checks the recorded PID, the matching Astro `preview` (or `dev` for `foundation`) command, port ownership, HTTP 200 at `/`, and the expected app identity, title, and H1. For a live run:

```sh
node scripts/verify.mjs doctor --run-id <runId>
```

A completed run has already stopped its server, so run the doctor while the run is active.

## Drive

The host copies `scripts/verify-browser.cjs` into `/tmp/alexkutkin-personal-site-<runId>/` in the container. The site suite checks:

- root redirect by saved locale, browser language, and the no-JavaScript locale links;
- ten notes on page 1, one on page 2, localized dates, pagination, and identical article slugs in both locales;
- every route for document language, title, description, app identity, one visible H1, Open Graph, canonical URL, RSS link, footer, skip link, and images;
- home contacts and projects, CV sections, the complex article (nested lists, quote, table, figure, long link, code, valid and broken Mermaid), and the custom 404;
- language switch keeping the current page and slug, theme choice persistence, keyboard focus outlines, mobile overflow, and RSS full text;
- an internal-link audit plus screenshots and an ARIA snapshot.

Failures collect in `report.json` and the process exits non-zero.

## Evidence

Each run writes to `artifacts/verification/<runId>/`, which is ignored by Git. The browser folder contains `report.json`, `aria-snapshot.txt`, `trace.zip`, and `screenshots/` for all routes, themes, Mermaid, keyboard focus, and mobile. The run folder also records the build log, doctor result, server PID, versions, server logs, and browser logs. Keep the folder until the evidence has been reviewed.

## Cleanup

The orchestrator stops only its child PID and removes only its unique container staging directory. It does not kill by name, delete host artifacts, or change the container lifecycle. Failed runs still attempt this cleanup and keep any artifacts created.

## Helpers

- `scripts/verify.mjs` is the host launcher, doctor, build/preview coordinator, evidence copier, and cleanup routine.
- `scripts/verify-browser.cjs` is the Playwright helper. The host copies and runs it inside `playwright-sandbox-1` with `--base-url`, `--artifact-dir`, and `--suite`.

Read [the feature map](features/README.md) before driving a mapped journey.

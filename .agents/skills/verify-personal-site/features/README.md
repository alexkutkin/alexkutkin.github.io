# Personal site verification map

This map covers the built site: `/en/` and `/ru/` homes, pagination, eleven articles per locale, CV, RSS, the root redirect, and the custom 404 page.

## Baseline

- Run `node scripts/verify.mjs --suite site --port 4321` from the repository root. It builds the site, starts `astro preview`, runs the doctor, drives Chromium, copies evidence, and cleans up.
- The browser container is the existing `playwright-sandbox-1`; the host URL defaults to `http://host.docker.internal:4321`.
- Each run receives a unique `runId`. Evidence remains in `artifacts/verification/<runId>/` after the owned server and container staging folder are removed.
- Never drive a server that this verification run did not start and doctor.

## Features

- [Site routes and content](./site.md) covers every route and the checks shared across pages.
- `foundation` remains a small scaffold check: app identity, title, heading, and keyboard focus on `/`.

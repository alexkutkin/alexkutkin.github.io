# Personal site verification map

This map covers the current Astro scaffold: one landing page at `/`. Read the feature recipe before driving the page.

## Baseline

- Run `node scripts/verify.mjs --suite foundation --port 4321` from the repository root. It starts its own Astro server and runs doctor, browser drive, evidence copy, and cleanup.
- The browser container is the existing `playwright-sandbox-1`; the host URL defaults to `http://host.docker.internal:4321`.
- Each run receives a unique `runId`. Evidence remains in `artifacts/verification/<runId>/` after the owned server and container staging folder are removed.
- Never drive a server that this verification run did not start and doctor.

## Features

- [Landing page foundation](./landing-page.md) covers the root route, app identity, page title and heading, and one keyboard-focusable link.

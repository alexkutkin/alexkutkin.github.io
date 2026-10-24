---
name: verify-personal-site
description: "Drive and capture evidence from Alex Kutkin's Astro landing page."
disable-model-invocation: true
---

# Verify Alex Kutkin's personal site

Use this skill to prove the current landing page scaffold in a real Chromium browser. The current app has one user route, `/`; the optional Astro documentation link leaves the app. The `foundation` suite checks stable app identity metadata, a non-empty document title, a visible primary heading, and a keyboard-focusable link. It does not assume future site sections.

## Launch

From the repository root, run:

```sh
node scripts/verify.mjs --suite foundation --port 4321
```

This launches the installed Astro CLI from this checkout on `0.0.0.0:4321` with strict port handling, using `node_modules/astro/bin/astro.mjs dev --host 0.0.0.0 --port 4321 --strictPort`. Change `--port` to choose a different port. The browser URL defaults to `http://host.docker.internal:<port>`; set `--base-url` to another HTTP origin on that same port when the container's route to the host differs. `BASE_URL` and `PORT` environment variables are also accepted.

The script refuses an occupied port before launch. It waits for the doctor checks to prove that the server PID owns the listener and serves this app's identity, title, and heading. It then drives Chromium and cleans up the server it started before returning. No separate database, seed data, authentication, or build step is required. The project is an Astro dev server, so startup serves the current source scaffold directly.

Run the host script from PowerShell or Git Bash on Windows. The script uses the existing `playwright-sandbox-1` Docker container through `docker exec` and `docker cp`; the container already has Node, `@playwright/test`, and Chromium. If you need an interactive container shell, use `docker exec -it playwright-sandbox-1 bash` from the Windows host. The harness does not start or stop that container.

## Doctor

The default run always performs a read-only doctor check before browser drive. It requires the recorded Astro PID to be alive, the PID command line to match this port's Astro dev server, that PID to own the configured TCP listener, and the local page to return HTTP 200 with the expected `application-name` metadata plus non-empty title and H1. This scaffold has no separate revision marker or login, so the app identity and the checked-out package identity are its version/build signals.

For a live run, copy the `runId` printed by the script and inspect it from a second host terminal:

```sh
node scripts/verify.mjs doctor --run-id <runId>
```

The doctor writes no app state. It prints each check and exits non-zero if the instance is not worth driving. A completed run has already stopped its server, so run doctor while that run is still active.

## Drive

The host orchestrator copies `scripts/verify-browser.cjs` to a unique `/tmp/alexkutkin-personal-site-<runId>/` directory in the existing container, then runs it against the host server. The browser proof opens `/`, reads app identity/title/heading, then uses keyboard `Tab` until a visible link receives focus. It does not call test-only endpoints or application setters.

The current stable selector defaults are `meta[name="application-name"]`, `main h1`, and `a[href]`. Adjust them with `VERIFY_APP_IDENTITY_SELECTOR`, `VERIFY_HEADING_SELECTOR`, and `VERIFY_LINK_SELECTOR`; set `VERIFY_EXPECTED_APP_NAME` when the app identity changes. The same values are passed into the browser process by the host orchestrator. The suite argument is explicit so a later site-wide suite can be added without changing the foundation contract.

## Evidence

Each run writes to `artifacts/verification/<runId>/`. The folder is ignored by Git and remains after cleanup. The browser folder contains `report.json` (actions and observed results), `landing-page.png`, `aria-snapshot.txt`, and `trace.zip`. The run folder also records the doctor result, server PID, Astro/Playwright versions, server stdout/stderr, and browser logs. The report and screenshot capture both the visit and the resulting page state; the trace preserves the browser actions for review.

The current page is read-only, so it has no application data mutation to verify. If future features add a mutation, extend the matching feature recipe to confirm the changed value through a separate user-visible or read-only view. Keep real browser actions and their observable results in the evidence.

## Cleanup

The orchestrator stops only the child PID it launched, removes only its unique `/tmp/alexkutkin-personal-site-<runId>/` container staging directory, and keeps the copied evidence under `artifacts/verification/<runId>/`. It does not kill processes by name, remove the host artifact folder, or change the container lifecycle. If a run fails, it still attempts this cleanup and preserves any browser artifacts already created.

## Helpers

- `scripts/verify.mjs` is the host launcher, doctor, browser coordinator, artifact copier, and cleanup routine. Run it with Node as shown above.
- `scripts/verify-browser.cjs` is the Playwright browser helper. The host script copies and invokes it inside `playwright-sandbox-1`; to run it manually, first copy it into the container and pass `--base-url`, `--artifact-dir`, and `--suite=foundation`.

Read [the feature map](features/README.md) before driving a mapped journey. Use `verification maintain` when the app's routes or visible behavior change.

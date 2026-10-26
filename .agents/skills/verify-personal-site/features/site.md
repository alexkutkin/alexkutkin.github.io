# Landing page foundation

The landing page at `/` is the site's only current user-facing route. It identifies the app in document metadata, presents a page title and primary heading, and offers an Astro documentation link.

## Sub-features

- `root-page`: open the landing page and read its app identity, title, and primary heading.
- `keyboard-link`: use keyboard navigation to focus a visible link.

## How to get to it (user POV)

- Open the site's root URL, `/`.
- From the landing page, move through focusable controls with `Tab` to reach the documentation link.

## Driving it with Playwright in Chromium

Preconditions:

- Start a fresh run with `node scripts/verify.mjs --suite foundation --port 4321` from the repository root. The harness starts its own Astro server and runs doctor before the browser.
- Use the run's `http://host.docker.internal:4321/` browser URL, unless `--base-url` was configured for the same owned port.
- The expected app identity metadata is `Alex Kutkin personal site`.

- **Open the root page:** the browser visits `/`; the result is HTTP 200 at the requested root URL, recorded in `browser/report.json` and `browser/trace.zip`.
- **Read the page identity:** inspect `meta[name="application-name"]`; its content equals the expected app identity.
- **Read the page title:** inspect `document.title`; it is non-empty.
- **Read the primary heading:** inspect the visible `main h1`; it exists and has non-empty text.
- **Reach a link with the keyboard:** press `Tab` through the page until a visible link receives focus; the focused link has a destination and is recorded in the report. The screenshot and ARIA snapshot preserve the resulting page state.

Observable proof is the passing report, screenshot, ARIA snapshot, and browser trace in `artifacts/verification/<runId>/browser/`. The harness cleans the server and temporary browser directory after copying these files.

## Gotchas

- The browser runs in Docker, so `localhost` points at the container. The default host alias is `host.docker.internal`.
- A busy port is a hard failure. Pick another port; the harness will not attach to an existing server.
- The page is a starter scaffold. Do not infer or report site sections that are not present in the route.
- The docs link is external. The foundation suite verifies its keyboard focus and destination without navigating away from the app.

#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("/app/node_modules/@playwright/test");

function parseArgs(args) {
  const result = {};
  for (const arg of args) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Expected --name=value, received ${arg}`);
    result[match[1]] = match[2];
  }
  return result;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const suite = args.suite ?? "foundation";
  if (suite !== "foundation") throw new Error(`Unsupported suite ${JSON.stringify(suite)}; available suite: foundation`);
  if (!args["base-url"] || !args["artifact-dir"]) throw new Error("Usage: verify-browser.cjs --base-url=http://host.docker.internal:4321 --artifact-dir=/tmp/run/browser --suite=foundation");

  const artifactDir = path.resolve(args["artifact-dir"]);
  fs.mkdirSync(artifactDir, { recursive: true });
  const reportPath = path.join(artifactDir, "report.json");
  const screenshotPath = path.join(artifactDir, "landing-page.png");
  const ariaPath = path.join(artifactDir, "aria-snapshot.txt");
  const tracePath = path.join(artifactDir, "trace.zip");
  const appIdentitySelector = process.env.VERIFY_APP_IDENTITY_SELECTOR ?? 'meta[name="application-name"]';
  const headingSelector = process.env.VERIFY_HEADING_SELECTOR ?? "main h1";
  const linkSelector = process.env.VERIFY_LINK_SELECTOR ?? "a[href]";
  const expectedAppName = process.env.VERIFY_EXPECTED_APP_NAME ?? "Alex Kutkin personal site";
  const report = {
    suite,
    baseUrl: args["base-url"],
    startedAt: new Date().toISOString(),
    selectors: { appIdentitySelector, headingSelector, linkSelector },
    actions: [],
    status: "running",
  };
  let browser;
  let context;
  let page;
  let failure;
  let traceStarted = false;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    traceStarted = true;
    page = await context.newPage();

    const response = await page.goto(args["base-url"], { waitUntil: "domcontentloaded", timeout: 20000 });
    assert.equal(response?.status(), 200, `Expected HTTP 200 at ${args["base-url"]}`);
    report.actions.push({
      action: "Open the public landing page in Chromium",
      result: { status: response.status(), url: page.url() },
    });

    const appIdentity = page.locator(appIdentitySelector);
    assert.equal(await appIdentity.count(), 1, `Expected one app identity element matching ${appIdentitySelector}`);
    const identityValue = (await appIdentity.getAttribute("content"))?.trim() ?? "";
    assert.equal(identityValue, expectedAppName, `Expected application-name ${JSON.stringify(expectedAppName)}`);
    report.appIdentity = identityValue;
    report.actions.push({ action: "Read the app identity metadata", result: identityValue });

    const title = (await page.title()).trim();
    assert.ok(title.length > 0, "Expected a non-empty document title");
    report.title = title;
    report.actions.push({ action: "Read the document title", result: title });

    const heading = page.locator(headingSelector).first();
    assert.ok(await heading.count(), `Expected a primary heading matching ${headingSelector}`);
    assert.ok(await heading.isVisible(), "Expected the primary heading to be visible");
    const headingText = (await heading.innerText()).trim();
    assert.ok(headingText.length > 0, "Expected the primary heading to contain text");
    report.heading = headingText;
    report.actions.push({ action: "Read the visible primary heading", result: headingText });

    const links = page.locator(linkSelector);
    const focusableLink = await links.evaluateAll((elements) => {
      const isVisible = (element) => {
        const style = window.getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
      };
      const index = elements.findIndex((element) => element instanceof HTMLAnchorElement && element.tabIndex >= 0 && isVisible(element));
      if (index < 0) return null;
      const link = elements[index];
      return { index, href: link.href, text: (link.innerText || link.getAttribute("aria-label") || "").trim() };
    });
    assert.ok(focusableLink, `Expected at least one visible, keyboard-focusable link matching ${linkSelector}`);
    const focusTarget = links.nth(focusableLink.index);
    assert.ok(await focusTarget.count(), "Could not resolve the focusable link discovered on the page");
    const focusableCount = await page.locator("a[href],button,input,select,textarea,[tabindex],[contenteditable='true']").evaluateAll((elements) => elements.filter((element) => {
      const style = window.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return element.tabIndex >= 0 && style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
    }).length);
    let reachedLinkByKeyboard = false;
    for (let tab = 0; tab < Math.min(focusableCount + 1, 100); tab += 1) {
      await page.keyboard.press("Tab");
      if (await focusTarget.evaluate((element) => document.activeElement === element)) {
        reachedLinkByKeyboard = true;
        break;
      }
    }
    assert.equal(reachedLinkByKeyboard, true, "Expected keyboard Tab navigation to reach a visible link");
    const focused = await focusTarget.evaluate((element) => document.activeElement === element);
    assert.equal(focused, true, "Expected the selected link to receive keyboard focus");
    const focusResult = await focusTarget.evaluate((element) => ({
      href: element.href,
      text: (element.innerText || element.getAttribute("aria-label") || "").trim(),
      activeElement: document.activeElement === element,
    }));
    assert.ok(focusResult.href, "Expected the focused link to have a destination");
    assert.ok(focusResult.text, "Expected the focused link to have a user-facing name");
    report.focusableLink = focusResult;
    report.actions.push({ action: "Tab through the page until a visible link receives focus", result: focusResult });

    const ariaSnapshot = await page.locator("body").ariaSnapshot();
    fs.writeFileSync(ariaPath, `${ariaSnapshot}\n`, "utf8");
    await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
    report.screenshot = path.basename(screenshotPath);
    report.ariaSnapshot = path.basename(ariaPath);
    report.status = "passed";
  } catch (error) {
    failure = error;
    report.status = "failed";
    report.error = error.stack ?? error.message;
    if (page) {
      try {
        const ariaSnapshot = await page.locator("body").ariaSnapshot();
        fs.writeFileSync(ariaPath, `${ariaSnapshot}\n`, "utf8");
      } catch {}
      try {
        await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
        report.screenshot = path.basename(screenshotPath);
      } catch {}
    }
  } finally {
    if (traceStarted) {
      try {
        await context.tracing.stop({ path: tracePath });
        report.trace = path.basename(tracePath);
      } catch (error) {
        report.traceError = error.message;
        if (!failure) failure = error;
        report.status = "failed";
      }
    }
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    report.finishedAt = new Date().toISOString();
    writeJson(reportPath, report);
  }

  console.log(JSON.stringify(report, null, 2));
  if (failure) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});

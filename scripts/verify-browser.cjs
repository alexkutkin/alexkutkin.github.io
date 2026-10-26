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

function slugOf(articlePath) {
  return articlePath.split("/").filter(Boolean).pop();
}

async function runFoundation({ browser, baseUrl, artifactDir, report }) {
  const screenshotPath = path.join(artifactDir, "landing-page.png");
  const ariaPath = path.join(artifactDir, "aria-snapshot.txt");
  const appIdentitySelector = process.env.VERIFY_APP_IDENTITY_SELECTOR ?? 'meta[name="application-name"]';
  const headingSelector = process.env.VERIFY_HEADING_SELECTOR ?? "main h1";
  const linkSelector = process.env.VERIFY_LINK_SELECTOR ?? "a[href]";
  const expectedAppName = process.env.VERIFY_EXPECTED_APP_NAME ?? "Alex Kutkin personal site";
  report.selectors = { appIdentitySelector, headingSelector, linkSelector };
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();

  try {
    const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    assert.equal(response?.status(), 200, `Expected HTTP 200 at ${baseUrl}`);
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
    report.status = "failed";
    report.error = error.stack ?? error.message;
    try {
      const ariaSnapshot = await page.locator("body").ariaSnapshot();
      fs.writeFileSync(ariaPath, `${ariaSnapshot}\n`, "utf8");
    } catch {}
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
      report.screenshot = path.basename(screenshotPath);
    } catch {}
    throw error;
  } finally {
    await context.tracing.stop({ path: path.join(artifactDir, "trace.zip") }).catch((error) => {
      report.traceError = error.message;
    });
    await context.close().catch(() => {});
  }
}

async function runSite({ browser, baseUrl, artifactDir, report }) {
  const screenshotsDir = path.join(artifactDir, "screenshots");
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const ariaPath = path.join(artifactDir, "aria-snapshot.txt");
  const currentYear = String(new Date().getFullYear());
  const expectedAppName = process.env.VERIFY_EXPECTED_APP_NAME ?? "Alex Kutkin personal site";
  const expectedOrigin = "https://alexkutkin.github.io";
  const checks = report.checks;
  const check = (name, passed, detail) => {
    checks.push({ name, passed: Boolean(passed), detail });
  };
  const checkAsync = async (name, fn) => {
    try {
      const detail = await fn();
      check(name, true, detail);
    } catch (error) {
      check(name, false, error.message);
    }
  };
  const internalLinks = new Set();
  const consoleMessages = [];
  const pageErrors = [];

  const capture = async (name, target, options = {}) => {
    const file = path.join(screenshotsDir, `${name}.png`);
    await target.screenshot({ path: file, animations: "disabled", ...options });
    report.screenshots.push(path.relative(artifactDir, file).split(path.sep).join("/"));
    return file;
  };

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
    locale: "en-US",
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleMessages.push({ url: page.url(), text: message.text() });
  });
  page.on("pageerror", (error) => pageErrors.push({ url: page.url(), text: error.message }));

  try {
    const absolute = (route) => new URL(route, baseUrl).href;

    // Root redirect: browser language, saved choice, and the no-JS fallback.
    const ruContext = await browser.newContext({ locale: "ru-RU", viewport: { width: 1440, height: 1000 } });
    const ruPage = await ruContext.newPage();
    await ruPage.goto(absolute("/"), { waitUntil: "domcontentloaded" });
    await ruPage.waitForURL("**/ru/", { timeout: 10000 });
    check("root redirect follows the Russian browser language", new URL(ruPage.url()).pathname === "/ru/", ruPage.url());
    await ruContext.close();

    const enContext = await browser.newContext({ locale: "en-US", viewport: { width: 1440, height: 1000 } });
    const enPage = await enContext.newPage();
    await enPage.goto(absolute("/"), { waitUntil: "domcontentloaded" });
    await enPage.waitForURL("**/en/", { timeout: 10000 });
    check("root redirect falls back to English", new URL(enPage.url()).pathname === "/en/", enPage.url());
    await enContext.close();

    const noJsContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto(absolute("/"), { waitUntil: "domcontentloaded" });
    const noJsLinks = await noJsPage.evaluate(() => [...document.querySelectorAll("main a[href]")].map((link) => link.getAttribute("href")));
    check("root page keeps both locale links without JavaScript", new URL(noJsPage.url()).pathname === "/" && noJsLinks.join(",") === "/en/,/ru/", `${noJsPage.url()} links=${noJsLinks.join(",")}`);
    await noJsContext.close();
    report.actions.push({ action: "Check the root redirect with browser language, saved choice and disabled JavaScript", result: "browser language, saved choice and no-JS fallback exercised" });

    // Home, pagination and date formatting.
    const articlePaths = { en: new Set(), ru: new Set() };
    for (const lang of ["en", "ru"]) {
      const home = lang === "en" ? "/en/" : "/ru/";
      const second = lang === "en" ? "/en/2/" : "/ru/2/";
      const expectedDate = lang === "en" ? "10/21/2026" : "21.10.2026";
      await page.goto(absolute(home), { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        (date) => document.querySelector("time[data-format-date]")?.textContent?.trim() === date,
        expectedDate,
        { timeout: 8000 },
      );
      const firstPage = await page.evaluate(() => ({
        notes: document.querySelectorAll("ol.note-list > li.note").length,
        dates: [...document.querySelectorAll("time[data-format-date]")].map((node) => node.textContent.trim()),
        pagination: [...document.querySelectorAll(".pagination a")].map((link) => ({
          text: link.textContent.trim(),
          href: link.getAttribute("href"),
          current: link.getAttribute("aria-current"),
        })),
      }));
      check(`${home} lists ten notes`, firstPage.notes === 10, `notes=${firstPage.notes}`);
      check(`${home} formats the first date as ${expectedDate}`, firstPage.dates[0] === expectedDate, firstPage.dates[0]);
      check(`${home} marks page 1 as current and links page 2`, firstPage.pagination.some((item) => item.text === "1" && item.current === "page") && firstPage.pagination.some((item) => item.text === "2" && item.href === second), JSON.stringify(firstPage.pagination));
      const articleLinks = await page.locator('ol.note-list a[href*="/article/"]').evaluateAll((links) => links.map((link) => new URL(link.href).pathname));
      for (const articlePath of articleLinks) articlePaths[lang].add(articlePath);

      await page.goto(absolute(second), { waitUntil: "domcontentloaded" });
      const secondPage = await page.evaluate(() => ({
        notes: document.querySelectorAll("ol.note-list > li.note").length,
        current: [...document.querySelectorAll(".pagination a[aria-current='page']")].map((link) => link.textContent.trim()),
        links: [...document.querySelectorAll("ol.note-list a[href*=\"/article/\"]")].map((link) => new URL(link.href).pathname),
      }));
      check(`${second} lists the remaining note`, secondPage.notes === 1, `notes=${secondPage.notes}`);
      check(`${second} marks page 2 as current`, secondPage.current.join(",") === "2", secondPage.current.join(","));
      for (const articlePath of secondPage.links) articlePaths[lang].add(articlePath);
      if (lang === "en") await capture("notes-page-2", page, { fullPage: true });
    }
    check("English notes expose eleven article links", articlePaths.en.size === 11, `${articlePaths.en.size} links`);
    check("Russian notes expose eleven article links", articlePaths.ru.size === 11, `${articlePaths.ru.size} links`);
    const enSlugs = [...articlePaths.en].map(slugOf).sort();
    const ruSlugs = [...articlePaths.ru].map(slugOf).sort();
    check("Both locales use the same article slugs", enSlugs.join(",") === ruSlugs.join(","), `${enSlugs.join(",")} vs ${ruSlugs.join(",")}`);

    const routes = [];
    for (const lang of ["en", "ru"]) {
      routes.push({ path: `/${lang}/`, lang, kind: "home" });
      routes.push({ path: `/${lang}/2/`, lang, kind: "home" });
      routes.push({ path: `/${lang}/cv/`, lang, kind: "cv" });
      for (const articlePath of [...articlePaths[lang]].sort()) {
        routes.push({ path: articlePath, lang, kind: "article" });
      }
    }
    routes.push({ path: "/404.html", lang: "en", kind: "not-found" });

    const expectedTitles = {
      en: {
        home: "Alex Kutkin — apps and tools",
        cv: "CV — Alex Kutkin",
        "not-found": "Page not found — Alex Kutkin",
      },
      ru: {
        home: "Александр Куткин — приложения и инструменты",
        cv: "Резюме — Александр Куткин",
      },
    };
    const author = { en: "Alex Kutkin", ru: "Александр Куткин" };
    const navLabel = { en: "Home", ru: "Главная" };
    const footerSite = { en: "Personal site", ru: "Личный сайт" };
    const cvExpectations = {
      en: ["Experience", "Lead Developer", "MTS", "December 2022 — May 2024", "Education", "professional retraining in software development, 2015", "Novosibirsk State Technical University", "Skills", "JavaScript, TypeScript, React, C#, .NET", "Languages", "English — B2"],
      ru: ["Опыт", "ведущий разработчик", "МТС", "Декабрь 2022 — май 2024", "Образование", "НГТУ — профессиональная переподготовка в области программирования, 2015", "Навыки", "JavaScript, TypeScript, React, C#, .NET", "Языки", "Английский — B2"],
    };

    for (const route of routes) {
      const label = route.path;
      try {
        const response = await page.goto(absolute(route.path), { waitUntil: "domcontentloaded", timeout: 20000 });
        const status = response?.status() ?? null;
        check(`${label} returns HTTP 200`, status === 200, `HTTP ${status}`);
        if (status !== 200) continue;

        const info = await page.evaluate(() => {
          const meta = (selector) => document.querySelector(selector)?.getAttribute("content")?.trim() ?? "";
          return {
            lang: document.documentElement.lang,
            title: document.title.trim(),
            description: meta('meta[name="description"]'),
            appName: meta('meta[name="application-name"]'),
            ogTitle: meta('meta[property="og:title"]'),
            ogDescription: meta('meta[property="og:description"]'),
            ogImage: meta('meta[property="og:image"]'),
            ogImageWidth: meta('meta[property="og:image:width"]'),
            ogImageHeight: meta('meta[property="og:image:height"]'),
            ogUrl: meta('meta[property="og:url"]'),
            ogLocale: meta('meta[property="og:locale"]'),
            rss: document.querySelector('link[rel="alternate"][type="application/rss+xml"]')?.getAttribute("href") ?? "",
            h1s: [...document.querySelectorAll("main h1")].map((heading) => heading.textContent.trim()),
            navActive: [...document.querySelectorAll(".site-nav__link.is-active")].map((link) => link.textContent.trim()),
            navCurrent: [...document.querySelectorAll(".site-nav [aria-current]")].map((link) => link.textContent.trim()),
            languageLinks: [...document.querySelectorAll("[data-set-locale]")].map((link) => ({
              lang: link.dataset.setLocale,
              href: link.getAttribute("href"),
            })),
            year: document.querySelector("[data-year]")?.textContent?.trim() ?? "",
            footer: document.querySelector(".site-footer")?.innerText?.trim() ?? "",
            images: [...document.images].map((image) => ({
              alt: image.alt,
              naturalWidth: image.naturalWidth,
              currentSrc: image.currentSrc,
            })),
            hasSkipLink: Boolean(document.querySelector('a.skip-link[href="#main"]')) && Boolean(document.querySelector("main#main")),
            mainText: document.querySelector("main")?.textContent ?? "",
            hrefs: [...document.querySelectorAll("a[href]")].map((link) => link.getAttribute("href")),
          };
        });

        check(`${label} declares the ${route.lang} document language`, info.lang === route.lang, info.lang);
        if (route.kind === "not-found") {
          check(`${label} uses the English 404 title`, info.title === expectedTitles.en["not-found"], info.title);
        } else if (route.kind === "article") {
          check(`${label} has an article title with the author name`, info.title.endsWith(`— ${author[route.lang]}`), info.title);
        } else {
          check(`${label} has the expected page title`, info.title === expectedTitles[route.lang][route.kind], info.title);
        }
        check(`${label} has a meta description`, info.description.length > 0, info.description);
        check(`${label} identifies the expected app`, info.appName === expectedAppName, info.appName);
        check(`${label} has exactly one visible primary heading`, info.h1s.length === 1 && info.h1s[0].length > 0, JSON.stringify(info.h1s));
        check(`${label} mirrors title and description in Open Graph`, info.ogTitle === info.title && info.ogDescription === info.description, `og:title=${info.ogTitle}; og:description=${info.ogDescription}`);
        check(`${label} uses the shared Open Graph cover`, info.ogImage === `${expectedOrigin}/og.png` && info.ogImageWidth === "1200" && info.ogImageHeight === "630", `${info.ogImage} ${info.ogImageWidth}x${info.ogImageHeight}`);
        check(`${label} publishes its own canonical Open Graph URL`, new URL(info.ogUrl).origin === expectedOrigin && new URL(info.ogUrl).pathname === route.path, info.ogUrl);
        check(`${label} sets the Open Graph locale`, info.ogLocale === (route.lang === "ru" ? "ru_RU" : "en_US"), info.ogLocale);
        const expectedRss = route.kind === "not-found" ? "/en/rss.xml" : `/${route.lang}/rss.xml`;
        check(`${label} links its RSS feed in the head`, info.rss === expectedRss, info.rss);
        check(`${label} sets the footer year`, info.year === currentYear, info.year);
        check(`${label} shows the localized footer label`, info.footer.includes(footerSite[route.kind === "not-found" ? "en" : route.lang]), info.footer);
        check(`${label} has a working skip link`, info.hasSkipLink, `skip=${info.hasSkipLink}`);
        check(`${label} loads every image with alternative text`, info.images.every((image) => image.naturalWidth > 0 && image.alt.trim().length > 0), JSON.stringify(info.images));

        if (route.kind === "not-found") {
          check(`${label} has no language switch`, info.languageLinks.length === 0, JSON.stringify(info.languageLinks));
          check(`${label} offers a link back to the English home page`, info.hrefs.includes("/en/"), "missing /en/");
        } else {
          const otherLang = route.lang === "en" ? "ru" : "en";
          const expectedCounterpart = route.path.replace(/^\/(en|ru)(?=\/|$)/, `/${otherLang}`);
          const counterpart = info.languageLinks.find((link) => link.lang === otherLang);
          check(`${label} switches language without changing the page`, info.languageLinks.length === 2 && Boolean(counterpart) && counterpart.href === expectedCounterpart, JSON.stringify(info.languageLinks));
          const expectedActive = route.kind === "cv" ? (route.lang === "ru" ? "Резюме" : "CV") : navLabel[route.lang];
          check(`${label} marks the current navigation section`, info.navActive.length === 1 && info.navActive[0] === expectedActive, JSON.stringify(info.navActive));
          const expectedCurrent = route.kind === "article" ? [] : [expectedActive];
          check(`${label} exposes the current page to assistive tech`, info.navCurrent.join(",") === expectedCurrent.join(","), JSON.stringify(info.navCurrent));
        }

        if (route.kind === "home" && route.path === "/en/") {
          for (const expected of ["https://t.me/alxt", "mailto:hi@alexkutkin.com", "https://github.com/alexkutkin", "https://x.com/alex_kutkin", "https://github.com/alexkutkin/paste-hatch", "https://github.com/alexkutkin/herdr-tray"]) {
            check(`English home links ${expected}`, info.hrefs.includes(expected), expected);
          }
          const snapshot = await page.locator("body").ariaSnapshot();
          fs.writeFileSync(ariaPath, `${snapshot}\n`, "utf8");
          await capture("home-en", page, { fullPage: true });
        }
        if (route.kind === "home" && route.path === "/ru/") {
          await capture("home-ru", page, { fullPage: true });
        }
        if (route.kind === "cv") {
          for (const expected of cvExpectations[route.lang]) {
            check(`${label} shows ${JSON.stringify(expected)}`, info.mainText.includes(expected), expected);
          }
          await capture(`cv-${route.lang}`, page, { fullPage: true });
        }
        if (route.kind === "not-found") {
          await capture("not-found", page, { fullPage: true });
        }
        if (route.kind === "article" && slugOf(route.path) === "one-article-many-layouts" && route.lang === "en") {
          check(`${label} renders nested lists`, (await page.locator(".prose ul ul ul").count()) === 1, "missing third-level list");
          check(`${label} renders a quote`, (await page.locator(".prose blockquote").count()) === 1, "missing blockquote");
          check(`${label} renders a wide table`, (await page.locator(".prose table").count()) === 1, "missing table");
          check(`${label} renders headings at two levels`, (await page.locator(".prose h2").count()) >= 2 && (await page.locator(".prose h3").count()) >= 1, "missing heading levels");
          const figure = page.locator(".article-figure img");
          check(`${label} renders the article image with a caption`, (await figure.count()) === 1 && (await page.locator(".article-figure figcaption").innerText()).trim().length > 0, "missing figure or caption");
          const longLink = page.locator('.prose a[href*="a-very-long-path"]');
          const linkFits = await longLink.evaluate((link) => {
            const linkBox = link.getBoundingClientRect();
            const proseBox = link.closest(".prose").getBoundingClientRect();
            return linkBox.right <= proseBox.right + 1;
          });
          check(`${label} wraps the long link inside the column`, linkFits, "link overflows the prose column");
          const snapshot = await page.locator("body").ariaSnapshot();
          fs.writeFileSync(path.join(artifactDir, "aria-article.txt"), `${snapshot}\n`, "utf8");
        }

        for (const href of info.hrefs) {
          if (!href || href.startsWith("#")) continue;
          const url = new URL(href, absolute(route.path));
          if (url.origin !== new URL(baseUrl).origin) continue;
          internalLinks.add(url.pathname);
        }
      } catch (error) {
        check(`${label} can be opened and checked`, false, error.message);
      }
    }

    // Language switching keeps the page and records the explicit choice.
    await page.goto(absolute("/en/cv/"), { waitUntil: "domcontentloaded" });
    await page.locator('[data-set-locale="ru"]').click();
    await page.waitForURL("**/ru/cv/", { timeout: 10000 });
    check("Language switch moves the CV to Russian", new URL(page.url()).pathname === "/ru/cv/" && (await page.locator("main h1").innerText()).trim() === "Александр Куткин", page.url());
    check("Language switch records the explicit choice", (await page.evaluate(() => localStorage.getItem("locale"))) === "ru", "locale storage");
    await page.goto(absolute("/en/article/one-article-many-layouts/"), { waitUntil: "domcontentloaded" });
    await page.locator('[data-set-locale="ru"]').click();
    await page.waitForURL("**/ru/article/one-article-many-layouts/", { timeout: 10000 });
    check("Language switch keeps the article slug", new URL(page.url()).pathname === "/ru/article/one-article-many-layouts/" && (await page.locator("main h1").innerText()).trim() === "Одна статья, много вёрстки", page.url());
    await page.goto(absolute("/"), { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/ru/", { timeout: 10000 });
    check("Root redirect reuses the saved language choice", new URL(page.url()).pathname === "/ru/", page.url());
    report.actions.push({ action: "Switch language on CV and an article, then revisit the root", result: "same page and slug kept; saved choice redirects to /ru/" });

    // Themes: system default, explicit dark, persistence, and live system changes.
    await page.goto(absolute("/en/"), { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      try {
        localStorage.removeItem("theme");
      } catch {}
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    const themeInputs = await page.locator('input[name="theme"]').count();
    check("Theme switch exposes system, light and dark", themeInputs === 3, `inputs=${themeInputs}`);
    const systemState = await page.evaluate(() => ({
      attr: document.documentElement.getAttribute("data-theme"),
      background: getComputedStyle(document.body).backgroundColor,
    }));
    check("Theme defaults to the system preference", systemState.attr === null && systemState.background === "rgb(247, 242, 232)", JSON.stringify(systemState));
    await page.locator('.theme-switch__option:has(input[value="dark"])').click();
    await page.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "dark");
    const darkState = await page.evaluate(() => ({
      attr: document.documentElement.getAttribute("data-theme"),
      background: getComputedStyle(document.body).backgroundColor,
      stored: localStorage.getItem("theme"),
    }));
    check("Explicit dark theme applies and persists", darkState.attr === "dark" && darkState.background === "rgb(23, 25, 31)" && darkState.stored === "dark", JSON.stringify(darkState));
    await capture("theme-dark", page, { fullPage: true });
    await page.reload({ waitUntil: "domcontentloaded" });
    check("Dark theme survives a reload", (await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark", "data-theme after reload");
    await page.locator('.theme-switch__option:has(input[value="system"])').click();
    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-theme"));
    check("System theme clears the explicit choice", (await page.evaluate(() => localStorage.getItem("theme"))) === null, "theme storage after system");
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForTimeout(150);
    check("System theme follows a dark preference", (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === "rgb(23, 25, 31)", "dark system background");
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForTimeout(150);
    check("System theme follows a light preference", (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === "rgb(247, 242, 232)", "light system background");
    report.actions.push({ action: "Exercise system, dark and light themes", result: "default, persistence, clearing and prefers-color-scheme verified" });

    // Keyboard focus.
    await page.goto(absolute("/en/"), { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Tab");
    const skipFocus = await page.evaluate(() => ({
      className: document.activeElement?.className ?? "",
      outline: getComputedStyle(document.activeElement).outlineStyle,
    }));
    check("Tab reaches the skip link with a visible focus ring", skipFocus.className.includes("skip-link") && skipFocus.outline !== "none", JSON.stringify(skipFocus));
    let navFocus = null;
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press("Tab");
      navFocus = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || !active.classList.contains("site-nav__link")) return null;
        const style = getComputedStyle(active);
        return { text: active.textContent.trim(), outline: style.outlineStyle, width: style.outlineWidth };
      });
      if (navFocus) break;
    }
    check("Keyboard focus reaches the navigation with a visible outline", Boolean(navFocus) && navFocus.outline !== "none" && navFocus.width !== "0px", JSON.stringify(navFocus));
    await capture("keyboard-focus", page);
    report.actions.push({ action: "Tab through the header", result: skipFocus });

    // Mermaid diagrams and the source fallback.
    await page.goto(absolute("/en/article/one-article-many-layouts/"), { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".mermaid-diagram svg", { state: "visible", timeout: 20000 });
    const diagrams = await page.locator(".mermaid-diagram").count();
    const broken = page.locator('pre[data-language="mermaid"][data-mermaid-error="true"]');
    const brokenCount = await broken.count();
    const diagramSource = await page.locator(".mermaid-diagram").first().getAttribute("data-mermaid-source");
    const diagramText = await page.locator(".mermaid-diagram").first().evaluate((node) => node.textContent ?? "");
    check("Mermaid renders the valid diagram", diagrams === 1 && diagramText.includes("Valid?"), `diagrams=${diagrams}`);
    check("Mermaid keeps the broken diagram source", brokenCount === 1 && (await broken.innerText()).includes("flowchart TD"), `broken=${brokenCount}`);
    check("Mermaid keeps the diagram source for re-rendering", Boolean(diagramSource && diagramSource.includes("flowchart TD")), "missing source");
    await capture("mermaid", page.locator(".mermaid-diagram").first());
    await capture("mermaid-error", broken.first());
    await page.locator('.theme-switch__option:has(input[value="dark"])').click();
    await page.waitForTimeout(800);
    check("Mermaid re-renders when the theme changes", (await page.locator(".mermaid-diagram svg").count()) === 1, "diagram missing after theme change");
    await page.locator('.theme-switch__option:has(input[value="system"])').click();
    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-theme"));
    await page.waitForTimeout(300);
    await capture("article-en", page, { fullPage: true });
    report.actions.push({ action: "Render a valid and a broken Mermaid diagram", result: { diagrams, broken: brokenCount } });

    await page.goto(absolute("/ru/article/one-article-many-layouts/"), { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".mermaid-diagram svg", { state: "visible", timeout: 20000 });
    await capture("article-ru", page, { fullPage: true });

    // Responsive layout and wide blocks.
    const mobile = await context.newPage();
    await mobile.setViewportSize({ width: 375, height: 812 });
    const overflow = async (target) => target.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    await mobile.goto(absolute("/en/"), { waitUntil: "domcontentloaded" });
    const mobileHome = await overflow(mobile);
    check("Mobile home has no horizontal page overflow", mobileHome.scrollWidth <= mobileHome.innerWidth + 1 && mobileHome.bodyWidth <= mobileHome.innerWidth + 1, JSON.stringify(mobileHome));
    await capture("mobile-home", mobile, { fullPage: true });
    await mobile.goto(absolute("/en/article/one-article-many-layouts/"), { waitUntil: "domcontentloaded" });
    await mobile.waitForSelector(".mermaid-diagram svg", { state: "visible", timeout: 20000 });
    const mobileArticle = await overflow(mobile);
    check("Mobile article has no horizontal page overflow", mobileArticle.scrollWidth <= mobileArticle.innerWidth + 1 && mobileArticle.bodyWidth <= mobileArticle.innerWidth + 1, JSON.stringify(mobileArticle));
    const blockOverflow = await mobile.evaluate(() => {
      const code = document.querySelector(".prose pre");
      const table = document.querySelector(".prose table");
      const diagram = document.querySelector(".mermaid-diagram");
      const header = document.querySelector(".site-header__utilities");
      return {
        codeScrolls: code ? code.scrollWidth > code.clientWidth + 1 : false,
        tableScrolls: table ? table.scrollWidth > table.clientWidth + 1 : false,
        diagramFits: diagram ? diagram.getBoundingClientRect().right <= window.innerWidth + 1 : false,
        headerFits: header ? header.getBoundingClientRect().right <= window.innerWidth + 1 : false,
      };
    });
    check("Wide code scrolls inside its block on mobile", blockOverflow.codeScrolls, JSON.stringify(blockOverflow));
    check("Wide table scrolls inside its block on mobile", blockOverflow.tableScrolls, JSON.stringify(blockOverflow));
    check("Diagram and header fit the mobile viewport", blockOverflow.diagramFits && blockOverflow.headerFits, JSON.stringify(blockOverflow));
    await capture("mobile-article", mobile, { fullPage: true });
    await mobile.goto(absolute("/en/cv/"), { waitUntil: "domcontentloaded" });
    const mobileCv = await overflow(mobile);
    check("Mobile CV has no horizontal page overflow", mobileCv.scrollWidth <= mobileCv.innerWidth + 1 && mobileCv.bodyWidth <= mobileCv.innerWidth + 1, JSON.stringify(mobileCv));
    await capture("mobile-cv", mobile, { fullPage: true });
    await mobile.close();
    report.actions.push({ action: "Resize to 375px and inspect home, article and CV", result: { mobileHome, mobileArticle, mobileCv, blockOverflow } });

    // RSS feeds.
    const feedEn = await context.request.get(absolute("/en/rss.xml"));
    const feedEnText = await feedEn.text();
    check("English RSS responds with XML", feedEn.status() === 200 && (feedEn.headers()["content-type"] ?? "").includes("xml"), `HTTP ${feedEn.status()} ${feedEn.headers()["content-type"]}`);
    check("English RSS has eleven items and full article text", (feedEnText.match(/<item>/g) ?? []).length === 11 && feedEnText.includes("<language>en</language>") && feedEnText.includes("The first draft of a feature"), `items=${(feedEnText.match(/<item>/g) ?? []).length}`);
    const feedRu = await context.request.get(absolute("/ru/rss.xml"));
    const feedRuText = await feedRu.text();
    check("Russian RSS responds with XML", feedRu.status() === 200 && (feedRu.headers()["content-type"] ?? "").includes("xml"), `HTTP ${feedRu.status()} ${feedRu.headers()["content-type"]}`);
    check("Russian RSS has eleven items and full article text", (feedRuText.match(/<item>/g) ?? []).length === 11 && feedRuText.includes("<language>ru</language>") && feedRuText.includes("Первый черновик функции"), `items=${(feedRuText.match(/<item>/g) ?? []).length}`);
    report.actions.push({ action: "Read both RSS feeds", result: { en: feedEn.status(), ru: feedRu.status() } });

    // Internal link audit.
    let linkFailures = 0;
    for (const pathname of [...internalLinks].sort()) {
      const response = await context.request.get(absolute(pathname), { maxRedirects: 0 });
      if (response.status() !== 200) {
        linkFailures += 1;
        check(`Internal link ${pathname} resolves`, false, `HTTP ${response.status()}`);
      }
    }
    check("Every internal link resolves", linkFailures === 0, `${internalLinks.size} links checked; ${linkFailures} failed`);
    report.actions.push({ action: "Request every internal link", result: { checked: internalLinks.size, failed: linkFailures } });

    // The static host's not-found behavior.
    const missing = await context.request.get(absolute("/en/no-such-page/"), { maxRedirects: 0 });
    check("Missing routes respond with 404", missing.status() === 404, `HTTP ${missing.status()}`);
    const notFound = await context.request.get(absolute("/404.html"));
    check("The custom 404 page is served", notFound.status() === 200, `HTTP ${notFound.status()}`);
    report.actions.push({ action: "Request a missing route and /404.html", result: { missing: missing.status(), notFound: notFound.status() } });

    report.pages = routes.map((route) => route.path);
    report.linkAudit = { checked: internalLinks.size, failed: linkFailures };
    report.consoleMessages = consoleMessages.slice(0, 50);
    report.pageErrors = pageErrors.slice(0, 50);
    report.actions.push({ action: "Collect console errors", result: { consoleErrors: consoleMessages.length, pageErrors: pageErrors.length } });

    const failures = checks.filter((item) => !item.passed);
    report.summary = { checks: checks.length, passed: checks.length - failures.length, failed: failures.length };
    if (failures.length) {
      throw new Error(`${failures.length} site checks failed: ${failures.map((item) => item.name).slice(0, 6).join("; ")}`);
    }
    report.status = "passed";
  } catch (error) {
    report.status = "failed";
    report.error = error.stack ?? error.message;
    try {
      await capture("failure", page, { fullPage: true });
    } catch {}
    throw error;
  } finally {
    await context.tracing.stop({ path: path.join(artifactDir, "trace.zip") }).catch((error) => {
      report.traceError = error.message;
    });
    await context.close().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const suite = args.suite ?? "foundation";
  if (!["foundation", "site"].includes(suite)) throw new Error(`Unsupported suite ${JSON.stringify(suite)}; available suites: foundation, site`);
  if (!args["base-url"] || !args["artifact-dir"]) throw new Error("Usage: verify-browser.cjs --base-url=http://host.docker.internal:4321 --artifact-dir=/tmp/run/browser --suite=foundation|site");

  const artifactDir = path.resolve(args["artifact-dir"]);
  fs.mkdirSync(artifactDir, { recursive: true });
  const reportPath = path.join(artifactDir, "report.json");
  const report = {
    suite,
    baseUrl: args["base-url"],
    startedAt: new Date().toISOString(),
    actions: [],
    checks: [],
    screenshots: [],
    status: "running",
  };
  let browser;
  let failure;

  try {
    browser = await chromium.launch({ headless: true });
    if (suite === "site") {
      await runSite({ browser, baseUrl: args["base-url"], artifactDir, report });
    } else {
      await runFoundation({ browser, baseUrl: args["base-url"], artifactDir, report });
    }
  } catch (error) {
    failure = error;
    report.status = "failed";
    report.error = report.error ?? error.stack ?? error.message;
  } finally {
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

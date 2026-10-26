const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, webkit, devices } = require("/app/node_modules/@playwright/test");

const options = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  assert.ok(match, `Expected --name=value: ${arg}`);
  return [match[1], match[2]];
}));
const baseUrl = options["base-url"] ?? "http://host.docker.internal:4321";
const artifactDir = options["artifact-dir"] ?? "/tmp/personal-site-mobile";
const browserName = options.browser ?? "webkit";
assert.ok(["webkit", "chromium"].includes(browserName), "Unsupported browser");
fs.mkdirSync(artifactDir, { recursive: true });

async function main() {
  const browser = await ({ chromium, webkit })[browserName].launch({ headless: true });
  const results = [];
  try {
    for (const width of [320, 375, 390, 430]) {
      for (const lang of ["en", "ru"]) {
        for (const colorScheme of ["light", "dark"]) {
          const context = await browser.newContext({
            ...devices["iPhone 13"],
            viewport: { width, height: 844 },
            colorScheme,
          });
          const page = await context.newPage();
          const response = await page.goto(new URL(`/${lang}/`, baseUrl).href, { waitUntil: "networkidle" });
          assert.equal(response.status(), 200);
          const layout = await page.evaluate(() => {
            const rect = (selector) => {
              const box = document.querySelector(selector).getBoundingClientRect();
              return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
            };
            const hero = document.querySelector(".home-hero");
            const rule = hero.nextElementSibling;
            return {
              width: innerWidth,
              scrollWidth: document.documentElement.scrollWidth,
              header: rect(".site-header__row"),
              brand: rect(".brand"),
              navigation: rect(".site-nav"),
              language: rect(".language-switch"),
              theme: rect(".theme-control__toggle"),
              text: rect(".home-hero__text"),
              photo: rect(".home-hero__aside"),
              heroGap: parseFloat(getComputedStyle(hero).rowGap),
              sectionGap: parseFloat(getComputedStyle(rule).marginBlockStart),
            };
          });
          const label = `${browserName}-${lang}-${width}-${colorScheme}`;
          assert.ok(layout.scrollWidth <= width + 1, `${label}: horizontal overflow`);
          for (const target of await page.locator(".brand, .site-nav__link, .language-switch__link, .theme-control__toggle").all()) {
            const box = await target.boundingBox();
            assert.ok(box.width >= 44 && box.height >= 44, `${label}: header touch target smaller than 44px`);
          }
          assert.ok(Math.abs(layout.theme.right - layout.header.right) <= 1, `${label}: theme not aligned right`);
          assert.ok(Math.abs(layout.language.right - layout.header.right) <= 1, `${label}: language not aligned right`);
          assert.ok(Math.abs(layout.navigation.top - layout.language.top) <= 1, `${label}: navigation and languages not on one row`);
          assert.ok(layout.header.bottom - layout.header.top <= 100, `${label}: header exceeds two compact rows`);
          const toggle = page.locator(".theme-control__toggle");
          await toggle.click();
          await page.locator('.theme-switch__option:has(input[value="dark"])').click();
          assert.equal(await toggle.getAttribute("aria-expanded"), "false");
          assert.equal(await page.evaluate(() => localStorage.getItem("theme")), "dark");
          await toggle.click();
          await page.keyboard.press("Escape");
          assert.equal(await toggle.getAttribute("aria-expanded"), "false");
          await page.evaluate((scheme) => {
            localStorage.setItem("theme", scheme);
            document.documentElement.dataset.theme = scheme;
          }, colorScheme);
          assert.ok(Math.abs(layout.photo.top - layout.text.bottom - layout.heroGap) <= 1, `${label}: unexpected photo gap`);
          assert.ok(layout.heroGap >= 32 && layout.heroGap <= 40 && layout.sectionGap >= 32 && layout.sectionGap <= 40, `${label}: photo spacing is outside the chosen scale step`);

          if (width === 390) {
            await page.locator(".theme-control__toggle").blur();
            await page.locator(".site-header").screenshot({ path: path.join(artifactDir, `${label}-header.png`) });
            await page.locator(".home-hero").screenshot({ path: path.join(artifactDir, `${label}-hero.png`) });
          }
          await page.locator(`.language-switch a[hreflang="${lang === "en" ? "ru" : "en"}"]`).click();
          await page.waitForURL(`**/${lang === "en" ? "ru" : "en"}/`);
          for (const route of [`/${lang}/cv/`, `/${lang}/article/why-i-built-pastehatch/`]) {
            await page.goto(new URL(route, baseUrl).href, { waitUntil: "networkidle" });
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: overflow at ${route}`);
          }
          results.push({ label, ...layout });
          await context.close();
        }
      }
    }
    fs.writeFileSync(path.join(artifactDir, "report.json"), `${JSON.stringify({ browser: browserName, device: "iPhone 13 emulation with narrow-screen variants", results, status: "passed" }, null, 2)}\n`);
    console.log(`${browserName}: ${results.length} mobile configurations passed; home, CV, article, language switch and photo spacing checked`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

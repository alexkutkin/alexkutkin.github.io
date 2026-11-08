# Codebase untangling decision log

## Contract and workflow

- Preserve public URLs, content, ordering, metadata, appearance, locale selection,
  theme persistence, Mermaid rendering and graceful source fallback, and RSS.
- Work on `main`; do not commit or push. Comments and Tests cleanup are enabled.
- Inventory first, then replace duplicate owners, then improve tests, then ask
  independent reviewers to search again. Keep only changes that reduce reader load.
- Baseline: `20261108T170844449Z-25796-fq1nra`, 724 browser checks passed.
  Its isolated fixture build and browser evidence remain under `artifacts/verification`.
- Completion: typecheck, production build/content isolation, browser verification,
  normalized old/new static output comparison, and no remaining actionable review
  findings. Test expectations must remain independent of application implementation.

## Decisions and original problems

### Generate localized routes from one locale definition

- Eight files in `src/pages/en` and `src/pages/ru` duplicate four route adapters,
  including pagination size, article path generation, CV lookup, and RSS handling.
- Locale membership is repeated in Astro configuration, content schemas, article
  translation validation, dictionaries, language switch, and path recognition.
- Routes pass dictionaries alongside the locale that already determines them;
  article/CV views additionally receive a locale already recorded in their entry.
- Delete the eight old routes and unused dictionary `locale`, `language`, and
  dictionary reexports. Keep English/Russian copy in their locale resources.

### Give metadata one owner

- `index.astro` and `BaseLayout.astro` repeat document and Open Graph metadata.
- Layout, root, and RSS carry obsolete github.io fallback origins despite the
  configured alexkutkin.com site. Use the configured site origin consistently.
- Preserve the root's no-JavaScript language links and special canonical policy;
  preserve the English 404 without language alternates and with its own OG URL.
- Retain the explicit `canonicalPath` override for the 404: a production build
  proved Astro exposes `/404/` during rendering while the static host serves
  `/404.html`. Removing the override changed the public Open Graph URL.

### Put browser behavior beside its component

- Theme inputs, storage, system changes, and notifications live in BaseLayout,
  while the theme menu lives in ThemeSwitch. ArticleView knows a bare event name.
- Date markup/ISO conversion is duplicated in ArticleView and NoteCard, while
  formatting lives in BaseLayout. A shared date component owns this contract.
- Language choice persistence and footer year updates also live in BaseLayout.
- Keep prepaint theme initialization in the head to avoid a flash. Keep storage
  access failures nonfatal because blocked browser storage is supported.
- Keep animation timers: they define visible LivingDot choreography, rather than
  masking application races. Remove comments that merely narrate that code.

### Keep only current presentation data and style controls

- Project identity/links are duplicated across translations; share identity and
  retain translated descriptions keyed by project identifier.
- Dark palette values occur twice for explicit and system themes. Define them
  once and select them through the cascade without changing computed colors.
- Remove unused CSS tokens and never-overridden primitive configuration hooks.
- Keep article asset lookup local: both assets are used, the fixture format works,
  and a schema/frontmatter migration would add work without an observed benefit.

### Make verification depend on explicit inputs and observable behavior

- Browser tests hardcode 13 articles and exactly two listing pages; fixture docs
  still describe eleven articles and a single publication. Supply source slugs
  explicitly and visit every expected listing page. Keep independent assertions
  for the public domain, copy, pagination size, and metadata.
- `checkAsync` is unused. Remove it and implementation-restating comments last.
- Fixed browser sleeps encode timing assumptions. Wait for visible state instead.
- Mermaid theme verification counts an SVG that already existed, so broken
  updates still pass; assert rendered color changes and source fallback instead.
- Public-content verification assumes at most two pages; check every expected
  page and exact source-derived route, listing, and RSS membership.
- Keep Windows PID/listener checks, startup polling, unique Docker staging,
  cleanup/evidence recovery, foundation checks, and the separate mobile WebKit
  driver: each has an independent operational or behavioral purpose.

## Design comparison

Keeping per-locale routes and extracting four path factories would retain the
duplicate adapters and implicit dictionary/locale agreement. Dynamic `[lang]`
routes remove that agreement entirely, so they are the chosen shape.

A global browser initializer would shorten BaseLayout but retain its dependency
on unrelated component selectors. Component-owned scripts plus a shared date
component and a named theme notification make the dependencies explicit instead.

A generic theme/style engine or project registry would add configuration for a
single site. Use small concrete definitions and the existing CSS cascade.

## Verification results

- `npm run typecheck`: passed after the final source changes.
- `npm run build` and `node scripts/verify-public-content.mjs`: passed; each
  locale contains two published articles and no demonstration content.
- `node scripts/verify.mjs --suite site --port 4330` from Git Bash: 734/734
  checks passed in run `20261108T171751119Z-11464-cehl6h`. No unhandled page
  errors; the owned server and container staging were cleaned up.
- The same 39 HTML/XML/text outputs exist before and after. Their content and
  metadata match after normalizing whitespace and Astro scope identifiers and
  excluding executable scripts and stylesheet links, which are covered by the
  browser and visual checks instead.
- All 19 baseline screenshots retain their dimensions. Fifteen have no pixel
  differences above a two-channel-value tolerance; the four diagram/article
  captures differ by only 14–38 pixels each. The diagram was visually inspected.
- Comparison evidence: `static-equivalence.json` and `visual-equivalence.json`
  in the final run directory. Reproduction scripts are in ignored `.scratch/`.
- Syntax checks for all verification scripts and `git diff --check`: passed.
- Independent final review found no remaining issues worth fixing after the
  follow-ups below.

## Review follow-ups

- Derive Pagination's dictionary from its locale, just as other localized views do.
- Guard the root redirect against an empty browser language list, preserving the
  old English fallback instead of introducing a JavaScript exception.
- Constrain project descriptions with `Record<ProjectId, string>` so adding a
  project without translations fails the existing TypeScript check.

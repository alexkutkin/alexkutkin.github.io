# Working agreement

## Communication
- Communicate with the owner in Russian.
- Keep everything the repository stores in English: code and comments, commit
  messages, test names, README, docs, ADRs, AGENTS.md, config comments.
- Content, not documentation, keeps its own language: product strings in locale
  resource files (`Strings/ru-RU` and alike) and personal financial documents.

## Git
- Work directly on `main`. Create branches or pull requests only when requested.
- Use focused Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Do not add AI co-authorship or tool credits to commits or pull requests.
- Add `Signed-off-by` only when required.
- Commit and push only when requested. Push to `origin/main` unless otherwise specified.
- Do not force-push or rewrite published history without explicit approval.

## Project
- English is the site's default language; Russian is an alternative locale. Both
  locales ship every page and note.
- Published notes live in `src/content`; demonstration posts live in
  `tests/fixtures` and never reach the build. After content changes run
  `npm run build` and `node scripts/verify-public-content.mjs` to prove the split.
- Run `npm run typecheck` after code changes. `astro build` does not check types.
- Verify user-visible behavior with `node scripts/verify.mjs --suite site --port
  4330` from Git Bash. It drives Chromium in the existing `playwright-sandbox-1`
  container and writes evidence to `artifacts/verification/<run-id>/`.

# TODO

Workspace branch: `apo/develop`. PR branches from `upstream/main` only.

## First PRs (small, evidence-backed)

- [ ] **Wait on #154** unless it stalls. If stalled, open our own
      `fix/empty-close-thenable` with the same Promise contract plus a
      comment pointing at core `await close()`.
- [ ] `fix/grid-position-firefox`: null-safe gap / template parse in
      `getGridElementsPosition`.
- [ ] `fix/render-listener-stack`: delegate clicks on the app root or
      AbortController in `addListeners` and settings `addEventListeners`.
- [ ] `fix/await-set-grid-data`: await `setGridData` in add / remove /
      clear.
- [ ] `fix/settings-double-refresh`: drop the extra `refreshGmScreen`
      in `#onSubmit`.
- [ ] `fix/compact-close-contract`: compact sheets honor AppV2
      `close(options)` instead of swallowing any args.

## Second wave

- [ ] Guard `toggleGmScreenVisibility` when `this.element` is missing.
- [ ] Idempotent journal-directory button.
- [ ] Confirm before span overlap deletes other cells.
- [ ] Hide or placeholder cells the player cannot view.
- [ ] Escape `src` in page image/pdf/video HTML.
- [ ] Migration: skip notify when there is nothing to convert.

## Local / own-version (not for upstream unless asked)

- [ ] Vite proxy `30000` -> `30005` for `npm run dev` on this host.
- [ ] Live-sync `dist/gm-screen` into Foundry Data and load a QA world.
- [ ] Decide later: keep contributing to `gm-screen`, or start a new id
      if the product fork diverges.

## Review

Audit captured 2026-09-08 in `dev/AUDIT.md` against `ec0462a`.
No runtime QA yet. No PR opened.

# GM Screen audit (2026-09-08)

Checkout: `C:/git-foundry/GM-Screen-for-Foundry-VTT`
Commit: `ec0462a` (`chore: update deps`)
Upstream tag latest: **v6.2.1** (2026-06-28)
Source `src/module.json` version: **5.5.3** (release workflow substitutes the tag)

License: MIT. Fork of ElfFriend-DnD. samulopez is the live maintainer.

## What it is

Tabbed grid of journal entries, pages, roll tables, actors, items, and
images. Drawer or pop-out. Shared tabs for players. Persistence is one
world setting blob (`gm-screen-config`). No sockets. No document flags.

Main app and settings are ApplicationV2 + HandlebarsApplicationMixin.
Embedded sheets are a mix of compact AppV2 subclasses and instance-level
`close` / `_postRender` patches.

## Highest-impact bugs

### 1. `emptyClose` is not thenable (open PR already)

`src/module/helpers.ts` `emptyClose()` returns `this`. Assigned onto
embedded Actor / Item / Text sheets in `GmScreenApplication.ts`. Core
callers that `await close()` (Escape / `ClientKeybindings` dismiss)
throw. kvndrsslr already opened
https://github.com/samulopez/foundryvtt-gmScreen/pull/154
(`Promise.resolve(this)`). Do not duplicate that PR.

Clearing a cell still calls `this.apps[appKey]?.close()` then deletes
the key. The no-op close is intentional so Escape does not kill the
embedded sheet. Real teardown of listeners/DOM is a separate bug.

### 2. Click listeners stack on every render

`GmScreenApplication.addListeners` binds
`this.handleClickEvent.bind(this)` on every `_onRender` and never
removes the old handlers. Each refresh multiplies clicks. Same pattern
in `GmScreenSettings.addEventListeners` (click on `this.element`).

Fix: one AbortController or event delegation on the root, reset on
render.

### 3. Firefox drop / configure can throw

`getGridElementsPosition` does
`vanillaGridElementStyles['grid-row-gap'].match(numberRegex)[0]`.
The file already logs that `gap` is `''` in Firefox. `match` is then
null and `[0]` throws. Same risk on `grid-template-columns` / `rows`.

Fix: parse `gap` / `rowGap` / `columnGap` with a fallback (0). Guard
`match`.

### 4. Missing `await` on `setGridData`

`addEntryToActiveGrid`, `removeEntryFromActiveGrid`, and `handleClear`
call `this.setGridData(...)` without await. Rapid drop then clear can
lose the last write. `ClickAction.statBlock` already awaits.

### 5. Double refresh after tab settings save

`gmScreenConfig` `onChange` already calls `refreshGmScreen()`.
`GmScreenSettings.#onSubmit` then calls it again after `settings.set`.
Pop-out mode `refresh()` does `close()` then `render(true)`, so this is
a full teardown twice.

### 6. Compact sheet `close(...args)` swallows optioned closes

`CompactJournalEntryDisplay`, `CompactJournalEntryPageDisplay`,
`CompactRollTableDisplay`: if `args.length !== 0`, return `this`.
AppV2 `close({ force })` therefore becomes a no-op. That fights the
same contract as `emptyClose`.

### 7. `toggleGmScreenVisibility` assumes `this.element`

Drawer toggle writes `this.element.classList` with no render check.
If the instance exists but is unrendered, this throws. Entry
`toggleGmScreenOpen` already try/catches, so the user sees a silent
failure.

### 8. Journal directory button can duplicate

`addGmScreenButton` always `insertAdjacentHTML` on
`renderJournalDirectory` with no existing-button check.

### 9. Span overlap deletes neighbor cells with no confirm

`configureCell` deletes any entry whose `entryId` sits in the new
span. README admits overlap is possible. Silent delete is the sharp
edge.

### 10. Shared-tab permission leak (documented)

README: players can see content on a shared tab even without document
permission. `getUserViewableGrids` only filters `isShared`. Cell
injection still `fromUuid`s and renders. Treat as product behavior
until upstream wants a hard hide.

### 11. InnerHTML for image / pdf / video pages

`CompactJournalEntryPageDisplay._replaceHTML` interpolates
`document.src` into HTML. GM-controlled, still unescaped.

### 12. Migration is noisy and v2-only

`gmScreenMigrate` still notifies "Beginning Migration" on worlds that
never had the v1 array schema, then "Migration Complete". Schema target
is hardcoded `2.0.1`. Issue #60 (v11 world) was closed with "reset
settings".

### 13. Private AppV2 `_maxZ`

Drawer `bringToFront` writes `ApplicationV2._maxZ`. Fragile on core
bumps.

## Optimizations

- Pop-out `refresh()` closes the whole app. Prefer part render or
  `injectCellContents` only when the visible grid set changed.
- `injectCellContents` `fromUuid`s every occupied cell per render.
  Cache documents, invalidate on `update` / `delete`.
- `diffObject` on the full config blob each refresh. A grids / active
  id check is enough for the skip path.
- `classList.remove(...classList)` mutates a live token list while
  spreading it. Copy to an array first.
- Vite proxy is `:30000`. This host is `:30005`. `npm run dev` will
  miss Foundry until the proxy is patched.
- `package.json` `engines.node` is `>=v24.11.1`. This host is Node 22.
  CI is Node 24. Local lint/typecheck may still run.
- `src/module.json` version stays 5.5.3 on main. Tags rewrite it at
  release. Local builds report 5.5.3 even when the directory listing
  is 6.2.1.

## What is already solid

Typed config model. Drawer vs pop-out from one app. Shared tabs.
AppV2 main surfaces. Public `game.modules.get('gm-screen').api`.
DnD5e statblock embed. Vite + oxlint + eslint + fvtt-types. Five
languages. Maintainer is active (v6.2.1 in 2026).

## Do not fork-fight

Open upstream PRs as of clone:

- #154 `emptyClose` Promise (real fix, review then land or wait)
- dependabot: immutable, typescript-eslint, eslint-plugin-import-x,
  sass-embedded

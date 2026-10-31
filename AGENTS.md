# AGENTS.md

This checkout is Apo's working copy of samulopez GM Screen
(`gm-screen`, MIT). It is a fork for PRs plus local development. It is
not a rewrite with a new module id.

- Follow the parent `C:/git-foundry/AGENTS.md`. This file is module-only.
- Upstream: `https://github.com/samulopez/foundryvtt-gmScreen` (`upstream`).
- Original (stale): `https://github.com/ElfFriend-DnD/foundryvtt-gmScreen` (`original`).
- Fork: `https://github.com/apoapostolov/foundryvtt-gmScreen` (`origin`).
- Runtime id stays `gm-screen` while contributing upstream.
- Target Foundry v14 minimum, verified v14, maximum v14 (see `src/module.json`). Local package version is 14.0.0 so the Foundry directory cannot replace this checkout with samulopez 6.x.
- Source lives in `src/`. Build with `npm run build`. Output is `dist/gm-screen/`.
- Do not ship `AGENTS.md` or `dev/` in a PR to samulopez. Cut PR branches
  from `upstream/main`, never from `apo/develop`.
- License is MIT. Keep copyright and attribution.
- Public files stay free of secrets, bedroom paths, and research of other mods.
- Private agent memory: `dev/DEVELOPMENT_LOG.md`. Audit: `dev/AUDIT.md`.
  Plan: `dev/TODO.md`.
- Local Node is v22. Upstream `engines` wants Node 24. CI uses Node 24.
  Do not bump engines unless the PR needs it.
- Vite `server.proxy` targets Foundry `:30000`. This host is `:30005`.
  Change the proxy only on a local or PR branch when doing `npm run dev`.
- Do not commit, push, or open a GitHub PR unless asked.

## Remotes and branches

```bash
origin    apoapostolov/foundryvtt-gmScreen
upstream  samulopez/foundryvtt-gmScreen
original  ElfFriend-DnD/foundryvtt-gmScreen
```

- `main` tracks the fork default and should match `upstream/main`.
- `apo/live-all` is the personal Foundry 14 package (local version 14.0.0).
- `apo/develop` is an older workspace branch. Do not use it as the live source.
- Feature PRs: `git checkout -b fix/<name> upstream/main`

## Pull request recipe

```bash
git fetch upstream
git checkout -b fix/<name> upstream/main
# edit src/ only
git push -u origin fix/<name>
gh pr create --repo samulopez/foundryvtt-gmScreen --base main --head apoapostolov:fix/<name>
```

Then switch back to `apo/live-all`. Do not stay on the PR branch.

## Live test

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

Sync `dist/gm-screen` with `foundry_live_sync`. Do not rsync `--delete`
into `C:/FoundryData.14/Data/modules/gm-screen`.

## Release zip

Upstream releases zip `dist/` from GitHub Actions on `v*` tags. For a
local Foundry zip of this checkout after `npm run build`:

```bash
python C:/Users/theap/AppData/Local/hermes/skills/foundry/foundry-vtt-release-engineering/scripts/foundry-zip.py C:/git-foundry/GM-Screen-for-Foundry-VTT/dist/gm-screen
```

Do not zip the repo root. `src/` is not the served package.

## Upstream baseline (tracked)

`apo/live-all` is rebased onto the upstream release pinned below. Update this
block every time the personal copy is rebased; it is the reference that future
backports diff against. Do not infer the baseline from tags alone, because
upstream's `src/module.json` version string lags its own release tag.

| Item | Value |
| --- | --- |
| Upstream release | `v6.3.0` |
| Released | 2026-10-31 |
| Upstream commit | `b4404b6185c0aa57950af14c6a4dc5079944403a` |
| Upstream `src/module.json` version at that commit | `5.5.3` |
| Personal copy version | `14.0.0` |

Never take the module version from upstream; it reports `5.5.3` while shipping
as `v6.3.0`. This copy stays `14.0.0`.

Included from `v6.3.0`: export/import settings (`screenConfigTransfer.ts` plus
the two menu actions), the window-content background fix, and the
duplicate-cell-refresh rework.

Deliberately skipped from `v6.3.0`: the devDependency bumps, `cf1ced2`
(deps plus a compatibility minimum), and `4ffd27f` (removed an import this copy
uses for the typed `GmScreenApi`). Upstream's lock resolves `fvtt-types` over
`git+ssh`, which this npm refuses to fetch, so this copy keeps its own
`package.json` and `package-lock.json`.

To size the next batch:

```bash
git fetch upstream --tags
git log --oneline --cherry-pick --right-only apo/live-all...v<NEXT>
```

To rebase the personal copy onto a new release:

```bash
git fetch upstream --tags
git tag -f pre-rebase apo/live-all
git rebase --onto v<NEXT> <merge-base-with-previous-release> -X theirs --empty=drop
git diff --stat pre-rebase HEAD -- src/    # must show no dropped local feature
npm run typecheck && npm run lint && npm run build
```

`-X theirs` resolves every conflict to the local commit and drops commits whose
patch upstream already has, but it also drops individual lines when a hunk
straddles a change. The `git diff` against `pre-rebase` is mandatory: it is how
`MySettings.plainJournalCells` was caught missing after the `v6.3.0` rebase.

## Personal copy vs samulopez

The non-fork is `samulopez/foundryvtt-gmScreen` (`upstream`). Ignore
`original` (ElfFriend-DnD) unless asked. The personal copy is `apo/live-all`,
rebased onto the baseline above rather than merged.

Run this check when asked to sync, backport, or review upstream, and before
you take samulopez work into the personal copy.

1. Fetch.

```bash
git fetch upstream --tags
git fetch origin --tags
```

2. Name three points: personal `HEAD` (`apo/live-all`), upstream tip
   (`upstream/main`), and the latest upstream release. List releases with
   `gh release list --repo samulopez/foundryvtt-gmScreen --limit 5` and use
   the newest `v*` tag.
3. Compare commits and `src/`:

```bash
git merge-base apo/live-all upstream/main
git log --oneline $(git merge-base apo/live-all upstream/main)..upstream/main
git log --oneline $(git merge-base apo/live-all upstream/main)..$(git describe --tags --abbrev=0 upstream/main)
git diff --stat apo/live-all upstream/main -- src/
```

4. Classify each upstream commit:
   - Backport: runtime bug, crash, data loss, v14 API break, security.
   - Skip: dependabot, prettier-only, engines, a version string below 14.0.0,
     download or manifest URLs that point at samulopez, a compatibility
     minimum that would undo this package.
   - Ask Apo: new features, restyles, settings UX.
5. Apply with cherry-pick or a surgical edit. Keep local settings, compact
   sheet `close()` thenable, AbortController listeners, `src/module.json`
   version `14.0.0`, compatibility minimum 14, and apoapostolov url, manifest,
   and download fields.
6. Prove: `npm run typecheck`, `npm run lint`, `npm run build`, then
   `foundry_live_sync`. If `C:/FoundryData.14/Data/modules/gm-screen/gm-screen.lock`
   is missing, write U+1F512 into that file. If `game.modules.get('gm-screen').version`
   still shows directory 6.x after a world reload, restart the `FoundryVTT`
   service, then load the world again. Require version `14.0.0` and `locked: true`.
7. Do not push `apo/live-all` to samulopez. Do not open a PR that ships
   `AGENTS.md`, `dev/`, or version 14.0.0.

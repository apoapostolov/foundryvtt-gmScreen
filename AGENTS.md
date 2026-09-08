# AGENTS.md

This checkout is Apo's working copy of samulopez GM Screen
(`gm-screen`, MIT). It is a fork for PRs plus local development. It is
not a rewrite with a new module id.

- Follow the parent `C:/git-foundry/AGENTS.md`. This file is module-only.
- Upstream: `https://github.com/samulopez/foundryvtt-gmScreen` (`upstream`).
- Original (stale): `https://github.com/ElfFriend-DnD/foundryvtt-gmScreen` (`original`).
- Fork: `https://github.com/apoapostolov/foundryvtt-gmScreen` (`origin`).
- Runtime id stays `gm-screen` while contributing upstream.
- Target Foundry v13 minimum, verified v14, maximum v14 (see `src/module.json`).
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
- `apo/develop` holds this workspace (AGENTS + `dev/`) on top of upstream.
- Feature PRs: `git checkout -b fix/<name> upstream/main`

## Pull request recipe

```bash
git fetch upstream
git checkout -b fix/<name> upstream/main
# edit src/ only
git push -u origin fix/<name>
gh pr create --repo samulopez/foundryvtt-gmScreen --base main --head apoapostolov:fix/<name>
```

Then switch back to `apo/develop`. Do not stay on the PR branch.

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

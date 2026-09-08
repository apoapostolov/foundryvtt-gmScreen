# DEVELOPMENT_LOG

## 2026-09-08 clone, fork, audit, workspace branch

- Cloned samulopez/foundryvtt-gmScreen to
  `C:/git-foundry/GM-Screen-for-Foundry-VTT`.
- Forked to `apoapostolov/foundryvtt-gmScreen`.
- Remotes: `origin` fork, `upstream` samulopez, `original` ElfFriend-DnD.
- Branch `apo/develop` from `upstream/main` at `ec0462a`.
- Source audit in `dev/AUDIT.md`. Plan in `dev/TODO.md`.
- No src/ changes. No upstream PR.
- Commit `64663e9` `chore: add local agent workspace and audit notes`
  on `apoapostolov/foundryvtt-gmScreen` branch `apo/develop`.

## 2026-09-08 PRs to samulopez

origin/main has kvndrsslr emptyClose (#154) cherry-picked.

Opened one issue+PR per remaining audit item plus the three requested features:

- https://github.com/samulopez/foundryvtt-gmScreen/pull/156 firefox gap
- https://github.com/samulopez/foundryvtt-gmScreen/pull/158 click listeners
- https://github.com/samulopez/foundryvtt-gmScreen/pull/160 await setGridData
- https://github.com/samulopez/foundryvtt-gmScreen/pull/162 double refresh
- https://github.com/samulopez/foundryvtt-gmScreen/pull/164 compact close
- https://github.com/samulopez/foundryvtt-gmScreen/pull/166 toggle unrendered
- https://github.com/samulopez/foundryvtt-gmScreen/pull/168 duplicate journal button
- https://github.com/samulopez/foundryvtt-gmScreen/pull/170 bringToFront / _maxZ
- https://github.com/samulopez/foundryvtt-gmScreen/pull/172 quiet migration
- https://github.com/samulopez/foundryvtt-gmScreen/pull/174 page src innerHTML
- https://github.com/samulopez/foundryvtt-gmScreen/pull/176 span overlap confirm
- https://github.com/samulopez/foundryvtt-gmScreen/pull/178 drawer handle flush
- https://github.com/samulopez/foundryvtt-gmScreen/pull/180 plain journal cells
- https://github.com/samulopez/foundryvtt-gmScreen/pull/182 constrain cell content

Drawer gap live evidence (v14.367, crlngn-ui world): handle 6px above viewport because `.sheet-tabs.tabs` min-height 36px vs 28px button.

These PRs conflict on shared files. Merge one, rebase the rest.


## 2026-09-08 live bugfix: tabs, plain vs constrain

Apo after live-sync:

- Flush-handle PR collapsed tab height to 18px (`height: auto` + tabs min-height 0). Restored 28px, black 1px border, no bottom border, no light-5 outline.
- Plain Journal Cells CSS was width/min-width 100% (constrain). Constrain class never stuck on the AppV2 root after re-render.
- Plain now extracts `.journal-entry-pages` out of the JournalEntrySheet form so OSE `ojc-applied` / sheet chrome do not apply. Constrain uses `minmax(0,1fr)` plus inner min-width 0.

Measured OSA v14.367: handle 28px, border `#000`, flush. Constrain: form 677px in 681px cell, min-width 0. Plain: form `display:none`, visible `.journal-entry-content` without sidebar.


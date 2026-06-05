# edit-mode — Changelog

Reverse-chronological. Each `##` is a session. Added retroactively from git history.

---

## 2026-06-04 — E2E harness, UX polish, skill canon fix, delivery root-cause

**Package (edit-mode repo, `a4b428d`→`879faef`→`b6dc8f6`):**
- **`test:e2e`** — string harness, 23/23: package exports, full panel markup, server/React isolation (build-script no 'use client'), inbox merge semantics, ToV round-trip (request→pending→result→poll→drained), clean github-install proof.
- **`test:e2e:browser`** — headless chromium, 11/11: Edit button visible+activates, element-pick→Save→pin+highlight in live DOM+localStorage, **card stays open after Save** (new UX), collapses on outside-click, ToV browser→inbox→result→poll→page, zero page errors.
- **UX change** (`879faef`): after Save, comment card stays open showing "Send to Claude"; collapses only when user clicks empty area outside the panel. Applies to visual/copy/tov.
- `server/inbox-server.py` bundled into package (ToV channel included).

**Skill canon** (Second Brain `_system/skills/edit-mode-panel/`, `c68310c`→`b95cc2e`):
- Rewritten: single path = install package + call `buildScript`/`buildScriptInner`. Old `panel.js` removed. Client-specific CONFIG hardcode removed (global skill hygiene).
- Added: MANDATORY dev-server restart after reinstall — running Next server holds old bundle, reinstall alone is never enough.

**Root cause diagnosed + fixed** (delivery gap, not code bug): Yegor's reinstall in Urembo session updated the node_modules copy but the running :3131 server kept serving the stale bundle → change "didn't apply". Fix: knowledge in skill + explained to Yegor. Live verified on :3131/w/urembo-v2/ after restart.

## 2026-06-03 (pm) — Canonical convergence (BSO-585): single-source buildScript + migrate consumers

Root cause: Yegor opened Stape and saw the OLD Edit Mode — every project had its own fork, nothing shared. Fix: this repo becomes the single source.

- **`buildScript(config)` + `buildScriptInner(config)`** — canonical Edit Mode as a self-contained IIFE, server-safe `./build-script` export (no `'use client'`), `--emc-*` namespaced chrome vars with host-var fallback, configurable Tweaks/tokenMap/theme (`dc20343`, `7221b75`, `565d2d9`).
- **BSO Website** `chrome.ts` → thin consumer of `buildScript` (`1e5d54e`). Verified live :3131.
- **Stape** `layout.tsx` → injects `buildScriptInner` dev-only, old pill removed (`82b3f35`). Verified live :3850.
- Buried fixes found en route: package `'use client'` banner tainted buildScript (→ separate server-safe entry); Next/webpack can't resolve symlinked package outside root with spaces (→ `--install-links` real copy).
- Remaining: AI Skills Landing migration + delivery README.

## 2026-06-03 — Notion/Figma annotation model + ToV-lint (work landed in BSO Website)

Session in `edit-mode`; code landed in BSO Website `lib/proposal-workspace/chrome.ts` + `inbox-server.py` (cross-project — journaled here with SHAs, BSO Website journal untouched).

- **Closed BSO-563** — proposal-workspace Edit Mode converged to canonical (Tweaks + Visual/Copy), verified live by screenshot.
- **feat (`4ea7b97`):** replaced top-right list with per-comment marker+card model; each card has its own Send to Claude / Resolve. New **ToV** tab → posts to inbox `/tov-request`; CC session runs `tov-lint` and writes verdict back; browser polls `/tov-poll` and renders suggestions with apply-on-page. `inbox-server.py` now merges `/inbox` (per-comment send no longer clobbers) + ToV channel.
- **feat (`886ce76`):** faithful Notion model — amber inline highlight on commented text + comment-bubble markers; removed redundant counter chip (read as a duplicate button).
- **fix (`b9039cb`):** cssSel `:nth-of-type` counted all children instead of same-tag siblings → markers didn't resolve their anchor (saved but not drawn); + switched markers from `fixed`+viewport-clamp to **document-absolute** so they sit beside their block and scroll with the page (Notion/Figma). Fallback marker if anchor unresolved.
- **Open:** convergence to `buildScript(config)` canonical package (deferred); live verification of scroll-anchoring + ToV round-trip by Yegor.

---

## 2026-05-13 — wrap auto-batch (commit be1197d)

Auto-batch /wrap-all.

## 2026-05-12 — wrap auto-batch (commit 60bac5e)

Auto-batch /wrap-all.

---

## 2026-05-01 — wrap auto-batch (commit 4ab633f)

Auto-batch /wrap-all.

## 2026-04-30 — activeText persistence fix + template backport

- **fix(edit-mode):** preserve `activeText` display after Send to Claude — extended status to `'applied'` (commit ab9b378)
- **feat(template):** backport KOS-main pending/processed split into `save-draft-route.ts` template (BSO-228, commit 9e48f91)
- Activity log: edits to `src/context.tsx` on 2026-04-29 and 2026-04-30

## 2026-04-29 — thread + canvas features

- **fix(edit-mode):** clear threads on `saveAll()` success — symmetric with visualEdits (commit 5d6c7e5)
- **feat:** Space-hold to pan-through host app canvas (commit a2a62f4)
- **feat:** global Esc exits mode + no-rehydrate visualEdits on reload (commit 1c0f2a6)

## 2026-04-28 — BSO restyle + initial release

- **feat:** BSO-native restyle + edit/update workflow + localhost auto-on (commit c9f4498)
- Rewrite VisualEditPicker: overlay-based picking instead of capture listeners (commit 7bbd1d5)
- Fix visual edit: input text color, toolbar cursor, click passthrough (commit 2ae1d38)
- Initial release: edit-mode v0.1.0 (commit 2ae1d38)
- Initial commit + scaffold (commit 3f4a216)

### 2026-06-02 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-02-2017-8315-yegorkorobeynikov.md` had 8 user prompts, 31 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-03 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-02-2136-27310-yegorkorobeynikov.md` had 6 user prompts, 43 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-03 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-03-1007-11900-yegorkorobeynikov.md` had 1 user prompts, 6 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-03 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-03-1033-18796-yegorkorobeynikov.md` had 5 user prompts, 60 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-03 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-03-1033-18796-yegorkorobeynikov.md` had 5 user prompts, 60 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-03 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-03-1908-29788-yegorkorobeynikov.md` had 5 user prompts, 25 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-03 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-03-2120-45048-yegorkorobeynikov.md` had 2 user prompts, 20 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-03 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-03-2209-56052-yegorkorobeynikov.md` had 3 user prompts, 10 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-04 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-04-0116-33436-yegorkorobeynikov.md` had 3 user prompts, 14 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-04 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-04-0910-20885-yegorkorobeynikov.md` had 1 user prompts, 6 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-05 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-05-1351-42218-yegorkorobeynikov.md` had 7 user prompts, 57 tool calls, 0 errors. Full raw log has been deleted (retention policy).

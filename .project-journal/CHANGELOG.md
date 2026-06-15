# edit-mode — Changelog

Reverse-chronological. Each `##` is a session. Added retroactively from git history.

---

## 2026-06-10 — viewport clamp fix for pick dialog + thread card

**Package (`315590c`):** `clampToViewport(el)` added — fires in `requestAnimationFrame` after `renderBody()` fills the dialog with actual content. Before the fix, `onPick` used a hardcoded `300px` height estimate and `positionCard` used `180/220px`; for tall content the dialog's bottom edge fell below the viewport, hiding the Send button. Fix reads `getBoundingClientRect()` after render, shifts the element up by the overflow amount (min top: 8px). Applied to both the pick dialog (`dlg`) and the saved-thread card (`openCard`).

BSO Website `node_modules/@backspace-oddity/edit-mode/dist/build-script.js` updated by direct copy (npm install path did not propagate the new dist). Inbox-server restarted on :8002. Verified: `clampToViewport` present in `curl http://localhost:8002/edit-mode.js?slug=jetbrains`.

## 2026-06-09 — static-HTML live loader (/edit-mode.js) + JetBrains root-cause

**Package (`1b23b5b`):** `inbox-server.py` now serves `GET /edit-mode.js?slug=x` — builds the canonical panel live via `buildScriptInner(config)` from the installed package (config from `edit-mode.config.json` beside the server). Self-contained (shells to `node`); works whether the server is copied into a project or run from the package. Verified: `200 application/javascript`, full panel.

**Skill (`87cb698`, Second Brain):** `edit-mode-panel` SKILL.md documents the static-HTML live-loader as the canonical path for hand-served prototypes (one `<script src>` tag, no inlining); skill-bundled `inbox-server.py` synced.

**Root cause (JetBrains prototype, cross-project):** `jetbrains-campaign-intelligence` is a hand-authored `index.html` served by `python -m http.server` — no build step, so a prior session **inlined a frozen, near-empty-config snapshot** of the panel (looked "cut-down": only 2 Tweaks controls), and an agent spent ~30 min regex-patching it before reading the skill. Applied the loader there: removed the 44.5KB inlined block → one loader tag; lifted baked config into `edit-mode.config.json` (9 sizes / 3 LHs / 7 weights / 2 families); reinstalled package (dist sha matches canon); restarted inbox-server :8002. **In-browser verified:** 12 range sliders + 7 weight selects + 2 font pickers + Visual/Copy/ToV switcher + draggable dialog. (JetBrains repo left uncommitted — parallel session owns that tree.)

**Filed:** BSO-585 comment — static-HTML loader landed; AC#4 (AI Skills Landing) is the same class, now unblocked via this path.

## 2026-06-05 — font system, dialog UX, editable source, Monitor inbox root-cause

**Package (`29f1a2a`→`a7e4c3f`, all on `main`):**
- **Font family picker** (`29f1a2a`) — `queryLocalFonts()` populates datalists with all Font Book fonts; `tweaks.fontFamilies[]` config; per-row CSS-var control; text-input fallback when the API is blocked.
- **Configurable `weightOptions`** (`b0d83dd`) — data-driven override of the weight/style dropdown (Regular/Medium/Bold/Italic → any font's full range) via `JSON.stringify` into WOPTS.
- **Stacked font-family rows** (`9f5405d`) — label above, full-width input below; long font names no longer truncated.
- **Draggable comment dialog** (`83b78a8`) — 3-dot handle, drag anywhere, viewport-clamped.
- **Editable source text in Copy mode** (`a7e4c3f`) — SOURCE row is a `<textarea>`; blur saves to `sourceText` + updates the live element.

**Consumer (BSO Website, branch `yegor/bso-557-...`, `70695cd`):** `GT_EESTI_WEIGHTS` (16 variants) + `BSO_FONT_FAMILIES` in `chrome.ts`; `.step-title`/`.step-desc` added to `BSO_TOKEN_MAP`; 20 GT Eesti TTFs + 23 `@font-face` in `styles.ts`/`public/fonts/` so the dropdown maps to loaded faces.

**Skill canon (cross-project fix):** Monitor was watching the OLD `_edit-threads.json` while `inbox-server.py` writes `_edit-inbox.json` → 24 Urembo comments silently lost. SKILL.md now ships one canonical Monitor command watching `_edit-inbox.json` + `_tov-requests.json` with an explicit warning about the old file.

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

### 2026-06-05 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-05-1940-71272-yegorkorobeynikov.md` had 13 user prompts, 55 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-08 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-08-1809-90474-yegorkorobeynikov.md` had 1 user prompts, 1 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-09 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-09-0103-50205-yegorkorobeynikov.md` had 1 user prompts, 20 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-09 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-09-1847-39164-yegorkorobeynikov.md` had 2 user prompts, 8 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-09 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-09-2042-62050-yegorkorobeynikov.md` had 7 user prompts, 107 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-09 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-09-2246-86197-yegorkorobeynikov.md` had 1 user prompts, 26 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-10 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-10-0304-41191-yegorkorobeynikov.md` had 1 user prompts, 27 tool calls, 0 errors. Full raw log has been deleted (retention policy).

### 2026-06-10 — orphan session rolled up (PID no longer alive)

- Timeline file `2026-06-10-1749-14644-yegorkorobeynikov.md` had 3 user prompts, 31 tool calls, 0 errors. Full raw log has been deleted (retention policy).

# edit-mode — Current State

**Last updated:** 2026-06-05
**Status:** Active development — canonical Edit Mode being shaped via the live BSO Website surface
**Client/Context:** Internal — Backspace Oddity (web tooling)

## Latest session (2026-06-05) — font system, dialog UX, source-text edit, Monitor root-cause

Landed in package (all pushed to `main`, latest `a7e4c3f`):
- **Font family picker** (`29f1a2a`) — `queryLocalFonts()` loads all Font Book fonts into datalists; `tweaks.fontFamilies[]` config; each row drives a CSS var; falls back to text input if API blocked.
- **Configurable `weightOptions`** (`b0d83dd`) — override the default Regular/Medium/Bold/Italic with any font's full weight range (used for all 16 GT Eesti Pro variants); passes through to WOPTS in the IIFE via `JSON.stringify`.
- **Stacked font-family rows** (`9f5405d`) — label above, full-width input below, so long font names aren't truncated.
- **Draggable dialog** (`83b78a8`) — 3-dot handle, grab+drag anywhere, clamped to viewport.
- **Editable source text in Copy mode** (`a7e4c3f`) — SOURCE row is a `<textarea>`, blur saves to `sourceText` + updates live element.

Consumer-side (BSO Website, branch `yegor/bso-557-...`, latest `70695cd`):
- `chrome.ts` supplies `GT_EESTI_WEIGHTS` (16 variants) + `BSO_FONT_FAMILIES` + `.step-title`/`.step-desc` added to `BSO_TOKEN_MAP` (step headings now appear in Tweaks).
- `styles.ts` + `public/fonts/` — 20 new GT Eesti TTFs + 23 `@font-face` declarations so the weight dropdown maps to actually-loaded faces (showing an unloaded weight silently falls back).

**Monitor inbox root-cause (cross-project, fixed in SKILL.md):** Urembo session's Monitor watched `_edit-threads.json` while `inbox-server.py` writes `_edit-inbox.json` → 24 comments never surfaced. SKILL.md now ships one canonical Monitor command watching `_edit-inbox.json` + `_tov-requests.json`.

## What This Project Is

Inline text editing & visual edit picker for Next.js — component library for the Visual Edits Protocol. Goal: become the **single canonical Edit Mode** every project sources, instead of per-project forks.

## Current Status (2026-06-03)

The canonical Edit Mode currently lives, in its most complete form, in **BSO Website** at `lib/proposal-workspace/chrome.ts` (an IIFE injected dev-only via `WS_EDIT_MODE=1`). Today's session rebuilt its comment UX to the Notion/Figma model and added a ToV-lint tab. This repo's React components (`src/`) are now behind chrome.ts and lack the Tweaks panel — convergence is the open architectural step.

**Today's work (landed in BSO Website, branch `yegor/bso-557-...`):**
- `4ea7b97` — Notion-style annotations: per-comment Send/Resolve cards; ToV-check tab with CC writeback channel; `inbox-server.py` extended (merge `/inbox` + `/tov-request` `/tov-pending` `/tov-result` `/tov-poll` `/health`).
- `886ce76` — faithful Notion model: amber inline highlight on commented text + comment-bubble markers; dropped redundant counter chip.
- `b9039cb` — fixed cssSel `:nth-of-type` (same-tag index) + **document-absolute** marker positioning so comments sit beside their block and scroll with the page (was fixed+clamp → piled in corner).

**Closed today:** BSO-563 (converge proposal-workspace Edit Mode — Tweaks + Visual/Copy).

## Convergence (BSO-585) — IN PROGRESS, 3/5 AC + full test coverage + UX polish

Approved 2026-06-03 (after Yegor opened Stape and saw the OLD Edit Mode — root cause: every project had its own fork, nothing shared). This repo is now the single source.

- ✅ **AC#1 — canonical package.** `@backspace-oddity/edit-mode` exports `buildScript(config)` + `buildScriptInner(config)` from a **server-safe** `./build-script` entry (no `'use client'` banner). Panel chrome vars namespaced `--emc-*` with fallback to host vars; Tweaks/tokenMap/theme configurable. Built, smoke-tested.
- ✅ **AC#2 — BSO Website** migrated: `lib/proposal-workspace/chrome.ts` imports `buildScript`, only supplies BSO tokens + tokenMap. Verified live :3131 = 200, full panel.
- ✅ **AC#3 — Stape** migrated: `app/layout.tsx` injects `buildScriptInner({slug:'stape'})` (dev-only), old VisualEditPicker pill removed. Verified live :3850 = 200, canonical panel, old pill gone. `EditModeProvider` kept for legacy `EditableText` in HeroV2/WorkThatDisappearsV2.
- ⬜ **AC#4 — AI Skills Landing** — not yet migrated.
- ✅ **AC#5 — delivery docs** — skill `edit-mode-panel` rewritten (canonical package path, no panel.js, delivery notes incl. mandatory dev-server restart). README in package TBD.

**Delivery mechanism (decided + documented in skill):** `npm install <path> --install-links` (real copy, not symlink). After rebuild: `rm -rf node_modules/@backspace-oddity && npm install <path> --install-links` **+ restart dev server**. Running dev server doesn't pick up node_modules changes — both steps are inseparable.

**End-to-end coverage (added 2026-06-04):**
- `npm run test:e2e` — 23/23: package exports, full panel markup, server/React isolation, inbox merge, ToV round-trip, clean github-install.
- `npm run test:e2e:browser` — 11/11: real chromium, Edit button, element-pick→Save→pin+highlight in live DOM, card stays open after Save, collapses on outside-click, ToV browser→inbox→result→poll→page.

**UX improvement (2026-06-04):** card stays open after Save so user can hit "Send to Claude" immediately; collapses only on click outside the panel. In canon, propagated to all consumers via package.

## Follow-ups (separate)

- Retire `EditableText`/`useEditMode` from Stape `components/v2*` so the old `lib/edit-mode/` fork can be deleted entirely (currently coexists behind the provider).
- Background dev servers launched this session (:3131 BSO Website, :3850 Stape) may not persist — relaunch with each project's dev command + `WS_EDIT_MODE=1` (BSO Website) when needed.

## Key Files

- BSO Website `lib/proposal-workspace/chrome.ts` — current canonical Edit Mode (IIFE)
- BSO Website `inbox-server.py` — inbox + ToV channel on :8002
- `src/context.tsx`, `src/VisualEditPicker.tsx` — React components (pre-Tweaks, behind chrome.ts)

## How to Resume

Fresh CC session in this folder → `/resume`. The live surface to test/iterate is BSO Website `/w/<client>` with `WS_EDIT_MODE=1` + `inbox-server.py` on :8002.

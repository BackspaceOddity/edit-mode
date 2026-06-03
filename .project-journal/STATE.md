# edit-mode — Current State

**Last updated:** 2026-06-03
**Status:** Active development — canonical Edit Mode being shaped via the live BSO Website surface
**Client/Context:** Internal — Backspace Oddity (web tooling)

## What This Project Is

Inline text editing & visual edit picker for Next.js — component library for the Visual Edits Protocol. Goal: become the **single canonical Edit Mode** every project sources, instead of per-project forks.

## Current Status (2026-06-03)

The canonical Edit Mode currently lives, in its most complete form, in **BSO Website** at `lib/proposal-workspace/chrome.ts` (an IIFE injected dev-only via `WS_EDIT_MODE=1`). Today's session rebuilt its comment UX to the Notion/Figma model and added a ToV-lint tab. This repo's React components (`src/`) are now behind chrome.ts and lack the Tweaks panel — convergence is the open architectural step.

**Today's work (landed in BSO Website, branch `yegor/bso-557-...`):**
- `4ea7b97` — Notion-style annotations: per-comment Send/Resolve cards; ToV-check tab with CC writeback channel; `inbox-server.py` extended (merge `/inbox` + `/tov-request` `/tov-pending` `/tov-result` `/tov-poll` `/health`).
- `886ce76` — faithful Notion model: amber inline highlight on commented text + comment-bubble markers; dropped redundant counter chip.
- `b9039cb` — fixed cssSel `:nth-of-type` (same-tag index) + **document-absolute** marker positioning so comments sit beside their block and scroll with the page (was fixed+clamp → piled in corner).

**Closed today:** BSO-563 (converge proposal-workspace Edit Mode — Tweaks + Visual/Copy).

## Convergence (BSO-585) — IN PROGRESS, 3/5 AC verified live

Approved 2026-06-03 (after Yegor opened Stape and saw the OLD Edit Mode — root cause: every project had its own fork, nothing shared). This repo is now the single source.

- ✅ **AC#1 — canonical package.** `@backspace-oddity/edit-mode` exports `buildScript(config)` + `buildScriptInner(config)` from a **server-safe** `./build-script` entry (no `'use client'` banner). Panel chrome vars namespaced `--emc-*` with fallback to host vars; Tweaks/tokenMap/theme configurable. Built, smoke-tested.
- ✅ **AC#2 — BSO Website** migrated: `lib/proposal-workspace/chrome.ts` imports `buildScript`, only supplies BSO tokens + tokenMap. Verified live :3131 = 200, full panel.
- ✅ **AC#3 — Stape** migrated: `app/layout.tsx` injects `buildScriptInner({slug:'stape'})` (dev-only), old VisualEditPicker pill removed. Verified live :3850 = 200, canonical panel, old pill gone. `EditModeProvider` kept for legacy `EditableText` in HeroV2/WorkThatDisappearsV2.
- ⬜ **AC#4 — AI Skills Landing** — not yet migrated.
- ⬜ **AC#5 — delivery docs** — README: rebuild package → clean reinstall in consumer.

**Delivery mechanism (decided):** consumers install as a REAL COPY via `npm install <path> --install-links` (NOT symlink — Next/webpack can't resolve a symlinked package outside project root with spaces in the path). To refresh after a package rebuild: `rm -rf node_modules/@backspace-oddity && npm install <path> --install-links`.

## Follow-ups (separate)

- Retire `EditableText`/`useEditMode` from Stape `components/v2*` so the old `lib/edit-mode/` fork can be deleted entirely (currently coexists behind the provider).
- Background dev servers launched this session (:3131 BSO Website, :3850 Stape) may not persist — relaunch with each project's dev command + `WS_EDIT_MODE=1` (BSO Website) when needed.

## Key Files

- BSO Website `lib/proposal-workspace/chrome.ts` — current canonical Edit Mode (IIFE)
- BSO Website `inbox-server.py` — inbox + ToV channel on :8002
- `src/context.tsx`, `src/VisualEditPicker.tsx` — React components (pre-Tweaks, behind chrome.ts)

## How to Resume

Fresh CC session in this folder → `/resume`. The live surface to test/iterate is BSO Website `/w/<client>` with `WS_EDIT_MODE=1` + `inbox-server.py` on :8002.

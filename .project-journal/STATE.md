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

## Decision in flight

**IIFE-first convergence:** lift `chrome.ts`'s logic into this repo as `buildScript(config)` (configurable CSS-var tokens), so every project sources one implementation. Discussed + recommended, **not yet approved/started** (~3.5h). See `pending-discussions.md`.

## Next Steps

1. **User verifies live** (not yet confirmed): scroll-anchored markers stay beside their text; ToV browser→CC→browser round-trip renders verdict in the card.
2. Convergence to `buildScript(config)` in this repo (the canonical package).
3. After convergence: migrate AI Skills Landing + KOS to source it.

## Key Files

- BSO Website `lib/proposal-workspace/chrome.ts` — current canonical Edit Mode (IIFE)
- BSO Website `inbox-server.py` — inbox + ToV channel on :8002
- `src/context.tsx`, `src/VisualEditPicker.tsx` — React components (pre-Tweaks, behind chrome.ts)

## How to Resume

Fresh CC session in this folder → `/resume`. The live surface to test/iterate is BSO Website `/w/<client>` with `WS_EDIT_MODE=1` + `inbox-server.py` on :8002.

# edit-mode — Current State

**Last updated:** 2026-06-17
**Status:** Active development — canonical Edit Mode, single-source package
**Client/Context:** Internal — Backspace Oddity (web tooling)

## What This Project Is

`@backspace-oddity/edit-mode` — canonical Edit Mode panel as a single-source npm package. Every project (static HTML, Next.js route handler, React app) sources the same panel via `buildScript(config)` / `buildScriptInner(config)`. Provides Visual/Copy/Rewrite/ToV tabs, Tweaks panel, per-comment Send to Claude / Resolve, ToV-lint writeback, and a personal ToV learning loop (Rewrite → diff → pattern candidates → morning digest approval).

## Current Status

**Package on `main` (`12da290`):** Fully functional. Two Rewrite mode fixes applied this session:
- `2c3d220` — marker persisted after Send in Rewrite mode: thread deletion + marker cleanup were in an `else` branch, so they didn't run when Rewrite learning was triggered. Moved to always run after `startLearn()`.
- `12da290` — switching from Rewrite to Visual collapsed page layout: `el.textContent = rwOrig` on a container with child elements destroys markup. Added `rwOrigHtml` (saves `innerHTML` on contenteditable start), `endRewrite(restore)` now uses `el.innerHTML = rwOrigHtml`.

**Convergence (BSO-585) — 4/5 AC:**
- ✅ AC#1 — canonical `buildScript(config)` package, server-safe `./build-script` entry
- ✅ AC#2 — BSO Website migrated (`chrome.ts`)
- ✅ AC#3 — Stape migrated (`app/layout.tsx`)
- ⬜ AC#4 — AI Skills Landing — not yet migrated (now unblocked via static-HTML live loader)
- ✅ AC#5 — `edit-mode-panel` SKILL.md rewritten, canonical paths documented

**Tests:** `test:e2e` 35/35 (includes Rewrite/ToV round-trips), `test:e2e:browser` 11/11

**Rewrite mode + ToV learning loop (BSO-613):** Live. Rewrite tab → inline contenteditable → on Send: saves verbatim to `Second Brain/vault/tov-corpus/`, extracts candidate patterns via `tov-learn` (diff mode), queues in `DIGEST-STATE.json → pending_tov_patterns[]` for morning digest approval. Immediate feedback rendered in card ("Learned · saved to corpus").

**Static-HTML live loader (`1b23b5b`):** `inbox-server.py` serves `GET /edit-mode.js?slug=x` — builds canonical panel live from installed package. Static prototypes use one `<script src>` tag; no inlining, no drift.

**Tweaks architecture (confirmed 2026-06-17):** Tweaks sets CSS variables only on `document.documentElement` (`:root`). One slider → one token → all elements using that token move together. `tokenMap` / `tokenForEl` is for UX context only (maps a clicked element to its token name for display) — NOT for per-element override. Per-element control requires a visual comment (sends a specific request to Claude with element selector). This is by design — the token model is for systematic design exploration.

## Key Files

- `src/buildScript.ts` — IIFE generator; all panel logic lives here
- `server/inbox-server.py` — inbox + ToV + Rewrite-learn + `/edit-mode.js` live loader
- `test/e2e.mjs` — 35 string assertions + 3 server round-trip tests
- `edit-mode.config.json` — project-level Tweaks/tokenMap config for `inbox-server.py` live loader
- `.project-journal/CHANGELOG.md` — session history

## Open Issues

1. **AC#4 (BSO-585):** AI Skills Landing still needs live-loader migration (same class as JetBrains — static HTML). Unblocked.
2. **Stape cleanup:** `EditableText`/`useEditMode` still exist behind `EditModeProvider`; can be deleted once Stape fully cuts over to the package.
3. **JetBrains Engagement Workshop bug stream:** Yegor working actively with the page — more fixes may come via this session.

## Next Steps

1. Migrate AI Skills Landing to live loader (BSO-585 AC#4) — one `<script src>` tag + `edit-mode.config.json`
2. Continue JetBrains Engagement Workshop bug stream as Yegor reports more issues
3. `npm run build` → `cp dist/build-script.js node_modules/.../dist/build-script.js` → restart inbox-server after any `src/` change

## How to Resume

```
/resume
```

Live test surface: http://127.0.0.1:8080/index.html (JetBrains prototype, `python -m http.server 8080` in that project). Inbox server must be running on :8002 (`python3 inbox-server.py 8002` from BSO Website or from `server/` here). Both Rewrite mode fixes are live on `main`.

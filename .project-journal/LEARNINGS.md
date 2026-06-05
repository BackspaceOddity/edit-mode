# edit-mode — Learnings

Tagged log of errors, discoveries, and wins from this project. Each entry:

```
[YYYY-MM-DD] [LEARN|ERROR|WIN] [LOCAL|CROSS-PROJECT]: What happened → Why → What to do differently
```

- `[LOCAL]` — only relevant to this project
- `[CROSS-PROJECT]` — should be harvested to Second Brain graph; when unsure, prefer `[CROSS-PROJECT]`

`knowledge-harvest` skill scans this file at session end; `[CROSS-PROJECT]` entries get promoted to `nodes/` in the Second Brain.

---

- [2026-06-03] [ERROR] [CROSS-PROJECT]: Given a concrete reference UI (Notion comments) I shipped generic approximations twice — a counter chip that read as a duplicate button, then markers piled fixed in the corner — and got pushback each time → Root: didn't decompose the reference's defining mechanics before coding → When handed a reference, enumerate its 3-5 defining traits (here: inline text highlight + margin marker aligned to the text + marker scrolls with the document) and verify each in the build. Reinforces [[literal-reference-clone-protocol]].
- [2026-06-03] [ERROR] [CROSS-PROJECT]: Scroll-anchored annotation overlays positioned `position:fixed` + viewport-clamp pile up in the corner and detach from their text → Anchored comments (Notion/Figma model) must use document-absolute coords (`top = rect.top + pageYOffset`) so they travel with the content. Fixed+clamp is the wrong primitive for anchored annotations.
- [2026-06-03] [ERROR] [LOCAL]: Rewrote `cssSel` with `:nth-of-type(N)` computing N as index among ALL children instead of same-tag siblings → selector never resolved → markers silently not drawn though the comment was saved (looked like "Save does nothing") → `:nth-of-type` counts same-tag siblings; and always render a fallback marker when the anchor can't be resolved, so a comment is never invisible.
- [2026-06-03] [LEARN] [LOCAL]: Two chrome.ts fixes sat uncommitted on disk after `git commit -q` in an `&&` chain appeared to succeed (Next served them, so they looked done). Verify commits with `git rev-parse HEAD` / `git status`, not the absence of an error line.
- [2026-06-04] [ERROR] [CROSS-PROJECT]: `npm install` (reinstall of a local package) updates the copy in node_modules but does NOT cause a running Next/webpack dev server to recompile. The server holds its compiled bundle in memory; the change appears silently absent. Root fix: reinstall + restart dev server are always inseparable steps. Document both in the skill/README, never just one.
- [2026-06-04] [LEARN] [LOCAL]: Playwright `isVisible()` / `innerText()` can return false/empty for a fixed-position element that is technically rendered but clipped by the viewport or outside the accessible DOM tree. Use `page.evaluate(() => el.style.display + el.offsetWidth + el.innerHTML)` for reliable in-DOM checks. `innerText` especially misses content not in the visible layout flow.
- [2026-06-04] [WIN] [CROSS-PROJECT]: `'use client'` banner in tsup config taints the entire bundle, making it unusable from server contexts (Next route handlers). Fix: separate tsup entry without banner for server-safe exports (`./build-script`). This is the pattern for any mixed React/server-side package.
- [2026-06-05] [LEARN] [LOCAL]: When user says "подтяни шрифты" in the context of a Tweaks panel showing Regular/Medium/Bold/Italic — they mean ALL WEIGHT VARIANTS of the brand font (UltraLight→UltraBold), NOT a font-family picker for system fonts. The words "шрифты" and "начертания" are contextually different. Disambiguate before building: "все начертания одного шрифта" vs "все шрифты из Font Book".
- [2026-06-05] [LEARN] [LOCAL]: Each consumer of `@backspace-oddity/edit-mode` (playground, BSO Website, Stape) has its own TWEAKS config object. A feature added to `buildScript` config (e.g. `weightOptions`, `fontFamilies`) is only visible in a specific consumer after: (1) rebuild package, (2) reinstall in consumer, (3) add the new field to THAT consumer's config. All three steps are required — the package change alone does nothing visible.
- [2026-06-05] [WIN] [LOCAL]: `weightOptions: Array<[string, string]>` pattern — injecting custom weight/style options list into WOPTS in the IIFE via `JSON.stringify(weightOptions)` makes the dropdown fully data-driven without touching the panel logic. Reusable for any fixed-option override in the Tweaks panel.
- [2026-06-03] [WIN] [CROSS-PROJECT]: ToV-lint-via-CC-writeback is a clean pattern: browser → inbox `/tov-request` → CC watcher picks up → runs `tov-lint` → POSTs `/tov-result` → browser polls `/tov-poll` → verdict renders in the annotation. No API key in the browser; uses the CC session's own Claude. Reusable for any "ask Claude about this on-page text" affordance.

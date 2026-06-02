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
- [2026-06-03] [WIN] [CROSS-PROJECT]: ToV-lint-via-CC-writeback is a clean pattern: browser → inbox `/tov-request` → CC watcher picks up → runs `tov-lint` → POSTs `/tov-result` → browser polls `/tov-poll` → verdict renders in the annotation. No API key in the browser; uses the CC session's own Claude. Reusable for any "ask Claude about this on-page text" affordance.

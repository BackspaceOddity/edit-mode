# edit-mode — Changelog

Reverse-chronological. Each `##` is a session. Added retroactively from git history.

---

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

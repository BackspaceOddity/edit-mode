# edit-mode — Changelog

Reverse-chronological. Each `##` is a session. Added retroactively from git history.

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

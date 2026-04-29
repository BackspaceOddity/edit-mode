# edit-mode — project rules

**Project context:** Inline text editing & visual edit picker for Next.js — Notion-style variants + Lovable-style visual prompts. Component library for visual-edits-protocol implementations.
**Scaffolded:** 2026-04-28 via `project-scaffold` skill.

## MANDATORY session-start protocol

Read in order:
1. `README.md`
2. `.project-journal/STATE.md`
3. `.project-journal/CROSS-REFERENCES.md` — cross-project lessons received from siblings
4. `docs/INTEGRATION-STRATEGY.md` — what to reuse and what to harvest back
5. `docs/ROADMAP.md` — current step scope
6. Relevant skill SKILL.md files (if this project uses a specific skill)

## Cross-project discipline (per global CLAUDE.md)

- Never implement a pattern that already exists in a sibling project or shared skill. Reuse or explicitly document divergence in `docs/INTEGRATION-STRATEGY.md`.
- Every `LEARNINGS.md` entry must be tagged `[LOCAL]` or `[CROSS-PROJECT]`. When unsure → `[CROSS-PROJECT]`.
- Cross-project learnings get promoted to Second Brain graph AND cross-referenced in sibling projects' `.project-journal/CROSS-REFERENCES.md` via the `knowledge-harvest` skill.

## Sister projects

- `bso-canvas` — sibling project (see workspace)
- `Knowledge-OS-Product` — sibling project (see workspace)

## Canonical sources (Notion > local)

If this project publishes content to Notion or shares positioning/brand docs between Git and Notion, fill in this table and treat Notion as authoritative. Local `context/*.md` or `docs/*.md` copies of Notion pages are ephemeral staging, stale by default.

| Topic | Canonical (Notion URL / internal path) | Local staging | Rule |
|---|---|---|---|
| _e.g. Project brief_ | _Notion page URL_ | `context/*-brief-v0.md` | **Fetch Notion first** before any copy generation. Don't rely on "I read this at session start". |
| _Tone of voice_ | `~/.claude/tov.md` | — | Re-read in full before every H1 / hero / tagline / client-facing sentence. |

Delete this section (or leave the header only) if the project has no external canonicals.

**Drift discipline:** if a local file's name contains a version tag that lags Notion (e.g. `*-v0.md` while Notion is on v1), treat the local as a snapshot — fetch Notion. If Notion is unreachable, say so explicitly: "working from local copy as of <commit-hash>, Notion may have diverged".

## Copy-publish gates (enforced by hooks)

- **`pre-pushback-reread.py`** (UserPromptSubmit) — on user pushback phrases, blocks new-draft generation until canonical sources are re-read and diffed.
- **`require-tov-lint-on-copy.py`** (PreToolUse) — blocks Write/Edit to copy paths (`WEBSITE-CONTENT*`, `content/**`, `*brief*`, `*hero*`, `*landing*`, `*tagline*`, `*copy*`, `*positioning*`) or Notion writes with H1/hero content until the `tov-lint` skill is loaded.

These hooks are global (live in Second Brain `_system/hooks/`); this project inherits them. If a gate false-positives on internal files, extend `EXCLUDE_PATH_RES` in the hook, don't disable the gate.

## Language

Default conversation language: **Russian**. All user-facing responses (explanations, status updates, questions, end-of-turn summaries) по-русски. English только для: inline-кода, CLI-команд, технических identifier'ов (имена файлов, API, CVE, node ID), а также если юзер сам пишет по-английски в текущем turn'е. Commit-сообщения и содержимое `.md`-файлов — по правилам из `~/.claude/tov.md`.

## Autonomy (from global CLAUDE.md)

- Terminal / npm / build / test / curl — all via Bash tool. Never ask user "open terminal".
- User decides: product direction, scope, auth, external tokens, design.
- Everything else — act, verify, report in one line.

## UX for decisions

- ≥2 structural decisions → `AskUserQuestion` (tap through is faster than typing).

## Session timeline sync

Per-session timelines (user prompts + tool calls) are written automatically to
`.project-journal/sessions/<id>.md` by the session-timeline hooks. Default: local
only, gitignored, 7-day retention, then rolled up into CHANGELOG by nightly sweep.

**Team-sync opt-in:** if this project benefits from Anna and Yegor seeing each
other's raw timelines cross-machine, add this flag to the frontmatter of this file
(uncomment):

```
# team_sync_timelines: true
```

With flag enabled, timelines go to `.project-journal/team-sessions/` (tracked in
git, committed + pushed + pulled by team). Privacy trade-off: any truncated user
prompts and tool-result snippets become visible to whoever has repo access. The
writer redacts common secret patterns but is not bulletproof. Use for
collaboration-heavy projects where raw visibility is valuable; keep default
(commented out / absent) for solo exploratory work.

## Token / secret handling

- All secrets live in `~/.claude.json` env or project `.mcp.json` env — never in repo files.
- `.gitignore` blocks `.env`, `*.token`, `*.pat`, `.*-credentials`.
- If user pastes a secret in chat → save to config then acknowledge in one line. Do NOT echo back.

## Harvest discipline

- At every meaningful checkpoint — log `.project-journal/LEARNINGS.md` with `[LOCAL]` or `[CROSS-PROJECT]` tag.
- At session end — run `project-journal` + `knowledge-harvest`.
- After any `[CROSS-PROJECT]` learning — ensure sibling projects' `CROSS-REFERENCES.md` gets the one-line ref.

## Project-specific rules

_Add project-specific rules here as they emerge. Example categories:_

- _Architecture constraints_
- _Anti-patterns specific to this project_
- _Testing / deployment discipline_
- _External integrations' quirks_

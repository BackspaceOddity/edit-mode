# Integration Strategy — edit-mode ↔ sister projects

Two-way knowledge flow. What we reuse vs. what we harvest back.

## Principle

Don't think "isolated project". Patterns from siblings apply here; lessons learned here apply to siblings. Manage the flow explicitly.

## Forward transfer (sibling projects → this one)

Patterns we explicitly reuse. Don't re-derive.

### From sister projects

- `bso-canvas` — list specific files/skills to reuse here when patterns emerge
- `Knowledge-OS-Product` — list specific files/skills to reuse here when patterns emerge

_For each sibling, list specific patterns/files/skills to reuse. Example:_

- `../bso-figma-mcp/src/local.ts` — MCP server boilerplate shape
- `../some-sibling/src/core/client.ts` — auth pattern
- `~/.claude/skills/component-design/SKILL.md` — 3-layer DS methodology

### From Second Brain graph

_List specific nodes (type: methodology / decision / learning) that apply to this domain. Example:_

- [[3-layer-design-system-architecture]] — if this project builds visual artifacts
- [[decision-cross-project-knowledge-flow-default]] — protocol this file implements
- [[knowledge-architect]] heuristics — cross-domain patterns (SSoT, verify-the-verifier, enforcement-as-hook)

## Reverse learning (this project → shared knowledge)

Lessons discovered here that should promote back. Harvest at checkpoints below.

### Expected harvest targets

_Pre-seed 3-5 nodes we expect to write during this project's life:_

- `<domain>-<specific-pattern>` (learning / methodology / decision) — what it captures
- ...

### Candidate updates to shared skills

_When a pattern stabilizes, propose updating:_

- `~/.claude/skills/<skill-name>/SKILL.md` — section on <cross-platform / multi-approach>
- Global `~/.claude/CLAUDE.md` — if it's a universal rule

## Sync checkpoints

_When to stop implementing and merge back learnings:_

- After first working milestone — log `.project-journal/LEARNINGS.md` with real tags
- After first cross-project pattern emerges — harvest node, cross-ref siblings
- Before starting a new major area — re-read siblings' `CROSS-REFERENCES.md` for incoming hints
- Before shipping v1 — full harvest + propose skill / CLAUDE.md updates

## Hard rule

**Never implement a pattern that exists in a sibling project or shared skill without either:**
1. Reusing via import/reference, OR
2. Documenting explicit divergence here with reason.

Divergence without doc = accidental drift = how DS and skill libraries die.

## Revisit

_When to review this document:_

- At every sync checkpoint above
- When user notices pattern duplication (they'll flag it)
- At 3-month anniversary of the project

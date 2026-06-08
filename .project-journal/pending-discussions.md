# Pending discussions — edit-mode

## Discussed, not approved
_(picked up by next /resume — surface for re-decision or drop)_

- [2026-06-09] Productize edit-mode into a hosted SaaS "anyone can use" | context: Yegor floated turning edit-mode into a public product; in AskUserQuestion he chose **Hosted SaaS** + **we host the agent**, then paused it the same turn as premature. Analysis (see [[internal-tool-to-saas-leap]]): the tool is ~20% of the product; the hard 80% is the cloud agent runtime acting on the user's real repo (DOM→source mapping, sandboxing, multi-tenant auth, billing/metering, security). Riskiest unproven assumption = % of comments that yield a correct, mergeable PR with no human fixup. Recommended path when revived: **Phase 0 — one design partner, single-tenant, build only the agent-on-repo loop, measure that %** before any SaaS scaffold. Only durable wedge vs Stagewise/Onlook/Lovable = brand/ToV/design-system-aware editing. Paused — revive when there's a real client to anchor Phase 0.

_(cleared 2026-06-09: "IIFE-first convergence to canonical package" — DONE, shipped as `buildScript(config)`/`buildScriptInner` under BSO-585.)_

## Approved, awaiting Linear filing
_(filled only if /wrap detects approved-without-issue and fails to file — anomaly state)_

- (none)

---
_Last updated by /wrap on 2026-06-09. Cleared by /resume after surfacing._

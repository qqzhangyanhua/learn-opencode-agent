# Dangerous Areas

## High-Risk Areas

- `.env`: local secrets and environment values. Do not read aloud, commit, or modify unless explicitly requested.
- `Caddyfile` and `bun run start`: production static serving behavior.
- `.vitepress/config.mts`: navigation, sidebars, metadata, search, and route exposure.
- `.vitepress/theme/data/`: shared indexes for practice projects, learning paths, content metadata, animation lab, and entry experiences.
- `.vitepress/cache/` and `.vitepress/dist/`: generated/cache outputs; do not edit directly.
- `.agent/repo-facts.json`: regenerable harness scan output; do not treat as source.
- `.worktrees/`: local worktree copies; do not edit unless the task explicitly targets a worktree.
- `scripts/check-*.mjs`: release validation contracts.
- Permission and public API teaching examples detected by scan:
  - `.vitepress/theme/components/HttpPermissionGateDemo.vue`
  - `.vitepress/theme/components/PermissionFlow.vue`
  - `.vitepress/theme/data/animation-lab/tool-permission-gate.ts`
  - `docs/enterprise-agent/e06-permission-filtering-and-citation.md`
  - `docs/superpowers/specs/2026-04-13-security-boundary-protocol-simulator-design.md`
  - `docs/superpowers/plans/2026-04-13-security-boundary-protocol-simulator-implementation.md`

## Rules

- Do not edit generated files directly.
- Do not change deployment, infrastructure, permissions, secrets, public API examples, navigation contracts, or generated artifacts without explicit risk notes and focused verification.
- Do not drop or rename published content routes without updating `.vitepress/config.mts`, data indexes, and relevant checks.
- Do not change release or deployment scripts casually.
- Treat `.context/prefs/` as active workflow rules before modifying code.

## Mechanical Checks To Add

- Recommended: add a dedicated package script for `.vitepress/theme/components/*.test.ts` if those tests should be executable in CI.
- Recommended: add a lint script if style enforcement should be automated.
- Recommended: add a focused check for `converted-md/` if it is intended to be canonical imported content.

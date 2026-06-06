# Project Map

## Snapshot

- Generated from: `.agent/repo-facts.json`
- Last updated: 2026-06-06
- Scan mode: conservative repository scan, 2627 files

## Main Directories

- `.context/`: shared coding style, workflow rules, and session decision logs.
- `.vitepress/`: VitePress configuration, theme entry, global Vue components, data indexes, and site styles.
- `docs/`: VitePress content pages, including the homepage, OpenCode chapters, practice pages, intermediate topics, interview content, Claude Code, Hermes Agent, enterprise Agent, animation lab, reading map, release notes, and checklist docs.
- `practice/`: runnable TypeScript practice examples matching `docs/practice/pNN-*` pages.
- `scripts/`: validation scripts named `check-*.mjs`.
- `converted-md/`: converted source material and assets. Needs human confirmation before using as canonical content.
- `.worktrees/`: local git worktrees. Treat as non-source working copies, not canonical project content.
- `.claude/`, `.superpowers/`, `.trellis/`, `.planning/`, `.playwright-cli/`: local or workflow support directories. Do not treat as published site content unless a task explicitly targets them.

## Detected Project Files

- `package.json`: Bun/VitePress package scripts and dependencies.
- `bun.lockb`: Bun lockfile.
- `tsconfig.json` and `.vitepress/tsconfig.json`: TypeScript configuration.
- `.vitepress/config.mts`: VitePress site configuration, navigation, sidebars, search, and page metadata.
- `.env.example`: sample environment file.
- `.env`: local environment file; do not edit or disclose values.
- `Caddyfile`: production static hosting configuration for the built site.
- `README.md`: current project overview and local development notes.
- `AGENTS.md` and `CLAUDE.md`: agent-facing repository instructions.

## Important Flows

- Content routing: `docs/**/index.md` pages are exposed through `.vitepress/config.mts`, with homepage and discovery entry points in `docs/index.md`, `docs/discover/`, and `docs/learning-paths/`.
- Practice flow: `docs/practice/pNN-*/index.md`, `practice/pNN-*.ts`, and `.vitepress/theme/data/practice-projects.ts` must stay in sync.
- Theme and interactive demos: `.vitepress/theme/components/` contains Vue components; `.vitepress/theme/data/` contains content indexes and animation data used by pages.
- Release validation: `bun run build:strict` chains content, practice, learning path, navigation, chapter experience, discovery, learning progress, animation lab, practice motion, and build checks.
- Project workflow: `.context/prefs/workflow.md` requires reading existing code first, keeping changes small, validating, and logging qualifying decisions to `.context/current/branches/main/session.log` on the current branch.

## Generated Files

- `.vitepress/cache/`: Vite/VitePress dependency cache and generated files.
- `.vitepress/dist/`: static build output from `bun run build`.
- `.agent/repo-facts.json`: regenerable harness scan artifact.
- `node_modules/`: installed dependencies.
- `.worktrees/`: local worktree copies that can contain duplicate package files and docs.
- Needs human confirmation: `converted-md/` may be imported source material, but the scan does not prove whether it is generated-only or manually curated.

## Ownership / Risk

- High risk: `.env`, `Caddyfile`, deployment docs under `docs/13-deployment-infrastructure/`, generated/cache directories, `.vitepress/config.mts`, and site-wide data indexes under `.vitepress/theme/data/`.
- Medium risk: shared Vue components in `.vitepress/theme/components/`, validation scripts in `scripts/`, practice route/data wiring, and public API or permission teaching examples.
- Low risk: isolated docs copy edits that do not affect navigation, metadata, examples, or shared data.

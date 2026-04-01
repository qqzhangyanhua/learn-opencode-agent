# Repository Guidelines

## Project Structure & Module Organization

This repository is a VitePress-based book site. Main content lives in `docs/`, with chapter folders such as `docs/01-agent-basics/`, practice lessons in `docs/practice/`, and intermediate chapters in `docs/intermediate/`. Interactive source examples live in `practice/` as runnable TypeScript entry files like `p01-minimal-agent.ts`. Theme code and UI components live under `.vitepress/`, especially `.vitepress/theme/components/` and `.vitepress/theme/data/`. Validation and release checks are script-driven from `scripts/check-*.mjs`.

## Build, Test, and Development Commands

- `bun install`: install dependencies.
- `bun run dev`: start the local VitePress dev server.
- `bun run build`: build the static site.
- `bun run preview`: preview the built site locally.
- `bun run typecheck`: run TypeScript checks for `.vitepress/`.
- `bun run check:content`: validate document structure and required metadata.
- `bun run check:practice`: verify practice entry pages.
- `bun run build:strict`: run the full validation pipeline before release.

## Coding Style & Naming Conventions

Follow the existing style in nearby files: TypeScript and Vue use single quotes, no semicolons, and compact 2-space indentation. Keep Vue components in PascalCase, for example `ReActLoopDemo.vue`. Keep validation scripts named `check-*.mjs`. New theory chapters should follow `docs/NN-topic/index.md`; practice chapters should follow `docs/practice/pNN-topic/index.md`. Preserve frontmatter fields and existing Chinese copy style in docs pages.

## Testing Guidelines

This repo relies on validation scripts rather than a dedicated unit test framework. Run targeted checks while editing, then finish with `bun run typecheck` and `bun run build:strict` for broad verification. If you change navigation, metadata, practice routes, or learning-path content, run the matching `check:*` script before opening a PR.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commits with scopes, such as `feat(practice): add ReActLoopDemo component for P10` and `chore(scripts): remove obsolete migration and test files`. Use the same pattern: `feat(scope): ...`, `fix(scope): ...`, `chore(scope): ...`. PRs should include a short summary, affected routes or files, and screenshots or GIFs when changing `.vitepress/theme/` UI behavior. Call out any skipped checks explicitly.

## Release & Content Notes

Before merging content-heavy changes, review `docs/release-checklist.md`. Prefer small, traceable edits that keep homepage, reading map, practice entries, and chapter metadata in sync.

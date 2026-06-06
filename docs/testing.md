# Testing

## Verified Commands

- `bun run build:strict`: full release gate from `package.json`; it runs all configured `check:*` scripts and `bun run build`.
- `bun run typecheck`: TypeScript check for `.vitepress/`.
- `bun run check:content`: document structure and required metadata.
- `bun run check:practice`: practice entry pages and scripts.
- `bun run check:learning-metadata`: learning content metadata.
- `bun run check:learning-paths`: learning path configuration.
- `bun run check:homepage-entry`: homepage entry checks.
- `bun run check:navigation-entry`: navigation entry checks.
- `bun run check:entry-context`: entry context checks.
- `bun run check:chapter-experience`: chapter experience structure and components.
- `bun run check:practice-course-experience`: practice course experience checks.
- `bun run check:discovery-experience`: discovery center checks.
- `bun run check:learning-progress`: learning progress checks.
- `bun run check:animation-lab`: animation lab data and route checks.
- `bun run check:practice-motion`: practice motion governance checks.
- `bun run build`: VitePress static build.

## Candidate Commands

- `bun run dev`: starts the local VitePress dev server.
- `bun run preview`: previews the built site.
- `bun run start`: serves the static site with Caddy using `/Caddyfile`.
- Not configured: no `lint` package script detected.
- Not configured: no dedicated unit test package script detected.

## Test Locations

- `scripts/check-*.mjs`: content and release validation scripts.
- `.vitepress/theme/components/*.test.ts`: detected scenario tests, but no package script currently wires a dedicated test runner.
- `docs/intermediate/examples/25-rag-failure-patterns/requirements.txt`: Python example dependency file, not a root test command.

## Standard Check

Run:

```sh
./scripts/check.sh
```

## Notes

- Do not claim checks passed unless they were run in this workspace.
- For narrow content edits, run the closest `bun run check:*` first, then finish with `./scripts/check.sh` before release or handoff.
- `build:strict` is a coupled gate; fix the first failing script, rerun that targeted check, then rerun the full gate.

# Debugging

## Start Here

- Check `docs/testing.md` for verified commands.
- For content or route failures, run the matching `bun run check:*` script before running the full gate.
- For theme TypeScript or component issues, run `bun run typecheck`.
- For release confidence, run `./scripts/check.sh`.

## Local Logs

- Not configured: no dedicated application log directory detected.
- VitePress dev and build errors print to the terminal.
- Caddy logs, if using `bun run start`, are emitted by the local Caddy process.

## Common Failures

- `build:strict` failing early: inspect the first failing `check:*` script and fix that contract before rerunning the whole chain.
- Practice content mismatch: keep `docs/practice/pNN-*/index.md`, `practice/pNN-*.ts`, and `.vitepress/theme/data/practice-projects.ts` aligned.
- Navigation or entry mismatch: check `.vitepress/config.mts`, `docs/index.md`, `docs/discover/`, and `.vitepress/theme/data/` together.
- Generated cache noise: ignore `.vitepress/cache/`, `.vitepress/dist/`, `node_modules/`, `.agent/`, and `.worktrees/`.

## Useful Commands

```sh
bun run check:content
bun run check:practice
bun run typecheck
bun run build:strict
./scripts/check.sh
```

## Candidate Debug Commands

```sh
bun run dev
bun run preview
```

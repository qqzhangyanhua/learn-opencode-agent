# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A VitePress-based e-book: **从零构建 AI Coding Agent — OpenCode 源码剖析与实战** (Building AI Coding Agent from Scratch — OpenCode Source Code Analysis and Practice). Documents OpenCode architecture across 16 chapters plus auxiliary pages.

## Commands

Run from repository root:

```bash
bun dev        # start dev server (default port 5173)
bun build      # build static site to .vitepress/dist
bun preview    # preview built site
bun start      # serve with Caddy on port 3000
```

## Project Structure

```
.
├── .vitepress/
│   ├── config.mts              # VitePress configuration
│   ├── theme/
│   │   ├── index.ts            # Theme entry, registers global components
│   │   ├── components/         # Vue components (ReActLoop, StreamingDemo, etc.)
│   │   └── custom.css          # Custom styles
│   └── dist/                   # Build output (gitignored)
├── docs/                       # Content root (srcDir in config)
│   ├── index.md                # Homepage (layout: home)
│   ├── 00-what-is-ai-agent/index.md
│   ├── 01-agent-basics/index.md
│   ├── ...
│   ├── 15-advanced-topics/index.md
│   ├── reading-map.md          # Reading guide
│   ├── glossary.md             # Terminology
│   ├── version-notes.md        # Version history
│   └── release-checklist.md    # Pre-release checklist
├── add-frontmatter.ts          # Utility: add frontmatter to chapters
├── remove-duplicate-titles.ts  # Utility: remove duplicate H1s
└── package.json
```

## Content Conventions

- **Frontmatter required**: Every chapter must have `title` and `description` in YAML frontmatter
- **No duplicate H1**: VitePress renders title from frontmatter; don't add `# Title` in content
- **Chapter naming**: `docs/NN-slug/index.md` format (00-15)
- **Auxiliary pages**: Direct under `docs/` (no subdirectory)

## VitePress Configuration

- **srcDir**: `docs` — all content paths relative to `docs/`
- **Sidebar**: Manually defined in `.vitepress/config.mts` (not auto-generated)
- **Custom components**: Registered in `.vitepress/theme/index.ts`, usable in any markdown file
- **Mermaid support**: Enabled via `vitepress-plugin-mermaid`

## Utility Scripts

Two TypeScript utilities at root:

- `add-frontmatter.ts` — Prepends frontmatter to chapter files
- `remove-duplicate-titles.ts` — Strips H1 duplicating frontmatter title

**Note**: Both scripts hardcode chapter list and paths. Update manually if adding/removing chapters.

## Development Notes

- Uses **bun** as package manager (not npm/pnpm)
- TypeScript config at root (`tsconfig.json`) covers `.vitepress/**` and `docs/**`
- Build output: `.vitepress/dist` (served by Caddy in production via `Caddyfile`)
- Local search enabled (no external search service)

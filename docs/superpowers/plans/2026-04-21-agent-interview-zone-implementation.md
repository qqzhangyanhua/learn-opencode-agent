# Agent 面试题专区 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `面试题专区` docs module with top-level nav, dedicated sidebar, one overview page, and seven category pages.

**Architecture:** Extend the VitePress config with one isolated `/interview/` section and keep all content as Markdown pages under `docs/interview/`. Reuse the existing validation pattern by teaching `check-navigation-entry` to assert the new nav/sidebar entry before wiring the docs pages.

**Tech Stack:** VitePress, Markdown, TypeScript config, Node-based validation scripts

---

### Task 1: Add a failing navigation check for the new module

**Files:**
- Modify: `scripts/check-navigation-entry.mjs`

- [ ] **Step 1: Write the failing assertions**

Add checks for:
- top nav text `面试题专区`
- root sidebar link `/interview/`
- interview section sidebar link `/interview/fundamentals/`

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/check-navigation-entry.mjs`
Expected: FAIL because the config does not contain the new interview entries yet.

### Task 2: Wire the new interview module into site config

**Files:**
- Modify: `.vitepress/config.mts`

- [ ] **Step 1: Add nav entry**

Insert a new top-level nav item:

```ts
{ text: '面试题专区', link: '/interview/', activeMatch: '/interview/' }
```

- [ ] **Step 2: Add sidebar section**

Add a dedicated `/interview/` sidebar with:
- return home
- interview overview
- seven category links

- [ ] **Step 3: Add root sidebar shortcut**

Add `/interview/` to the root sidebar shortcuts so the module is reachable outside top nav.

### Task 3: Create the overview page

**Files:**
- Create: `docs/interview/index.md`

- [ ] **Step 1: Add required learning frontmatter**

Use valid `support` metadata so `check:learning-metadata` passes.

- [ ] **Step 2: Write the overview content**

Include:
- what the zone is for
- seven category links
- what each category covers
- who it is suitable for

### Task 4: Create the seven category pages

**Files:**
- Create: `docs/interview/fundamentals/index.md`
- Create: `docs/interview/tools/index.md`
- Create: `docs/interview/memory/index.md`
- Create: `docs/interview/planning/index.md`
- Create: `docs/interview/rag/index.md`
- Create: `docs/interview/multi-agent/index.md`
- Create: `docs/interview/engineering/index.md`

- [ ] **Step 1: Add valid frontmatter for each page**

Each page must include the required learning metadata fields.

- [ ] **Step 2: Fill the first-pass content**

For each category, write:
- why this topic is common in interviews
- 5 questions
- `题目 / 回答思路 / 追问方向`
- linked reading suggestions back into the book

### Task 5: Verify the end-to-end result

**Files:**
- Modify: `scripts/check-navigation-entry.mjs`
- Modify: `.vitepress/config.mts`
- Create: `docs/interview/**`

- [ ] **Step 1: Run navigation check**

Run: `node scripts/check-navigation-entry.mjs`
Expected: PASS

- [ ] **Step 2: Run metadata check**

Run: `node scripts/check-learning-metadata.mjs`
Expected: PASS

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Run full build**

Run: `bun run build`
Expected: PASS

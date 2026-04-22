# Interview Reading Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce visual overload in the interview category pages by collapsing every `深答版` section behind a consistent expand control while keeping `题目`、`面试官想听什么`、`短答版`、`追问方向` directly visible.

**Architecture:** Keep the current Markdown-first information architecture intact and only change the per-question rendering pattern inside the seven category pages under `docs/interview/`. Prefer the built-in VitePress/Markdown `details` container first, then add minimal CSS only if preview shows the default folding block is too visually noisy or too cramped.

**Tech Stack:** VitePress, Markdown, existing theme CSS, repository validation scripts

---

### Task 1: Prove the folding pattern on one category page

**Files:**
- Modify: `docs/interview/fundamentals/index.md`

- [ ] **Step 1: Record the baseline shape**

Run:

```bash
rg -c -- "- 深答版：" docs/interview/fundamentals/index.md
```

Expected: `12`

- [ ] **Step 2: Replace each deep-answer bullet with a uniform fold block**

For all 12 questions in `docs/interview/fundamentals/index.md`, convert:

```md
- 深答版：这里是长段说明
```

into:

```md
::: details 展开深答版
这里是长段说明
:::
```

Rules:
- Keep `题目`、`面试官想听什么`、`短答版`、`追问方向` exactly where they are
- Do not rewrite answer text
- Do not change heading levels or question ordering
- Use the exact title `展开深答版` for every fold block

- [ ] **Step 3: Verify the first page shape**

Run:

```bash
rg -c -- "- 深答版：" docs/interview/fundamentals/index.md
rg -c -- "::: details 展开深答版" docs/interview/fundamentals/index.md
```

Expected:
- first command prints `0`
- second command prints `12`

### Task 2: Roll the same pattern across the remaining interview category pages

**Files:**
- Modify: `docs/interview/tools/index.md`
- Modify: `docs/interview/memory/index.md`
- Modify: `docs/interview/planning/index.md`
- Modify: `docs/interview/rag/index.md`
- Modify: `docs/interview/multi-agent/index.md`
- Modify: `docs/interview/engineering/index.md`

- [ ] **Step 1: Apply the same conversion everywhere**

In each file above, replace every `- 深答版：...` bullet with the same `::: details 展开深答版` block used in Task 1.

Do not modify:
- `docs/interview/index.md`
- frontmatter
- any `题目` / `短答版` / `追问方向` text

- [ ] **Step 2: Verify the full rollout counts**

Run:

```bash
rg -c -- "- 深答版：" docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md
rg -c -- "::: details 展开深答版" docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md
```

Expected:
- every file reports `0` on the first command
- every file reports `12` on the second command

### Task 3: Add only the minimum styling needed for the fold blocks

**Files:**
- Modify: `.vitepress/theme/custom.css`

- [ ] **Step 1: Preview the converted page before touching CSS**

Run:

```bash
bun run dev
```

Open `/interview/fundamentals/` locally and inspect:
- whether the folded block is visually distinct enough from normal bullets
- whether `summary` spacing is cramped
- whether expanded content visually bleeds into neighboring bullets

- [ ] **Step 2: If and only if the default details block feels raw, add ultra-light styling**

Add a narrowly-scoped rule set in `.vitepress/theme/custom.css` targeting interview-page fold blocks only.

Allowed changes:
- add slightly clearer top/bottom spacing
- slightly increase `summary` weight
- add a weak divider or weak background for expanded content

Forbidden changes:
- card-like heavy backgrounds
- multi-column layout
- aggressive borders/shadows
- animation-heavy affordances

Implementation note:
- prefer a selector that only affects the interview pages or interview fold blocks
- keep the CSS small and additive

- [ ] **Step 3: Re-preview after CSS**

Refresh `/interview/fundamentals/` and confirm:
- the page still reads like a document page, not a UI card grid
- the fold control is obvious but not loud
- the default reading path is now `题目 -> 短答版 -> 追问方向`

### Task 4: Run repository validation for the docs change

**Files:**
- Modify: `docs/interview/fundamentals/index.md`
- Modify: `docs/interview/tools/index.md`
- Modify: `docs/interview/memory/index.md`
- Modify: `docs/interview/planning/index.md`
- Modify: `docs/interview/rag/index.md`
- Modify: `docs/interview/multi-agent/index.md`
- Modify: `docs/interview/engineering/index.md`
- Modify: `.vitepress/theme/custom.css` (only if Task 3 required it)

- [ ] **Step 1: Run content validation**

Run:

```bash
bun run check:content
```

Expected: PASS

- [ ] **Step 2: Run theme typecheck**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 3: Run strict build**

Run:

```bash
bun run build:strict
```

Expected: PASS

### Task 5: Commit the minimal interview readability change

**Files:**
- Modify: `docs/interview/fundamentals/index.md`
- Modify: `docs/interview/tools/index.md`
- Modify: `docs/interview/memory/index.md`
- Modify: `docs/interview/planning/index.md`
- Modify: `docs/interview/rag/index.md`
- Modify: `docs/interview/multi-agent/index.md`
- Modify: `docs/interview/engineering/index.md`
- Modify: `.vitepress/theme/custom.css` (only if touched)

- [ ] **Step 1: Review the final diff**

Run:

```bash
git diff -- docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md .vitepress/theme/custom.css
```

Expected:
- only the seven category pages changed for content
- CSS diff is either absent or very small
- no unrelated interview overview or navigation changes

- [ ] **Step 2: Commit**

Run:

```bash
git add docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md .vitepress/theme/custom.css
git commit -m "docs(interview): collapse deep answer sections"
```

Expected: one content-focused commit containing only the readability simplification

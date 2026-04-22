# Interview Details Light Styling Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a very light visual cleanup to the interview-category `深答版` fold controls without changing the Markdown structure or affecting `details` usage outside the seven interview category pages.

**Architecture:** Scope the styling with a page-level frontmatter class on the seven interview category pages, then add only the approved `details` and `summary` rules in `.vitepress/theme/custom.css`. Keep the implementation Markdown-first and additive: no new components, no global `details` overrides, and no card-like visuals.

**Tech Stack:** VitePress, Markdown frontmatter, existing theme CSS, repository validation scripts

---

### Task 1: Add a stable page-level scope for the seven interview category pages

**Files:**
- Modify: `docs/interview/fundamentals/index.md`
- Modify: `docs/interview/tools/index.md`
- Modify: `docs/interview/memory/index.md`
- Modify: `docs/interview/planning/index.md`
- Modify: `docs/interview/rag/index.md`
- Modify: `docs/interview/multi-agent/index.md`
- Modify: `docs/interview/engineering/index.md`

- [ ] **Step 1: Record the current frontmatter state**

Run:

```bash
rg -n "^pageClass:" docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md
```

Expected: no matches

- [ ] **Step 2: Add the approved page class to each interview category page**

In each file above, add this exact frontmatter field:

```yml
pageClass: interview-details-page
```

Rules:
- keep all existing frontmatter fields unchanged
- do not reorder content below the frontmatter
- do not touch `docs/interview/index.md`
- use the exact class name `interview-details-page`

- [ ] **Step 3: Verify the scope marker landed only where intended**

Run:

```bash
rg -n "^pageClass: interview-details-page$" docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md
rg -n "^pageClass:" docs/intermediate/25-rag-failure-patterns/index.md docs/intermediate/26-multi-agent-collaboration/index.md
```

Expected:
- first command prints exactly 7 matches
- second command prints no matches

### Task 2: Add only the approved interview-scoped `details` styling

**Files:**
- Modify: `.vitepress/theme/custom.css`

- [ ] **Step 1: Confirm there is no existing interview-specific `details` styling**

Run:

```bash
rg -n "interview-details-page|summary|details\\[open\\]" .vitepress/theme/custom.css
```

Expected: no existing `interview-details-page` rules; any unrelated global results must be reviewed before editing

- [ ] **Step 2: Append the exact approved rules under the interview page scope**

Add one small rule set to `.vitepress/theme/custom.css` using the page-level class as the only scope anchor.

Required rules:

```css
.interview-details-page .vp-doc details {
  margin-block: 0.25rem;
}

.interview-details-page .vp-doc summary {
  font-weight: 600;
  padding-block: 0.125rem;
  cursor: pointer;
}

.interview-details-page .vp-doc details[open] > summary + * {
  margin-top: 0.25rem;
}
```

Rules:
- do not add any `color`, `font-size`, `line-height`, `border`, `background`, `border-radius`, `transition`, `transform`, or `opacity`
- do not replace or hide the native disclosure marker
- do not add global `.VPDoc .vp-doc details` or `.VPDoc .vp-doc summary` selectors
- do not modify Markdown structure in any interview page

- [ ] **Step 3: Verify the CSS matches the approved scope and property set**

Run:

```bash
rg -n -A 6 -B 1 "interview-details-page \\.vp-doc details|interview-details-page \\.vp-doc summary|interview-details-page \\.vp-doc details\\[open\\] > summary \\+ \\*" .vitepress/theme/custom.css
```

Expected:
- one scoped `details` rule under `.interview-details-page .vp-doc`
- one scoped `summary` rule under `.interview-details-page .vp-doc`
- one scoped open-state descendant rule
- the printed block contains only these declarations:
  - `margin-block: 0.25rem`
  - `font-weight: 600`
  - `padding-block: 0.125rem`
  - `cursor: pointer`
  - `margin-top: 0.25rem`

### Task 3: Validate the change stays in scope and does not regress docs build

**Files:**
- Modify: `docs/interview/fundamentals/index.md`
- Modify: `docs/interview/tools/index.md`
- Modify: `docs/interview/memory/index.md`
- Modify: `docs/interview/planning/index.md`
- Modify: `docs/interview/rag/index.md`
- Modify: `docs/interview/multi-agent/index.md`
- Modify: `docs/interview/engineering/index.md`
- Modify: `.vitepress/theme/custom.css`

- [ ] **Step 1: Inspect the diff for scope correctness**

Run:

```bash
git diff -- docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md .vitepress/theme/custom.css
```

Expected:
- interview page diffs only add `pageClass: interview-details-page`
- CSS diff only adds the tiny scoped rule block
- no Markdown body changes

- [ ] **Step 2: Run the relevant repository checks**

Run:

```bash
bun run typecheck
bun run check:content
bun run build
bun run build:strict
```

Expected:
- if all commands pass, proceed
- if any command fails, stop and record the exact failure output before deciding whether the failure belongs to this change set

- [ ] **Step 3: Verify the final selector cannot hit non-interview pages**

Run:

```bash
rg -n "^\\.interview-details-page \\.vp-doc (details|summary)" .vitepress/theme/custom.css
rg -n "interview-details-page" .vitepress/dist/interview/fundamentals/index.html .vitepress/dist/interview/tools/index.html .vitepress/dist/interview/memory/index.html .vitepress/dist/interview/planning/index.html .vitepress/dist/interview/rag/index.html .vitepress/dist/interview/multi-agent/index.html .vitepress/dist/interview/engineering/index.html
rg -n "interview-details-page" .vitepress/dist/intermediate/25-rag-failure-patterns/index.html .vitepress/dist/intermediate/26-multi-agent-collaboration/index.html
```

Expected:
- first command shows only selectors anchored on `.interview-details-page`
- second command shows matches for the seven interview category pages
- third command shows no matches for the two non-interview pages

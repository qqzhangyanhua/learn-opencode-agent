# AI Agent 面试八股文接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `AI Agent 面试八股文` sub-section under `/interview/` with one overview page, nine module pages, and matching overview/sidebar entry points.

**Architecture:** Keep the existing `/interview/` seven-category flow intact and add a second reading path under `docs/interview/bagua/`. Guard the new entry with `check-navigation-entry`, wire the new sidebar group in `.vitepress/config.mts`, then migrate the converted markdown into focused VitePress pages with valid learning metadata.

**Tech Stack:** VitePress, Markdown, TypeScript config, Node-based validation scripts

---

## File Map

- `scripts/check-navigation-entry.mjs`
  - Extend navigation checks so the new bagua entry is enforced both in sidebar config and in `docs/interview/index.md`.
- `.vitepress/config.mts`
  - Add an `八股文` group inside the `/interview/` sidebar.
- `docs/interview/index.md`
  - Add the `AI Agent 面试八股文` entry block without disturbing the seven existing category links.
- `docs/interview/bagua/index.md`
  - New landing page for the bagua sub-section.
- `docs/interview/bagua/agent-basics/index.md`
  - Migrated content from `converted-md/sections-clean/03-agent-basics.md`.
- `docs/interview/bagua/core-frameworks/index.md`
  - Migrated content from `converted-md/sections-clean/04-core-frameworks.md`.
- `docs/interview/bagua/rag/index.md`
  - Migrated content from `converted-md/sections-clean/05-rag.md`.
- `docs/interview/bagua/tool-calling/index.md`
  - Migrated content from `converted-md/sections-clean/06-tool-calling.md`.
- `docs/interview/bagua/memory/index.md`
  - Migrated content from `converted-md/sections-clean/07-memory.md`.
- `docs/interview/bagua/multi-agent/index.md`
  - Migrated content from `converted-md/sections-clean/08-multi-agent.md`.
- `docs/interview/bagua/llm-fundamentals/index.md`
  - Migrated content from `converted-md/sections-clean/09-llm-fundamentals.md`.
- `docs/interview/bagua/engineering-practice/index.md`
  - Migrated content from `converted-md/sections-clean/10-engineering-practice.md`.
- `docs/interview/bagua/prompt-engineering/index.md`
  - Migrated content from `converted-md/sections-clean/11-prompt-engineering.md`.

## Content Rules

- Do not modify files under `converted-md/`; treat them as source material only.
- Keep the existing seven category pages unchanged.
- Use valid learning frontmatter on every new page by following the existing interview/support page contract.
- Do not add `pageClass: interview-details-page` to the new bagua pages.
- Clean only obvious conversion damage:
  - broken code fences
  - malformed lists
  - missing spacing between paragraphs
  - headings that would render incorrectly in VitePress

### Task 1: Add a failing navigation guard for the new bagua entry

**Files:**
- Modify: `scripts/check-navigation-entry.mjs`

- [ ] **Step 1: Teach the script to read the interview overview page**

Add:

```js
const interviewContent = readFileSync(path.join(rootDir, 'docs', 'interview', 'index.md'), 'utf8')
```

Use the new content string for page-level assertions.

- [ ] **Step 2: Add the new failing assertions**

Add checks for:
- `link: '/interview/bagua/'` in `.vitepress/config.mts`
- `/interview/bagua/` in `docs/interview/index.md`

Suggested issue texts:
- `面试题专区侧边栏缺少八股文入口`
- `面试题专区首页缺少八股文入口`

- [ ] **Step 3: Run the navigation check and verify it fails**

Run: `node scripts/check-navigation-entry.mjs`
Expected: FAIL with one or both new bagua-related issue messages because the site config and interview overview do not expose the new path yet.

### Task 2: Wire the new bagua entry into the interview navigation path

**Files:**
- Modify: `.vitepress/config.mts:520-533`
- Modify: `docs/interview/index.md`
- Modify: `scripts/check-navigation-entry.mjs`

- [ ] **Step 1: Add the `八股文` sidebar group**

Under the existing `/interview/` sidebar, append:

```ts
{
  text: '八股文',
  collapsed: false,
  items: [
    { text: 'AI Agent 面试八股文', link: '/interview/bagua/' },
    { text: '基础概念', link: '/interview/bagua/agent-basics/' },
    { text: '核心框架', link: '/interview/bagua/core-frameworks/' },
    { text: 'RAG 技术', link: '/interview/bagua/rag/' },
    { text: '工具调用', link: '/interview/bagua/tool-calling/' },
    { text: '记忆系统', link: '/interview/bagua/memory/' },
    { text: '多智能体', link: '/interview/bagua/multi-agent/' },
    { text: '大模型基础', link: '/interview/bagua/llm-fundamentals/' },
    { text: '工程化实践', link: '/interview/bagua/engineering-practice/' },
    { text: 'Prompt 工程', link: '/interview/bagua/prompt-engineering/' },
  ]
}
```

- [ ] **Step 2: Add the interview overview entry block**

Insert a new section in `docs/interview/index.md` after the seven-category overview and before the closing route links. Keep it short and additive:
- heading text around `AI Agent 面试八股文`
- one short explanation of what this second path is for
- a direct link to `/interview/bagua/`

- [ ] **Step 3: Run the navigation check and verify it passes**

Run: `node scripts/check-navigation-entry.mjs`
Expected: PASS with `check:navigation-entry 通过`

- [ ] **Step 4: Commit the green navigation wiring**

```bash
git add scripts/check-navigation-entry.mjs .vitepress/config.mts docs/interview/index.md
git commit -m "docs(interview): add bagua entry path"
```

### Task 3: Create the bagua landing page

**Files:**
- Create: `docs/interview/bagua/index.md`
- Reference: `converted-md/sections-clean/01-ai-agent-interview-guide-overview.md`
- Reference: `converted-md/sections-clean/02-ai-agent-bagua-index.md`
- Reference: `docs/interview/index.md`

- [ ] **Step 1: Add valid support frontmatter**

Follow the existing interview/support page contract and include at least:
- `title`
- `description`
- `contentType: support`
- `series: support`
- `contentId`
- `shortTitle`
- `summary`
- `difficulty`
- `estimatedTime`
- `learningGoals`
- `prerequisites`
- `recommendedNext`
- `practiceLinks`
- `searchTags`
- `navigationLabel`
- `entryMode`
- `roleDescription`

- [ ] **Step 2: Write the landing-page introduction**

Use the source material to explain:
- this is the system-reading path for `八股文`
- how it differs from the seven-category quick-review path
- who should read it
- how to use it without trying to read everything at once

- [ ] **Step 3: Add the module directory and reading suggestions**

Include:
- links to all nine module pages
- a recommended reading order for beginners and for experienced readers
- return links to `/interview/`, `/discover/`, `/practice/`, and `/intermediate/`

- [ ] **Step 4: Run metadata validation**

Run: `node scripts/check-learning-metadata.mjs`
Expected: PASS, confirming the new landing page frontmatter satisfies the learning metadata contract.

- [ ] **Step 5: Commit the landing page**

```bash
git add docs/interview/bagua/index.md
git commit -m "docs(interview): add bagua landing page"
```

### Task 4: Create the first five bagua module pages

**Files:**
- Create: `docs/interview/bagua/agent-basics/index.md`
- Create: `docs/interview/bagua/core-frameworks/index.md`
- Create: `docs/interview/bagua/rag/index.md`
- Create: `docs/interview/bagua/tool-calling/index.md`
- Create: `docs/interview/bagua/memory/index.md`
- Reference: `converted-md/sections-clean/03-agent-basics.md`
- Reference: `converted-md/sections-clean/04-core-frameworks.md`
- Reference: `converted-md/sections-clean/05-rag.md`
- Reference: `converted-md/sections-clean/06-tool-calling.md`
- Reference: `converted-md/sections-clean/07-memory.md`

- [ ] **Step 1: Create `agent-basics`**

Source: `converted-md/sections-clean/03-agent-basics.md`

Requirements:
- valid support-style frontmatter
- readable Markdown heading hierarchy
- code fences repaired if the converted source is malformed

- [ ] **Step 2: Create `core-frameworks`**

Source: `converted-md/sections-clean/04-core-frameworks.md`

Requirements:
- keep the original module scope
- normalize broken lists and code blocks
- keep the page long-form; do not convert it into the current interview Q&A page shape

- [ ] **Step 3: Create `rag`**

Source: `converted-md/sections-clean/05-rag.md`

Requirements:
- preserve the RAG module structure
- fix only rendering issues introduced by conversion

- [ ] **Step 4: Create `tool-calling`**

Source: `converted-md/sections-clean/06-tool-calling.md`

Requirements:
- preserve MCP / function-calling sections
- repair any malformed fenced code snippets

- [ ] **Step 5: Create `memory`**

Source: `converted-md/sections-clean/07-memory.md`

Requirements:
- preserve the module outline
- keep terminology consistent with the rest of the site

- [ ] **Step 6: Run content and metadata checks**

Run:
- `node scripts/check-content.mjs`
- `node scripts/check-learning-metadata.mjs`

Expected:
- `check:content 通过`
- `check:learning-metadata 通过`

- [ ] **Step 7: Commit the first module batch**

```bash
git add docs/interview/bagua/agent-basics/index.md docs/interview/bagua/core-frameworks/index.md docs/interview/bagua/rag/index.md docs/interview/bagua/tool-calling/index.md docs/interview/bagua/memory/index.md
git commit -m "docs(interview): add first bagua module set"
```

### Task 5: Create the remaining four bagua module pages

**Files:**
- Create: `docs/interview/bagua/multi-agent/index.md`
- Create: `docs/interview/bagua/llm-fundamentals/index.md`
- Create: `docs/interview/bagua/engineering-practice/index.md`
- Create: `docs/interview/bagua/prompt-engineering/index.md`
- Reference: `converted-md/sections-clean/08-multi-agent.md`
- Reference: `converted-md/sections-clean/09-llm-fundamentals.md`
- Reference: `converted-md/sections-clean/10-engineering-practice.md`
- Reference: `converted-md/sections-clean/11-prompt-engineering.md`

- [ ] **Step 1: Create `multi-agent`**

Source: `converted-md/sections-clean/08-multi-agent.md`

Requirements:
- preserve collaboration-pattern content
- repair only conversion artifacts

- [ ] **Step 2: Create `llm-fundamentals`**

Source: `converted-md/sections-clean/09-llm-fundamentals.md`

Requirements:
- keep the module focused on LLM basics
- avoid reformatting it into a different teaching style

- [ ] **Step 3: Create `engineering-practice`**

Source: `converted-md/sections-clean/10-engineering-practice.md`

Requirements:
- preserve the engineering module layout
- fix malformed code blocks or table formatting only as needed

- [ ] **Step 4: Create `prompt-engineering`**

Source: `converted-md/sections-clean/11-prompt-engineering.md`

Requirements:
- preserve prompt-specific sections
- ensure headings and lists render cleanly

- [ ] **Step 5: Run content and metadata checks**

Run:
- `node scripts/check-content.mjs`
- `node scripts/check-learning-metadata.mjs`

Expected:
- `check:content 通过`
- `check:learning-metadata 通过`

- [ ] **Step 6: Commit the second module batch**

```bash
git add docs/interview/bagua/multi-agent/index.md docs/interview/bagua/llm-fundamentals/index.md docs/interview/bagua/engineering-practice/index.md docs/interview/bagua/prompt-engineering/index.md
git commit -m "docs(interview): add remaining bagua modules"
```

### Task 6: Run final verification for the new interview reading path

**Files:**
- Modify: `scripts/check-navigation-entry.mjs`
- Modify: `.vitepress/config.mts`
- Modify: `docs/interview/index.md`
- Create: `docs/interview/bagua/**`

- [ ] **Step 1: Run the navigation check**

Run: `node scripts/check-navigation-entry.mjs`
Expected: PASS with `check:navigation-entry 通过`

- [ ] **Step 2: Run content validation**

Run: `node scripts/check-content.mjs`
Expected: PASS with `check:content 通过`

- [ ] **Step 3: Run metadata validation**

Run: `node scripts/check-learning-metadata.mjs`
Expected: PASS with `check:learning-metadata 通过`

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS with no TypeScript errors from `.vitepress/config.mts`

- [ ] **Step 5: Run the strict release pipeline**

Run: `bun run build:strict`
Expected: PASS, including all content, navigation, metadata, and build checks.

- [ ] **Step 6: Commit the verified integration**

```bash
git add scripts/check-navigation-entry.mjs .vitepress/config.mts docs/interview/index.md docs/interview/bagua
git commit -m "feat(interview): add bagua reading path"
```

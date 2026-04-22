# Agent 面试题专区扩容 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the seven existing interview category pages from 5 questions each to 12 high-frequency questions each while keeping the current single-page structure and overall navigation unchanged.

**Architecture:** Keep the existing `/interview/` information architecture intact and only deepen content inside each category page. Organize each category page as `高频题` plus `扩展题`, preserve the current `题目 / 面试官想听什么 / 短答版 / 深答版 / 追问方向` skeleton, and update the overview page only enough to reflect the expanded scope.

**Tech Stack:** VitePress, Markdown, existing interview content pages, Node-based navigation/content validation scripts

---

### Task 1: Lock the content contract for expanded category pages

**Files:**
- Modify: `docs/interview/fundamentals/index.md`
- Modify: `docs/interview/tools/index.md`
- Modify: `docs/interview/memory/index.md`
- Modify: `docs/interview/planning/index.md`
- Modify: `docs/interview/rag/index.md`
- Modify: `docs/interview/multi-agent/index.md`
- Modify: `docs/interview/engineering/index.md`
- Reference: `docs/superpowers/specs/2026-04-21-agent-interview-zone-expansion-design.md`

- [ ] **Step 1: Inspect the current heading pattern**

Run:

```bash
rg -n "^## |^### " docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md
```

Expected:
- each page currently has one `## 高频题`
- each page currently has `### 1` through `### 5`

- [ ] **Step 2: Define the invariant before editing**

For every category page, preserve:
- frontmatter block
- page intro
- `## 书内关联阅读`
- the existing first 5 questions unless a wording cleanup is required

Add:
- one new `## 扩展题` section
- `### 6` through `### 12`

- [ ] **Step 3: Record the target count**

Run after the contract is clear:

```bash
for f in docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md; do echo "FILE:$f"; rg -n "^### " "$f"; done
```

Expected before implementation:
- each file shows exactly 5 question headings

### Task 2: Expand the highest-pressure interview categories first

**Files:**
- Modify: `docs/interview/tools/index.md`
- Modify: `docs/interview/rag/index.md`
- Modify: `docs/interview/multi-agent/index.md`
- Modify: `docs/interview/engineering/index.md`

- [ ] **Step 1: Add `## 扩展题` to tools**

Append 7 new high-frequency questions to `docs/interview/tools/index.md` covering:
- schema quality
- tool exposure governance
- parallel vs serial tool calls
- idempotency and side effects
- tool result write-back pollution
- tool timeout budgeting
- tool fallback and degraded modes

- [ ] **Step 2: Verify tools reaches 12 questions**

Run:

```bash
rg -n "^### " docs/interview/tools/index.md
```

Expected:
- headings `### 1` through `### 12`

- [ ] **Step 3: Add `## 扩展题` to RAG**

Append 7 new high-frequency questions to `docs/interview/rag/index.md` covering:
- chunking trade-offs
- reranker value
- query rewrite boundaries
- citation consistency
- retrieval freshness
- offline vs online eval
- hallucination vs retrieval miss diagnosis

- [ ] **Step 4: Verify RAG reaches 12 questions**

Run:

```bash
rg -n "^### " docs/interview/rag/index.md
```

Expected:
- headings `### 1` through `### 12`

- [ ] **Step 5: Add `## 扩展题` to Multi-Agent**

Append 7 new high-frequency questions to `docs/interview/multi-agent/index.md` covering:
- arbitration
- shared state boundaries
- agent-to-agent task contracts
- parallelization proof
- reviewer agent boundaries
- failure containment
- when to collapse back to single-agent

- [ ] **Step 6: Verify Multi-Agent reaches 12 questions**

Run:

```bash
rg -n "^### " docs/interview/multi-agent/index.md
```

Expected:
- headings `### 1` through `### 12`

- [ ] **Step 7: Add `## 扩展题` to engineering**

Append 7 new high-frequency questions to `docs/interview/engineering/index.md` covering:
- release guardrails
- replay-based evaluation
- alert design
- auditability
- rollback design
- versioned rollout
- human handoff and recovery readiness

- [ ] **Step 8: Verify engineering reaches 12 questions**

Run:

```bash
rg -n "^### " docs/interview/engineering/index.md
```

Expected:
- headings `### 1` through `### 12`

### Task 3: Expand the foundational categories without repeating the same judgments

**Files:**
- Modify: `docs/interview/fundamentals/index.md`
- Modify: `docs/interview/memory/index.md`
- Modify: `docs/interview/planning/index.md`

- [ ] **Step 1: Add `## 扩展题` to fundamentals**

Append 7 new high-frequency questions to `docs/interview/fundamentals/index.md` covering:
- agent vs automation
- agent vs search/UI fixes
- “looks intelligent but is not an agent”
- where agent terminology is abused
- where not to use agent despite technical feasibility
- what minimal runtime still counts
- common interview misdefinitions

- [ ] **Step 2: Verify fundamentals reaches 12 questions**

Run:

```bash
rg -n "^### " docs/interview/fundamentals/index.md
```

Expected:
- headings `### 1` through `### 12`

- [ ] **Step 3: Add `## 扩展题` to memory**

Append 7 new high-frequency questions to `docs/interview/memory/index.md` covering:
- write policy
- forgetting and deletion
- memory ownership boundaries
- stale memory versioning
- memory confidence
- user-private vs shared memory
- cleanup of polluted memory

- [ ] **Step 4: Verify memory reaches 12 questions**

Run:

```bash
rg -n "^### " docs/interview/memory/index.md
```

Expected:
- headings `### 1` through `### 12`

- [ ] **Step 5: Add `## 扩展题` to planning**

Append 7 new high-frequency questions to `docs/interview/planning/index.md` covering:
- planning trigger heuristics
- over-planning
- re-planning checkpoints
- planning verification
- planning vs decomposition
- planning and parallel branches
- when planning should be skipped

- [ ] **Step 6: Verify planning reaches 12 questions**

Run:

```bash
rg -n "^### " docs/interview/planning/index.md
```

Expected:
- headings `### 1` through `### 12`

### Task 4: Update the overview page to match the expanded scope

**Files:**
- Modify: `docs/interview/index.md`

- [ ] **Step 1: Adjust summary copy**

Update the overview page copy so it reflects:
- the zone is now a fuller high-frequency question set
- the structure is still seven categories
- the overview remains a routing page, not a full index

- [ ] **Step 2: Avoid turning overview into a question catalog**

Keep:
- category descriptions
- suggested routes

Do not add:
- all 84 question titles
- per-page subindexes

- [ ] **Step 3: Verify overview still only links category pages**

Run:

```bash
rg -n "/interview/" docs/interview/index.md
```

Expected:
- links only point to existing category pages and the overview itself

### Task 5: Run structure, link, and quality checks

**Files:**
- Modify: `docs/interview/index.md`
- Modify: `docs/interview/fundamentals/index.md`
- Modify: `docs/interview/tools/index.md`
- Modify: `docs/interview/memory/index.md`
- Modify: `docs/interview/planning/index.md`
- Modify: `docs/interview/rag/index.md`
- Modify: `docs/interview/multi-agent/index.md`
- Modify: `docs/interview/engineering/index.md`

- [ ] **Step 1: Check all category pages reached 12 questions**

Run:

```bash
for f in docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md; do echo "FILE:$f"; rg -c "^### " "$f"; done
```

Expected:
- every file reports `12`

- [ ] **Step 2: Check interview links stay valid**

Run:

```bash
ruby -e 'routes = {}; Dir.glob("docs/**/*.md").each do |f| route = "/" + f.sub(/^docs\//, "").sub(/index\.md$/, "").sub(/\.md$/, ""); route = route.gsub(%r{//+}, "/"); routes[route] = true; end; bad = []; Dir.glob("docs/interview/**/*.md").each do |f| File.readlines(f).each_with_index do |line, i| line.scan(/\]\((\/[^)#]+)\)/).flatten.each do |route| next if route == "/"; normalized = route.end_with?("/") ? route : route; unless routes[normalized] || routes[normalized + "/"] || routes[normalized.sub(/\/$/, "")] then bad << [f, i + 1, route] end end end end; if bad.empty? then puts "interview links ok" else bad.each { |f, l, r| puts "#{f}:#{l}: #{r}" } end'
```

Expected:
- output `interview links ok`

- [ ] **Step 3: Run navigation validation**

Run:

```bash
bun run check:navigation-entry
```

Expected:
- `check:navigation-entry 通过`

- [ ] **Step 4: Run content validation and classify failures correctly**

Run:

```bash
bun run check:content
```

Expected:
- ideally PASS
- if it fails, it must not introduce new interview-zone TODO hits; only pre-existing repository TODO hits are acceptable and must be documented in handoff

- [ ] **Step 5: Review diff for duplicate or low-value questions**

Run:

```bash
git diff -- docs/interview/index.md docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md
```

Expected:
- each page clearly has new `### 6` through `### 12`
- no obvious same-question paraphrase loops
- overview changes remain minimal

### Task 6: Commit the expanded interview set

**Files:**
- Modify: `docs/interview/index.md`
- Modify: `docs/interview/fundamentals/index.md`
- Modify: `docs/interview/tools/index.md`
- Modify: `docs/interview/memory/index.md`
- Modify: `docs/interview/planning/index.md`
- Modify: `docs/interview/rag/index.md`
- Modify: `docs/interview/multi-agent/index.md`
- Modify: `docs/interview/engineering/index.md`

- [ ] **Step 1: Stage only the expansion changes**

Run:

```bash
git add docs/interview/index.md docs/interview/fundamentals/index.md docs/interview/tools/index.md docs/interview/memory/index.md docs/interview/planning/index.md docs/interview/rag/index.md docs/interview/multi-agent/index.md docs/interview/engineering/index.md
```

- [ ] **Step 2: Commit with a focused message**

Run:

```bash
git commit -m "docs(interview): expand category question sets"
```

Expected:
- one content-focused commit containing only the interview-zone expansion

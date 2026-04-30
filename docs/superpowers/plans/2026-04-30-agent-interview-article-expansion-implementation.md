# Agent Interview Article Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the interview column with five new Agent-engineering-focused questions while preserving the existing "题目 + 短答版 + 深答版（默认收缩）" reading pattern.

**Architecture:** Modify the existing category pages in `docs/interview/` directly instead of creating new standalone pages. Keep all additions within the current page rhythm so readers can continue scanning by category without learning a new navigation model.

**Tech Stack:** Markdown, VitePress content structure, repository content validation scripts

---

### Task 1: Extend Planning Interview Page

**Files:**
- Modify: `docs/interview/planning/index.md`
- Reference: `docs/superpowers/specs/2026-04-30-agent-interview-article-expansion-design.md`

- [ ] **Step 1: Add the question “Agent 任务的一步执行应该怎么设计？”**

Insert a new question block before `## 书内关联阅读` with these sections:

- `题目`
- `面试官想听什么`
- `短答版`
- `深答版`
- `追问方向`

The short answer must cover:

- 单步不是单次模型调用
- 一步至少包含输入、决策、动作、结果回填
- 步长过大和过小的代价

The deep answer must explain:

- 为什么一步执行要同时绑定工具调用和状态更新
- 怎么定义一步的可验收边界
- 面试收口句

- [ ] **Step 2: Add the question “如何把 Agent 的执行过程设计成可中断、可恢复、可重试？”**

Insert a second question block immediately after the previous one with the same structure.

The short answer must cover:

- 中断点设计
- 恢复点持久化
- 重试的层级与幂等性

The deep answer must explain:

- 为什么副作用工具调用不能裸重试
- 什么情况下做局部重试，什么情况下回退到任务级重试
- 为什么可恢复不等于把所有历史都塞回上下文

- [ ] **Step 3: Review the page for style consistency**

Check that:

- New headings follow the existing numbered interview pattern
- `短答版` remains compact
- Each deep answer uses `<details>` and a `summary`
- New wording matches the tone of existing pages

- [ ] **Step 4: Commit**

```bash
git add docs/interview/planning/index.md
git commit -m "feat(interview): expand planning interview topics"
```

### Task 2: Extend RAG Interview Page

**Files:**
- Modify: `docs/interview/rag/index.md`
- Reference: `docs/superpowers/specs/2026-04-30-agent-interview-article-expansion-design.md`

- [ ] **Step 1: Add the question “向量数据库的更新、删除、版本管理应该怎么做？”**

Insert a new question block before `## 书内关联阅读`.

The short answer must cover:

- 文档更新不是简单覆盖 embedding
- chunk、metadata、索引版本要一起治理
- 软删除、硬删除、增量更新、全量重建各有场景

The deep answer must explain:

- 为什么生产 RAG 的重点是生命周期治理而不是一次性入库
- 怎么避免新旧版本混答
- 为什么可回滚和可追溯很重要

- [ ] **Step 2: Review the page for category fit**

Check that the added content is clearly about RAG lifecycle engineering rather than generic vector database introduction.

- [ ] **Step 3: Commit**

```bash
git add docs/interview/rag/index.md
git commit -m "feat(interview): add vector database lifecycle question"
```

### Task 3: Extend Fundamentals Interview Page

**Files:**
- Modify: `docs/interview/fundamentals/index.md`
- Reference: `docs/superpowers/specs/2026-04-30-agent-interview-article-expansion-design.md`

- [ ] **Step 1: Add the question “LLM 到底擅长什么，不擅长什么？”**

Insert a new question block before `## 书内关联阅读`.

The short answer must cover:

- 擅长模式归纳、语言压缩、弱结构推断
- 不擅长稳定状态跟踪、强确定性执行、长期一致性维护
- 模型能力和系统能力必须拆开看

The deep answer must explain:

- 为什么“看起来会”和“稳定能做”不同
- 为什么 Agent 不能把系统可靠性寄托给模型本体
- 面试收口句

- [ ] **Step 2: Add the question “上下文窗口变长，为什么不等于 Agent 一定更强？”**

Insert a second block after the previous one.

The short answer must cover:

- 长上下文只是信息容量变大
- 不代表模型能稳定利用全部信息
- 检索、组织、摘要、分层记忆仍然重要

The deep answer must explain:

- 注意力稀释与噪声污染
- 成本、延迟与信息组织的关系
- 为什么工程上仍然需要 context engineering

- [ ] **Step 3: Review the page for conceptual clarity**

Check that the two new questions stay at the “基础概念里的工程边界”层次 rather than drifting into planning or RAG implementation detail.

- [ ] **Step 4: Commit**

```bash
git add docs/interview/fundamentals/index.md
git commit -m "feat(interview): expand fundamentals with LLM boundary topics"
```

### Task 4: Validate Content Structure

**Files:**
- Verify: `docs/interview/planning/index.md`
- Verify: `docs/interview/rag/index.md`
- Verify: `docs/interview/fundamentals/index.md`

- [ ] **Step 1: Run content validation**

Run: `bun run check:content`
Expected: PASS without new content structure errors

- [ ] **Step 2: Run strict build if the content check passes**

Run: `bun run build:strict`
Expected: PASS, or only pre-existing unrelated issues

- [ ] **Step 3: Record verification outcome**

If any command fails, note:

- failure command
- whether failure is caused by new content or pre-existing repo state
- which page caused it

### Task 5: Final Review

**Files:**
- Review: `docs/interview/planning/index.md`
- Review: `docs/interview/rag/index.md`
- Review: `docs/interview/fundamentals/index.md`
- Review: `docs/superpowers/specs/2026-04-30-agent-interview-article-expansion-design.md`

- [ ] **Step 1: Check spec coverage**

Confirm all five planned questions are present and match the approved order:

1. `planning`：Agent 任务的一步执行应该怎么设计？
2. `planning`：如何把 Agent 的执行过程设计成可中断、可恢复、可重试？
3. `rag`：向量数据库的更新、删除、版本管理应该怎么做？
4. `fundamentals`：LLM 到底擅长什么，不擅长什么？
5. `fundamentals`：上下文窗口变长，为什么不等于 Agent 一定更强？

- [ ] **Step 2: Check for placeholder language**

Search manually for:

- 占位词
- 不完整提示语
- “后面再补”
- “待完善”

Expected: none found in the new interview content

- [ ] **Step 3: Confirm reading rhythm**

Verify each new question still reads as:

- 题目
- 面试官想听什么
- 短答版
- 深答版
- 追问方向

and that no new section breaks the existing interview scan pattern.

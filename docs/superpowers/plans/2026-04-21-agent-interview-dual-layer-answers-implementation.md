# Agent 面试题双层答案增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all seven interview category pages from single-layer answer notes to a unified dual-layer interview-answer format.

**Architecture:** Keep the existing interview module structure and only enhance page content. Each question will use one stable schema: `题目 / 面试官想听什么 / 短答版 / 深答版 / 追问方向`, with category-specific emphasis preserved.

**Tech Stack:** VitePress, Markdown

---

### Task 1: Lock the content schema

**Files:**
- Modify: `docs/interview/fundamentals/index.md`
- Modify: `docs/interview/tools/index.md`
- Modify: `docs/interview/memory/index.md`
- Modify: `docs/interview/planning/index.md`
- Modify: `docs/interview/rag/index.md`
- Modify: `docs/interview/multi-agent/index.md`
- Modify: `docs/interview/engineering/index.md`

- [ ] **Step 1: Replace the current answer structure**

Each question must use:
- `题目`
- `面试官想听什么`
- `短答版`
- `深答版`
- `追问方向`

- [ ] **Step 2: Keep a stable writing density**

For every `深答版`, cover:
- core judgment
- boundary
- engineering tradeoff
- common misunderstanding or practical example

### Task 2: Rewrite all category pages consistently

**Files:**
- Modify: `docs/interview/fundamentals/index.md`
- Modify: `docs/interview/tools/index.md`
- Modify: `docs/interview/memory/index.md`
- Modify: `docs/interview/planning/index.md`
- Modify: `docs/interview/rag/index.md`
- Modify: `docs/interview/multi-agent/index.md`
- Modify: `docs/interview/engineering/index.md`

- [ ] **Step 1: Update intros where needed**

Make it clear the page now supports both quick-answer review and deep interview follow-up preparation.

- [ ] **Step 2: Rewrite all 35 questions**

Preserve the existing topic coverage, but deepen the answers so each page can be used both for fast review and deeper mock interviews.

### Task 3: Verify rendering and build safety

**Files:**
- Modify: `docs/interview/**`

- [ ] **Step 1: Run targeted content scan**

Run: `rg -n "面试官想听什么|短答版|深答版" docs/interview`
Expected: every category page contains the new structure.

- [ ] **Step 2: Run full build**

Run: `bun run build`
Expected: PASS

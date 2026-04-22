# Agent 面试题排错与事故题分类页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `排错与事故题` category under the interview module, with overview/sidebar links and a 12-question page covering troubleshooting and incident response.

**Architecture:** Keep the interview module structure unchanged and extend it with one new category page. Use a stable response schema for each question: `题目 / 面试官想听什么 / 短答版 / 先看什么 / 排查路径 / 怎么止血 / 怎么复盘 / 追问方向`.

**Tech Stack:** VitePress, Markdown

---

### Task 1: Wire the new category into the interview module

**Files:**
- Modify: `.vitepress/config.mts`
- Modify: `docs/interview/index.md`

- [ ] **Step 1: Add sidebar link**
- [ ] **Step 2: Add overview entry and update counts/summary**

### Task 2: Create the troubleshooting page

**Files:**
- Create: `docs/interview/troubleshooting/index.md`

- [ ] **Step 1: Add valid frontmatter**
- [ ] **Step 2: Write 12 questions**

### Task 3: Verify integration

**Files:**
- Modify: `docs/interview/**`
- Modify: `.vitepress/config.mts`

- [ ] **Step 1: Run targeted grep for the new category**
- [ ] **Step 2: Run `bun run build`**

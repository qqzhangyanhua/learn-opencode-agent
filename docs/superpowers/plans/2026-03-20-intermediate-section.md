# 中级篇模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 VitePress 电子书中新增独立的“中级篇”模块，接入首批 8 篇热门专题文章、建立源码映射与教学示例双映射，并完成导航、阅读地图与代码示例目录整合。

**Architecture:** 保持单 VitePress 实例不变，在现有理论篇与实践篇之外新增 `docs/intermediate/` 目录和对应侧边栏分组。页面层面优先复用现有 Markdown、`SourceSnapshotCard` 与 VitePress 原生 `details` 能力，不额外引入复杂展示组件；代码示例迁入 `docs/intermediate/examples/`，正文按“短代码直接展示 / 中等代码折叠 / 长代码目录下沉”三档规则呈现。

**Tech Stack:** VitePress 1.5, Markdown, Vue 3 组件复用, TypeScript 配置文件, Bun/PNPM 构建

**Spec Document:** `/Users/zhangyanhua/AI/opencode/docs/book/docs/superpowers/specs/2026-03-20-intermediate-articles-design.md`

---

## 文件变更地图

| 操作 | 文件 | 说明 |
|------|------|------|
| Modify | `.vitepress/config.mts` | 新增顶部导航 `中级篇`，扩展主侧边栏第六部分 |
| Modify | `docs/index.md` | 新增中级篇入口按钮和定位说明 |
| Modify | `docs/reading-map.md` | 新增“路线 E：从原理走向工程专题” |
| Create | `docs/intermediate/index.md` | 中级篇导读页 |
| Create | `docs/intermediate/25-rag-failure-patterns/index.md` | 第25章正文 |
| Create | `docs/intermediate/26-multi-agent-collaboration/index.md` | 第26章正文 |
| Create | `docs/intermediate/27-planning-mechanism/index.md` | 第27章正文 |
| Create | `docs/intermediate/28-context-engineering/index.md` | 第28章正文 |
| Create | `docs/intermediate/29-system-prompt-design/index.md` | 第29章正文 |
| Create | `docs/intermediate/30-production-architecture/index.md` | 第30章正文 |
| Create | `docs/intermediate/31-safety-boundaries/index.md` | 第31章正文 |
| Create | `docs/intermediate/32-performance-cost/index.md` | 第32章正文 |
| Create | `docs/intermediate/examples/25-rag-failure-patterns/**` | 迁入 RAG 翻车场景示例 |
| Create | `docs/intermediate/examples/26-multi-agent-collaboration/**` | 迁入多智能体示例 |
| Create | `docs/intermediate/examples/27-planning-mechanism/**` | 迁入 Planning 示例 |
| Create | `docs/intermediate/examples/28-context-engineering/**` | 迁入上下文工程示例 |
| Create | `docs/intermediate/examples/29-system-prompt-design/README.md` | 整理 System Prompt 示例说明 |
| Create | `docs/intermediate/examples/30-production-architecture/README.md` | 整理生产架构示例说明 |
| Create | `docs/intermediate/examples/31-safety-boundaries/README.md` | 整理安全边界示例说明 |
| Create | `docs/intermediate/examples/32-performance-cost/README.md` | 整理性能成本示例说明 |

所有路径相对于 `/Users/zhangyanhua/AI/opencode/docs/book/`。

---

## Task 1: 建立中级篇目录骨架

**Files:**
- Create: `docs/intermediate/index.md`
- Create: `docs/intermediate/25-rag-failure-patterns/index.md`
- Create: `docs/intermediate/26-multi-agent-collaboration/index.md`
- Create: `docs/intermediate/27-planning-mechanism/index.md`
- Create: `docs/intermediate/28-context-engineering/index.md`
- Create: `docs/intermediate/29-system-prompt-design/index.md`
- Create: `docs/intermediate/30-production-architecture/index.md`
- Create: `docs/intermediate/31-safety-boundaries/index.md`
- Create: `docs/intermediate/32-performance-cost/index.md`

- [ ] **Step 1: 创建目录结构**

Run:

```bash
mkdir -p docs/intermediate/{25-rag-failure-patterns,26-multi-agent-collaboration,27-planning-mechanism,28-context-engineering,29-system-prompt-design,30-production-architecture,31-safety-boundaries,32-performance-cost}
```

Expected: 8 个章节目录创建成功

- [ ] **Step 2: 为导读页和 8 个章节页写入最小 frontmatter 占位**

每个 `index.md` 至少包含：

```md
---
title: 第25章：示例标题
description: 示例描述
---
```

- [ ] **Step 3: 运行构建，确认新目录不会导致站点报错**

Run:

```bash
pnpm -s run build
```

Expected: `vitepress build` 成功，无路径或 frontmatter 报错

- [ ] **Step 4: Commit**

```bash
git add docs/intermediate
git commit -m "feat(intermediate): scaffold intermediate section pages"
```

---

## Task 2: 接入中级篇导航与侧边栏

**Files:**
- Modify: `.vitepress/config.mts`

- [ ] **Step 1: 在 `nav` 中新增 `中级篇` 入口**

将：

```ts
{ text: '实践篇', link: '/practice/', activeMatch: '/practice/' },
{ text: '阅读地图', link: '/reading-map' },
```

改为：

```ts
{ text: '实践篇', link: '/practice/', activeMatch: '/practice/' },
{ text: '中级篇', link: '/intermediate/', activeMatch: '/intermediate/' },
{ text: '阅读地图', link: '/reading-map' },
```

- [ ] **Step 2: 在主侧边栏新增“第六部分：中级专题与工程进阶”分组**

新增 9 个条目：

- 中级篇导读
- 第25章至第32章

- [ ] **Step 3: 构建验证侧边栏配置合法**

Run:

```bash
pnpm -s run build
```

Expected: 构建通过，无 `config.mts` 语法错误

- [ ] **Step 4: Commit**

```bash
git add .vitepress/config.mts
git commit -m "feat(intermediate): add nav and sidebar entries"
```

---

## Task 3: 更新首页与阅读地图入口

**Files:**
- Modify: `docs/index.md`
- Modify: `docs/reading-map.md`

- [ ] **Step 1: 在 `docs/index.md` Hero Actions 中新增中级篇入口按钮**

追加：

```yaml
- theme: alt
  text: 阅读中级篇
  link: /intermediate/
```

- [ ] **Step 2: 在首页正文补一句中级篇定位**

要求：

- 不影响现有“双轨学习体系”表述
- 明确中级篇是“完成基础理解后继续走向工程专题”的入口

- [ ] **Step 3: 在 `docs/reading-map.md` 新增“路线 E：从原理走向工程专题”**

路线 E 至少包含：

1. 适合人群
2. 建议顺序
3. 与理论篇 / 实践篇的衔接说明

- [ ] **Step 4: 构建验证所有内部链接可解析**

Run:

```bash
pnpm -s run build
```

Expected: 构建通过，无 broken link 级别报错

- [ ] **Step 5: Commit**

```bash
git add docs/index.md docs/reading-map.md
git commit -m "feat(intermediate): add homepage and reading map entry"
```

---

## Task 4: 完成中级篇导读页

**Files:**
- Modify: `docs/intermediate/index.md`

- [ ] **Step 1: 写导读页 frontmatter**

要求：

- 标题明确为“中级篇导读”或等价名称
- description 清楚表达“热门专题与工程进阶”

- [ ] **Step 2: 写正文的三块核心内容**

正文必须包含：

1. 适合谁读
2. 首批 8 篇推荐阅读顺序
3. 每篇与现有章节的回链关系

- [ ] **Step 3: 给出明确阅读建议**

至少包含：

- 从 RAG / 多智能体 / Planning 开始的读法
- 从生产 / 安全 / 成本开始的读法

- [ ] **Step 4: 构建验证页面渲染**

Run:

```bash
pnpm -s run build
```

Expected: 中级篇首页生成成功

- [ ] **Step 5: Commit**

```bash
git add docs/intermediate/index.md
git commit -m "feat(intermediate): add intermediate landing page"
```

---

## Task 5: 迁入首批代码示例目录并补 README

**Files:**
- Create: `docs/intermediate/examples/25-rag-failure-patterns/**`
- Create: `docs/intermediate/examples/26-multi-agent-collaboration/**`
- Create: `docs/intermediate/examples/27-planning-mechanism/**`
- Create: `docs/intermediate/examples/28-context-engineering/**`
- Create: `docs/intermediate/examples/29-system-prompt-design/README.md`
- Create: `docs/intermediate/examples/30-production-architecture/README.md`
- Create: `docs/intermediate/examples/31-safety-boundaries/README.md`
- Create: `docs/intermediate/examples/32-performance-cost/README.md`

- [ ] **Step 1: 创建 `docs/intermediate/examples/` 下的 8 个主题目录**

Run:

```bash
mkdir -p docs/intermediate/examples/{25-rag-failure-patterns,26-multi-agent-collaboration,27-planning-mechanism,28-context-engineering,29-system-prompt-design,30-production-architecture,31-safety-boundaries,32-performance-cost}
```

Expected: 8 个示例目录创建成功

- [ ] **Step 2: 复制已有外部示例到仓库内**

至少迁入：

- `03_RAG五大翻车场景/`
- `08_多智能体协作/multi_agent.py`
- `10_Planning机制/plan_and_execute.py`
- `16_上下文工程实战/context_engine.py`

- [ ] **Step 3: 为每个目录补 `README.md`**

每个 README 统一包含：

1. 演示目标
2. 依赖安装命令
3. 建议先运行哪个文件
4. 对应正文哪一节

- [ ] **Step 4: 用 `rg --files docs/intermediate/examples` 检查示例目录完整性**

Run:

```bash
rg --files docs/intermediate/examples
```

Expected: 看到 8 个主题目录及其 README / 示例文件

- [ ] **Step 5: Commit**

```bash
git add docs/intermediate/examples
git commit -m "feat(intermediate): import teaching code examples"
```

---

## Task 6: 编写第25-28章正文

**Files:**
- Modify: `docs/intermediate/25-rag-failure-patterns/index.md`
- Modify: `docs/intermediate/26-multi-agent-collaboration/index.md`
- Modify: `docs/intermediate/27-planning-mechanism/index.md`
- Modify: `docs/intermediate/28-context-engineering/index.md`

- [ ] **Step 1: 统一这 4 篇的章节模板**

每篇必须包含：

1. 对应路径 / 前置阅读 / 学习目标
2. 这篇解决什么问题
3. 为什么真实系统里重要
4. 核心概念与主链路
5. 源码映射
6. 教学代码示例
7. 常见误区
8. 延伸阅读与回链

- [ ] **Step 2: 为每篇补 OpenCode 源码映射**

要求：

- 复用 `SourceSnapshotCard`
- 只列与该主题最相关的 3-6 个入口文件
- 明确这是 OpenCode 主线映射，不是教学示例

- [ ] **Step 3: 为每篇补教学代码示例映射**

要求：

- 明确链接到 `docs/intermediate/examples/` 下对应目录
- 标注“教学示例，不是 OpenCode 原仓实现”

- [ ] **Step 4: 按三档规则处理代码展示**

规则：

- 短代码直接展示
- 单文件中等代码用 `::: details` 折叠
- 多文件或长代码只放关键片段并跳转目录

- [ ] **Step 5: 构建验证前 4 篇页面**

Run:

```bash
pnpm -s run build
```

Expected: 这 4 篇页面正常构建，无 Markdown 容器或组件引用错误

- [ ] **Step 6: Commit**

```bash
git add docs/intermediate/25-rag-failure-patterns/index.md docs/intermediate/26-multi-agent-collaboration/index.md docs/intermediate/27-planning-mechanism/index.md docs/intermediate/28-context-engineering/index.md
git commit -m "feat(intermediate): add first four intermediate chapters"
```

---

## Task 7: 编写第29-32章正文

**Files:**
- Modify: `docs/intermediate/29-system-prompt-design/index.md`
- Modify: `docs/intermediate/30-production-architecture/index.md`
- Modify: `docs/intermediate/31-safety-boundaries/index.md`
- Modify: `docs/intermediate/32-performance-cost/index.md`

- [ ] **Step 1: 延续统一章节模板写完后 4 篇**

要求与 Task 6 保持完全一致，禁止另起一套结构

- [ ] **Step 2: 处理“非单脚本型”文章的代码展示**

特别注意：

- `生产架构` 以架构图、模块骨架、关键代码骨架为主
- `System Prompt 设计`、`安全与边界`、`性能与成本` 需要从参考文章中整理出可稳定展示的示例片段或 README

- [ ] **Step 3: 确保每篇都与现有章节形成回链**

至少补充：

- 理论篇对应章节链接
- 实践篇对应章节链接

- [ ] **Step 4: 构建验证后 4 篇页面**

Run:

```bash
pnpm -s run build
```

Expected: 后 4 篇页面正常构建

- [ ] **Step 5: Commit**

```bash
git add docs/intermediate/29-system-prompt-design/index.md docs/intermediate/30-production-architecture/index.md docs/intermediate/31-safety-boundaries/index.md docs/intermediate/32-performance-cost/index.md
git commit -m "feat(intermediate): add remaining intermediate chapters"
```

---

## Task 8: 回归检查源码映射与示例链接

**Files:**
- Modify: `docs/intermediate/25-rag-failure-patterns/index.md`
- Modify: `docs/intermediate/26-multi-agent-collaboration/index.md`
- Modify: `docs/intermediate/27-planning-mechanism/index.md`
- Modify: `docs/intermediate/28-context-engineering/index.md`
- Modify: `docs/intermediate/29-system-prompt-design/index.md`
- Modify: `docs/intermediate/30-production-architecture/index.md`
- Modify: `docs/intermediate/31-safety-boundaries/index.md`
- Modify: `docs/intermediate/32-performance-cost/index.md`

- [ ] **Step 1: 检查 8 篇页面是否都具备“双映射”**

核对项：

- 是否有 `SourceSnapshotCard`
- 是否有教学示例目录说明
- 是否明确说明两者不是同一套代码

- [ ] **Step 2: 抽查所有内部链接**

Run:

```bash
rg -n "/intermediate/|/practice/|/0[0-9]-|/1[0-9]-|/20-" docs/intermediate
```

Expected: 所有链接指向现有有效路径，无明显拼写错误

- [ ] **Step 3: 全量构建**

Run:

```bash
pnpm -s run build
```

Expected: 全站构建通过

- [ ] **Step 4: Commit**

```bash
git add docs/intermediate
git commit -m "docs(intermediate): align source mapping and example links"
```

---

## Task 9: 最终验收与交付说明

**Files:**
- Modify: `docs/intermediate/index.md`
- Modify: `docs/index.md`
- Modify: `docs/reading-map.md`

- [ ] **Step 1: 重新通读入口页文案**

验收点：

- 首页、中级篇导读、阅读地图三处对中级篇的定位是否一致
- 是否避免把中级篇表述成初学者默认入口

- [ ] **Step 2: 运行最终构建验收**

Run:

```bash
pnpm -s run build
```

Expected: 构建成功，输出 `build complete` 类结果

- [ ] **Step 3: 记录最终交付摘要**

在交付说明中至少写清：

- 新增了哪些页面
- 导航和阅读地图改了什么
- 代码示例迁入了哪些目录
- 哪些章节使用了折叠完整代码

- [ ] **Step 4: Commit**

```bash
git add docs/index.md docs/reading-map.md docs/intermediate
git commit -m "docs: finalize intermediate section delivery"
```


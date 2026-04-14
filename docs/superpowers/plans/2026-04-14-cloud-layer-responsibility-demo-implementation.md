# Cloud Layer Responsibility Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为第 13 章新增“云端分层职责演示”章节级教学组件，让读者通过同一条能力链稳定区分 `function / console / infra / containers` 的职责边界。

**Architecture:** 保留现有 `<LocalCloudTopologyDemo />` 作为总拓扑入口，新增独立组件 `CloudLayerResponsibilityDemo.vue` 负责“主链 + 固定记忆面板”的边界记忆。正文在 `14.3 packages/function 与 packages/console 的云端架构` 开头接入新组件，`check:chapter-experience` 增加第 13 章回归校验。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、Bun、现有 `scripts/check-*.mjs`

---

## File Structure

### Create

- `.vitepress/theme/components/CloudLayerResponsibilityDemo.vue`
- `docs/superpowers/specs/2026-04-14-cloud-layer-responsibility-demo-design.md`

### Modify

- `.vitepress/theme/index.ts`
- `docs/13-deployment-infrastructure/index.md`
- `scripts/check-chapter-experience.mjs`

### Reference

- `docs/superpowers/specs/2026-04-14-cloud-layer-responsibility-demo-design.md`
- `.vitepress/theme/components/HttpPermissionGateDemo.vue`
- `.vitepress/theme/components/ExtensionCapabilitySelector.vue`
- `docs/13-deployment-infrastructure/index.md`

---

### Task 1: 建立第 13 章体验校验基线

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 增加第 13 章章节体验校验**

新增这些检查：

- 存在 `CloudLayerResponsibilityDemo.vue`
- 组件必须包含：
  - `function 负责公共 API，console 负责账号与商业化域，两者不是一回事。`
  - `负责什么`
  - `不负责什么`
  - `典型文件`
  - `需求出现`
  - `containers / CI`
- 第 13 章文档必须接入 `<CloudLayerResponsibilityDemo`

- [ ] **Step 2: 运行章节体验校验，确认先失败**

Run:

```bash
bun run check:chapter-experience
```

Expected: FAIL，至少提示缺少 `CloudLayerResponsibilityDemo.vue` 或第 13 章文档未接入组件。

### Task 2: 实现云端分层职责组件

**Files:**
- Create: `.vitepress/theme/components/CloudLayerResponsibilityDemo.vue`
- Modify: `.vitepress/theme/index.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 定义五个状态节点数据**

至少包含：

- 需求出现
- function
- console
- infra
- containers / CI

每个节点都要有：

- `title`
- `summary`
- `responsibility`
- `nonResponsibility`
- `files`
- `warning`

- [ ] **Step 2: 实现顶部主记忆句和主链切换**

要求：

- 顶部固定显示：
  `function 负责公共 API，console 负责账号与商业化域，两者不是一回事。`
- 点击节点时当前状态高亮
- 不自动播放
- 不使用学习进度按钮组

- [ ] **Step 3: 实现中央当前层说明区**

要求：

- 每次切换只强调一句当前层判断
- 明确“为什么下一层不能替它做”

- [ ] **Step 4: 实现右侧固定记忆面板**

至少包含：

- `负责什么`
- `不负责什么`
- `典型文件`

底部再补一条随状态变化的“易混淆提醒”。

- [ ] **Step 5: 注册全局组件**

在 `.vitepress/theme/index.ts` 中注册 `CloudLayerResponsibilityDemo`

- [ ] **Step 6: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

### Task 3: 接入第 13 章正文并做最终验证

**Files:**
- Modify: `docs/13-deployment-infrastructure/index.md`
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`
- Test: `bun run typecheck`
- Test: `bun run build`

- [ ] **Step 1: 在 `14.3 packages/function 与 packages/console 的云端架构` 开头补引导文案**

文案方向：

```md
先不要把这些目录都看成“云端后端”，先用一条账号 / 订阅 / 模型配置链路，分清每一层到底负责什么。
```

- [ ] **Step 2: 在 `14.3` 开头接入 `<CloudLayerResponsibilityDemo />`**

要求：

- 保留前文已有 `<LocalCloudTopologyDemo />`
- 新组件承担本章“职责边界记忆”的主教学角色

- [ ] **Step 3: 运行最终验证**

Run:

```bash
bun run check:chapter-experience
bun run typecheck
bun run build
```

Expected:

- `check:chapter-experience` PASS
- `typecheck` PASS
- `build` PASS

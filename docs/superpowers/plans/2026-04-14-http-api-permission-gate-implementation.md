# HTTP API Permission Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为第 08 章新增“HTTP 请求权限守门双结果对照”教学组件，让用户优先记住权限中间件决定请求能否继续进入路由与 Handler。

**Architecture:** 新增独立章节组件 `HttpPermissionGateDemo.vue`，沿用最近章节的“顶部主链 + 中间对照 + 右侧记忆面板”结构，不去复用老式 `FlowScenarioDemo`。正文只补一句观看引导，`check:chapter-experience` 增加第 08 章回归校验，确保这章后续不会退回纯文本讲解。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、Bun、现有 `scripts/check-*.mjs`

---

## File Structure

### Create

- `.vitepress/theme/components/HttpPermissionGateDemo.vue`
- `docs/superpowers/specs/2026-04-14-http-api-permission-gate-design.md`

### Modify

- `.vitepress/theme/index.ts`
- `docs/08-http-api-server/index.md`
- `scripts/check-chapter-experience.mjs`

### Reference

- `docs/superpowers/specs/2026-04-14-http-api-permission-gate-design.md`
- `.vitepress/theme/components/McpHandshake.vue`
- `.vitepress/theme/components/ProviderFallback.vue`
- `docs/08-http-api-server/index.md`

---

### Task 1: 建立第 08 章失败校验基线

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 增加第 08 章章节体验校验**

新增这些检查：

- 存在 `HttpPermissionGateDemo.vue`
- 组件必须包含 `function flowStageLabel(`
- 组件必须声明：
  - `谁在做守门`
  - `拦住的依据是什么`
  - `被拦住后请求停在哪里`
  - `放行后为什么 Handler 可以更简单`
- 组件必须声明主链阶段：
  - `HTTP 请求`
  - `权限中间件`
  - `路由匹配`
  - `Handler`
  - `响应返回`
- 第 08 章文档必须接入 `<HttpPermissionGateDemo`

- [ ] **Step 2: 运行章节体验校验，确认先失败**

Run:

```bash
bun run check:chapter-experience
```

Expected: FAIL，至少提示缺少 `HttpPermissionGateDemo.vue` 或缺少 `flowStageLabel`。

### Task 2: 实现权限守门双结果对照组件

**Files:**
- Create: `.vitepress/theme/components/HttpPermissionGateDemo.vue`
- Modify: `.vitepress/theme/index.ts`
- Test: `bun run typecheck`

- [ ] **Step 1: 定义主链阶段与记忆字段**

最小定义：

```ts
type FlowStageId = 'request' | 'permission' | 'route' | 'handler' | 'response'
type FlowLabelKey = 'owner' | 'basis' | 'blocked' | 'simple'
```

- [ ] **Step 2: 定义双栏对照路径数据**

要求：

- 左栏是拒绝路径
- 右栏是放行路径
- 两栏共用同一个请求说明

- [ ] **Step 3: 实现主链点击切换与自动播放**

要求：

- 点击顶部阶段按钮时切换说明
- 自动播放时先推进到 `权限中间件`
- 再分叉成左侧拒绝、右侧通过

- [ ] **Step 4: 实现右侧固定说明面板**

至少包含：

- 四张记忆卡
- 当前主链位置
- 当前阶段说明
- 一句话记忆

- [ ] **Step 5: 注册全局组件**

在 `.vitepress/theme/index.ts` 中注册 `HttpPermissionGateDemo`

- [ ] **Step 6: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

### Task 3: 接入第 08 章正文并做最终验证

**Files:**
- Modify: `docs/08-http-api-server/index.md`
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`
- Test: `bun run typecheck`
- Test: `bun run build`

- [ ] **Step 1: 在组件前补一句引导文案**

文案方向：

```md
先记住这条主链：HTTP 请求不是直接进 Handler，而是先经过权限中间件。下面看同一个请求为什么会出现“被拦截”和“继续执行”两种结果。
```

- [ ] **Step 2: 在合适位置插入 `<HttpPermissionGateDemo />`**

建议插入到 `9.3 createApp 的中间件链` 之后、`9.4 统一错误处理` 之前。

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

# Rag Failure Chain Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把第 25 章现有 `RagAccuracyDemo` 升级为支持五类故障链切换的章节级 RAG 诊断模拟器。

**Architecture:** 复用现有 `RagAccuracyDemo.vue` 作为唯一章节入口，不新增平行大组件。组件内部新增五阶段状态：召回单元、相似度判断、关键词召回、回答边界、冲突治理；现有 `scenarios` prop 继续服务第三阶段的混合检索对比，其余阶段采用组件内本地演示数据。最后用章节体验校验补回归规则，保证第 25 章不再只是单一混合检索对比。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、现有 `scripts/check-*.mjs`、Bun

---

## File Structure

### Modify

- `.vitepress/theme/components/RagAccuracyDemo.vue`
  - 增加五阶段切换、故障视图、修复建议和排查顺序说明
- `scripts/check-chapter-experience.mjs`
  - 增加第 25 章五阶段回归校验
- `docs/intermediate/25-rag-failure-patterns/index.md`
  - 在现有组件前增加操作提示

### Optional Modify

- `.vitepress/theme/components/types.ts`
  - 如需最小阶段类型，可补在此处

### Reference

- `docs/superpowers/specs/2026-04-13-rag-failure-chain-simulator-design.md`
- `.vitepress/theme/components/RagAccuracyDemo.vue`
- `docs/intermediate/25-rag-failure-patterns/index.md`

---

### Task 1: 建立第 25 章失败校验基线

**Files:**
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run check:chapter-experience`

- [ ] **Step 1: 给 `RagAccuracyDemo.vue` 增加新校验要求**

在 `scripts/check-chapter-experience.mjs` 增加这些检查：

- `RagAccuracyDemo.vue` 必须包含 `function changeStage(`
- 组件源码必须包含：
  - `召回单元`
  - `相似度判断`
  - `关键词召回`
  - `回答边界`
  - `冲突治理`
- 第 25 章文档仍包含 `<RagAccuracyDemo`

- [ ] **Step 2: 先运行校验让它失败**

Run:

```bash
bun run check:chapter-experience
```

Expected: FAIL，至少提示 `RagAccuracyDemo` 尚未实现阶段切换处理函数。

- [ ] **Step 3: 提交失败基线改动**

```bash
git add scripts/check-chapter-experience.mjs
git commit -m "test(intermediate): require rag failure chain simulator"
```

---

### Task 2: 给组件补五阶段状态骨架

**Files:**
- Modify: `.vitepress/theme/components/RagAccuracyDemo.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 在组件内定义五阶段状态**

最小定义：

```ts
type RagStageKey = 'chunk' | 'embedding' | 'hybrid' | 'prompt' | 'conflict'

const stages = [
  { id: 'chunk', label: '召回单元' },
  { id: 'embedding', label: '相似度判断' },
  { id: 'hybrid', label: '关键词召回' },
  { id: 'prompt', label: '回答边界' },
  { id: 'conflict', label: '冲突治理' }
] as const
```

- [ ] **Step 2: 增加阶段切换函数**

实现：

```ts
const activeStage = ref<RagStageKey>('chunk')

function changeStage(stage: RagStageKey) {
  activeStage.value = stage
}
```

- [ ] **Step 3: 在顶部加入阶段按钮组**

要求：

- 当前阶段高亮
- 点击不影响 `scenarios` 数据完整性

- [ ] **Step 4: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/RagAccuracyDemo.vue
git commit -m "feat(intermediate): add rag failure chain stage state"
```

---

### Task 3: 实现前三阶段视图

**Files:**
- Modify: `.vitepress/theme/components/RagAccuracyDemo.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 实现“召回单元”视图**

展示：

- 坏 chunk 示例
- 好 chunk 示例
- 为什么切块错误会让知识单元失真

- [ ] **Step 2: 实现“相似度判断”视图**

展示：

- 同一查询在不同 embedding 匹配下的候选项分数差异
- 正确语义空间和错误语义空间的对比

- [ ] **Step 3: 保留并嵌入现有“关键词召回”视图**

要求：

- 继续使用 `props.scenarios`
- precision / recall / 最终答案保留
- 当前阶段标题和右侧说明改成“关键词召回”

- [ ] **Step 4: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/RagAccuracyDemo.vue
git commit -m "feat(intermediate): add retrieval and hybrid rag failure views"
```

---

### Task 4: 实现后两阶段视图

**Files:**
- Modify: `.vitepress/theme/components/RagAccuracyDemo.vue`
- Test: `bun run typecheck`

- [ ] **Step 1: 实现“回答边界”视图**

展示：

- 宽松 prompt 的错误回答倾向
- 严格 prompt 的边界收口
- 为什么“检索到了”不等于“答案安全”

- [ ] **Step 2: 实现“冲突治理”视图**

展示：

- 两到三份带 metadata 的文档片段
- 来源、版本、日期、状态
- 最终选择哪一份作为有效依据

- [ ] **Step 3: 统一右侧说明区**

右侧说明区在所有阶段都显示：

- 当前错误点
- 修复动作
- 这是供应链上的第几层

- [ ] **Step 4: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add .vitepress/theme/components/RagAccuracyDemo.vue
git commit -m "feat(intermediate): add prompt and conflict rag failure views"
```

---

### Task 5: 接入第 25 章引导并做最终验证

**Files:**
- Modify: `docs/intermediate/25-rag-failure-patterns/index.md`
- Modify: `scripts/check-chapter-experience.mjs`
- Test: `bun run typecheck`
- Test: `bun run check:chapter-experience`
- Test: `bun run build`

- [ ] **Step 1: 在组件前补操作提示**

在第 25 章现有组件前加一句：

```md
按顺序切换五个故障阶段，观察 RAG 是在哪一层开始答偏的。
```

- [ ] **Step 2: 确认校验要求完整**

校验至少覆盖：

- `RagAccuracyDemo.vue` 含 `function changeStage(`
- 组件源码包含五个阶段标识
- 第 25 章仍接入 `<RagAccuracyDemo`

- [ ] **Step 3: 跑类型检查**

Run:

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 4: 跑章节体验校验**

Run:

```bash
bun run check:chapter-experience
```

Expected: PASS

- [ ] **Step 5: 跑构建**

Run:

```bash
bun run build
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add .vitepress/theme/components/RagAccuracyDemo.vue docs/intermediate/25-rag-failure-patterns/index.md scripts/check-chapter-experience.mjs
git commit -m "feat(intermediate): upgrade rag failure chain simulator"
```

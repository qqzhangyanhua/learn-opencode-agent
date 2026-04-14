# 第29章 System Prompt 装配链侧栏设计稿

## 背景

第 29 章当前的 `PromptDesignStudio` 更像一个“Prompt 编辑器”：

- 可以切模板
- 可以勾选 section
- 可以编辑内容
- 可以看预览和 lint

但用户在这一章真正需要记住的，不是“怎么写几段 Prompt 文案”，而是：

```text
system.ts
  -> instruction.ts
  -> prompt.ts
  -> llm.ts
```

也就是 System Prompt 在 OpenCode 里并不是写死字符串，而是运行时逐层装配的结果。

## 目标

保留现有 `PromptDesignStudio` 作为主交互容器，但把右侧从“通用预览工具区”升级为“源码装配链教学侧栏”，让用户在编辑任一 section 时，都能立刻看到它更接近哪一层运行时职责。

成功标准：

- 左侧继续保留现有编辑器主体
- 右侧持续显示 `system.ts -> instruction.ts -> prompt.ts -> llm.ts`
- 点击不同 section 时，右侧会稳定高亮对应源码层
- 右侧解释当前层负责什么、如果放错层会有什么问题
- Prompt 预览仍保留，但明确降级为“最终发模结果”
- 第 29 章正文在组件前补一句明确操作提示

## 范围

本次只改：

- `.vitepress/theme/components/PromptDesignStudio.vue`
- `docs/intermediate/29-system-prompt-design/index.md`
- `scripts/check-chapter-experience.mjs`

不包含：

- 不新建平行大型组件
- 不引入真实源码解析或动态 AST 映射
- 不重做模板系统
- 不把第 29 章改成独立的阶段切换整页

## 方案选择

### 方案 A：静态说明增强

保留当前组件，仅在右侧补一张静态说明卡。

优点：

- 改动小
- 风险低

缺点：

- 用户仍会把它理解成“Prompt 编辑器”
- 装配链记忆点弱

### 方案 B：编辑器主视图 + 装配链侧栏

保留左侧编辑器，把右侧改为：

- 源码主链
- 当前映射
- 为什么在这一层
- 最终发模预览
- Prompt 诊断

优点：

- 不破坏现有交互习惯
- 装配链长期固定可见
- 最适合强化“运行时组装”记忆

缺点：

- 需要重构右侧结构和映射逻辑

### 推荐方案

采用方案 B。

## 交互结构

### 左侧

继续使用现有 Prompt 编辑区：

- 模板切换
- section 勾选
- section 编辑
- token 预算

左侧的教学角色调整为：

“提供会被映射到运行时装配链的输入面板”

### 右侧

右侧改为五块固定信息：

1. 源码装配链
2. 当前映射
3. 这一层为什么负责这些内容
4. 最终发模预览
5. Prompt 诊断

其中主角必须是源码装配链，不再是大面积预览。

## 状态映射规则

映射不做动态猜测，采用稳定职责映射：

- `role` -> `system.ts`
- `rules` -> `system.ts`
- `safety` -> `instruction.ts`
- `output` -> `llm.ts`

默认状态：

- 页面初始或仅切模板未选 section 时，默认高亮 `system.ts`

教学解释要求：

- `system.ts`：稳定角色与长期规则
- `instruction.ts`：项目级/组织级附加约束
- `prompt.ts`：会话入口装配上下文
- `llm.ts`：最终把 system、messages、tools 送进模型

注意：

- `safety` 映射到 `instruction.ts` 时，要补一句“这不能替代权限系统”

## 视觉结构

建议布局：

- 左：编辑器
- 右：竖向信息侧栏

源码链建议用四段连续链式卡片呈现，避免四张完全无关联的独立信息块。

交互原则：

- 用户只需要点左侧 section
- 不额外增加第二套主要切换按钮
- 右侧跟随左侧选择联动

## 校验与回归

`scripts/check-chapter-experience.mjs` 至少新增以下校验：

- `PromptDesignStudio.vue` 包含装配链映射处理函数
- 包含源码层标识：
  - `system.ts`
  - `instruction.ts`
  - `prompt.ts`
  - `llm.ts`
- 第 29 章文档已接入 `<PromptDesignStudio`
- 第 29 章组件前有操作提示文案

## 验证方式

至少运行：

- `bun run check:chapter-experience`
- `bun run typecheck`
- `bun run build`

## 风险与控制

### 风险 1：右侧信息过多，又退化成长文说明

控制：

- 每层只保留“职责 + 风险”两类短文案

### 风险 2：用户仍把注意力放在编辑器，而不是装配链

控制：

- 右侧顶部固定显示源码链
- 预览降级为辅助卡片

### 风险 3：安全章节被误解为权限系统替代

控制：

- 在 `instruction.ts` 说明里显式提示“仍需权限系统兜底”

## 预期产出

- 升级后的 `PromptDesignStudio.vue`
- 第 29 章更清晰的源码装配链教学体验
- 新的章节体验回归校验

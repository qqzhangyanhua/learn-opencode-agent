# 第12章 扩展能力选择器设计稿

## 背景

第 12 章当前已经把插件、Skill、命令、MCP 和编辑器扩展讲得很全，也有一个 `ExtensionDecisionFlowDemo` 在做决策动画。

但用户现在更明确的需求不是“看一个流程图”，而是：

- 先按“我要扩展什么能力”来选扩展方式
- 最容易混淆的边界要先分清 `Plugin` 和 `Skill`
- 用可切换的方式快速比较不同能力类型
- 最后记住：扩展方式不是按高级不高级选，而是按能力落到最合适的运行时边界

因此第 12 章最重要的第一记忆，不该只是“决策树长什么样”，而应该是：

```text
我想扩展什么能力
  -> 选最合适的扩展方式
  -> 回到统一工具 / 命令 / 上下文边界
```

## 目标

为第 12 章新增章节级教学组件，让读者通过切换“能力标签”快速判断：

- 当前需求最适合 Plugin、Skill、Command、MCP 还是编辑器扩展
- 为什么推荐这个方案
- 为什么不是最容易混淆的另一个方案
- 最终进入系统的哪个统一入口

成功标准：

- 顶部固定主链：
  `我想扩展什么能力 -> 选对应扩展方式 -> 进入统一边界`
- 左侧能力标签可切换
- 中间始终给出当前标签的主推荐方案
- 右侧始终固定显示记忆说明
- 解释中心始终围绕 Plugin / Skill 的边界

## 范围

本次只改：

- `.vitepress/theme/components/ExtensionCapabilitySelector.vue`
- `.vitepress/theme/index.ts`
- `docs/12-plugins-extensions/index.md`
- `scripts/check-chapter-experience.mjs`

不包含：

- 不重写整章插件生命周期内容
- 不保留 `ExtensionDecisionFlowDemo` 作为本章第一主入口
- 不把本章改成完整的插件加载链模拟器

## 方案选择

### 方案 A：单条决策主链

从“我想扩展什么能力”一路走到推荐方案。

优点：

- 结构清楚

缺点：

- 用户不能快速切换重点
- 不利于横向比较 Plugin 和 Skill

### 方案 B：Plugin / Skill 双栏对照

只重点比较这两类最容易混淆的方案。

优点：

- 聚焦 Plugin / Skill

缺点：

- 会弱化 Command、MCP、编辑器扩展的整体框架

### 方案 C：多标签切换

按能力类型切换，每个标签都显示：

- 推荐方案
- 推荐理由
- 为什么不是其他方案
- 进入统一边界的位置

优点：

- 最符合用户当前确认的学习方式
- 既能覆盖全景，又能把 Plugin / Skill 放到解释中心
- 适合做快速记忆和反复切换

缺点：

- 需要为每个能力标签维护稳定文案

### 推荐方案

采用方案 C。

## 交互结构

### 顶部主链

固定三段：

- 我想扩展什么能力
- 选对应扩展方式
- 进入统一边界

### 左侧能力标签

建议至少保留五类：

- 复用提示词
- 固定工作流
- 新工具能力
- 外部系统接入
- 编辑器环境接入

### 中间主舞台

切换标签时，中间显示：

- 当前能力类型
- 推荐扩展方式
- 最短理解句
- 对应入口目录 / 文件
- 与最容易混淆方案的区别

重点标签：

- `固定工作流 -> Skill`
- `新工具能力 -> Plugin`

因为这是用户当前最想先分清的边界。

### 右侧固定说明

至少包含四个字段：

- 这一类为什么首选这个方案
- 为什么不是 Plugin
- 为什么不是 Skill
- 最后进入系统的哪个统一入口

再补：

- 当前推荐
- 一句话记忆

## 文案原则

一句话记忆固定为：

`扩展方式不是按高级不高级选，而是按你要扩展的能力落到最合适的运行时边界。`

解释时必须优先把 `Plugin` 和 `Skill` 的边界讲清，而不是平均铺开所有扩展形式。

## 接入位置

建议直接放在 `13.1 扩展体系全景` 中，替代现在 `<ExtensionDecisionFlowDemo />` 的主教学角色。

原因：

- 本章第一步最重要的就是“先选扩展方式”
- 先把能力与扩展方式对上，再读插件、Skill、命令和编辑器扩展的细节会更顺

## 校验与回归

`scripts/check-chapter-experience.mjs` 至少新增：

- 存在 `.vitepress/theme/components/ExtensionCapabilitySelector.vue`
- 组件源码包含：
  - `function recommendationForCapability(`
  - `function whyNotPlugin(`
  - `function whyNotSkill(`
  - `这一类为什么首选这个方案`
  - `为什么不是 Plugin`
  - `为什么不是 Skill`
  - `最后进入系统的哪个统一入口`
  - `我想扩展什么能力`
  - `选对应扩展方式`
  - `进入统一边界`
- 第 12 章文档接入 `<ExtensionCapabilitySelector`

## 验证方式

至少运行：

- `bun run check:chapter-experience`
- `bun run typecheck`
- `bun run build`


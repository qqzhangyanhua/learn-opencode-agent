# 第14章 测试环境边界演示设计稿

## 背景

第 14 章当前已经有一个 `<TestingLayersDemo />`，它能帮助读者先建立“runtime test / 前端单测 / E2E”三层测试面的总览。

但用户当前更明确的需求不是继续看一张测试分层图，而是：

- 先记住 `Bun Test / Happy DOM / Playwright` 三个名字分别托住哪一层验证
- 把“测试稳定成立”的关键从“test 文件数量”转到“运行环境和 fixture”
- 降低纯文字阅读疲劳，让读者快速形成固定判断框架
- 避免再次落回“E2E 最高级所以最重要”这类常见误区

因此第 14 章最重要的第一记忆，不该只是“测试被分成几层”，而应该是：

```text
Agent 项目能稳定测试
  -> 不只是因为有 test 文件
  -> 更是因为每一层都有对应的运行环境和 fixture
```

并且让读者持续记住：

```text
Bun Test、Happy DOM、Playwright 不是谁替代谁，
而是分别托住最合适的验证边界。
```

## 目标

为第 14 章新增章节级教学组件，让读者通过切换 `Bun Test / Happy DOM / Playwright`，稳定理解：

- 当前运行器托住的是哪一层测试
- 它主要解决什么问题
- 如果没有这层运行环境，会坏成什么样
- 在仓库里应该先看哪些入口文件

成功标准：

- 顶部固定主记忆句：
  `Agent 项目能稳定测试，不只是因为有 test 文件，更是因为每一层都有对应的运行环境和 fixture。`
- 中间切换主轴使用：
  - `Bun Test`
  - `Happy DOM`
  - `Playwright`
- 右侧固定记忆面板始终保持相同结构
- 每次切换都明确展示：
  - `托住哪层`
  - `解决什么问题`
  - `没有会坏成什么`
  - `典型入口文件`
- 用户点完一遍后，能清楚说出：
  - `Bun Test` 托住 runtime test
  - `Happy DOM` 托住前端单测
  - `Playwright` 托住真实用户流程

## 范围

本次只改：

- `.vitepress/theme/components/TestingFixtureBoundaryDemo.vue`
- `.vitepress/theme/index.ts`
- `docs/14-testing-quality/index.md`
- `scripts/check-chapter-experience.mjs`

不包含：

- 不重写整章测试策略正文
- 不保留旧组件作为本章第一主入口
- 不把组件扩展成完整测试流水线动画
- 不加入自动轮播或学习进度按钮组

## 方案选择

### 方案 A：测试层切换

按 `runtime / frontend / e2e` 三层切换，再解释各自依赖的运行器。

优点：

- 对应原文章结构，理解成本低

缺点：

- 用户未必能快速记住 `Bun Test / Happy DOM / Playwright`
- 容易还是停留在“测试层名词”上

### 方案 B：运行器映射切换

直接按：

- `Bun Test`
- `Happy DOM`
- `Playwright`

切换，再解释它们分别托住哪一层。

优点：

- 最符合用户当前确认的记忆目标
- 能直接把“运行器名 -> 测试层 -> 作用边界”绑定起来
- 更适合强调 fixture 和环境边界

缺点：

- 流程感比“同一次改动如何流转”更弱

### 方案 C：失败倒推

从故障现象出发，反推应该看哪种运行环境和 fixture。

优点：

- 代入感强

缺点：

- 初学者需要先有故障经验
- 不如映射式结构适合快速建立稳定记忆

### 推荐方案

采用方案 B。

## 交互结构

### 顶部主记忆句

始终固定展示：

`Agent 项目能稳定测试，不只是因为有 test 文件，更是因为每一层都有对应的运行环境和 fixture。`

### 中间主切换轴

固定三个标签：

- Bun Test
- Happy DOM
- Playwright

默认停留在 `Bun Test`，不自动轮播。

### 切换方式

- 用户点击标签切换当前状态
- 当前标签高亮
- 其余标签保持可见但弱化
- 不增加“学习进度按钮组”

### 右侧固定记忆面板

结构始终不变，只更新内容：

- 托住哪层
- 解决什么问题
- 没有会坏成什么
- 典型入口文件

### 底部误区提醒

每个状态底部补一条短句，强化“它不是替代其他层，而是托住当前层最合适的验证边界”。

## 三个状态设计

### 状态 1：Bun Test

标题：

`Bun Test 托住核心运行时测试`

说明：

它主要承接 `packages/opencode/test/` 这一层，用来验证工具、权限、session、server、MCP、控制平面这些运行时行为。

记忆面板：

- 托住哪层：核心运行时测试
- 解决什么问题：让文件系统、进程、权限、协议这类接近真实运行时的行为能快速回归
- 没有会坏成什么：会被迫大量 mock，很多真实边界问题根本测不到
- 典型入口文件：
  - `packages/opencode/package.json`
  - `packages/opencode/test/fixture/fixture.ts`

误区提醒：

`Bun Test 不是“低级版测试”，它是最接近 runtime 边界的高频验证层。`

### 状态 2：Happy DOM

标题：

`Happy DOM 托住共享前端状态层`

说明：

它不是完整浏览器，而是给 `packages/app/src/**/*.test.ts(x)` 提供足够轻量的 DOM 环境，让前端状态和交互逻辑能高频验证。

记忆面板：

- 托住哪层：前端单元测试
- 解决什么问题：让状态同步、输入构建、文件树、terminal panel 这类逻辑不用上真实浏览器也能跑
- 没有会坏成什么：很多前端逻辑只能拖到 E2E 才验证，回归成本会暴涨
- 典型入口文件：
  - `packages/app/package.json`
  - `packages/app/happydom.ts`

误区提醒：

`Happy DOM 不是浏览器替身，它是前端状态层的轻量测试环境。`

### 状态 3：Playwright

标题：

`Playwright 托住真实用户流程`

说明：

它负责把 UI、前端状态、HTTP API、本地 backend 一起拉进真实浏览器流程里验证，重点不是替代前两层，而是收口真实路径。

记忆面板：

- 托住哪层：E2E 端到端测试
- 解决什么问题：验证真实用户路径、跨层协作和最终体验闭环
- 没有会坏成什么：界面和服务各自都可能“单独没问题”，但真实联动会悄悄坏掉
- 典型入口文件：
  - `packages/app/e2e/fixtures.ts`
  - `playwright.config.ts`

误区提醒：

`Playwright 不是替代全部测试，它负责真实用户路径收口。`

## 文案原则

- 所有说明尽量短句化
- 中间区域每次只强调一个核心判断
- 固定使用：
  - `托住哪层`
  - `解决什么问题`
  - `没有会坏成什么`
  - `典型入口文件`
- 重点反复强化：
  - 有 test 文件不等于有稳定测试体系
  - 运行环境和 fixture 才是测试能稳定成立的关键
  - 三个运行器不是高低关系，而是边界分工

## 接入位置

建议直接替换 `docs/14-testing-quality/index.md` 当前的 `<TestingLayersDemo />`。

原因：

- 旧组件偏“分层总览”，不够强调 fixture 与环境边界
- 新组件更贴合用户当前确认的章节目标
- 后文继续阅读 `fixture.ts`、`happydom.ts`、`e2e/fixtures.ts` 时会更顺

## 校验与回归

`scripts/check-chapter-experience.mjs` 至少新增：

- 存在 `.vitepress/theme/components/TestingFixtureBoundaryDemo.vue`
- 组件源码包含：
  - `Agent 项目能稳定测试，不只是因为有 test 文件，更是因为每一层都有对应的运行环境和 fixture。`
  - `托住哪层`
  - `解决什么问题`
  - `没有会坏成什么`
  - `典型入口文件`
  - `Bun Test`
  - `Happy DOM`
  - `Playwright`
- 第 14 章文档接入 `<TestingFixtureBoundaryDemo`

## 验证方式

至少运行：

- `bun run check:chapter-experience`
- `bun run typecheck`
- `bun run build`

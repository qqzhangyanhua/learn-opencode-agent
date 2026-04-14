# 第11章 LSP 拉起与诊断主链设计稿

## 背景

第 11 章当前已经把 LSP 的核心知识写得很全：

- `getClients()` 的懒加载状态机
- `touchFile` 与 `waitForDiagnostics`
- 诊断如何进入工具返回值
- `LspTool` 的 9 种操作

但现有交互几乎只有 `LspHover` 这种“单点协议请求”演示。用户更难快速记住的，反而是本章真正重要的主链：

```text
edit 写文件
  -> LSP.touchFile
  -> getClients
  -> 启动 / 复用 tsserver
  -> didChange
  -> publishDiagnostics
```

而用户已经确认，这章优先要记住的是：

- “编译/诊断 -> 修复”内循环里的前半段
- 尤其是 `edit` 后 LSP 如何被拉起并开始产出诊断
- 用单条主链推进，而不是双栏对照或完整状态机拆页

## 目标

为第 11 章新增一个章节级教学组件，把一次 `edit foo.ts` 触发 LSP 诊断的流程讲成稳定主链，让用户先建立“LSP 是被 edit 触发按需拉起”的强记忆。

成功标准：

- 顶部固定主链：
  `edit 写文件 -> touchFile -> getClients -> 启动/复用客户端 -> didChange -> publishDiagnostics`
- 中间主舞台是一条单链时间线
- 右侧固定四张记忆卡
- 自动播放时严格按一次 edit 的顺序推进
- 结尾只轻量提示“这些诊断会进入后续修复链”，但不把修复链做成主角

## 范围

本次只改：

- `.vitepress/theme/components/LspEditDiagnosticFlowDemo.vue`
- `.vitepress/theme/index.ts`
- `docs/11-code-intelligence/index.md`
- `scripts/check-chapter-experience.mjs`

不包含：

- 不重写 `LspHover.vue`
- 不完整展开 `getClients()` 六步状态机每一个分支
- 不把本章同时改成“hover / definition / references / diagnostics”四套演示

## 方案选择

### 方案 A：单条主链推进

围绕一次 `edit` 修改，依次推进到 `publishDiagnostics`。

优点：

- 最符合用户确认的学习重点
- 最容易形成“edit 触发 LSP 按需拉起”的第一记忆
- 结构清晰，和近期已升级章节风格统一

缺点：

- 不直接对比“首次启动”和“复用已有客户端”

### 方案 B：双路径对照

左右对比“首次启动 tsserver”和“复用已有客户端”。

优点：

- 更完整

缺点：

- 会把注意力分散到路径比较
- 不利于用户先记住最基础主链

### 方案 C：完整状态机面板

拆开 `getClients()` 的 6 步判断，逐步切页解释。

优点：

- 工程表达完整

缺点：

- 第一轮理解成本太高
- 会压过本章更重要的 edit -> diagnostics 主线

### 推荐方案

采用方案 A。

## 交互结构

### 顶部主链

固定六段：

- edit 写文件
- touchFile
- getClients
- 启动/复用客户端
- didChange
- publishDiagnostics

要求：

- 可点击切换阶段说明
- 自动播放时随时间推进高亮

### 中间主舞台

用单条链路展示：

1. `edit foo.ts` 写入文件
2. `LSP.touchFile("foo.ts", waitForDiagnostics=true)`
3. `getClients("foo.ts")`
4. 找到 `.ts` 对应的 server，并按项目根目录定位到 `tsserver`
5. 如果没有客户端则启动，如果已有则复用
6. 发送 `textDocument/didChange`
7. 收到 `publishDiagnostics`

为了不让组件过重，“启动/复用客户端”可以用单节点文案表达，不需要再拆成双路径对照。

### 右侧固定说明

至少包含四个记忆字段：

- 谁负责把文件变更交给 LSP
- `getClients()` 真正在解决什么问题
- 为什么不是启动时就拉起所有语言服务器
- 诊断出来后怎么进入后续修复链

再补：

- 当前主链位置
- 这一步在源码里看什么
- 一句话记忆

## 文案原则

一句话记忆固定为：

`LSP 不是一直挂着等 AI 用，而是在 edit 触发后，按文件类型和项目根目录被按需拉起，再把诊断送回修复链。`

右侧文案必须围绕“edit 触发 LSP 拉起”，不要在这里扩写所有 `LspTool` 操作。

## 接入位置

建议插入到 `12.4 懒加载客户端：getClients 的状态机` 开头。

原因：

- 这里正是用户最容易断掉理解的地方
- 先看一次完整主链，再读 `getClients()` 代码，会更顺

## 校验与回归

`scripts/check-chapter-experience.mjs` 至少新增：

- 存在 `.vitepress/theme/components/LspEditDiagnosticFlowDemo.vue`
- 组件源码包含：
  - `function flowStageLabel(`
  - `谁负责把文件变更交给 LSP`
  - `getClients() 真正在解决什么问题`
  - `为什么不是启动时就拉起所有语言服务器`
  - `诊断出来后怎么进入后续修复链`
  - `edit 写文件`
  - `touchFile`
  - `getClients`
  - `启动/复用客户端`
  - `didChange`
  - `publishDiagnostics`
- 第 11 章文档接入 `<LspEditDiagnosticFlowDemo`

## 验证方式

至少运行：

- `bun run check:chapter-experience`
- `bun run typecheck`
- `bun run build`


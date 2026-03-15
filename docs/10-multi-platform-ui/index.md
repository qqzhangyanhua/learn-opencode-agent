---
title: 第十篇：多端 UI 开发
description: 第十篇：多端 UI 开发的详细内容
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/cli/cmd/tui/`、`packages/ui/`、`packages/app/`、`packages/desktop/`、`sdks/vscode/`
> **前置阅读**：第七篇 TUI 终端界面、第八篇 HTTP API 服务器、第九篇 数据持久化
> **学习目标**：理解 OpenCode 的多端架构包含 TUI、Web、Desktop、VSCode 四个主要终端，它们通过共享 UI 组件库和统一的 Platform 抽象实现代码复用

---

<SourceSnapshotCard
  title="第十篇源码快照"
  description="这一篇先抓多端共享的真实骨架：同一套产品能力怎样分别落到 TUI、Web、Desktop 和 VSCode，而不是为每个端重写一遍。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: 'TUI 入口',
      path: 'packages/opencode/src/cli/cmd/tui/app.tsx',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/cli/cmd/tui/app.tsx'
    },
    {
      label: '共享应用壳',
      path: 'packages/app/src/app.tsx',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/app/src/app.tsx'
    },
    {
      label: 'Desktop 入口',
      path: 'packages/desktop/src/index.tsx',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/desktop/src/index.tsx'
    },
    {
      label: 'VSCode 扩展入口',
      path: 'sdks/vscode/src/extension.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/sdks/vscode/src/extension.ts'
    }
  ]"
/>

## 核心概念速览

OpenCode 的“多端”不是只有 Web 和桌面，而是包含四个主要终端：

1. **TUI（终端界面）** - `packages/opencode/src/cli/cmd/tui/`
2. **Web（浏览器）** - `packages/app/`
3. **Desktop（桌面应用）** - `packages/desktop/`
4. **VSCode 扩展** - `sdks/vscode/`

### 为什么 TUI 是第一个“端”

很多人会忽略 TUI，但它其实是 OpenCode 最核心的交互方式：

- 启动最快（无需浏览器）
- 资源占用最小
- 最接近开发者的日常工作流
- 第七篇已经详细讲解了 TUI 的实现

### 多端架构的分层设计

```text
packages/ui
  -> 基础视觉与交互原语（所有端共享）

packages/opencode/src/cli/cmd/tui/
  -> TUI 终端界面
  -> SolidJS + OpenTUI
  -> 15 层 Context Provider

packages/app
  -> Web/Desktop 共享应用核心
  -> AppBaseProviders
  -> AppInterface
  -> 路由 / 状态 / 页面 / SDK 接入

packages/desktop
  -> PlatformProvider(value=desktop)
  -> Tauri 能力注入
  -> 复用 AppInterface

sdks/vscode
  -> 编辑器扩展
  -> 驱动本地 opencode 进程
  -> 文件引用与上下文采集
```

最值得先看的入口有六个：

- [packages/opencode/src/cli/cmd/tui/app.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/tui/app.tsx)（TUI 入口）
- [packages/app/src/app.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/app/src/app.tsx)
- [packages/app/src/entry.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/app/src/entry.tsx)
- [packages/desktop/src/index.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/desktop/src/index.tsx)
- [sdks/vscode/src/extension.ts](https://github.com/anomalyco/opencode/blob/dev/sdks/vscode/src/extension.ts)（VSCode 扩展）
- [packages/ui/package.json](https://github.com/anomalyco/opencode/blob/dev/packages/ui/package.json)

---

## 本章导读

### 这一章解决什么问题

这一章要回答的是：

- OpenCode 的“多端”到底是哪几个终端
- 哪些代码是共享的，哪些代码是各端单独实现的
- `packages/ui`、`packages/app`、`packages/desktop`、`sdks/vscode` 分别承担什么职责
- 平台差异为什么更多体现在 `Platform` 注入，而不是重写整套页面

### 必看入口

- [packages/ui/package.json](https://github.com/anomalyco/opencode/blob/dev/packages/ui/package.json)：共享 UI 包出口
- [packages/app/src/app.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/app/src/app.tsx)：共享应用骨架
- [packages/app/src/context/platform.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/app/src/context/platform.tsx)：平台抽象入口
- [packages/app/src/entry.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/app/src/entry.tsx)：Web 入口
- [packages/desktop/src/index.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/desktop/src/index.tsx)：Desktop 入口
- [sdks/vscode/src/extension.ts](https://github.com/anomalyco/opencode/blob/dev/sdks/vscode/src/extension.ts)：VSCode 集成入口

### 一张图先建立感觉

```text
packages/ui
  -> 提供共享组件与视觉原语
packages/app
  -> 组装共享应用骨架与状态层
  -> platform.tsx 注入平台能力
     -> entry.tsx 形成 Web
     -> desktop/index.tsx 形成 Desktop
sdks/vscode
  -> 轻客户端驱动本地 opencode 进程
```

### 先抓一条主链路

建议先看下面这条线：

```text
packages/ui 提供共享组件
  -> packages/app 组装共享应用骨架
  -> platform.tsx 注入平台差异
  -> entry.tsx 形成 Web 版本
  -> desktop/src/index.tsx 形成 Desktop 版本
  -> vscode/extension.ts 走编辑器轻集成方案
```

先理解“共享骨架 + 平台注入”的结构，再去分别看具体页面和具体组件。

### 初学者阅读顺序

1. 先看 `packages/ui` 的导出和 `packages/app/src/app.tsx`，建立共享层直觉。
2. 再看 `platform.tsx`、`entry.tsx`、`desktop/src/index.tsx`，理解 Web/Desktop 如何分化。
3. 最后再看 `sdks/vscode/src/extension.ts`，理解编辑器扩展为什么没有重做一套前端。

### 最容易误解的点

- `packages/app` 不是单纯“网页项目”，它是多端共享应用核心。
- TUI 不走 `packages/app` 这套代码，它是另一条独立的终端前端实现。
- 编辑器扩展不等于再做一个端，很多时候只是驱动本地 opencode 进程。

## 10.1 TUI 终端界面：第一个“端”

### 为什么先讲 TUI

这里先讲 TUI，不是为了重复第七篇，而是为了把它放回多端架构里重新定位：它不是“附带的命令行界面”，而是 OpenCode 最早、也最贴近开发工作流的一个终端。

### TUI 的技术栈

**位置**：`packages/opencode/src/cli/cmd/tui/`

**技术栈**：
- SolidJS：真正的响应式框架
- OpenTUI：专为终端设计的 UI 框架
- 15 层 Context Provider：管理全局状态

**启动方式**：
```bash
bun dev                    # 在当前目录启动 TUI
bun dev <directory>        # 在指定目录启动
```

### TUI 的独特优势

和 Web/Desktop 相比，TUI 的价值主要体现在：

1. **启动最快**：无需浏览器，直接在终端运行
2. **资源占用最小**：内存占用约 30MB（React TUI 约 80MB）
3. **最接近开发者工作流**：无需切换窗口
4. **支持 SSH 远程**：可以在远程服务器上使用

### TUI 与其他端的关系

TUI 不复用 `packages/app` 的页面层，而是保留一套独立前端：

```text
TUI 路径：
packages/opencode/src/cli/cmd/tui/
├── app.tsx              # TUI 根组件
├── context/             # 15 层 Context Provider
├── routes/              # 路由页面
└── component/           # TUI 专用组件

Web/Desktop 路径：
packages/app/
├── src/app.tsx          # Web/Desktop 共享根组件
├── src/context/         # 共享 Context
└── src/pages/           # 共享页面
```

原因很直接：
- TUI 使用 OpenTUI 框架（终端渲染）
- Web/Desktop 使用标准 DOM（浏览器渲染）
- 两者的渲染机制完全不同

### TUI 的核心特性

详见第七篇，这里列出关键点：

- **30+ 内置主题**：dracula、github、tokyonight 等
- **Leader 键机制**：类似 Vim 的快捷键系统
- **实时流式输出**：显示 AI 的思考过程
- **多窗口布局**：同时显示多个信息面板

---

## 10.2 `packages/ui` 不是“几个按钮”，而是共享设计系统

### 先从导出面看它到底负责什么

[packages/ui/package.json](https://github.com/anomalyco/opencode/blob/dev/packages/ui/package.json) 的导出已经很能说明问题：

- `./*` 指向组件
- `./context/*` 指向可复用上下文
- `./hooks`
- `./styles`
- `./theme/*`
- `./icons/*`
- `./fonts/*`
- `./audio/*`
- `./pierre/*`

这说明 `ui` 不只是纯展示层，还包含：

- 样式基建
- 图标和字体资源
- 主题系统
- 通用上下文
- 与代码/文件展示相关的前端能力

### 组件目录已经比“基础控件库”更深一层

当前 [packages/ui/src/components](https://github.com/anomalyco/opencode/blob/dev/packages/ui/src/components) 下不只有 `button`、`dialog`、`tabs` 这种通用控件，还有很多明显贴近 Agent 场景的组件：

- `message-nav`
- `message-part`
- `dock-prompt`
- `tool-error-card`
- `tool-status-title`
- `session-review`
- `file-search`
- `file-media`
- `line-comment`

这意味着 `ui` 层并不是中立到完全不知道业务，而是抽出了“多个前端都可能复用的 Agent UI 原语”。

### 主题系统和资源资产也是统一维护的

`packages/ui/src/theme/themes/` 下当前已经有很多主题 JSON，`packages/ui/src/assets/fonts/` 也放着字体资源。  
这比“每个应用自己定义一份 CSS 变量”更稳，因为：

- Web 和 Desktop 不会逐渐长成两套视觉语言
- 主题切换和字体切换可以统一下沉
- 组件只需要消费 design tokens，而不是重复造颜色和字体配置

### `pierre` 说明 UI 层还承担富文本与代码查看器能力

`packages/ui` 里专门有 `src/pierre/` 目录，包含：

- 选择桥接
- 虚拟化
- 文件运行时
- 评论 hover
- diff 选择

对初学者来说，这一点很重要。  
它说明一个 Agent 产品的“UI 组件库”很快就会越过普通表单控件，进入：

- 代码片段展示
- diff 浏览
- 文件上下文高亮
- 评论和注释交互

这也是为什么 `ui` 在 OpenCode 里单独成包。

---

## 10.3 `packages/app` 才是共享应用核心，而不只是 Web 页面目录

### 先看公开导出：它在提供“可嵌入的应用骨架”

[packages/app/src/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/app/src/index.ts) 当前直接导出：

- `AppBaseProviders`
- `AppInterface`
- `PlatformProvider`
- `ServerConnection`
- `useCommand`

这已经说明 `packages/app` 的定位不是“浏览器入口文件集合”，而是：

**一个可被不同壳层嵌入的前端应用核心。**

### `AppBaseProviders` 负责把一整串全局能力装起来

[packages/app/src/app.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/app/src/app.tsx) 里的 `AppBaseProviders` 会依次挂上：

- `MetaProvider`
- `Font`
- `ThemeProvider`
- `LanguageProvider`
- `UiI18nBridge`
- `ErrorBoundary`
- `DialogProvider`
- `MarkedProviderWithNativeParser`
- `FileComponentProvider`

这一层可以理解成“应用公共底座”。

它解决的不是业务逻辑，而是：

- 页面元信息
- 字体和主题
- 国际化
- 错误兜底
- 弹窗系统
- Markdown 与文件展示能力

### `AppInterface` 决定的是“这个产品怎么看起来像一个完整应用”

同一个文件里的 `AppInterface` 则负责：

- 包 `ServerProvider`
- 做连接健康检查 `ConnectionGate`
- 注入 `GlobalSDKProvider`
- 注入 `GlobalSyncProvider`
- 挂前端路由

当前真实路由结构很简洁：

- `/`
- `/:dir`
- `/:dir/session/:id?`

这说明 OpenCode 的前端路由其实很强依赖目录 slug 和 session ID，而不是传统 SaaS 那种“页面很多、资源很多”的路由风格。

### 应用层已经把“多服务器连接”当成一等公民

`packages/app/src/context/server.tsx` 和 `AppInterface` 一起构成了当前前端的一个关键信念：

**UI 默认认为自己可能要连接多个 opencode server。**

所以才会有：

- `ServerConnection`
- 默认 server
- server health polling
- server picker
- 连接失败页切换其他 server

这和普通单页应用很不一样，也很符合 OpenCode 的产品形态。

---

## 10.4 Web 和 Desktop 的区别不在页面，而在 `Platform`

### Web 入口：`entry.tsx` 提供浏览器版本的 `Platform`

[packages/app/src/entry.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/app/src/entry.tsx) 可以看作浏览器端装配器。

它会提供一套 web 平台能力：

- `openLink` 用 `window.open`
- `back` / `forward` 走浏览器 history
- `restart` 直接 `window.location.reload()`
- `notify` 用浏览器 Notification API
- 默认 server URL 存在 `localStorage`

最后再把这些能力放进：

```tsx
<PlatformProvider value={platform}>
  <AppBaseProviders>
    <AppInterface ... />
  </AppBaseProviders>
</PlatformProvider>
```

这说明 Web 版本不是写了另一套 UI，只是给同一个 `AppInterface` 注入了浏览器语义。

### Desktop 入口：`packages/desktop` 给同一套应用装上 Tauri 原生能力

[packages/desktop/src/index.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/desktop/src/index.tsx) 做的事情和 Web 很像，但注入的 `Platform` 完全不同。

它接入了大量 Tauri 插件：

- `plugin-dialog`
- `plugin-shell`
- `plugin-store`
- `plugin-http`
- `plugin-updater`
- `plugin-notification`
- `plugin-clipboard-manager`
- `plugin-deep-link`
- `plugin-process`

由此 Desktop 版本能提供 Web 没有的能力：

- 原生目录和文件选择
- 本地应用打开路径
- 深链处理
- 原生更新检查与安装
- 持久化 store
- 原生 HTTP 请求
- 剪贴板图片读取
- WSL 路径适配

### 同一个 `Platform` 接口，才是多端复用的关键设计

[packages/app/src/context/platform.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/app/src/context/platform.tsx) 定义了统一的 `Platform` 类型。

这个接口把“平台差异”明确收敛到了几个能力点：

- 导航
- 打开链接/路径
- 存储
- 更新
- 文件选择
- 通知
- 默认 server 设置
- markdown 解析
- webview 缩放

这就是 OpenCode 当前多端架构最值得学习的地方：

**共享 UI 不是靠写很多 if/else，而是靠把平台差异提到显式接口。**

---

## 10.5 VSCode 扩展：编辑器集成的轻量化方案

### VSCode 扩展并没有重做一个 Agent，而是驱动本地 opencode

VS Code 扩展入口在 [sdks/vscode/src/extension.ts](https://github.com/anomalyco/opencode/blob/dev/sdks/vscode/src/extension.ts)。

它的设计很务实：

1. 打开一个名为 `opencode` 的终端
2. 运行 `opencode --port <port>`
3. 读取当前文件或选区
4. 通过本地 HTTP 请求把 prompt 追加进 TUI

关键逻辑如下：

```ts
terminal.sendText(`opencode --port ${port}`)

await fetch(`http://localhost:${port}/tui/append-prompt`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text }),
})
```

这个方案说明 OpenCode 对"编辑器集成"的理解是：

- **编辑器负责采集上下文**
- **真正的 Agent 仍运行在 opencode 进程里**

这样做有几个现实好处：

1. 不用在 VS Code 扩展里重写核心逻辑
2. 桌面端、终端端、编辑器端共享同一后端能力
3. 调试成本低，协议边界清晰

### 文件引用格式也值得单独讲

扩展会把当前文件转成类似下面的引用：

- `@src/foo.ts`
- `@src/foo.ts#L20`
- `@src/foo.ts#L20-35`

这不是一个小细节，而是 OpenCode 在编辑器集成中非常实用的一层协议约定。

对 Agent 来说，这种格式比"把整段代码直接塞进 prompt"更轻量，也更容易和文件工具联动。

### VSCode 扩展的核心功能

**上下文采集**：
- 当前文件路径
- 选中的代码片段
- 光标位置
- 工作区路径

**命令注册**：
- `opencode.ask`：发送选中内容给 OpenCode
- `opencode.explain`：解释选中代码
- `opencode.fix`：修复选中代码
- `opencode.refactor`：重构选中代码

**与本地 opencode 的通信**：
```typescript
// 启动本地 opencode
const terminal = vscode.window.createTerminal("opencode")
terminal.sendText(`opencode --port ${port}`)

// 发送 prompt
await fetch(`http://localhost:${port}/tui/append-prompt`, {
  method: "POST",
  body: JSON.stringify({
    text: `@${relativePath}#L${startLine}-${endLine}\n\n${userPrompt}`
  })
})
```

### 为什么不在 VSCode 里重写 Agent

**Linus 式评价**：
> "这是好品味。不要在 VS Code 扩展里重写整个 Agent，只做两件事：采集上下文、驱动本地进程。这是正确的边界划分。"

**好处**：
1. **代码复用**：核心逻辑在 `packages/opencode`，不重复实现
2. **一致性**：所有端使用同一个 Agent 引擎
3. **维护成本低**：只需维护一套核心代码
4. **调试简单**：扩展只是薄薄的一层

### 其他编辑器扩展

仓库里还有 [packages/extensions/zed/extension.toml](https://github.com/anomalyco/opencode/blob/dev/packages/extensions/zed/extension.toml)。

这提醒我们一个现实问题：

不是所有扩展都要做成 VS Code 那种完整客户端。很多时候，一个轻量入口或最小集成就够用了。

---

## 10.6 状态、同步和交互能力主要沉在 `packages/app`

### `packages/app/src/context/` 才是多端状态系统的重心

如果你打开 [packages/app/src/context](https://github.com/anomalyco/opencode/blob/dev/packages/app/src/context)，会看到这层已经非常厚了。

当前至少有这些重要方向：

- `server`
- `command`
- `layout`
- `terminal`
- `model`
- `permission`
- `file`
- `global-sync`

其中最值得注意的是 `global-sync`，因为它直接说明：

前端不是每个页面自己请求一次数据，而是在努力维护一个全局同步层。

### 前端状态不是“本地 UI 状态”这么简单

从现有测试文件和上下文命名也能看出，前端当前要处理的不只是按钮开关：

- session 预取
- child store 管理
- optimistic sync
- 文件内容淘汰
- layout scroll
- command keybind
- permission auto respond

这类状态已经明显和 Agent 交互模型耦合：

- 子会话会不会影响父会话显示
- 权限请求怎么阻塞输入区
- 文件标签滚动怎么跟会话联动

所以写这一章时，最好不要再把它讲成“React/Solid 的基础状态管理教程”。

### 终端、文件树、命令面板这些高频交互都已经有独立测试和上下文

当前前端代码和测试里可以直接看到这些功能域：

- terminal
- file tree
- prompt input
- sidebar
- settings
- models
- status popover

这说明 OpenCode 的前端并不是只有“一个聊天窗口”，而是一个偏 IDE 化的工作台。

---

## 10.7 当前仓库里的多端验证方式：单元测试 + E2E，而不是每端各测一套

### `packages/app` 自己就有大量前端单元测试

这一点是旧文容易漏掉的。  
当前 `packages/app/src/` 下已经有很多 `*.test.ts(x)`，例如：

- `context/global-sync.test.ts`
- `context/permission-auto-respond.test.ts`
- `components/file-tree.test.ts`
- `components/prompt-input/*.test.ts`
- `utils/server-health.test.ts`
- `pages/session/terminal-panel.test.ts`

这些测试通过 [packages/app/happydom.ts](https://github.com/anomalyco/opencode/blob/dev/packages/app/happydom.ts) 预加载 Happy DOM，并补了 Canvas mock。

这说明 OpenCode 并不是把前端验证全部压给 E2E，而是先在应用层把很多状态逻辑拆出来测。

### E2E 测试主要围绕共享应用壳展开

[packages/app/playwright.config.ts](https://github.com/anomalyco/opencode/blob/dev/packages/app/playwright.config.ts) 当前会：

- 自动启动 Vite dev server
- 默认把前端指向 `127.0.0.1:4096` 的 opencode backend
- 失败时保留 trace、screenshot、video
- 把报告输出到 `e2e/playwright-report`

而 [packages/app/e2e/fixtures.ts](https://github.com/anomalyco/opencode/blob/dev/packages/app/e2e/fixtures.ts) 则会：

- 创建 SDK
- seed 项目数据
- 组织测试用 session
- 在测试结束后清理 session 和测试项目

这说明当前 E2E 不是“点点页面看看”，而是：

**先搭一个可重复的 Agent 场景，再验证真实交互流。**

### Desktop 当前主要复用 App 层测试覆盖

从当前仓库结构看，`packages/desktop` 没有和 `packages/app/e2e` 对称的一大套桌面端自动化测试目录。  
这更符合现在的工程取舍：

- 共享应用逻辑尽量在 `packages/app` 测透
- Desktop 重点做平台能力接入
- 真正需要差异化验证的部分集中在 Tauri 适配层

这类“测试面集中在共享层”的策略，比每端机械复制一套测试更现实。

---

## 本章小结

理解 OpenCode 的多端 UI，关键不是把 TUI、Web、Desktop、VSCode 分别背下来，而是抓住这四层分工：

1. **TUI**：终端界面，OpenCode 的第一个“端”，使用 SolidJS + OpenTUI 独立实现
2. **packages/ui**：提供共享设计系统和 Agent 场景组件
3. **packages/app**：提供 Web/Desktop 共享应用骨架、状态系统和页面逻辑
4. **packages/desktop**：通过 `Platform` 注入原生能力，而不是重写整套界面
5. **sdks/vscode**：编辑器扩展，驱动本地 opencode 进程，不重写 Agent

如果你想自己做一个 Agent 产品，这种分层方式非常值得借鉴。
因为它能让你先把“应用核心”稳定下来，再决定要不要加桌面壳、Web 壳或其他终端。

### 关键代码位置

| 模块 | 位置 | 建议关注点 |
|------|------|-----------|
| TUI 入口 | `packages/opencode/src/cli/cmd/tui/app.tsx` | 15 层 Context Provider、主题系统 |
| TUI 详细文档 | 第七篇：TUI 终端界面 | OpenTUI 框架、快捷键系统 |
| UI 组件库 | `packages/ui/package.json` | 导出结构、组件目录 |
| UI 组件 | `packages/ui/src/components` | Agent 场景组件 |
| UI 富文本 | `packages/ui/src/pierre` | 代码查看器、diff 浏览 |
| App 导出 | `packages/app/src/index.ts` | AppBaseProviders、AppInterface |
| App 骨架 | `packages/app/src/app.tsx` | Provider 装配 |
| Web 入口 | `packages/app/src/entry.tsx` | 浏览器 Platform |
| Platform 接口 | `packages/app/src/context/platform.tsx` | 平台抽象 |
| Desktop 入口 | `packages/desktop/src/index.tsx` | Tauri Platform |
| VSCode 扩展 | `sdks/vscode/src/extension.ts` | 编辑器集成 |
| E2E 配置 | `packages/app/playwright.config.ts` | 测试策略 |

### 源码阅读路径

1. **先看 TUI**：`packages/opencode/src/cli/cmd/tui/app.tsx`，理解第一个“端”的实现（详见第七篇）
2. **再看共享层**：`packages/app/src/app.tsx`，理解 Web/Desktop 共享应用骨架和 providers 的装配方式
3. **对比平台差异**：对比 `packages/app/src/entry.tsx` 与 `packages/desktop/src/index.tsx`，看同一套应用怎样接入 Web 和 Desktop 两种 `Platform`
4. **看编辑器集成**：`sdks/vscode/src/extension.ts`，理解轻量化的编辑器集成方案
5. **最后看组件库**：`packages/ui/` 看组件、主题和 `pierre` 目录，建立共享设计系统视角

### 任务

判断 OpenCode 的多端 UI 为什么更适合被理解成“共享应用核心 + 平台外壳”，而不是 Web、Desktop、VSCode 各写一套前端。

### 操作

1. 先对比 `packages/app/src/app.tsx`、`packages/app/src/entry.tsx` 和 `packages/desktop/src/index.tsx`，写下共享应用骨架与平台启动入口分别放在哪一层。
2. 再选一个 `Platform` 能力，例如 `openLink`、`notify` 或 `getDefaultServer`，比较它在 Web 和 Desktop 的实现差异。
3. 最后读 `sdks/vscode/src/extension.ts`，说明 VSCode 扩展为什么选择驱动本地 opencode 进程，而不是在扩展内重做 Agent 运行时。

### 验收

完成后你应该能说明：

- 为什么 `packages/app` 更像共享应用核心，而不是单纯的 Web 项目。
- `Platform` 抽象到底隔离了哪些真实平台差异。
- 为什么多端共享的关键不是 UI 长得像，而是后端语义和平台边界被统一控制。

### 下一篇预告

下一篇会进入代码智能层，也就是 LSP。
到那时你会更清楚：为什么一个 Agent 前端最终会长出文件树、终端、代码引用和诊断面板这些接近 IDE 的界面结构。

### 思考题

1. 为什么 `packages/app` 更适合被理解成“共享应用核心”，而不是单纯的 Web 项目？
2. `Platform` 抽象解决的核心问题是什么？哪些差异适合放进它，哪些不适合？
3. VSCode 扩展为什么选择驱动本地 opencode 进程，而不是在扩展内重做一套 Agent 运行时？

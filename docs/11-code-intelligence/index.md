---
title: 第十一篇：代码智能
description: 第十一篇：代码智能的详细内容
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/lsp/`、`packages/opencode/src/tool/lsp.ts`
> **前置阅读**：第三篇 工具系统
> **学习目标**：理解 OpenCode 的代码智能不是“单个 LSP 插件”，而是一套按语言启动、按项目隔离、按需同步、可被 Agent 调用的本地语义分析系统

---

<SourceSnapshotCard
  title="第十一篇源码快照"
  description="这一篇先抓代码智能的服务化主链路：语言服务器怎样被选择和复用、文件怎样同步、以及语义能力怎样重新包装成 Agent 可调用的接口。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: 'LSP 总入口',
      path: 'packages/opencode/src/lsp/index.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/lsp/index.ts'
    },
    {
      label: '语言服务器定义',
      path: 'packages/opencode/src/lsp/server.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/lsp/server.ts'
    },
    {
      label: 'LSP 客户端',
      path: 'packages/opencode/src/lsp/client.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/lsp/client.ts'
    },
    {
      label: 'Agent LSP 工具',
      path: 'packages/opencode/src/tool/lsp.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/tool/lsp.ts'
    }
  ]"
/>

## 核心概念速览

很多 Agent 产品会说自己“支持 LSP”，但真正落到工程里，至少要解决四个问题：

1. 不同语言怎么选服务器
2. 一个仓库里多个项目根怎么隔离
3. 文件修改后怎么同步给服务器
4. 这些能力怎么重新包装成 Agent 工具

OpenCode 在这几件事上做得比较完整。它的 LSP 系统至少包含：

- `LSPServer`：描述每种语言服务器怎么找 root、怎么启动
- `LSP`：管理客户端池、生命周期和调用入口
- `LSPClient`：负责 JSON-RPC 通信、文件同步、诊断等待
- `LspTool`：把部分能力暴露给 Agent

对初学者来说，这一篇最该学到的不是 LSP 协议教科书，而是：

**Agent 的代码理解能力，往往来自“把 IDE 时代的语义工具重新服务化”。**

---

## 本章导读

### 这一章解决什么问题

这一章要回答的是：

- OpenCode 的代码智能到底由哪几层组成
- 不同语言服务器怎样被选择、启动和隔离
- 文件变更、诊断、跳转等语义能力怎样进入 Agent 工作流
- 为什么 LSP 在这里不是“附加插件”，而是核心代码理解基础设施

### 必看入口

- [packages/opencode/src/lsp/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/lsp/index.ts)：LSP 总入口与能力导出
- [packages/opencode/src/lsp/server.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/lsp/server.ts)：语言服务器定义
- [packages/opencode/src/lsp/client.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/lsp/client.ts)：JSON-RPC 客户端与文件同步
- [packages/opencode/src/lsp/language.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/lsp/language.ts)：语言映射
- [packages/opencode/src/tool/lsp.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/lsp.ts)：暴露给 Agent 的实验性 LSP 工具

### 先抓一条主链路

建议先追这条线：

```text
文件被 read / edit / write 等工具触达
  -> lsp/index.ts 选择或复用客户端
  -> server.ts 决定语言服务器如何启动
  -> client.ts 同步文件与请求诊断
  -> 结果回流到工具、会话和界面
```

这条线先解决“LSP 怎样成为产品能力”，再去看协议细节。

### 初学者阅读顺序

1. 先读 `lsp/index.ts`，建立整体职责分工。
2. 再读 `server.ts` 和 `language.ts`，理解语言支持是怎样被声明的。
3. 最后读 `client.ts` 和 `tool/lsp.ts`，看语义能力如何真正被调用。

### 最容易误解的点

- LSP 在这里不是单独面向用户的功能页，而是很多编辑与诊断能力的底层依赖。
- 代码智能的难点不在“连上语言服务器”，而在项目根隔离、文件同步和诊断时序。
- 显式 `lsp` 工具只是能力出口之一，不代表全部 LSP 能力都只通过它暴露。

## 11.1 OpenCode 的 LSP 架构

### 先看整体角色分工

当前仓库里的 LSP 体系可以先压缩成下面这张图：

```text
Agent / Tool
  -> tool/lsp.ts
  -> LSP.index.ts
  -> LSPClient.create()
  -> 具体语言服务器进程

文件变化
  -> LSP.touchFile()
  -> didOpen / didChange / didChangeWatchedFiles
  -> publishDiagnostics
  -> 回流到 read / edit / write 的输出
```

这张图先说明两件事：

1. LSP 不只是单独的 `lsp` 工具在用
2. 文件工具和 LSP 系统是直接联动的

也就是说，即使模型没有显式调用 `lsp` 工具，也可能通过 `read/edit/write` 间接拿到语义能力。

### `LSP.index.ts` 才是调度中枢

[packages/opencode/src/lsp/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/lsp/index.ts) 负责：

- 读取配置
- 装配内置 server
- 应用实验开关
- 接入自定义 LSP 配置
- 按文件扩展名挑选候选 server
- 按 root 复用客户端
- 调度 definition / references / hover 等操作

这里真正值得看的不是某个单独函数，而是它长期维护的状态：

- `servers`
- `clients`
- `broken`
- `spawning`

这说明 OpenCode 把 LSP 当成长期运行的本地基础设施，而不是一次性脚本。

### 一个文件可能触发多种 server，但会按 root 去重

当前调度逻辑也不是“一个扩展名绑定一个 server”那么简单。它会：

1. 遍历所有启用的 server
2. 检查扩展名是否命中
3. 让各自的 `root(file)` 决定是否接管
4. 同 root 同 server 复用现有 client
5. 并发启动中的 client 会被 `spawning` 复用

这套设计解决的是现代仓库最常见的现实问题：**多语言、多子项目、多 workspace 共存。**

---

## 11.2 真实支持的语言服务器比文档里常见示例多得多

### 不要只记 TypeScript、Python、Go

当前仓库的 [packages/opencode/src/lsp/server.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/lsp/server.ts) 里，内置 server 远比“常规六件套”多。

至少可以看到这些明确的内置项：

- `deno`
- `typescript`
- `vue`
- `eslint`
- `oxlint`
- `gopls`
- `ty`
- `pyright`
- `elixir-ls`
- `zls`
- `csharp`
- `fsharp`
- `sourcekit-lsp`
- `rust`
- `clangd`

这对写电子书非常重要，因为它体现了 OpenCode 的一个真实定位：

**它不是只服务于 TypeScript 仓库，而是在努力把 LSP 做成多语言基础能力。**

### 不同 server 的安装策略也不同

OpenCode 没有强行要求所有语言服务器都预装。

从 `server.ts` 可以看到三种典型策略：

1. **系统已有则直接用**
2. **缺失时自动下载/安装**
3. **完全依赖本机工具链**

比如：

- `typescript` 通过 `typescript-language-server` 启动
- `vue` 缺失时会自动安装 `@vue/language-server`
- `eslint` 缺失时甚至会下载并编译 VS Code ESLint server
- `pyright` 缺失时会自动安装
- `rust-analyzer`、`clangd` 更依赖本机已有环境

这说明 OpenCode 的 LSP 策略不是纯粹“约定用户自己准备环境”，而是尽量帮用户补齐缺口。

### 自动下载也有明确开关

仓库里有一个很关键的开关：

- `OPENCODE_DISABLE_LSP_DOWNLOAD`

这意味着自动安装是可控的，而不是偷偷进行。  
对于企业环境或受限环境，这一点尤其重要。

---

## 11.3 根目录检测与项目隔离

### 每种语言都有自己的 root 规则

LSPServer 里的 `root()` 设计很值得学习。

OpenCode 并不是简单把当前工作目录当 root，而是为不同语言定义不同的锚点：

- TypeScript：锁文件，如 `package-lock.json`、`bun.lock`、`pnpm-lock.yaml`
- Deno：`deno.json` / `deno.jsonc`
- Go：`go.mod`
- Rust：`Cargo.toml` / `Cargo.lock`，还会继续向上找 workspace
- Clang：`compile_commands.json`、`CMakeLists.txt`、`Makefile`

这种做法有两个价值：

1. 避免错误地把整个 monorepo 当成一个语言项目
2. 保证语言服务器拿到更合适的 workspace root

### Rust 的 root 逻辑尤其能体现“工程细节”

`rust` 的处理不止找最近的 `Cargo.toml`，还会继续向上找 `[workspace]`。

这类细节非常适合写给初学者，因为它说明：

**代码智能真正难的地方，常常不在协议调用，而在“如何找到正确项目边界”。**

### 自定义 LSP 也能通过配置接入

`LSP.index.ts` 还支持把用户配置并进现有服务器表：

```ts
for (const [name, item] of Object.entries(cfg.lsp ?? {})) {
  servers[name] = {
    ...existing,
    id: name,
    root: existing?.root ?? (async () => Instance.directory),
    extensions: item.extensions ?? existing?.extensions ?? [],
    spawn: async (root) => ({ ... }),
  }
}
```

所以如果某个语言不在内置列表里，或者你想覆写内置行为，也不需要改核心源码。

---

## 11.4 LSP 客户端实现：不仅是连上去，还要把文件状态养起来

### `LSPClient.create()` 负责完整 JSON-RPC 生命周期

[packages/opencode/src/lsp/client.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/lsp/client.ts) 做的事情比文稿里常见的“发个 initialize”更完整：

1. 建立消息连接
2. 监听 `publishDiagnostics`
3. 处理多种反向请求
4. 发送 `initialize`
5. 发送 `initialized`
6. 必要时同步 `workspace/didChangeConfiguration`
7. 维护文件版本表

这里很关键的一点是，OpenCode 不把 LSP server 当黑箱，而是认真处理了它反向请求的协作面。

### 文件同步不只是 `didOpen` / `didChange`

当前实现会同时发：

- `workspace/didChangeWatchedFiles`
- `textDocument/didOpen`
- `textDocument/didChange`

这点很重要，因为不同语言服务器对文件状态变化的敏感点不同。  
OpenCode 这里走的是偏稳妥路线，而不是只赌一个最小协议子集。

### 版本号管理是必须的，不是可选细节

客户端里会维护：

```ts
const files: { [path: string]: number } = {}
```

并在每次变更时递增版本号。  
这是让 `didChange` 生效的基础之一，也能帮助服务端正确理解文件演化顺序。

### 诊断等待不是立即返回，而是做了轻量 debounce

这一点是当前实现里很值得讲的工程细节。

OpenCode 不会在收到第一条诊断就立刻结束等待，而是用了一个短暂 debounce：

- `DIAGNOSTICS_DEBOUNCE_MS = 150`

目的很现实：

- 某些 LSP 会先给语法诊断
- 再给语义诊断

如果不做 debounce，Agent 常常会拿到一个半成品诊断结果。

---

## 11.5 诊断、跳转与 Agent 工具的关系

### `LSP` 命名空间暴露的是能力 API

在 [packages/opencode/src/lsp/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/lsp/index.ts) 里，真正被其他模块消费的是这些函数：

- `touchFile`
- `diagnostics`
- `hover`
- `workspaceSymbol`
- `documentSymbol`
- `definition`
- `references`
- `implementation`
- `prepareCallHierarchy`
- `incomingCalls`
- `outgoingCalls`

也就是说，LSP 系统本质上已经被包装成了一套本地语义 API。

### 文件工具比显式 `lsp` 工具更常用

这是当前仓库里最值得提醒读者的一点。

虽然存在 [packages/opencode/src/tool/lsp.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/lsp.ts)，但它是实验性工具，且是否注册受：

- `OPENCODE_EXPERIMENTAL_LSP_TOOL`

控制。

相反，真正高频发生的是：

- `read` 之后预热 `LSP.touchFile()`
- `edit` 后触发 `LSP.touchFile(file, true)`
- `write` 后拉取全局 `diagnostics()`

也就是说，在 OpenCode 当前实现中，LSP 更像“底层语义服务”，而不是永远由模型显式调用的工具。

### `lsp` 工具当前暴露的操作范围

如果显式启用了 `lsp` 工具，它支持的操作包括：

- `goToDefinition`
- `findReferences`
- `hover`
- `documentSymbol`
- `workspaceSymbol`
- `goToImplementation`
- `prepareCallHierarchy`
- `incomingCalls`
- `outgoingCalls`

这里还有一个很细的实现点：

- `workspaceSymbol` 目前实际传的是空查询字符串

这说明工具层有时并不是把底层 API 一比一搬上来，而是做了符合 Agent 使用习惯的简化封装。

---

## 11.6 实验开关与能力切换

### `ty` 和 `pyright` 之间存在实验切换

在 `LSP.index.ts` 里有一个很关键的逻辑：

```ts
if (Flag.OPENCODE_EXPERIMENTAL_LSP_TY) {
  delete servers["pyright"]
} else {
  delete servers["ty"]
}
```

这说明：

- `ty` 目前是实验路线
- 一旦开启它，会替换掉 `pyright`

这类设计很适合电子书里拿来说明：

**Agent 系统里的能力演进，不一定靠大重构，也可以靠 feature flag 逐步替换。**

### LSP 工具本身也是实验能力

同样，显式的 `lsp` 工具也不是默认永久开放，而是由实验开关决定是否加入工具列表。

这说明团队当前对 LSP 的定位比较谨慎：

- 底层诊断能力已经稳定使用
- 显式工具暴露仍在继续验证

这是很真实的工程状态，反而比“全面支持一切”更值得写进书里。

---

## 11.7 给初学者的阅读和实践路线

### 第一步：先看 `read/edit/write` 与 LSP 的联动

不要一上来就啃 `server.ts` 全文。  
更好的切入是：

1. 看 `read.ts`
2. 看 `edit.ts`
3. 看 `write.ts`
4. 找它们调用 `LSP.touchFile()` 和 `LSP.diagnostics()` 的位置

这样你会先理解 LSP 在产品里的作用，而不是先陷进协议细节。

### 第二步：再看 `index.ts`

重点只看：

- server 装配
- root 选择
- client 复用
- 能力函数导出

这一层解决的是“系统怎么组织”。

### 第三步：最后再进 `client.ts` 和 `server.ts`

重点是：

- JSON-RPC 初始化
- diagnostics 生命周期
- 各语言 server 的 root / spawn 差异

这一层解决的是“细节怎么落地”。

### 初学者最常见的两个误区

#### 误区 1：以为 LSP 只是 `lsp` 工具

其实当前仓库里，LSP 更多是底层公共能力，被文件工具大量复用。

#### 误区 2：以为“支持某语言”只等于能启动一个进程

真实情况是还要考虑：

- root 检测
- 安装方式
- 配置同步
- 文件变化通知
- 诊断稳定性

---

## 本章小结

### 这一篇最重要的认识

1. OpenCode 的 LSP 是一套本地语义基础设施，不只是一个工具
2. 代码智能能力很多时候通过 `read/edit/write` 间接发挥作用
3. 多语言支持的核心难点在 root 检测、安装策略和生命周期管理
4. 诊断等待、能力切换、实验开关这些细节，决定了系统是否可用
5. LSP 在 Agent 里最有价值的地方，不是“支持多少协议方法”，而是“能否稳定地服务真实修改流程”

### 关键代码位置

| 模块 | 位置 | 建议重点 |
| --- | --- | --- |
| LSP 调度中枢 | `packages/opencode/src/lsp/index.ts` | server/client 管理、能力导出、实验开关 |
| LSP 客户端 | `packages/opencode/src/lsp/client.ts` | initialize、文件同步、diagnostics debounce |
| 语言服务器表 | `packages/opencode/src/lsp/server.ts` | root 检测、spawn 策略、自动下载 |
| 语言映射 | `packages/opencode/src/lsp/language.ts` | 扩展名到 languageId |
| 显式 LSP 工具 | `packages/opencode/src/tool/lsp.ts` | Agent 可调用操作 |
| 文件工具联动 | `packages/opencode/src/tool/read.ts`、`edit.ts`、`write.ts` | LSP 在真实工作流中的接入点 |

### 源码阅读路径

1. 先从 `read.ts`、`edit.ts`、`write.ts` 找到它们和 LSP 联动的入口。
2. 再看 `packages/opencode/src/lsp/index.ts`，理解调度、root 选择和 client 复用。
3. 最后进入 `client.ts` 与 `server.ts`，补齐 JSON-RPC 生命周期和多语言 server 策略细节。

### 任务

判断 OpenCode 里的 LSP 为什么更适合被看成一层底层语义基础设施，而不是单独一项“代码智能功能”。

### 操作

1. 从 `packages/opencode/src/tool/read.ts`、`edit.ts`、`write.ts` 找到它们与 LSP 联动的入口，记录文件工具怎样间接复用语义能力。
2. 再读 `packages/opencode/src/lsp/index.ts`，整理 root 选择、client 复用和调度策略。
3. 最后进入 `client.ts` 与 `server.ts`，选一种你熟悉的语言，写下它的 server 启动方式、root 检测规则，以及显式 `lsp` 工具适合的场景。

### 验收

完成后你应该能说明：

- 为什么 `read/edit/write` 对 LSP 的复用，比单独暴露一个显式 `lsp` 工具更关键。
- 为什么语言服务是否“真正可用”，取决于 root、诊断和复用策略，而不只是能不能启动进程。
- 为什么 LSP 在 Agent 项目里属于底层语义设施，而不是附属增强功能。

### 下一篇预告

第十二篇会把视角从“代码智能”切回“扩展智能”：

- 插件怎么接到 OpenCode
- Skill 怎么给 Agent 注入方法论
- 命令模板怎么复用 Prompt
- VS Code / Zed 怎么把编辑器上下文送进 Agent

这样你会看到另一个同样重要的问题：  
不是 Agent 能看懂代码就够了，它还得能被持续扩展。

### 思考题

1. 为什么在 Agent 项目里，LSP 更应该被看成底层语义基础设施，而不是单独一项“代码智能功能”？
2. `read/edit/write` 复用 LSP 能力，比单独暴露一个显式 `lsp` 工具更关键的原因是什么？
3. 如果某种语言“能启动服务端但诊断不稳定”，你会把它视为已经支持了吗？为什么？

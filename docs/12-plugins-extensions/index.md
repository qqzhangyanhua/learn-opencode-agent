---
title: 第十二篇：插件与扩展
description: 第十二篇：插件与扩展的详细内容
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/plugin/`、`packages/opencode/src/plugin/`、`packages/opencode/src/skill/`、`packages/opencode/src/command/`、`.opencode/`、`sdks/vscode/`
> **前置阅读**：第六篇 MCP 协议集成、第三篇 工具系统
> **学习目标**：理解 OpenCode 当前仓库里的真实扩展方式，知道什么时候该写插件、什么时候该写 Skill、什么时候只需要一个命令模板

---

<SourceSnapshotCard
  title="第十二篇源码快照"
  description="这一篇先把扩展手段分清楚：插件、Skill、命令和编辑器扩展各自从哪条入口进入系统，以及它们最后怎样汇入统一能力边界。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: '插件接口',
      path: 'packages/plugin/src/index.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/plugin/src/index.ts'
    },
    {
      label: '运行时插件加载',
      path: 'packages/opencode/src/plugin/index.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/plugin/index.ts'
    },
    {
      label: 'Skill 装载',
      path: 'packages/opencode/src/skill/skill.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/skill/skill.ts'
    },
    {
      label: 'Command 入口',
      path: 'packages/opencode/src/command/index.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/command/index.ts'
    }
  ]"
/>

## 核心概念速览

如果你是 Agent 开发初学者，这一篇最重要的目标不是背概念，而是先分清楚 OpenCode 里几种扩展方式各自负责什么：

- **插件（Plugin）**：写 TypeScript 代码，接入 Hook、认证逻辑、自定义工具，适合“要运行逻辑”的扩展
- **Skill**：写 `SKILL.md`，给 Agent 注入一整套工作流和额外资源，适合“要教模型怎么做”的扩展
- **命令（Command）**：写 Markdown 模板，生成固定提示词，适合高频场景复用
- **MCP Prompt / Tool**：来自外部 MCP 服务器，适合把外部系统能力接进来
- **编辑器扩展**：如 VS Code / Zed，把 OpenCode 接到具体开发环境里

对当前仓库来说，这几条线不是并列的孤岛，而是互相打通的：

```text
.opencode/command/*.md ─────┐
                           ├── Command.list() -> 统一命令入口
.opencode/skill/**/SKILL.md ┤
                           │
MCP prompts ───────────────┘

packages/plugin/src/* -> 定义插件接口
packages/opencode/src/plugin/index.ts -> 加载插件
packages/opencode/src/tool/registry.ts -> 把插件工具接入 Agent
sdks/vscode/src/extension.ts -> 把编辑器上下文送进 opencode TUI
```

这也是 OpenCode 值得写进电子书的地方：它不是抽象地谈“Agent 可扩展”，而是把扩展能力拆成了几种成本不同、适用范围不同的工程手段。

---

## 本章导读

### 这一章解决什么问题

这一章要回答的是：

- OpenCode 当前到底有哪些扩展手段
- 插件、Skill、命令模板、MCP、编辑器扩展分别适合什么场景
- 外部扩展如何进入统一的工具、命令和上下文体系
- 为什么“不是所有扩展都要写 TypeScript 代码”

### 必看入口

- [packages/plugin/src/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/index.ts)：插件接口定义
- [packages/opencode/src/plugin/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/plugin/index.ts)：插件加载入口
- [packages/opencode/src/skill/skill.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/skill/skill.ts)：Skill 发现与装载
- [packages/opencode/src/command/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/command/index.ts)：命令统一入口
- [packages/opencode/src/tool/registry.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/registry.ts)：插件工具接入点
- [sdks/vscode/src/extension.ts](https://github.com/anomalyco/opencode/blob/dev/sdks/vscode/src/extension.ts)：编辑器端扩展入口

### 先抓一条主链路

建议先只看这条线：

```text
plugin / skill / command / MCP prompt 等扩展来源
  -> plugin/index.ts / skill.ts / command/index.ts 发现与装载
  -> tool/registry.ts 或命令系统统一接入
  -> session / agent / TUI / 编辑器扩展消费这些能力
```

先理解“扩展怎样被接入统一入口”，再分别比较不同扩展形态的成本和适用场景。

### 初学者阅读顺序

1. 先读 `packages/plugin/src/index.ts` 和 `packages/opencode/src/plugin/index.ts`，理解代码型插件。
2. 再读 `skill/skill.ts` 和 `command/index.ts`，理解轻量扩展怎样装进系统。
3. 最后回到 `tool/registry.ts` 和 `sdks/vscode/src/extension.ts`，看这些扩展如何进入实际用户流程。

### 最容易误解的点

- “扩展”不是单一机制，而是一组成本不同的工程手段。
- Skill 和 Command 的价值不低，它们很多时候比新插件更适合初学者。
- 插件接入之后仍然要回到统一权限、工具和会话边界中，不是随意外挂逻辑。

## 12.1 扩展体系全景

### 先从目录理解整体结构

在当前仓库里，扩展能力不是集中在一个目录里，而是分散在几条不同链路上。先把目录对上，再谈抽象会更清楚：

```text
packages/plugin/
  src/index.ts          # 插件类型定义（PluginInput、Hooks、AuthHook）
  src/tool.ts           # 插件自定义工具的定义方式
  src/shell.ts          # 插件里可用的 Bun Shell 类型

packages/opencode/src/plugin/
  index.ts              # 插件加载器
  codex.ts              # 内置认证插件
  copilot.ts            # 内置认证插件

packages/opencode/src/skill/
  skill.ts              # Skill 发现、加载、权限过滤

packages/opencode/src/command/
  index.ts              # 命令统一注册，合并 command / mcp / skill

.opencode/
  agent/                # 自定义 Agent
  command/              # 自定义命令模板
  tool/                 # 项目级自定义工具
  themes/               # 主题

sdks/vscode/
  src/extension.ts      # VS Code 扩展入口

packages/extensions/zed/
  extension.toml        # Zed 扩展配置
```

如果你只看 `packages/plugin`，很容易误以为“扩展 = npm 插件”；如果只看 `.opencode/`，又会误以为“扩展 = 配置文件 + Markdown”。真实情况更接近下面这四类：

1. **代码型扩展**放在插件里
2. **提示词型扩展**放在 Skill 和 Command 里
3. **外部系统型扩展**放在 MCP 里
4. **宿主环境型扩展**放在编辑器扩展里

### 初学者该怎么选

可以用一个很实用的判断法：

| 你的目标 | 最合适的方式 |
| --- | --- |
| 我想加一个固定工作流，让 Agent 按步骤做事 | Skill |
| 我想复用一段固定提示词 | Command |
| 我想让 Agent 多一个可执行能力 | Plugin Tool |
| 我想接入 GitHub、Slack、内部平台等外部系统 | MCP 或 Plugin |
| 我想把编辑器当前文件、选区发给 OpenCode | 编辑器扩展 |

经验上，**先写 Command，再写 Skill，再写 Plugin**，通常是成本最低、也最适合初学者建立手感的路径。

---

## 12.2 插件系统架构

### 插件接口长什么样

OpenCode 当前插件接口定义在 [packages/plugin/src/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/index.ts)。

插件本质上是一个返回 Hook 集合的异步函数：

```ts
export type Plugin = (input: PluginInput) => Promise<Hooks>
```

其中 `PluginInput` 会把运行时上下文交给插件：

```ts
export type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>
  project: Project
  directory: string
  worktree: string
  serverUrl: URL
  $: BunShell
}
```

这几个字段里最关键的是：

- `client`：插件可以直接调用 OpenCode SDK
- `directory` / `worktree`：插件知道当前项目目录
- `serverUrl`：插件知道当前服务地址
- `$`：插件可以安全地复用 Bun Shell 风格执行器

### Hook 不是 before/after 两三个名字，而是一组命名事件

这里最容易讲错的地方是把它写成“before/after 两三个钩子”。OpenCode 当前的插件 Hook 实际上是一组明确命名的扩展点，例如：

- `"chat.message"`
- `"chat.params"`
- `"chat.headers"`
- `"permission.ask"`
- `"command.execute.before"`
- `"tool.execute.before"`
- `"tool.execute.after"`
- `"shell.env"`
- `"tool.definition"`
- `"experimental.session.compacting"`

也就是说，插件更像一个“命名钩子表”：

```ts
export interface Hooks {
  event?: (input: { event: Event }) => Promise<void>
  config?: (input: Config) => Promise<void>
  tool?: { [key: string]: ToolDefinition }
  auth?: AuthHook
  "chat.message"?: (...) => Promise<void>
  "tool.execute.before"?: (...) => Promise<void>
  "tool.execute.after"?: (...) => Promise<void>
  "permission.ask"?: (...) => Promise<void>
}
```

这种设计的好处是：

1. 扩展点名称稳定，语义明确
2. 插件之间更容易串联
3. 可以逐步扩展，而不是频繁改接口

### 插件是怎么被加载的

真正的加载入口在 [packages/opencode/src/plugin/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/plugin/index.ts)。

加载顺序可以概括成四步：

1. 构造 `PluginInput`
2. 先加载内置插件
3. 再读取 `config.plugin`
4. 对 npm 插件执行安装、导入、去重初始化

关键代码的思路如下：

```ts
const INTERNAL_PLUGINS = [CodexAuthPlugin, CopilotAuthPlugin, GitlabAuthPlugin]

let plugins = config.plugin ?? []
if (!Flag.OPENCODE_DISABLE_DEFAULT_PLUGINS) {
  plugins = [...BUILTIN, ...plugins]
}

for (let plugin of plugins) {
  if (!plugin.startsWith("file://")) {
    plugin = await BunProc.install(pkg, version)
  }

  await import(plugin).then(async (mod) => {
    const seen = new Set<PluginInstance>()
    for (const [_name, fn] of Object.entries<PluginInstance>(mod)) {
      if (seen.has(fn)) continue
      seen.add(fn)
      hooks.push(await fn(input))
    }
  })
}
```

这里有三个很值得学习的工程点：

- **内置插件与外部插件分开**：第一方能力不用走 npm 安装链路
- **插件安装延后**：只有配置里声明了才会安装
- **函数去重**：兼容 `export default` 和命名导出指向同一函数的情况

### 插件工具如何进入 Agent 世界

插件如果要给 Agent 增加工具，不是直接改 `packages/opencode/src/tool/registry.ts`，而是把工具挂到 `Hooks.tool` 上。

之后 `ToolRegistry` 会统一收集：

1. 内置工具
2. `.opencode/tool` 或 `tool/` 目录的项目级工具
3. 插件通过 `hook.tool` 提供的工具

对应实现见 [packages/opencode/src/tool/registry.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/registry.ts)。

也就是说，插件工具最终仍然走统一工具注册表，而不是搞一套单独执行链路。

这点非常重要，因为它说明：

**OpenCode 的扩展不是“外挂系统”，而是被吸纳回统一 Agent 工具模型里的。**

### 一个贴近仓库的最小插件示例

如果你只是想从仓库出发做实验，可以先写一个只改 `shell.env` 或 `tool.execute.after` 的小插件，不要上来就做 OAuth。

例如：

```ts
import { tool, type Plugin } from "@opencode-ai/plugin"

export const Demo: Plugin = async () => {
  return {
    tool: {
      hello: tool({
        description: "返回一段测试文本，确认插件工具已加载",
        args: {
          name: tool.schema.string(),
        },
        async execute(args) {
          return `hello ${args.name}`
        },
      }),
    },
    "tool.execute.after": async (input, output) => {
      if (input.tool !== "hello") return
      output.title = "插件工具执行完成"
    },
  }
}

export default Demo
```

然后在配置里声明：

```json
{
  "plugin": ["file:///absolute/path/to/my-plugin/dist/index.js"]
}
```

对初学者来说，这比一开始就写一个完整认证插件更适合入门。

---

## 12.3 Skill 系统设计

### Skill 不是插件，它更像”可加载的专用操作手册”

Skill 的核心实现位于 [packages/opencode/src/skill/skill.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/skill/skill.ts)。

它解决的问题不是”执行代码”，而是”把一组高质量说明书注入给 Agent”。

你可以把 Skill 理解成：

- 一份 `SKILL.md`
- 若干脚本、模板、参考资料
- 一套适用于特定任务的工作方法

这非常适合电子书里的教学目标，因为它直接体现了 Agent 开发里常见的一条经验：

**很多时候你不需要新增工具，只需要让模型遵循更好的流程。**

### Skill 与 SkillTool 的关系

**重要概念区分**（与第三篇呼应）：

很多初学者会困惑：Skill 是工具吗？

答案：**Skill 不是工具，但有一个工具用来加载 Skill。**

```text
Skill（提示词工作流）
├── SKILL.md              # 主要内容
├── templates/            # 模板文件
├── scripts/              # 辅助脚本
└── examples/             # 示例代码

SkillTool（内置工具）
├── 列出可用 Skill
├── 请求 skill 权限
└── 加载 SKILL.md 内容到上下文
```

**关系图**：
```text
第三篇视角（工具系统）：
工具注册表
├── read
├── write
├── bash
└── skill  ← 这是 SkillTool，不是 Skill

第十二篇视角（扩展系统）：
Skill 系统
├── Skill 发现与加载
├── SkillTool 提供工具接口
└── 命令系统集成
```

**为什么这个区分很重要**：
1. Skill 存储在 `.opencode/skill/` 目录，不在工具注册表中
2. SkillTool 在工具注册表中，负责加载 Skill
3. Agent 通过 SkillTool 访问 Skill，而不是直接读取文件
4. 这种设计实现了”提示词工作流”与”工具系统”的解耦

### 当前仓库支持从哪些位置发现 Skill

Skill 扫描来源并不只是一处，这也是当前项目很有代表性的设计：

1. `.opencode/skill/**/SKILL.md`
2. `.opencode/skills/**/SKILL.md`
3. 外部目录 `.claude/skills/**/SKILL.md`
4. 外部目录 `.agents/skills/**/SKILL.md`
5. `config.skills.paths`
6. `config.skills.urls`

简化后的扫描逻辑如下：

```ts
const EXTERNAL_DIRS = [".claude", ".agents"]
const OPENCODE_SKILL_PATTERN = "{skill,skills}/**/SKILL.md"

for (const dir of await Config.directories()) {
  const matches = await Glob.scan(OPENCODE_SKILL_PATTERN, { cwd: dir, absolute: true })
  for (const match of matches) {
    await addSkill(match)
  }
}
```

这个设计说明 OpenCode 不把 Skill 锁死在自己生态里，而是愿意兼容外部 Agent 工具已经形成的目录习惯。

### Skill 如何进入命令系统

更巧妙的一点在 [packages/opencode/src/command/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/command/index.ts)。

`Command.list()` 会把三类东西统一成“可调用命令”：

1. 本地 `command`
2. MCP `prompt`
3. Skill

代码里很直接：

```ts
for (const skill of await Skill.all()) {
  if (result[skill.name]) continue
  result[skill.name] = {
    name: skill.name,
    description: skill.description,
    source: "skill",
    get template() {
      return skill.content
    },
    hints: [],
  }
}
```

这意味着 Skill 并不是一套完全平行的系统，它会被收敛进统一命令入口。

这对用户体验的意义是：

- 用户不必区分“这是命令还是 Skill”
- Agent 可以用统一方式暴露可用能力
- 扩展系统更容易组合

### Skill 工具负责“按需加载全文”

除了在命令系统中暴露，Skill 还会通过 [packages/opencode/src/tool/skill.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/skill.ts) 作为工具供 Agent 使用。

这个工具会做三件事：

1. 列出当前可用 Skill
2. 请求 `skill` 权限
3. 把 `SKILL.md` 内容和目录样本注入上下文

所以 Skill 的本质不是“静态文档”，而是**上下文按需装载机制**。

### 什么时候该写 Skill

下面几类场景非常适合：

- 某类任务总有固定操作顺序
- 需要携带模板、脚本、参考资料
- 希望不同 Agent 在同一场景下保持一致风格
- 不需要新增真正的运行时代码

例如你这本书如果要带读者做“从仓库里定位插件加载链路”，其实就很适合写成一个 Skill，而不是插件。

---

## 12.4 自定义命令开发

### 命令的载体其实就是 Markdown 模板

命令系统入口在 [packages/opencode/src/command/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/command/index.ts)，配置加载逻辑在 [packages/opencode/src/config/config.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/config/config.ts)。

OpenCode 会扫描：

- `command/**/*.md`
- `commands/**/*.md`
- `.opencode/command/**/*.md`
- `.opencode/commands/**/*.md`

当前仓库自己就有例子，比如 [.opencode/command/learn.md](https://github.com/anomalyco/opencode/blob/dev/.opencode/command/learn.md)。

### 命令为什么适合初学者

命令的成本最低：

- 不用写 TypeScript
- 不用发 npm 包
- 不用碰 Hook
- 只要把固定提示词模板整理好

比如：

```md
---
description: 解释当前仓库某个目录的职责和调用链
---

请阅读 $1 对应的目录，回答：
1. 它解决什么问题
2. 关键入口文件是哪一个
3. 它依赖哪些上游模块
4. 初学者最容易忽略什么
```

然后你就可以把它作为一个高频命令复用。

### 模板变量怎么工作

命令系统会自动分析模板里的占位符：

- `$1`、`$2` 这类位置参数
- `$ARGUMENTS` 这类整段参数

对应逻辑在：

```ts
export function hints(template: string): string[] {
  const result: string[] = []
  const numbered = template.match(/\$\d+/g)
  if (numbered) {
    for (const match of [...new Set(numbered)].sort()) result.push(match)
  }
  if (template.includes("$ARGUMENTS")) result.push("$ARGUMENTS")
  return result
}
```

这说明命令系统并不复杂，它只是把“Prompt 模板”做成了一个可以被发现、列出、调用的正式机制。

### 默认命令也值得看

OpenCode 自带两个默认命令：

- `init`
- `review`

它们来自 [packages/opencode/src/command/template/initialize.txt](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/command/template/initialize.txt) 和 [packages/opencode/src/command/template/review.txt](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/command/template/review.txt)。

这两个命令很适合电子书里作为案例讲，因为它们能说明：

- 命令系统本质上是“产品内建提示词资产”
- 命令既能面向用户，也能面向 Agent 编排

---

## 12.5 编辑器扩展：VS Code 与 Zed

### VS Code 扩展并没有重做一个 Agent，而是驱动本地 opencode

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

这个方案说明 OpenCode 对“编辑器集成”的理解是：

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

对 Agent 来说，这种格式比“把整段代码直接塞进 prompt”更轻量，也更容易和文件工具联动。

### Zed 扩展目前更轻

仓库里还有 [packages/extensions/zed/extension.toml](https://github.com/anomalyco/opencode/blob/dev/packages/extensions/zed/extension.toml)。

这提醒我们一个现实问题：

不是所有扩展都要做成 VS Code 那种完整客户端。很多时候，一个轻量入口或最小集成就够用了。

---

## 12.6 给初学者的实践路线

如果你是第一次基于这个仓库学习 Agent 扩展，我建议按下面顺序动手：

### 第一步：先写命令

目标：

- 在 `.opencode/command/` 下新建一个 Markdown 模板
- 复用某个你经常会问的问题

你会学到：

- Prompt 模板如何产品化
- 命令是如何被发现和列出的

### 第二步：再写 Skill

目标：

- 在 `.opencode/skill/你的技能名/SKILL.md` 下写一份工作流说明
- 给它配一两个辅助文件

你会学到：

- 如何给 Agent 注入方法论
- Skill 与权限、命令系统的关系

### 第三步：最后再写插件

目标：

- 先实现一个最小 `tool` 或 `tool.execute.after`
- 再考虑更复杂的 Hook

你会学到：

- 运行时扩展和提示词扩展的边界
- 插件加载链路和工具注册链路

对初学者来说，这个顺序非常重要。很多人一上来就想“做插件”，最后写了一堆本该由 Skill 或 Command 解决的东西。

---

## 本章小结

### 这一篇真正要掌握什么

不是“OpenCode 有很多扩展点”，而是下面这几个判断：

1. 复用提示词，用 Command
2. 复用工作流，用 Skill
3. 新增运行时能力，用 Plugin
4. 接外部系统，用 MCP 或 Plugin
5. 接编辑器，用轻客户端驱动现有后端

### 关键代码位置

| 模块 | 位置 | 建议关注点 |
| --- | --- | --- |
| 插件接口 | `packages/plugin/src/index.ts` | `PluginInput`、`Hooks`、`AuthHook` |
| 插件加载 | `packages/opencode/src/plugin/index.ts` | 内置插件、npm 安装、动态导入、去重 |
| 插件工具接入 | `packages/opencode/src/tool/registry.ts` | `fromPlugin()`、统一工具注册 |
| Skill 发现 | `packages/opencode/src/skill/skill.ts` | 扫描来源、权限过滤、外部兼容 |
| Skill 工具 | `packages/opencode/src/tool/skill.ts` | 按需装载 Skill 内容 |
| 命令系统 | `packages/opencode/src/command/index.ts` | command / mcp / skill 统一入口 |
| 配置扫描 | `packages/opencode/src/config/config.ts` | `.opencode` 目录的命令、插件、Agent 加载 |
| VS Code 扩展 | `sdks/vscode/src/extension.ts` | 终端启动、文件引用、追加 prompt |

### 源码阅读路径

1. 先看 `packages/plugin/src/index.ts` 和 `packages/opencode/src/plugin/index.ts`，理解插件接口和加载链路。
2. 再看 `packages/opencode/src/skill/skill.ts` 与 `packages/opencode/src/command/index.ts`，理解 Skill 和命令模板怎样进入统一入口。
3. 最后读 `sdks/vscode/src/extension.ts`，看编辑器扩展怎样把本地 opencode 接进开发环境。

### 任务

判断在 OpenCode 里，一个扩展需求到底应该落成 Plugin、Skill、Command 还是 MCP，关键不在功能听起来多高级，而在它需要进入哪一层运行时边界。

### 操作

1. 打开 `packages/plugin/src/index.ts` 和 `packages/opencode/src/plugin/index.ts`，确认代码型插件拿到哪些运行时上下文，以及它们怎样被加载进系统。
2. 再读 `packages/opencode/src/skill/skill.ts` 与 `packages/opencode/src/command/index.ts`，比较 Skill、Command 和 MCP Prompt 是怎样被统一收进命令入口的。
3. 最后拿一个你常做的高频任务做判断：它更适合写成 Plugin、Skill、Command 还是 MCP，并顺着相关入口文件写出原因。

### 验收

完成后你应该能说明：

- 为什么很多扩展需求其实不需要新增运行时代码。
- 为什么 Skill 和 Command 往往是比“直接写插件”更低漂移的第一步。
- 为什么一个扩展想进入真实用户流程，最终还得回到统一的工具、命令或上下文边界。

### 下一篇预告

在第十三篇里，更适合从“本地运行时 + 云端基础设施”两条线来理解 OpenCode：

- 本地 CLI / TUI / Desktop 如何运行
- Web 与 Console 各自承担什么职责
- 云端控制台和工作区服务为什么单独拆包

这样比单纯讲部署平台，更贴近你真正会在仓库里看到的结构。

### 思考题

1. 面对一个高频开发任务，你会如何判断它更适合做成 Command、Skill 还是 Plugin？
2. 为什么 Skill 和 Command 往往比“直接写插件”更适合作为初学者的第一步扩展方式？
3. 一个扩展如果想进入真实用户流程，最终为什么还得回到统一的工具、命令或上下文边界？

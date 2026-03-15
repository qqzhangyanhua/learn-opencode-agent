---
title: 第三篇：工具系统
description: 第三篇：工具系统的详细内容
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/tool/`
> **前置阅读**：第二篇 Agent 核心系统
> **学习目标**：理解 OpenCode 里的工具不是几个零散脚本，而是一套统一的能力注册、权限控制、结果裁剪和模型适配机制

---

<SourceSnapshotCard
  title="第三篇源码快照"
  description="这一篇先别急着背工具清单，而要先抓住工具怎样被注册、筛选、执行和约束，真正看清 Agent 和外部世界的能力边界。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: '工具注册表',
      path: 'packages/opencode/src/tool/registry.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/tool/registry.ts'
    },
    {
      label: '统一工具壳',
      path: 'packages/opencode/src/tool/tool.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/tool/tool.ts'
    },
    {
      label: 'Bash 工具',
      path: 'packages/opencode/src/tool/bash.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/tool/bash.ts'
    },
    {
      label: '任务编排工具',
      path: 'packages/opencode/src/tool/task.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/tool/task.ts'
    }
  ]"
/>

## 核心概念速览

如果说 Agent 是“大脑”，那工具系统就是它和外部世界的全部接口。

在当前仓库里，OpenCode 的工具系统不是简单的“给模型几个函数”：

- 工具先在注册表里汇总
- 再按客户端、模型、实验开关做过滤
- 执行前会走权限询问
- 执行后会统一裁剪输出
- 部分工具还会触发 LSP、子任务、插件 Hook 等后续链路

这意味着你理解工具系统时，不能只盯着 `read.ts` 或 `bash.ts`，而要先看“工具是怎么被接入 Agent 的”。

当前最关键的入口有三个：

- [packages/opencode/src/tool/tool.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/tool.ts)：工具抽象
- [packages/opencode/src/tool/registry.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/registry.ts)：工具注册表
- [packages/opencode/src/tool/schema.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/schema.ts)：工具 ID 类型

---

## 本章导读

### 这一章解决什么问题

这一章不是教你背工具清单，而是要回答：

- 工具怎样进入 Agent 可见列表
- 为什么同一仓库里，不同模型和不同客户端看到的工具集合会不同
- 工具执行前后的权限、裁剪、metadata 更新是谁负责的
- 什么时候应该写新工具，什么时候应该改用 Skill 或 Command

### 必看入口

- [packages/opencode/src/tool/registry.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/registry.ts)：工具汇总和过滤入口
- [packages/opencode/src/tool/tool.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/tool.ts)：统一工具包装器
- [packages/opencode/src/tool/read.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/read.ts)：典型 I/O 工具
- [packages/opencode/src/tool/bash.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/bash.ts)：高风险环境交互工具
- [packages/opencode/src/tool/task.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/task.ts)：编排型工具

### 一张图先建立感觉

```text
registry.ts
  -> 汇总内置工具
  -> 接入插件 / Skill 工具
  -> 按模型 / 客户端 / 开关过滤
  -> Tool.define() 包装统一执行壳
  -> 权限 / 参数 / 输出裁剪
  -> read / bash / task ... 具体能力落地
```

### 先抓一条主链路

建议只追下面这条链路：

```text
registry.ts
  -> 生成当前可用工具列表
  -> Tool.define() 统一包装
  -> 权限检查 / 参数校验
  -> 具体工具执行
  -> 输出裁剪 / metadata 更新
```

先理解“工具是怎样被系统接纳和约束的”，再分别去看 `read`、`bash`、`task` 这些具体实现。

### 初学者阅读顺序

1. 先看 `registry.ts`，建立工具全景。
2. 再看 `tool.ts`，理解每个工具共有的执行外壳。
3. 最后选一个读写类工具和一个编排类工具，对比它们的输入、权限和输出结构。

### 最容易误解的点

- 工具不是“模型直接调用的几个函数”，而是带权限、裁剪和产品元数据的一层系统边界。
- 新需求不一定要新工具，很多时候 Skill、Command、Prompt 组合更合适。
- 看工具时不能只盯函数体，真正决定工程质量的往往是执行前后的约束层。

## 3.1 工具注册与发现机制

### 先看真实注册表，而不是只看单个工具文件

OpenCode 当前内置工具的真实集合在 [packages/opencode/src/tool/registry.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/registry.ts)。

它不是只注册 `read/write/edit/glob/grep`，而是把多类工具统一收进一个列表：

```ts
return [
  InvalidTool,
  ...(question ? [QuestionTool] : []),
  BashTool,
  ReadTool,
  GlobTool,
  GrepTool,
  EditTool,
  WriteTool,
  TaskTool,
  WebFetchTool,
  TodoWriteTool,
  WebSearchTool,
  CodeSearchTool,
  SkillTool,
  ApplyPatchTool,
  ...(Flag.OPENCODE_EXPERIMENTAL_LSP_TOOL ? [LspTool] : []),
  ...(config.experimental?.batch_tool === true ? [BatchTool] : []),
  ...(Flag.OPENCODE_EXPERIMENTAL_PLAN_MODE && Flag.OPENCODE_CLIENT === "cli" ? [PlanExitTool] : []),
  ...custom,
]
```

这张列表至少说明三件事：

1. 工具系统不仅处理文件，还处理提问、任务拆分、网页读取、技能装载、补丁应用
2. 一部分工具是否启用，取决于运行环境
3. “当前有哪些工具可用”不是静态结论，而是注册表运行后的结果

### 工具的来源其实有三层

注册表会收集三类工具：

1. **内置工具**
2. **项目级自定义工具**
3. **插件提供的工具**

其中项目级自定义工具会扫描 `tool/` 或 `tools/` 目录：

```ts
Glob.scanSync("{tool,tools}/*.{js,ts}", { cwd: dir, absolute: true, dot: true, symlink: true })
```

插件工具则来自 `plugin.tool`：

```ts
for (const plugin of plugins) {
  for (const [id, def] of Object.entries(plugin.tool ?? {})) {
    custom.push(fromPlugin(id, def))
  }
}
```

也就是说，OpenCode 的工具扩展路径至少有两条：

- 你可以在项目里直接塞一个工具文件
- 也可以通过 npm 插件把工具注入进来

这比“必须改核心源码才能加工具”更接近真实产品化设计。

### 工具不是全部无条件暴露给模型

工具列表拿到之后，还会继续过滤。当前仓库里至少有三类过滤逻辑：

1. **客户端条件**
2. **模型条件**
3. **实验开关条件**

例如：

- `question` 只在 `app/cli/desktop` 或显式开关下启用
- `websearch/codesearch` 只在 `opencode` provider 或 Exa 开关下启用
- `apply_patch` 和 `edit/write` 会根据模型类型二选一
- `lsp`、`batch`、`plan_exit` 都受实验开关控制

其中最有意思的是补丁工具选择：

```ts
const usePatch =
  model.modelID.includes("gpt-") && !model.modelID.includes("oss") && !model.modelID.includes("gpt-4")
if (t.id === "apply_patch") return usePatch
if (t.id === "edit" || t.id === "write") return !usePatch
```

这说明工具系统不只是“能力目录”，还会根据模型交互风格调整暴露给模型的工具形态。

---

## 3.2 Tool 抽象：一个工具到底由什么组成

### `Tool.define()` 才是工具的标准入口

当前工具定义统一走 [packages/opencode/src/tool/tool.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/tool.ts)：

```ts
export function define(id, init) {
  return {
    id,
    init: async (initCtx) => {
      const toolInfo = init instanceof Function ? await init(initCtx) : init
      const execute = toolInfo.execute
      toolInfo.execute = async (args, ctx) => {
        toolInfo.parameters.parse(args)
        const result = await execute(args, ctx)
        const truncated = await Truncate.output(result.output, {}, initCtx?.agent)
        return {
          ...result,
          output: truncated.content,
          metadata: {
            ...result.metadata,
            truncated: truncated.truncated,
          },
        }
      }
      return toolInfo
    },
  }
}
```

从这段代码你能看出，一个工具最少要解决四件事：

1. 定义参数 Schema
2. 提供面向模型的描述
3. 实现执行逻辑
4. 接受统一的结果裁剪包装

### 工具上下文里真正有价值的字段

`Tool.Context` 里最常用的不是很多，而是下面几个：

- `sessionID`
- `messageID`
- `agent`
- `abort`
- `messages`
- `metadata()`
- `ask()`

其中最重要的是两个：

#### `ctx.ask()`

这不是“可选交互”，而是权限系统和工具系统的连接点。  
很多工具真正危险的地方，不在执行代码本身，而在它们拿到什么权限。

#### `ctx.metadata()`

这允许工具把中间输出同步给前端，例如 `bash` 工具会在命令执行过程中不断更新输出片段，而不是等进程结束后一次性给结果。

### 工具 ID 也是正式类型，不是随便一串字符串

[packages/opencode/src/tool/schema.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/schema.ts) 里定义了 `ToolID`，虽然不复杂，但它体现的是工程态度：

- 工具名称是系统协议的一部分
- 它会被其他模块稳定引用
- 不能把工具名当成无约束文本随便传来传去

---

## 3.3 按职责理解工具，而不是按文件名死记

如果你是初学者，我更建议按“能力类型”来记工具，而不是按文件个数来记。

### 第一类：文件与代码操作

这类是最基础的：

- `read`
- `edit`
- `write`
- `apply_patch`

它们的区别不是“都能改文件”，而是修改粒度不同：

| 工具 | 适合场景 | 特点 |
| --- | --- | --- |
| `read` | 看文件、看目录、读取附件 | 支持目录、分页、图片/PDF |
| `edit` | 精确替换局部文本 | 强依赖 `oldString` 命中 |
| `write` | 整体重写文件 | 适合完整生成 |
| `apply_patch` | 用补丁格式做结构化修改 | 更适合某些 GPT 模型 |

### 第二类：搜索与定位

这类是 Agent 真正“会找东西”的基础：

- `glob`
- `grep`
- `codesearch`
- `lsp`（实验）

其中：

- `glob` 解决“去哪找”
- `grep` 解决“搜什么文本”
- `codesearch` 解决“语义相关代码”
- `lsp` 解决“符号级理解”

一个成熟 Agent 往往不是直接 `read` 大量文件，而是先靠这几种定位工具收窄范围。

### 第三类：环境交互

最典型的是：

- `bash`
- `webfetch`
- `websearch`

这三者分别解决：

- 本地环境执行
- 单页网页抓取
- 搜索引擎级发现

注意这三类能力的权限风险都比 `read` 高，所以当前仓库对它们的约束也更重。

### 第四类：任务编排

当前仓库里这类能力很重要，但初学者常常忽略：

- `task`
- `question`
- `skill`
- `todo`
- `plan_exit`
- `batch`（实验）

这些工具告诉我们，OpenCode 并不把工具系统限制在”外部 I/O”。
它也把”任务拆分””向用户追问””加载工作流””管理待办”都纳入了工具系统。

这正是现代 Agent 和早期函数调用机器人最大的区别之一。

**重要说明**：
- `skill` 在这里指的是 **SkillTool**（一个工具），不是 Skill 本身
- Skill 是提示词工作流（SKILL.md + 辅助文件），不是工具
- SkillTool 的作用是把 Skill 内容加载到上下文
- 详见第十二篇对 Skill 系统的完整讲解

---

## 3.4 文件工具：不只是读写，而是一整套安全修改链路

### `read` 的重点不是读文本，而是处理真实文件世界

[packages/opencode/src/tool/read.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/read.ts) 的能力比表面上丰富很多：

- 支持相对路径转绝对路径
- 会检查外部目录访问
- 会走 `read` 权限询问
- 目录可直接读取
- 图片和 PDF 会转附件返回
- 大文件会分页与字节截断
- 会预热 LSP
- 会携带文件相关 instruction prompt

也就是说，`read` 在 OpenCode 里不是一个简单 `fs.readFile()` 包装器，而是“安全文件读取协议”。

### `edit` 体现了 Agent 修改代码最难的部分

[packages/opencode/src/tool/edit.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/edit.ts) 值得重点看，因为它非常接近真实 Agent 编辑难题：

1. 先校验参数
2. 外部目录检查
3. 文件锁
4. 文件时间校验
5. 保持原始换行风格
6. 生成 diff
7. 请求编辑权限
8. 写回文件
9. 广播文件变更事件
10. 触发 LSP 诊断

这个链路说明一个现实问题：

**Agent 改代码最难的不是“替换字符串”，而是确保替换过程在并发、诊断、权限和可回溯性上都成立。**

### `write` 与 `edit` 的区别

`write` 不是 `edit` 的简化版，而是适合“整体生成”的另一条路径。

它的典型流程是：

1. 读取旧内容
2. 生成整文件 diff
3. 请求 `edit` 权限
4. 写入新内容
5. 发布文件变更事件
6. 触发项目级 LSP 诊断

值得注意的是：

- `write` 会汇总当前文件诊断
- 还会附带其他文件的部分诊断

这意味着 OpenCode 假设“一个新文件或整文件重写，可能影响整个工程”，而不是只影响当前文件。

---

## 3.5 `bash` 工具：最强也最危险的能力

### 为什么 `bash` 是 Agent 系统里的分水岭

[packages/opencode/src/tool/bash.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/bash.ts) 不是简单 `spawn(command)`。

它先做了很多准备：

- 解析命令 AST
- 识别潜在外部目录
- 推导命令前缀权限模式
- 请求 `external_directory` 权限
- 请求 `bash` 权限
- 通过插件 Hook 注入环境变量
- 处理超时、终止、流式输出和元数据更新

尤其是这两段逻辑很关键：

```ts
await ctx.ask({
  permission: "external_directory",
  patterns: globs,
  always: globs,
  metadata: {},
})

await ctx.ask({
  permission: "bash",
  patterns: Array.from(patterns),
  always: Array.from(always),
  metadata: {},
})
```

这说明 OpenCode 不是粗暴地把“执行命令”当成一个整体权限，而是拆成：

1. 你要不要碰外部目录
2. 你要不要执行这类命令

### `bash` 也是插件插手运行环境的入口

命令执行前，`bash` 会触发：

```ts
const shellEnv = await Plugin.trigger("shell.env", ...)
```

这意味着插件可以给 shell 注入环境变量。  
所以工具系统和插件系统不是割裂的，它们在运行期会实际协作。

这类设计很适合写进电子书，因为它能让初学者明白：

**Agent 的能力不是单模块决定的，而是多个子系统在工具执行时汇合。**

---

## 3.6 搜索、网页与远程上下文工具

### `glob` / `grep` 是真正的第一跳

虽然这两类工具看起来普通，但在 Agent 工作流里优先级很高。

经验上，一个稳健的 Agent 搜仓库通常是：

1. `glob` 先缩小文件范围
2. `grep` 再找文本命中
3. `read` 只读少量候选文件
4. 必要时才上 `lsp`

这也是你写电子书时可以反复强调的一条方法论：

**Agent 高效，不是因为它什么都能做，而是因为它先缩小搜索空间。**

### `webfetch` 解决的是“拉正文”，不是“全网搜索”

[packages/opencode/src/tool/webfetch.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/webfetch.ts) 的职责很清晰：

- URL 校验
- `webfetch` 权限确认
- 超时控制
- 请求头协商
- 按需返回 text / markdown / html
- 图片直接转附件

它适合的是：

- 已经知道目标 URL
- 需要拉正文
- 需要把网页转成适合模型消费的格式

### `websearch` / `codesearch` 受供应商能力控制

注册表里对这两个工具有专门条件：

```ts
if (t.id === "codesearch" || t.id === "websearch") {
  return model.providerID === ProviderID.opencode || Flag.OPENCODE_ENABLE_EXA
}
```

这背后有两个现实约束：

1. 搜索能力通常依赖外部服务，不是所有部署都能用
2. 工具集本身会受到产品套餐、provider 或环境开关影响

从 Agent 工程角度看，这说明工具系统同时也是**商业能力和运行时能力的分发层**。

---

## 3.7 `task`、`question`、`skill`：工具系统里的编排能力

### `task` 工具其实是在创建子 Agent 会话

[packages/opencode/src/tool/task.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/task.ts) 很值得看，因为它不是传统意义上的“工具调用外部 API”。

它会：

1. 检查 `task` 权限
2. 找到目标 `Subagent`
3. 创建或恢复子会话
4. 继承父消息模型信息
5. 禁掉一部分工具
6. 调用 `SessionPrompt.prompt()` 运行子任务
7. 返回 `task_id`

这意味着 `task` 工具其实是 OpenCode 的“多 Agent 编排入口”。

所以你在写书时完全可以把它定义为：

**任务型工具，而不是 I/O 型工具。**

### `question` 工具是 Agent 何时该停下来问人的正式机制

[packages/opencode/src/tool/question.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/question.ts) 的价值在于，它把“问用户补充信息”做成了一个标准工具，而不是让模型随便输出一句问题。

这会带来两个好处：

1. 前端可以针对它做专门交互
2. 回答结果能结构化返回给 Agent

这也是为什么一个成熟 Agent 系统不该把所有交互都塞进纯文本。

### `skill` 工具负责”按需加载 Skill 内容”

**重要概念区分**：

很多初学者会困惑：Skill 是工具吗？

答案：**Skill 不是工具，但有一个工具用来加载 Skill。**

- **Skill**：一份 SKILL.md + 辅助文件（提示词工作流）
- **SkillTool**：一个内置工具，用来把 Skill 内容注入上下文
- **关系**：`SkillTool.execute(name)` → 返回 `Skill.content`

**SkillTool 的实现**：

[packages/opencode/src/tool/skill.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/skill.ts) 会做三件事：

1. 列出当前可用 Skill
2. 请求 `skill` 权限
3. 把 `SKILL.md` 内容和目录样本注入上下文

所以 Skill 的本质不是”静态文档”，而是**上下文按需装载机制**。

**为什么这个区分很重要**：

- Skill 在工具注册表中的体现是 SkillTool
- Skill 本身存储在 `.opencode/skill/` 目录
- 第十二篇会详细讲解 Skill 系统的完整设计

### `todo` 把待办列表也变成了工具

- `todo`：把待办列表正式结构化

这说明 OpenCode 的工具系统并不局限于”操作外部世界”，它同样承担”组织 Agent 自身工作流”的角色。

---

## 3.8 Planning 与任务分解实战

### 为什么需要任务分解

当用户提出复杂需求时，比如”重构整个认证系统”，Agent 面临的挑战是：

1. **任务太大**：无法一次性完成
2. **需要规划**：必须先分析再执行
3. **需要并行**：多个子任务可以同时进行
4. **需要协作**：不同 Agent 擅长不同领域

这就是 Planning 与任务分解的价值所在。

### OpenCode 的任务分解机制

#### 1. task 工具：创建子任务

```typescript
// Primary Agent 调用 task 工具
{
  “tool”: “task”,
  “parameters”: {
    “description”: “分析当前认证系统的实现”,
    “agent”: “explore”,  // 使用 explore Agent
    “prompt”: “找到所有与认证相关的文件和函数”
  }
}
```

**执行流程**：

```text
Primary Agent
  ↓
调用 task 工具
  ↓
创建子会话（Session.create）
  ↓
使用指定的 Subagent（explore）
  ↓
执行子任务
  ↓
返回结果给 Primary Agent
  ↓
Primary Agent 继续规划下一步
```

#### 2. 并行任务执行

```typescript
// Primary Agent 可以同时创建多个任务
const tasks = [
  {
    tool: “task”,
    agent: “explore”,
    prompt: “找到所有认证相关文件”
  },
  {
    tool: “task”,
    agent: “explore”,
    prompt: “找到所有测试文件”
  },
  {
    tool: “task”,
    agent: “general”,
    prompt: “总结当前认证流程”
  }
]

// 并行执行
const results = await Promise.all(
  tasks.map(t => executeTask(t))
)
```

#### 3. 任务结果汇总

```typescript
// Primary Agent 收到所有子任务结果后
{
  “task_1”: “找到 5 个认证相关文件：auth.ts, login.ts...”,
  “task_2”: “找到 3 个测试文件：auth.test.ts...”,
  “task_3”: “当前使用 JWT 认证，流程是...”
}

// Primary Agent 基于结果制定计划
“基于分析结果，我建议按以下步骤重构：
1. 先重构 auth.ts 的核心逻辑
2. 更新相关测试
3. 迁移 login.ts 使用新接口
...”
```

### Planning 模式：先规划再执行

#### 进入 Planning 模式

```typescript
// Primary Agent 调用 plan_enter 工具
{
  “tool”: “plan_enter”,
  “parameters”: {
    “reason”: “任务复杂，需要先制定计划”
  }
}
```

**Planning 模式的特点**：

1. **只读模式**：不能修改代码
2. **可以编辑计划文件**：`.opencode/plans/*.md`
3. **可以调用搜索工具**：分析代码结构
4. **不能执行修改**：确保安全

#### Planning 模式的工作流

```text
用户: “重构认证系统”
  ↓
Agent: “这是个复杂任务，让我先制定计划”
  ↓
进入 Planning 模式
  ↓
分析代码结构（使用 glob/grep/read）
  ↓
创建计划文件（.opencode/plans/auth-refactor.md）
  ↓
向用户展示计划
  ↓
用户确认
  ↓
退出 Planning 模式（plan_exit）
  ↓
按计划执行
```

#### 计划文件示例

`.opencode/plans/auth-refactor.md`：

```markdown
# 认证系统重构计划

## 当前状态分析

- 使用 JWT 认证
- 代码分散在 3 个文件中
- 缺少统一的错误处理
- 测试覆盖率 60%

## 重构目标

1. 统一认证接口
2. 改进错误处理
3. 提高测试覆盖率到 90%

## 执行步骤

### 步骤 1：重构核心逻辑
- 文件：src/auth/core.ts
- 预计时间：30 分钟
- 风险：中等

### 步骤 2：更新测试
- 文件：src/auth/core.test.ts
- 预计时间：20 分钟
- 风险：低

### 步骤 3：迁移调用方
- 文件：src/auth/login.ts, src/auth/register.ts
- 预计时间：40 分钟
- 风险：高（需要仔细测试）

## 回滚方案

如果出现问题，可以：
1. 恢复 git commit abc123
2. 使用旧的认证接口
```

### 任务分解的最佳实践

#### 1. 自顶向下分解

```text
大任务：重构认证系统
  ↓
子任务 1：分析现状
  ├─ 找到所有相关文件
  ├─ 分析依赖关系
  └─ 识别潜在问题
  ↓
子任务 2：设计方案
  ├─ 设计新接口
  ├─ 规划迁移路径
  └─ 评估风险
  ↓
子任务 3：执行重构
  ├─ 重构核心逻辑
  ├─ 更新测试
  └─ 迁移调用方
```

#### 2. 明确任务边界

**好的任务分解**：
```
✅ “找到所有使用 JWT 的文件”
✅ “重构 auth.ts 的 login 函数”
✅ “为 auth.ts 添加单元测试”
```

**不好的任务分解**：
```
❌ “改进代码”（太模糊）
❌ “修复所有问题”（范围不明确）
❌ “优化性能”（没有具体目标）
```

#### 3. 设置任务优先级

```typescript
const tasks = [
  {
    priority: “high”,
    description: “修复安全漏洞”,
    blocking: []
  },
  {
    priority: “medium”,
    description: “重构核心逻辑”,
    blocking: [“task_1”]  // 依赖任务 1
  },
  {
    priority: “low”,
    description: “优化性能”,
    blocking: [“task_2”]  // 依赖任务 2
  }
]
```

### 多 Agent 协作模式

#### 模式 1：专家分工

```typescript
// Primary Agent 分配任务给不同的专家
{
  “explore”: “分析代码结构”,
  “general”: “总结业务逻辑”,
  “build”: “执行重构”
}
```

#### 模式 2：流水线

```text
explore Agent
  ↓ 找到相关文件
general Agent
  ↓ 分析业务逻辑
build Agent
  ↓ 执行修改
```

#### 模式 3：并行执行

```text
explore Agent (任务 1) ─┐
explore Agent (任务 2) ─┼─→ 汇总结果 → build Agent
general Agent (任务 3) ─┘
```

### 任务状态管理

```typescript
// 任务状态
type TaskStatus =
  | “pending”    // 等待执行
  | “running”    // 执行中
  | “completed”  // 已完成
  | “failed”     // 失败
  | “blocked”    // 被阻塞

// 任务依赖
interface Task {
  id: string
  status: TaskStatus
  dependencies: string[]  // 依赖的任务 ID
  agent: string
  prompt: string
}
```

### 实战案例：重构认证系统

**完整流程**：

```text
1. 用户输入
   “重构认证系统，使用更安全的方式”

2. Primary Agent 分析
   “这是个复杂任务，我需要：
   - 先分析现状
   - 制定计划
   - 分步执行”

3. 进入 Planning 模式
   [调用 plan_enter]

4. 并行分析
   Task 1 (explore): “找到所有认证相关文件”
   Task 2 (explore): “找到所有测试文件”
   Task 3 (general): “总结当前认证流程”

5. 制定计划
   [创建 .opencode/plans/auth-refactor.md]

6. 向用户展示计划
   “我制定了以下计划：
   1. 重构核心逻辑（30分钟）
   2. 更新测试（20分钟）
   3. 迁移调用方（40分钟）
   是否继续？”

7. 用户确认
   “继续”

8. 退出 Planning 模式
   [调用 plan_exit]

9. 执行步骤 1
   [修改 src/auth/core.ts]

10. 执行步骤 2
    [更新测试文件]

11. 执行步骤 3
    [迁移调用方]

12. 完成
    “重构完成，所有测试通过”
```

### 调试任务分解

**查看任务执行日志**：

```bash
# 查看所有子任务
DEBUG=opencode:task:* bun dev
```

**日志示例**：

```text
[task] Creating task: analyze-auth
[task] Agent: explore
[task] Creating sub-session: sess_abc123
[task] Executing...
[task] Result: Found 5 files
[task] Task completed: task_xyz789
```

---

## 3.9 自定义工具开发指南

### 先选扩展方式

在当前仓库里，自定义工具主要有两条路：

1. **项目级工具**
2. **插件工具**

如果你只是给当前项目自己用，优先选项目级工具。  
如果你要做复用或发布，才考虑插件工具。

### 项目级工具的思路

注册表会扫描 `tool/*.ts` 或 `tools/*.ts`，并把导出的定义转成标准工具。

所以一个最小项目级工具通常只需要：

```ts
import { tool } from "@opencode-ai/plugin"

export const hello = tool({
  description: "返回测试文本",
  args: {
    name: tool.schema.string(),
  },
  async execute(args) {
    return `hello ${args.name}`
  },
})
```

然后把文件放进项目的 `tool/` 目录即可。

### 写工具时最容易忽略的四件事

#### 1. 先想权限，不要先想功能

如果你的工具会：

- 改文件
- 跑命令
- 访问外部目录
- 发网络请求

那第一件事就是设计 `ctx.ask()`，而不是先写业务逻辑。

#### 2. 输出要面向模型，而不只是面向人

工具返回的 `output` 不是日志，而是下一步推理的输入。  
所以输出结构要清楚、短、可继续推理。

#### 3. `metadata` 是给界面和调试用的

不要把所有信息都塞进 `output`。  
能放进 `metadata` 的中间状态，尽量放进 `metadata`。

#### 4. 接受输出裁剪这件事

只要你不自己声明 `metadata.truncated`，工具返回值默认会被 `Truncate.output()` 统一处理。  
这意味着你不能假设模型一定能看到完整原始输出。

### 什么时候不该新增工具

这是给初学者最重要的一条提醒。

下面几种情况通常不需要新工具：

- 只是想复用一段提示词：用 Command
- 只是想固定一个流程：用 Skill
- 只是想把多个已有工具串起来：先用 Agent Prompt 或 Skill

很多新手会过早把问题“代码化”。  
但在 Agent 工程里，真正稀缺的往往不是新工具，而是合理的流程约束。

---

## 本章小结

### 这一篇最该记住什么

1. 工具系统的核心入口不是单个工具文件，而是注册表
2. 工具集合会随着客户端、模型和开关变化
3. OpenCode 的工具不只做文件和命令，也做提问、任务拆分、技能装载
4. 每个工具的真实价值不在函数体，而在权限、输出、裁剪和后续链路
5. 不是所有需求都该新增工具，很多需求更适合 Skill 或 Command

### 关键代码位置

| 模块 | 位置 | 建议重点 |
| --- | --- | --- |
| 工具抽象 | `packages/opencode/src/tool/tool.ts` | `Tool.define()`、参数校验、输出裁剪 |
| 工具注册表 | `packages/opencode/src/tool/registry.ts` | 内置工具、模型过滤、自定义工具接入 |
| 文件读取 | `packages/opencode/src/tool/read.ts` | 目录读取、附件、分页、权限 |
| 精确编辑 | `packages/opencode/src/tool/edit.ts` | diff、锁、LSP、文件时间校验 |
| 整体写入 | `packages/opencode/src/tool/write.ts` | 覆写、诊断汇总、文件事件 |
| 命令执行 | `packages/opencode/src/tool/bash.ts` | AST 分析、权限、插件环境、流式元数据 |
| 子任务编排 | `packages/opencode/src/tool/task.ts` | `Subagent`、子会话、任务恢复 |
| 用户追问 | `packages/opencode/src/tool/question.ts` | 结构化提问与回答 |
| 网页抓取 | `packages/opencode/src/tool/webfetch.ts` | 内容协商、超时、附件 |

### 源码阅读路径

1. 先看 `packages/opencode/src/tool/registry.ts`，把当前工具全景建立起来。
2. 再看 `packages/opencode/src/tool/tool.ts`，理解一个工具如何被统一包装执行。
3. 最后任选一个 I/O 工具和一个编排型工具，例如 `read.ts` + `task.ts`，比较它们的输入、权限和输出差异。

### 任务

判断 OpenCode 的工具系统为什么必须先解决“统一注册与能力边界”，而不是先盯着某个具体工具写得多强。

### 操作

1. 打开 `packages/opencode/src/tool/registry.ts`，把当前工具按“文件操作 / 搜索定位 / 环境交互 / 编排”四类重新分组。
2. 再读 `packages/opencode/src/tool/tool.ts`，确认一个工具在被真正执行前，会经过哪些统一包装步骤。
3. 最后任选一条真实链路，从 `registry.ts` 追到 `bash.ts`、`read.ts` 或 `task.ts`，记录它是怎样进入 Agent 可见工具列表的。

### 验收

完成后你应该能说明：

- 为什么工具系统的第一入口应该是注册表，而不是某个单独工具文件。
- 为什么权限、输入输出结构和执行包装必须在同一层统一收口。
- 为什么同一个需求有时更适合做成 Skill 或 Command，而不是继续加新工具。

### 下一篇预告

理解了工具之后，再看会话系统就更容易了：

- 工具输出如何进入消息流
- 子任务和父任务如何形成会话树
- 为什么上下文压缩会影响工具使用
- 流式响应和 SSE 为什么是会话层问题

这也是第四篇要解决的核心问题。

### 思考题

1. 为什么工具系统的核心入口应该先看 `registry.ts` 和 `tool.ts`，而不是直接看某个具体工具文件？
2. 如果一个需求既可以写成新工具，也可以写成 Skill 或 Command，你会怎么判断边界？
3. 为什么同一个工具在不同模型或不同客户端下，可能不应该暴露成同一套能力？

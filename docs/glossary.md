---
title: 术语表
description: 本书高频概念的统一口径
---

# 术语表

这一页不追求百科式定义，只负责统一本书里的高频概念口径，避免同一个词在不同章节里被读成不同意思。

## Agent

在本书里，`Agent` 默认不是”一个会思考的抽象角色”，而是：

- 一份运行时配置
- 一组模型、权限、提示词与模式的组合
- 一个可以被系统调度的执行角色

如果没有特别说明，不把它理解成独立进程或单一类实例。

## Agent Loop（执行循环）

`Agent Loop` 是 AI Agent 的核心执行机制，描述了从接收输入到产生输出的完整循环过程：

```
输入 → 思考 → 工具调用 → 观察结果 → 继续思考 → 输出
```

这个循环会持续进行，直到 Agent 决定不再需要调用工具，而是输出最终答案。

关键特征：
- **非确定性**：每次执行路径可能不同
- **自主决策**：Agent 自己决定何时调用工具、何时结束
- **上下文累积**：每次循环都会将结果添加到上下文中

详见：第二篇 §2.5

## Tool Calling（工具调用）

`Tool Calling` 是 Agent 与外部世界交互的核心机制。在执行循环中，Agent 可以：

1. 决定调用哪个工具
2. 提供工具参数
3. 接收工具执行结果
4. 基于结果继续思考

工具调用不是简单的函数调用，而是包含：
- 权限检查
- 参数验证
- 结果裁剪
- 错误处理

详见：第三篇

## Planning（任务规划）

`Planning` 是 Agent 在执行复杂任务前的规划阶段。OpenCode 提供专门的 Planning 模式：

- **只读模式**：不能修改代码，只能分析
- **计划文件**：可以编辑 `.opencode/plans/*.md`
- **用户确认**：计划需要用户审核后才执行

Planning 的价值：
- 避免盲目执行
- 让用户了解执行计划
- 降低风险

详见：第三篇 §3.8

## Task Decomposition（任务分解）

`Task Decomposition` 是将复杂任务拆解为多个子任务的过程。OpenCode 通过 `task` 工具实现：

```typescript
// 创建子任务
task({
  agent: “explore”,
  prompt: “找到所有认证相关文件”
})
```

任务分解的好处：
- **并行执行**：多个子任务可以同时进行
- **专家分工**：不同 Agent 擅长不同任务
- **降低复杂度**：大任务变成小任务

详见：第三篇 §3.8

## Memory（记忆机制）

`Memory` 在 AI Agent 中通常分为三层：

1. **短期记忆**：当前会话的上下文（Session）
2. **工作记忆**：压缩后的历史信息（Compaction）
3. **长期记忆**：持久化的数据（SQLite）

OpenCode 的记忆机制：
- 会话历史存储在数据库中
- 超长对话会自动压缩
- 重要信息会被保留

详见：第四篇、第九篇

## Prompt Engineering（提示词工程）

`Prompt Engineering` 是设计和优化 Agent 系统提示词的过程。OpenCode 的提示词包含：

- **基础指令**：Agent 的基本行为规范
- **模型特定提示**：针对不同模型的优化
- **环境信息**：工作目录、平台、日期等
- **Skill 列表**：可用的技能
- **Agent 自定义提示**：特定 Agent 的指令

详见：第二篇 §2.4

## Context Management（上下文管理）

`Context Management` 是管理 Agent 对话历史和上下文窗口的机制。包括：

- **上下文构建**：组装历史消息
- **上下文压缩**：当超过窗口限制时压缩
- **Token 预算**：为输出预留空间
- **重要信息保留**：确保关键信息不丢失

详见：第四篇 §4.3

## Primary Agent

`Primary Agent` 指直接面向用户交互的主执行角色。它通常具备：

- 接收用户输入
- 调用工具
- 调用 `Subagent`
- 在需要时向用户提问

在 OpenCode 当前实现里，`build`、`plan` 这类角色更接近 `primary` 模式。

如果只记一条关系，可以先记成：

- `Agent` 是总称
- `Primary Agent` 是直接面向用户的主入口
- `Subagent` 是被主入口调度、职责更收紧的子角色

## Subagent

`Subagent` 指由主 Agent 调度的子角色，重点不是“更弱”，而是“职责更收紧”。

在本书里，`subagent` 作为模式名或配置值时，保留代码里的小写写法；作为概念名词时，统一写作 `Subagent`。

`Subagent` 通常意味着：

- 不直接面向用户交互
- 不能无限继续调其他 `Subagent`
- 更适合搜索、分析、并行拆分这类局部任务

## 运行时

本书里的“运行时”主要指 OpenCode 在本地机器上真正执行起来的那一层，包括：

- Agent
- 工具系统
- 会话系统
- 本地 server
- 权限与状态边界

它不等于单一 CLI 命令，也不等于云端产品后端。

## 工作台

“工作台”主要用来形容 OpenCode 的 TUI 或多端前端形态，强调的是：

- 持续存在的状态空间
- 多面板、多上下文、多入口协作
- 不只是一次性问答，而是连续任务处理

看到这个词时，可以把它理解成“偏 IDE 化的 Agent 交互界面”。

## 工具系统

“工具系统”不只是模型可调用的函数列表，而是包含下面这些约束的系统边界：

- 工具注册
- 权限询问
- 参数校验
- 输出裁剪
- 模型适配

所以它比“工具函数集合”更接近产品级协议层。

## 会话

“会话”在本书里不是简单聊天记录，而是一次任务运行历史的容器。它通常承载：

- 用户输入
- assistant 输出
- 工具调用过程
- 回滚、压缩、重试等治理状态

如果一个能力需要持续恢复、继续执行或被前端展示，通常都会回到会话层。

## 上下文压缩

“上下文压缩”不是简单删历史消息，而是为了：

- 给下一轮生成预留空间
- 保留真正重要的信息
- 降低工具输出和长会话带来的膨胀

它更像一次策略性重建，而不是机械裁剪。

## Provider

`Provider` 在本书里指模型提供商抽象层。它的重点不是“换 API 地址”，而是统一：

- 消息格式
- 能力差异
- 参数差异
- 认证方式
- 成本与限制信息

## MCP

`MCP` 在本书里主要被理解成外部能力接入边界，而不是单纯协议名词。

它帮助 OpenCode：

- 发现外部工具
- 接入外部资源
- 装载外部 prompt
- 把认证和连接恢复收口到统一层

## 平台注入

“平台注入”主要出现在多端 UI 相关章节，指的是：

- 先保持共享应用骨架稳定
- 再把 Web、Desktop 等差异收敛到明确接口

它和“为每个平台重写一套前端”是相反思路。

## 控制平面

“控制平面”在本书里通常指那些不直接等于本地 Agent 执行逻辑、但负责跨工作区、远程路由、账号和云端治理的部分。

简单说：

- 本地运行时更偏执行面
- control plane 更偏调度、管理、转发和产品治理

## 当前实现

当本书写“当前实现”“当前仓库”“当前状态”时，意思是：

- 以当前 `dev` 分支源码为准
- 不替未来版本做承诺
- 不替未落地能力做脑补

这是本书最重要的写作约束之一。

---

## oh-my-openagent 专有术语

以下术语仅在本书第五部分（oh-my-openagent 插件系统）中使用。

## AgentFactory

`AgentFactory` 是 oh-my-openagent 定义内置 Agent 的工厂函数模式：

```typescript
type AgentFactory = {
  (model: string): AgentConfig
  mode: AgentMode  // "primary" | "subagent" | "all"
}
```

工厂函数接受模型名，返回完整的 Agent 配置。`mode` 属性挂在函数上，表示该 Agent 可在哪种上下文中被调用。

详见：第20章 §2

## Background Agent（后台 Agent）

`Background Agent` 指在独立 OpenCode 子会话中异步执行的 Agent 任务。它与主对话并行运行，完成后通过 `session.idle` 事件通知父会话。

区分：
- **同步委托**：主 Agent 等待子任务完成（`wait_for_result: true`）
- **异步委托**：主 Agent 继续工作，子任务在后台进行（`wait_for_result: false`）

详见：第20章 §4

## ToolGuard

`ToolGuard` 是 oh-my-openagent 在 `tool.execute.before` Hook 中运行的权限检查机制。它根据每个 Agent 配置的 `deniedTools` 字段，在代码层面阻止越权工具调用。

这是代码级约束，不依赖 prompt 描述——即使 prompt 没有说"不能写文件"，`deniedTools: ["write"]` 也会强制阻止。

详见：第22章 §4

## hashline-edit

`hashline-edit` 是 oh-my-openagent 的精确文件编辑工具。它在读取文件时给每行加上基于内容的哈希标识（`LINE#ID`），编辑时引用该标识而非行号，从而避免"幻觉对齐"问题（AI 引用了不存在的内容）。

区分：
- **传统 edit**：基于 old_string/new_string 匹配，文件变化后容易失败
- **hashline-edit**：基于内容哈希锁定，验证后再写入，失败时自动重试

详见：第22章 §2

## Hook（钩子）

oh-my-openagent 语境下的 `Hook` 是插件注册到 OpenCode 生命周期事件的回调函数。与第13章"插件 Hook"的区别：

- **第13章**：讲 OpenCode 原生插件接口暴露的 8 个 Hook 点
- **第五部分**：讲 oh-my-openagent 内部实现的 46 个 Hook，它们挂载在这 8 个 Hook 点上

46 个 Hook 分三层：Core（37个）→ Continuation（7个）→ Skill（2个）。

详见：第21章

## Plugin Interface（插件接口）

`Plugin Interface` 是 oh-my-openagent 返回给 OpenCode 运行时的对象，包含 8 个方法（Hook 点）。OpenCode 在不同阶段调用这些方法，插件通过它们拦截和增强系统行为。

区分：
- **Plugin 函数**：只在插件加载时执行一次
- **Plugin Interface 方法**：在每次对话/事件时被反复调用

详见：第18章 §3

## 分类（Category）

`Category` 是 oh-my-openagent 的任务路由机制。Sisyphus 在委托任务时，可以委托给"分类"而不是具体 Agent，系统根据 `categories` 配置选择对应的模型和 Agent。

常见分类：`frontend`、`backend`、`exploration`、`review`。

详见：第20章 §3，第19章

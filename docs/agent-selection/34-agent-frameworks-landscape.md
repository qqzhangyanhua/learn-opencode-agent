---
title: Agent 框架组件怎么选
description: 对比自研 loop、LangChain、LangGraph、LlamaIndex、AutoGen、CrewAI、Semantic Kernel、OpenAI Agents SDK、Claude Tool Use、MCP 和 Managed Agents 的适用场景。
contentType: support
series: support
contentId: agent-selection-agent-frameworks-landscape
shortTitle: Agent 框架组件图谱
summary: Agent 框架选型要先分清模型 API、工具调用、Agent Runtime、Workflow Runtime、RAG 框架、工具协议和托管运行时，不要把所有能力混成一个框架品牌问题。
difficulty: advanced
estimatedTime: 30 分钟
learningGoals:
  - 了解主流 Agent 框架和运行时组件的差异
  - 判断 LangChain、LangGraph、LlamaIndex、AutoGen、CrewAI 等分别适合什么场景
  - 区分 Claude Tool Use、MCP 和 Managed Agents 的边界
  - 避免为了工具调用引入复杂状态图或多 Agent 框架
prerequisites:
  - 已了解 Agent 框架选型
  - 已了解工具调用和 RAG 基础概念
recommendedNext:
  - /agent-selection/01-agent-frameworks
  - /agent-selection/17-sdk-tools-langgraph
  - /agent-selection/18-managed-platform-vs-runtime
  - /agent-selection/23-mcp-tool-selection
practiceLinks:
  - /practice/p10-react-loop/
  - /practice/p11-planning/
  - /practice/p14-mcp/
  - /practice/p15-multi-agent/
searchTags:
  - Agent Framework
  - LangChain
  - LangGraph
  - LlamaIndex
  - AutoGen
  - CrewAI
  - MCP
navigationLabel: Agent 框架组件图谱
entryMode: bridge
roleDescription: 适合在自研 loop、Agent 框架、状态图、平台 SDK、MCP 和托管 Agent Runtime 之间做工程取舍时阅读。
---

<ChapterLearningGuide />

> 说明：本文是截至 2026-06 的选型图谱，不是实时排名。平台 SDK、托管 Agent Runtime、工具协议、可用区域和 API surface 会变化，进入实现前请以官方文档、价格页、版本说明和业务样本评测为准。

## 阅读定位

这篇是 Agent 框架和运行时组件图谱，重点帮你分清 Model API、Tool Calling、Agent Runtime、Workflow Runtime、RAG Framework、Tool Protocol 和 Managed Runtime。如果你还没判断是否需要 Agent Framework，先看 [Agent 框架怎么选](/agent-selection/01-agent-frameworks)。如果你只是在平台 SDK、Claude Tool Use 和 LangGraph 之间取舍，再看 [Agents SDK、Claude Tool Use、LangGraph 怎么取舍](/agent-selection/17-sdk-tools-langgraph)。

## 这个类别解决什么

Agent 框架组件解决的不是一个问题，而是几类不同问题：

```text
Model API
  -> 怎么调用模型

Tool Calling
  -> 模型怎么提出工具调用

Agent Runtime
  -> 谁管理 loop、session、handoff、guardrail、trace

Workflow Runtime
  -> 谁管理状态、分支、暂停、恢复和 checkpoint

RAG Framework
  -> 谁管理数据接入、索引、retriever、query engine

Tool Protocol
  -> 工具怎么暴露、发现、授权和复用

Managed Runtime
  -> 谁托管 agent loop、环境、工具执行和会话状态
```

很多选型失败，是因为团队把这些问题都塞进“用哪个 Agent 框架”一句话里。

## 主流选择有哪些

| 方案 | 本质 | 强项 | 代价 | 适合场景 | 不适合场景 |
| --- | --- | --- | --- | --- | --- |
| 自研轻量 loop | 应用自己写 tool call / observe / answer 循环 | 透明、可控、依赖少、容易调试 | 状态、恢复、trace 要自己补 | 少量工具调用、第一版 Agent、强业务控制 | 长流程、复杂分支、恢复执行 |
| LangChain | LLM 应用组件生态 | 模型、工具、chain、retriever 集成多，上手快 | 抽象层多，生产边界要收紧 | 快速原型、多模型和工具集成 | 需要严格状态机和可恢复工作流 |
| LangGraph | 状态图 / Workflow Runtime | 显式状态、分支、checkpoint、human-in-the-loop、恢复执行 | 简单任务会过度设计，状态 schema 要设计 | 长流程、多分支、可回放、可暂停恢复 | 单轮问答、固定 RAG pipeline、少量工具调用 |
| LlamaIndex | 数据连接和 RAG 框架 | loader、index、retriever、query engine、RAG 抽象强 | 通用 Agent 控制流不是主战场 | 知识库、企业文档、数据接入、RAG 产品 | 复杂业务流程编排 |
| AutoGen | 多 Agent 对话协作框架 | 多角色对话、研究原型、协作实验 | 容易把流程写成角色聊天，责任边界变虚 | 多 Agent 研究、方案探索、角色协作原型 | 严肃业务流程自动化、强审计生产系统 |
| CrewAI | Role / Task / Process 编排 | 概念直观，适合业务角色任务原型 | 拟人化角色过多会稀释责任和状态边界 | 内容生产、业务流程原型、多角色任务分配 | 需要精确状态、权限、恢复和审计 |
| Semantic Kernel | 企业插件和函数编排框架 | .NET / Azure 生态、插件模式、企业集成 | 微软生态绑定更明显 | .NET 企业系统、Azure 集成、函数插件体系 | 非微软生态或轻量原型 |
| Haystack | 搜索和 RAG pipeline 框架 | 检索、Reader、pipeline、搜索系统集成 | Agent Runtime 能力不是核心 | 搜索/RAG pipeline、问答系统、信息检索 | 复杂行动型 Agent |
| OpenAI Agents SDK | OpenAI-first Agent Runtime | agent loop、tools、handoff、guardrails、sessions、tracing | OpenAI 平台抽象和 runtime 迁移成本要评估 | OpenAI-first 产品、平台 trace 和 guardrail 集成 | 强跨 provider、强自有 runtime 控制 |
| Claude API Tool Use | Claude 模型工具调用能力 | 工具 schema 清楚，应用可完全控制执行和审批 | loop、状态、trace、工具执行要应用自己管 | Claude-first，自有 runtime，强审批和安全边界 | 想把 agent loop 和环境都交给平台托管 |
| Claude Managed Agents | Anthropic 托管 Agent Runtime | Anthropic 执行 agent loop，session、container、工具执行、事件流和版本化 agent 配置更完整 | Beta / API surface 约束，平台可用性和迁移成本要评估 | 需要托管长任务、workspace、文件操作、bash、MCP、session 事件流 | Bedrock / Vertex / Foundry 接入面，或必须自托管全部运行时 |
| MCP | 工具协议，不是 Agent 框架 | 工具暴露、发现、授权和跨客户端复用 | 不负责 agent loop、状态机和业务审批 | 多工具生态、第三方系统接入、工具复用 | 想让 MCP 替代 runtime 或 workflow |
| Dify / Flowise / Langflow | 低代码 LLM 应用平台 | 快速搭建、可视化、适合内部工具和原型 | 深度定制、复杂权限和迁移成本要评估 | 业务原型、运营配置、内部知识助手 | 核心产品 runtime、强代码治理场景 |

这个表不是排名。先确定你要解决哪一层问题，再选组件。

## 先分清六类问题

| 你真正的问题 | 优先看什么 | 不要先做什么 |
| --- | --- | --- |
| 模型需要调用一个只读工具 | Tool Use / 轻量 loop | 不要上 LangGraph 或多 Agent |
| 需要把多个工具调用串起来 | 自研 loop / Agent Runtime | 不要把所有逻辑塞进 prompt |
| 流程有分支、暂停、恢复 | LangGraph / Workflow Runtime | 不要只靠 while loop 硬撑 |
| 核心复杂在文档接入和检索 | LlamaIndex / Haystack / RAG pipeline | 不要把 RAG 框架当 workflow runtime |
| 需要多角色协作实验 | AutoGen / CrewAI | 不要直接上生产高风险流程 |
| 需要统一工具生态 | MCP | 不要让每个 Agent 自己发明工具格式 |
| 需要平台托管长任务和工作区 | Managed Agents / 托管平台 | 不要自建一半又交给平台一半，边界会乱 |

## 自研轻量 loop 什么时候够用

自研 loop 不是低级方案。很多生产 Agent 第一版就应该这么做。

适合：

- 只有一到几个工具；
- 工具调用风险可控；
- 流程短；
- 状态简单；
- 团队需要强控制和强可观测；
- 审批、权限、日志都在自有系统里。

典型结构：

```text
user input
  -> model call
  -> tool call?
  -> validate tool args
  -> execute tool
  -> append observation
  -> model answer
```

不适合：

- 状态节点很多；
- 需要 checkpoint；
- 需要暂停后恢复；
- 需要复杂人机确认；
- 需要多团队维护状态图；
- 需要可视化流程和系统级 replay。

一句话：短流程自己写，长流程再找 runtime。

## LangChain 什么时候用

LangChain 的价值在生态和集成，不在替你设计业务边界。

适合：

- 快速原型；
- 多模型接入；
- 多工具接入；
- chain、retriever、loader 组合；
- 团队想快速试出可行路径。

不适合：

- 已经明确需要显式状态图；
- 需要严格 checkpoint；
- 每个状态迁移都要审计；
- 业务权限和审批强约束；
- 团队无法解释每层抽象在做什么。

常见误判：

```text
用了 LangChain 不等于有了生产 Agent Runtime。
它能帮你接很多东西，但不会替你定义状态、权限、停止条件和评估集。
```

## LangGraph 什么时候用

LangGraph 适合 workflow runtime 问题，不是“更高级的 LangChain”。

适合：

- 多步长流程；
- 有明确状态 schema；
- 有分支和循环；
- 需要 checkpoint；
- 需要恢复执行；
- 需要 human-in-the-loop；
- 需要 replay 和 trace。

不适合：

- 单轮问答；
- 搜索后总结；
- 固定 RAG pipeline；
- 只有一个工具调用；
- 没有状态 schema；
- 只是为了让架构图更像 Agent。

判断标准：

```text
如果你说不清每个节点的输入、输出和失败处理，别上 LangGraph。
如果低一级 loop 能跑通业务样本，先别画图。
```

## LlamaIndex 什么时候用

LlamaIndex 的主战场是数据接入、索引和 RAG。

适合：

- 企业文档知识库；
- 多数据源 loader；
- 向量索引、关键词索引、组合索引；
- query engine；
- 文档问答；
- RAG 原型和产品化。

不适合：

- 复杂业务流程编排；
- 高风险工具执行；
- 多状态审批流；
- 把 Agent 行动控制完全交给 RAG 框架。

一句话：知识复杂选 LlamaIndex，流程复杂看 LangGraph 或自有 runtime。

## AutoGen 和 CrewAI 什么时候用

AutoGen 和 CrewAI 适合探索多 Agent 协作，但要小心拟人化过度。

适合：

- 研究原型；
- 多角色内容生产；
- 方案生成和评审；
- 模拟多人协作；
- 低风险自动化。

不适合：

- 生产关键业务流程；
- 强权限系统；
- 高风险工具执行；
- 必须可审计、可恢复、可复盘的状态流。

坏味道：

```text
Planner Agent
Reviewer Agent
Executor Agent
Manager Agent
Critic Agent
```

如果这些角色没有清晰输入输出，只是在互相聊天，就是把业务流程写成戏剧脚本。

## Semantic Kernel 什么时候用

Semantic Kernel 更适合企业插件和函数编排，尤其是 .NET / Azure 生态。

适合：

- .NET 企业系统；
- Azure 生态；
- 现有服务函数化；
- 插件模式；
- 企业内部助手和业务系统集成。

不适合：

- 非微软生态的小型原型；
- 只需要简单工具调用；
- 不想绑定某个企业生态。

判断重点不是它能不能做 Agent，而是你的组织是否已经在微软生态里。

## OpenAI Agents SDK 什么时候用

OpenAI Agents SDK 更偏 OpenAI-first Agent Runtime。

适合：

- OpenAI-first 产品；
- 希望使用平台内 tools、handoff、guardrails、sessions、tracing；
- 团队接受 OpenAI 平台抽象；
- trace 和 guardrail 希望在平台体系里完成。

不适合：

- 强跨 provider；
- 核心状态必须完全自有；
- 工具 schema 必须平台无关；
- 不接受平台 runtime 迁移成本。

注意：OpenAI Agents SDK 不等于只能使用 OpenAI 模型。锁定风险更多在 runtime、tracing、guardrails、sessions、handoff 等平台抽象，而不是单纯的 model provider。

## Claude Tool Use、MCP、Managed Agents 怎么分

这三者不是同一层。

| 方案 | 层级 | 主要解决 | 不主要解决 |
| --- | --- | --- | --- |
| Claude API Tool Use | 模型工具调用层 | Claude 产生 tool call，应用执行或接入 server-side tools | 通用 workflow 状态机、完整托管 runtime |
| MCP | 工具协议层 | 工具如何暴露、发现、授权和跨客户端复用 | Agent loop、状态、业务审批 |
| Claude Managed Agents | 托管 Agent Runtime | Anthropic 管理 agent loop、session、container、事件流、工具执行工作区 | 所有云接入面都可用、完全自有 runtime |

### Claude API Tool Use

适合：

- Claude-first；
- 自己管理 loop；
- 自己执行工具；
- 需要强审批；
- 需要把权限、审计、业务状态放在自有系统；
- 不想把运行时交给平台托管。

边界：

```text
模型提出 tool call
  -> 应用校验参数
  -> 应用执行工具
  -> 应用返回 tool result
  -> 模型继续
```

普通 Claude Tool Use 里的用户自定义工具通常由应用侧执行。Anthropic server-side tools 才由 Anthropic 执行。

### MCP

适合：

- 多工具生态；
- 工具要跨客户端复用；
- GitHub、Linear、Notion、数据库等第三方能力接入；
- 希望工具协议标准化；
- 工具权限和凭据需要统一治理。

边界：

```text
MCP 是 Tool Protocol，不是 Agent Runtime。
```

MCP server 暴露 tools、resources、prompts。Elicitation、sampling、roots 等是 client capability 方向，不能把它们当成 server 像 tool 一样暴露的同类原语。

### Claude Managed Agents

适合：

- 希望 Anthropic 托管 agent loop；
- 需要持久 agent config；
- 需要每次任务有 session；
- 需要 container workspace；
- 需要 bash、文件读写、代码执行等工具环境；
- 需要事件流、tool confirmation、session 状态；
- 需要长任务和 workspace 形态。

边界：

```text
Agent config：创建一次，保存 ID
Session：每次任务创建，引用 agent
Environment / container：工具执行工作区
```

Managed Agents 当前是 beta / 特定 API surface。它适用于 Anthropic first-party API 和 Claude Platform on AWS；不要默认 Amazon Bedrock、Google Vertex AI、Microsoft Foundry 等 Claude 接入面也支持 Managed Agents 或 Anthropic server-side tools。那些场景通常要用 Claude API Tool Use + 自建 runtime / 工具执行层。

## 怎么选

```text
只是一次模型调用？
  -> 不要 Agent 框架

只有一两个工具？
  -> Claude/OpenAI tool use + 自研轻量 loop

需要快速接模型、工具、retriever？
  -> LangChain

知识库和索引复杂？
  -> LlamaIndex / Haystack

流程有状态、分支、恢复、人机确认？
  -> LangGraph

多角色协作实验？
  -> AutoGen / CrewAI

.NET / Azure 企业集成？
  -> Semantic Kernel

OpenAI-first，并接受平台 runtime？
  -> OpenAI Agents SDK

Claude-first，自有 runtime？
  -> Claude API Tool Use + 自研 loop + MCP

Claude-first，想要托管长任务和 workspace？
  -> Claude Managed Agents

工具要跨多个 Agent / 客户端复用？
  -> MCP

业务人员要可视化配置？
  -> Dify / Flowise / Langflow，但核心产品要评估迁移成本
```

## 典型误判

| 误判 | 问题 |
| --- | --- |
| 有工具调用就要 Agent 框架 | 一个 tool call 用轻量 loop 就够 |
| 有多步就要 LangGraph | 固定 pipeline 不需要状态图 |
| LlamaIndex 能替代业务 workflow | 它主战场是 RAG，不是审批流 |
| AutoGen / CrewAI 角色越多越智能 | 角色多通常只是责任边界更模糊 |
| MCP 是 Agent 框架 | MCP 是工具协议，不管理 agent loop |
| Managed Agents 等于 MCP | Managed Agents 是托管 runtime，MCP 是工具协议 |
| 平台 SDK 一定锁死模型 | 锁定常在 runtime、trace、session、guardrail，而不只是模型 |
| 自研 loop 不专业 | 简单流程自研更透明、更可控 |

## 最小推荐

| 场景 | 推荐 |
| --- | --- |
| 单轮分类、总结、抽取 | 普通模型调用 |
| 少量工具调用 | Tool Use + 自研轻量 loop |
| RAG 原型 | LlamaIndex / LangChain |
| 企业知识库 | LlamaIndex / Haystack + 自有权限和评估 |
| 长流程行动 Agent | LangGraph 或自有 workflow runtime |
| 多 Agent 研究原型 | AutoGen / CrewAI |
| OpenAI-first 产品 | OpenAI Agents SDK |
| Claude-first 自有 runtime | Claude API Tool Use + MCP |
| Claude-first 托管长任务 | Claude Managed Agents |
| 企业 .NET / Azure | Semantic Kernel |
| 工具生态标准化 | MCP |

## 最终判断

```text
少量工具：轻量 loop
集成生态：LangChain
显式状态：LangGraph
知识检索：LlamaIndex / Haystack
多角色实验：AutoGen / CrewAI
企业微软栈：Semantic Kernel
OpenAI-first runtime：OpenAI Agents SDK
Claude-first 自有控制：Claude Tool Use + MCP
Claude-first 托管工作区：Managed Agents
工具协议：MCP
```

不要从框架品牌开始。先问清楚你要的是工具调用、状态机、RAG、协议，还是托管运行时。

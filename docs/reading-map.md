---
title: 阅读地图
description: 这本电子书的推荐阅读顺序与章节关系图
---

<script setup>
import LearningPath from '../.vitepress/theme/components/LearningPath.vue'
import RuntimeLifecycleDiagram from '../.vitepress/theme/components/RuntimeLifecycleDiagram.vue'
</script>

如果你是第一次系统阅读一个真实 AI Coding Agent 仓库，最常见的问题不是”内容不够”，而是”信息太多，不知道先读哪一篇”。

这一页只做一件事：给你一张可以直接执行的阅读路线图。

<EntryContextBanner
  section="阅读地图"
  badge="当前位置"
  tone="theory"
  summary="你现在在全站的路线分发页。它不负责替你读完整本书，而是帮你先定位『我应该从哪条路径切进去』，再决定回理论篇、去实践篇还是进入中级专题。"
  :next-steps="[
    { label: '按目标重新选学习路径', href: '/learning-paths/', hint: '先判断自己更适合先看源码、先做项目，还是先补工程判断。' },
    { label: '直接进入实践篇', href: '/practice/', hint: '如果你更想先跑项目，这里能马上进入 P1 和阶段总览。' }
  ]"
  :support-links="[
    { label: '回到首页', href: '/', hint: '重新从首页的起步卡做一次快速判断。' },
    { label: '准备好后进入中级篇', href: '/intermediate/', hint: '当你已经做过基础闭环并开始关心工程问题时，再切到专题页。' }
  ]"
/>

## 核心概念快速定位

如果你想快速找到特定主题，直接跳转到对应章节：

| 核心概念 | 主要章节 | 补充章节 | 说明 |
|---------|---------|---------|------|
| 🔄 **Agent Loop（执行循环）** | [第2篇 §2.5](/02-agent-core/index#agent-生命周期与执行循环) | [第4篇](/04-session-management/index) | Agent 的核心执行流程：输入→思考→工具调用→观察→输出 |
| 🔧 **Tool / Function Calling** | [第3篇](/03-tool-system/index) | [第11篇](/11-code-intelligence/index) | 工具系统的注册、执行、权限控制 |
| 📋 **Planning 与任务分解** | [第3篇 §3.5](/03-tool-system/index#任务编排与自定义工具开发) | [第15篇 §15.3](/15-advanced-topics/index#多-agent-协作的正式协议) | task 工具、子任务创建、多 Agent 协作 |
| 🧠 **Memory 机制** | [第4篇 §4.3](/04-session-management/index#上下文压缩策略) | [第9篇](/09-data-persistence/index) | 短期记忆（会话）、工作记忆（压缩）、长期记忆（持久化） |
| 💬 **Prompt 与上下文管理** | [第2篇 §2.4](/02-agent-core/index#prompt-工程与系统提示词) | [第4篇](/04-session-management/index) | 系统提示词、上下文窗口、Token 预算 |
| 👥 **多 Agent 协作** | [第15篇 §15.3](/15-advanced-topics/index#多-agent-协作的正式协议) | [第2篇 §2.3](/02-agent-core/index#agent-模式切换) | primary/subagent 模式、权限继承、任务分发 |

💡 **建议**：如果你是初学者，不要直接跳到某个概念，先按下面的”推荐起点”顺序建立整体认知。

## 推荐起点

如果你不想先读完整张地图，可以先回到 [学习路径](/learning-paths/)，或者直接从下面三条 canonical path 中选一条开始：

<LearningPath :path-ids="['theory-first', 'practice-first', 'engineering-depth']" />

如果你是 Agent 开发初学者，默认按下面顺序读：

1. 第一篇：先建立“系统怎样跑起来”的最小闭环
2. 第二篇：再理解 Agent 是如何被定义和约束的
3. 第三篇：再看工具怎样进入 Agent 能力边界
4. 第四篇：最后把会话怎样把模型、工具和状态串起来读顺

读完这四篇后，再决定往哪条路线深入，效率会高很多。

## 全书统一主链路

<RuntimeLifecycleDiagram
  :highlight-keys="['session', 'tools', 'provider']"
  description="阅读地图不是另一套解释，它只是把同一条运行时主链路拆成更适合初学者执行的章节顺序。"
/>

## 三条主线怎么配合

如果把全书看成一套完整学习系统，可以先把三条线理解成三种不同问题：

- **理论篇**：帮助你看懂“别人已经做出来的 Agent 系统为什么这样组织”。
- **实践篇**：帮助你练会“如果自己从零搭，应该先把哪些能力做出来”。
- **中级篇**：帮助你处理“当系统开始进入真实工程场景后，会遇到哪些专题问题”。

最推荐的阅读顺序不是三条线各读一遍，而是沿着“理论建立骨架 -> 实践补手感 -> 中级篇补工程判断”往前推进。

## 理论 / 实践 / 中级篇映射总表

| 理论篇 | 对应实践篇 | 对应中级篇 | 说明 |
| --- | --- | --- | --- |
| [第 1-4 章：基础闭环](/00-what-is-ai-agent/) | [P1-P4：最小 Agent 到错误处理](/practice/p01-minimal-agent/) | [第 27 章：Planning](/intermediate/27-planning-mechanism/) | 先建立最小闭环，再进入计划与执行的工程讨论。 |
| [第 4-5 章：会话与记忆](/04-session-management/) | [P5-P6：记忆系统与检索](/practice/p05-memory-arch/) | [第 28 章：上下文工程](/intermediate/28-context-engineering/) | 把抽象的上下文管理落到具体记忆策略。 |
| [第 3 章：工具系统](/03-tool-system/) | [P10-P12：ReAct / Planning / Reflection](/practice/p10-react-loop/) | [第 31 章：安全与边界](/intermediate/31-safety-boundaries/) | 从工具调用走到计划控制，再走到高风险约束。 |
| [第 6-9 章：模型、协议、服务与持久化](/05-provider-system/) | [P14、P18、P20：MCP、模型路由、可观测性](/practice/p14-mcp/) | [第 30 章：生产架构](/intermediate/30-production-architecture/) | 把运行时能力延伸到服务化和生产环境。 |
| [第 15-16 章：高级主题与最佳实践](/14-testing-quality/) | [P15-P17：多 Agent 协作](/practice/p15-multi-agent/) | [第 26 章：多智能体协作](/intermediate/26-multi-agent-collaboration/) | 理论、实践和专题都围绕协作边界与分工展开。 |
| [第 6、9、14 章：模型、数据与质量](/05-provider-system/) | [P18-P21：路由、安全、可观测、评估](/practice/p18-model-routing/) | [第 25、32 章：RAG 稳定性与性能成本](/intermediate/25-rag-failure-patterns/) | 把“能跑”推进到“可测、可控、可优化”。 |

## 四阶段课程分级

```text
阶段 1：先建立全局认知
  01 Agent 基础架构
  02 Agent 核心系统
  03 工具系统
  04 会话管理

阶段 2：再进入运行时主链路
  05 多模型支持
  06 MCP 协议集成
  08 HTTP API 服务器
  09 数据持久化

阶段 3：再理解交互与扩展
  07 TUI 终端界面
  10 多端 UI 开发
  11 代码智能
  12 插件与扩展

阶段 4：最后看工程化闭环
  13 部署与基础设施
  14 测试与质量保证
  15 高级主题与最佳实践
```

## 多条阅读路线

### 路线 A：从零入门 Agent 实现

适合：

- 第一次系统学习 Agent 开发
- 还没有搭过完整的工具调用和会话系统
- 希望先建立整体认知，而不是先啃某个细节模块

建议顺序：

1. [第一篇：Agent 基础架构](/01-agent-basics/index)
2. [第二篇：Agent 核心系统](/02-agent-core/index)
3. [第三篇：工具系统](/03-tool-system/index)
4. [第四篇：会话管理](/04-session-management/index)
5. [第五篇：多模型支持](/05-provider-system/index)
6. [第八篇：HTTP API 服务器](/08-http-api-server/index)

这条线的目标，是先看懂“一个 Agent 系统怎样跑起来”。

### 路线 B：从运行时到产品化

适合：

- 已经理解基本 Agent 概念
- 更想知道多模型、协议、持久化、云端产品边界怎么落地
- 关心“真实项目为什么会长成现在这个架构”

建议顺序：

1. [第五篇：多模型支持](/05-provider-system/index)
2. [第六篇：MCP 协议集成](/06-mcp-integration/index)
3. [第八篇：HTTP API 服务器](/08-http-api-server/index)
4. [第九篇：数据持久化](/09-data-persistence/index)
5. [第十三篇：部署与基础设施](/13-deployment-infrastructure/index)
6. [第十四篇：测试与质量保证](/14-testing-quality/index)

这条线的目标，是看懂“从本地运行时到产品级系统”的演进路径。

### 路线 C：从交互界面到扩展生态

适合：

- 对 TUI、Web、Desktop、IDE 集成更感兴趣
- 想理解代码智能和插件/Skill 体系
- 更关心“用户怎么和 Agent 协作”

建议顺序：

1. [第七篇：TUI 终端界面](/07-tui-interface/index)
2. [第十篇：多端 UI 开发](/10-multi-platform-ui/index)
3. [第十一篇：代码智能](/11-code-intelligence/index)
4. [第十二篇：插件与扩展](/12-plugins-extensions/index)

这条线的目标，是看懂”交互层和扩展层怎样让 Agent 真正可用”。

### 路线 D：从插件到多模型编排（oh-my-openagent）

适合：

- 已经理解 OpenCode 基础架构（至少读完前 4 章）
- 想知道如何通过插件扩展 OpenCode 的能力
- 对多模型编排、Agent 协作的工程实现感兴趣
- 想动手添加自己的 Agent、工具或 Hook

建议顺序：

1. [第17章：为什么需要多个 Agent？](/oh-prelude/)
2. [第18章：插件系统概述](/16-plugin-overview/)
3. [第19章：配置系统实战](/oh-config/)
4. [第20章：多模型编排系统](/17-multi-model-orchestration/)
5. [第21章：Hooks 三层架构](/18-hooks-architecture/)
6. [第22章：工具扩展系统](/19-tool-extension/)
7. [第23章：一条消息的完整旅程](/oh-flow/)
8. [第24章：实战案例与最佳实践](/20-best-practices/)

这条线的目标，是看懂”一个生产级 OpenCode 插件如何组织多 Agent 协作”，并能动手扩展它。

### 路线 E：从原理走向工程专题

适合：

- 希望把理论篇的核心概念无缝过渡到更具体工程专题的读者
- 已经读完理论篇并完成部分实践篇项目，准备继续深入中级专题的工程实践者

建议顺序：

1. 衔接理论篇：重温第1-4章的运行时主链路和关键组件，把握系统整体脉络
2. 进入中级篇：点击 [阅读中级篇入口](/intermediate/)，在中级专题内容里快速对照原理与工程场景的映射
3. 对照实践篇：以 HTTP API、部署、质量等实践项目为锚点，在实际案例中验证中级专题的工程细节

衔接说明：

- 与理论篇：路线 E 以理论篇的运行时主链路作为起点，在掌握原理后直接跳到中级篇的专题桥段，避免重复初级内容
- 与实践篇：让你把在实践篇中遇到的工程挑战与中级篇的专题讲解串联，形成“原理+实践”的复合认知路径

## 章节依赖关系

如果你只想知道”某一篇之前至少该看什么”，可以按下面这张简化依赖图走：

```text
01 -> 02 -> 03 -> 04
04 -> 05 -> 06
04 + 07 -> 08
04 + 08 -> 09
07 + 08 + 09 -> 10
03 -> 11
03 + 06 -> 12
01 + 08 + 10 -> 13
03 + 08 + 10 -> 14
02 + 03 + 04 + 14 -> 15

# 第五部分（oh-my-openagent）
12 -> oh-prelude -> 16-plugin-overview -> oh-config
oh-config -> 17-multi-model -> 18-hooks -> 19-tool -> oh-flow -> 20-best-practices
```

## 如果你时间有限

### 只读 4 篇

读这四篇：

1. [第一篇：Agent 基础架构](/01-agent-basics/index)
2. [第二篇：Agent 核心系统](/02-agent-core/index)
3. [第三篇：工具系统](/03-tool-system/index)
4. [第四篇：会话管理](/04-session-management/index)

这四篇足够帮你建立一个真实 Agent 系统的主骨架。

### 只读 8 篇

在前四篇基础上，加上：

5. [第五篇：多模型支持](/05-provider-system/index)
6. [第六篇：MCP 协议集成](/06-mcp-integration/index)
7. [第八篇：HTTP API 服务器](/08-http-api-server/index)
8. [第九篇：数据持久化](/09-data-persistence/index)

这 8 篇足够让你看懂 OpenCode 的核心运行时闭环。

## 最后建议

不要试图一次性记住所有目录和所有文件。

更有效的方式是：

1. 先按这张地图选一条线
2. 每篇只抓“入口文件 + 主链路 + 最容易误解的点”
3. 看完一篇，再决定要不要继续深入代码细节

如果你已经准备好了，建议从 [第一篇：Agent 基础架构](/01-agent-basics/index) 开始。

如果你已经读完前四篇，想看真实插件案例，直接跳到 [第17章：为什么需要多个 Agent？](/oh-prelude/)。

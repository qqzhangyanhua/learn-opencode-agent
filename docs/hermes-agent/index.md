---
title: 从零拆解 Hermes Agent
description: 以 Hermes Agent 源码为案例，从 Agent 概念校准到运行时全链路拆解，建立 Agent Runtime 工程直觉
contentType: theory
series: hermes-agent
contentId: hermes-agent-index
shortTitle: Hermes Agent 拆解
summary: 12 章主干（第1-12章）+ 26 篇附录，从「什么是 Agent」到「怎么自己做一个 Agent」
difficulty: intermediate
estimatedTime: 12-18 小时
learningGoals:
  - 建立 Agent Runtime 分层认知，区分 Agent 与普通聊天系统
  - 理解核心执行循环、工具编排、Prompt 装配流水线
  - 掌握记忆系统、会话持久化、跨会话连续性设计
  - 理解 CLI / Gateway 多入口架构与 Skills 技能体系
  - 了解子 Agent、Cron 自动化、安全约束等工程化能力
prerequisites:
  - 了解 AI Agent 基本概念
  - 熟悉 Python
recommendedNext:
  - /claude-code/
  - /new-claude/
practiceLinks: []
searchTags:
  - hermes-agent
  - agent-runtime
  - 工具系统
  - 记忆系统
  - 多平台接入
  - skills
navigationLabel: Hermes Agent 拆解
entryMode: read-first
roleDescription: 想通过真实 Agent 源码建立运行时工程直觉的开发者
---

# 从零拆解 Hermes Agent

> 以 Hermes Agent 当前源码为分析基点，12 章主干 + 26 篇深度附录，把一个真实 Agent Runtime 从概念到工程全部拆开讲透。

## 本书特点

**不讲 Demo，只讲 Runtime**：每一章对应 Hermes Agent 的一层真实架构，读完能带走可复用的工程判断。

**四条主线**：
- **概念校准**（00-01）：先站稳"你到底在学什么"，建立全局地图
- **核心机制**（02-05）：执行循环、工具系统、记忆系统、会话持久化
- **系统扩展**（06-09）：CLI / Gateway、Skills、子 Agent、Cron 自动化
- **工程落地**（10-11）：安全约束、自己做 Agent 该先抄哪几层

## 章节目录

### 概念准备

| 章节 | 核心问题 |
|------|----------|
| [第1章：先别急着看代码：你到底在学什么是 Agent](/hermes-agent/00-先别急着看代码-你到底在学什么是Agent) | 清理误区，建立 Agent 分层感 |
| [第2章：5 分钟看懂 Hermes Agent：先建立全局地图](/hermes-agent/01-5分钟看懂Hermes-Agent-先建立全局地图) | 从仓库结构看系统全貌 |

### 核心机制

| 章节 | 核心问题 |
|------|----------|
| [第3章：Hermes Agent 是怎么跑起来的](/hermes-agent/02-Hermes-Agent-是怎么跑起来的-拆开run_agent看执行闭环) | 拆开 run_agent 看执行闭环 |
| [第4章：工具系统](/hermes-agent/03-工具系统-为什么说Tool-Use才是Agent工程的地基) | 为什么说 Tool Use 才是 Agent 工程的地基 |
| [第5章：记忆系统](/hermes-agent/04-记忆系统-Hermes为什么不是每次都失忆的Agent) | Hermes 为什么不是每次都失忆的 Agent |
| [第6章：SessionDB 与会话系统](/hermes-agent/05-SessionDB与会话系统-Hermes如何拥有跨会话连续性) | 如何拥有跨会话连续性 |

### 系统扩展

| 章节 | 核心问题 |
|------|----------|
| [第7章：CLI 与 Gateway](/hermes-agent/06-CLI与Gateway-为什么一个好Agent不能只活在终端里) | 为什么一个好 Agent 不能只活在终端里 |
| [第8章：Skills](/hermes-agent/07-Skills-Hermes最像会成长的Agent的地方) | Hermes 最像会成长的 Agent 的地方 |
| [第9章：子 Agent 与并行执行](/hermes-agent/08-子Agent与并行执行-Hermes如何把复杂任务拆开做) | 如何把复杂任务拆开做 |
| [第10章：Cron 后台任务与自动化](/hermes-agent/09-Cron后台任务与自动化-从会聊天到会持续工作) | 从会聊天到会持续工作 |

### 工程落地

| 章节 | 核心问题 |
|------|----------|
| [第11章：安全约束与工程现实](/hermes-agent/10-安全约束与工程现实-为什么真正能用的Agent必须麻烦一点) | 为什么真正能用的 Agent 必须麻烦一点 |
| [第12章：如果你也想做一个自己的 Agent](/hermes-agent/11-如果你也想做一个自己的Agent-应该先抄Hermes的哪几层) | 应该先抄 Hermes 的哪几层 |

---

## 附录

### Prompt 与上下文

- [附录 A：上下文压缩与 Prompt 稳定性](/hermes-agent/附录A-上下文压缩与Prompt稳定性-为什么Agent不是上下文越长越好)
- [附录 B：Prompt Builder 专章](/hermes-agent/附录B-Prompt-Builder专章-系统提示词为什么在Hermes里是一条装配流水线)
- [附录 L：Context Compression 后状态恢复](/hermes-agent/附录L-Context-Compression后状态恢复专章-Hermes为什么压缩上下文不等于删历史)
- [附录 V：Ephemeral System Prompt](/hermes-agent/附录V-Ephemeral-System-Prompt专章-Hermes为什么自己保留临时system通道却不把它当长期前缀)
- [附录 W：多层上下文装配顺序](/hermes-agent/附录W-多层上下文装配顺序专章-Hermes一次API调用前到底按什么顺序拼上下文)
- [附录 X：Prompt Cache](/hermes-agent/附录X-Prompt-Cache专章-Hermes为什么很多边界设计最后都指向前缀稳定)
- [附录 Y：Trajectory 与 Prompt 边界](/hermes-agent/附录Y-Trajectory与Prompt边界专章-Hermes为什么有些上下文给模型看却故意不入轨迹)

### 工具与能力层

- [附录 E：Terminal 工具与执行环境](/hermes-agent/附录E-Terminal工具与执行环境-Hermes为什么不直接subprocess-run)
- [附录 F：Code Execution 与 Terminal 的边界](/hermes-agent/附录F-Code-Execution与Terminal的边界-Hermes为什么同时保留两套执行能力)
- [附录 I：Tool 与 Toolset 和 Skill 的边界](/hermes-agent/附录I-Tool与Toolset和Skill的边界-Hermes为什么要把能力拆成三层)
- [附录 K：Agent Loop 接管工具](/hermes-agent/附录K-Agent-Loop接管工具专章-Hermes为什么有些工具不能走普通Registry-Dispatch)
- [附录 AD：Tool Registry 与插件注册](/hermes-agent/附录AD-Tool-Registry与插件注册专章-Hermes为什么工具系统不是一堆if-else而是一条统一注册总线)
- [附录 AE：Skills Prompt 生成](/hermes-agent/附录AE-Skills-Prompt生成专章-Hermes为什么系统提示词里的技能索引要跟着当前可用tools和toolsets动态变化)

### 记忆与会话

- [附录 J：Memory 与 Skill 和 Session Search 的边界](/hermes-agent/附录J-Memory与Skill和Session-Search的边界-Hermes怎么区分事实记忆历史检索和流程沉淀)
- [附录 N：会话持久化边界](/hermes-agent/附录N-会话持久化边界专章-Hermes为什么SessionDB-Gateway-Transcript-ACP-Session和API-Responses-Store不是一回事)
- [附录 O：Session Search](/hermes-agent/附录O-Session-Search专章-Hermes为什么查的是正式会话账本而不是当前Transcript或Memory)
- [附录 P：Resume / Branch / Compression 的 Session Lineage](/hermes-agent/附录P-Resume-Branch-Compression的Session-Lineage专章-Hermes怎么把一段对话长成一棵会话树)
- [附录 Q：Tool Call 持久化](/hermes-agent/附录Q-Tool-Call持久化专章-Hermes为什么不只存最终回答而要存消息-工具调用-工具结果-推理痕迹)
- [附录 S：Memory Flush](/hermes-agent/附录S-Memory-Flush专章-Hermes为什么记忆沉淀不是每轮顺手改system-prompt)
- [附录 T：Prefetch Recall](/hermes-agent/附录T-Prefetch-Recall专章-Hermes为什么把外部记忆召回做成API-call-time临时注入而不是并回system-prompt)

### 运行时与执行

- [附录 C：测试一个 Agent Runtime](/hermes-agent/附录C-测试一个Agent-Runtime-Hermes为什么不是只靠Demo验证)
- [附录 D：模型切换与 Provider Fallback](/hermes-agent/附录D-模型切换与Provider-Fallback-Hermes怎么把模型差异变成运行时策略)
- [附录 M：多入口同一 Runtime](/hermes-agent/附录M-多入口同一Runtime专章-Hermes为什么CLI-Gateway-ACP和API-Server共用一颗Agent内核)
- [附录 R：Auxiliary Model](/hermes-agent/附录R-Auxiliary-Model专章-Hermes为什么不让主模型包办摘要压缩视觉和副任务)
- [附录 AA：Interrupt 与 Queue](/hermes-agent/附录AA-Interrupt与Queue专章-Hermes为什么消息平台里的新消息不能直接塞进正在运行的Agent回合)
- [附录 AB：Activity 与 Inactivity Timeout](/hermes-agent/附录AB-Activity与Inactivity-Timeout专章-Hermes为什么不是给Agent一个固定超时而是盯住它是否还在推进)

### 扩展与接入

- [附录 G：Gateway 会话注入](/hermes-agent/附录G-Gateway会话注入专章-Hermes怎么把消息来源变成运行时上下文)
- [附录 H：Skills 运行时](/hermes-agent/附录H-Skills运行时专章-Hermes为什么不把技能直接塞进system-prompt)
- [附录 U：Plugin Hook 注入边界](/hermes-agent/附录U-Plugin-Hook注入边界专章-Hermes为什么不开放system-prompt给插件随便改)
- [附录 AC：Skill 与 Plugin 加载](/hermes-agent/附录AC-Skill与Plugin加载专章-Hermes怎么把可扩展能力接进运行时而不是简单读目录拼提示词)
- [附录 Z：Gateway Agent Cache](/hermes-agent/附录Z-Gateway-Agent-Cache专章-Hermes为什么在消息平台里宁可缓存整颗AIAgent也不愿每条消息重建一次运行时)

---

<ChapterActionPanel
  :items="[
    { text: '从第1章开始', link: '/hermes-agent/00-先别急着看代码-你到底在学什么是Agent', type: 'primary' },
    { text: '返回首页', link: '/', type: 'secondary' }
  ]"
/>

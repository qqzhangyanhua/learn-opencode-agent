---
title: Claude Code 架构思维
description: 以 Claude Code 为案例，从 Agent 定义到运行时主链路、多 Agent 协作、平台化演进，建立完整的 Agent 工程判断框架
contentType: theory
series: claude-code
contentId: claude-code-index
shortTitle: Claude Code 架构思维
summary: 20 章系统拆解，从「Agent 到底是什么」到「把整本书收束成一个判断框架」
difficulty: intermediate
estimatedTime: 10-15 小时
learningGoals:
  - 建立 Agent 的最小判断标准，区分 Agent 与问答系统、固定工作流
  - 理解运行时主链路：模型、工具、上下文、规划、终止条件
  - 掌握多 Agent 协作、MCP 协议、配置控制面、持久化等系统设计
  - 理解 Agent 从应用走向平台的分水岭与扩展点设计
  - 建立一套可复用的 Agent 系统工程判断框架
prerequisites:
  - 了解 AI Agent 基本概念
  - 熟悉至少一门编程语言
recommendedNext:
  - /new-claude/
  - /intermediate/
practiceLinks: []
searchTags:
  - claude-code
  - agent架构
  - 运行时主链路
  - 多Agent
  - 平台化
navigationLabel: Claude Code 架构思维
entryMode: read-first
roleDescription: 想系统建立 Agent 工程判断力的开发者
---

# Claude Code 架构思维

> 以 Claude Code 为案例，用 20 章把 Agent 系统从概念到平台化讲透，建立一套可复用的工程判断框架。

## 本书特点

**不堆术语，只建判断力**：每一章围绕一个核心问题展开，读完能带走明确的工程判断标准。

**五条主线**：
- **概念校准**（1-3）：先把 Agent 定义拉清楚，建立最小闭环认知
- **运行时拆解**（4-9）：模型、工具、上下文、规划、终止——把主链路每个环节讲明白
- **系统扩展**（10-15）：多 Agent、MCP 协议、配置、服务化、持久化、交互层
- **平台演进**（16-18）：从应用到平台的分水岭，扩展点与多 Agent 编排
- **工程收束**（19-20）：长期存活条件与全书判断框架

## 章节目录

### 第一部分：先把 Agent 这件事想明白

| 章节 | 核心问题 |
|------|----------|
| [第1章：Agent 到底是什么，不是什么](/claude-code/chapter01) | 清理概念污染，建立最小判断标准 |
| [第2章：Agent 的最小组成单元](/claude-code/chapter02) | 感知、决策、行动、反馈——四件事缺一不可 |
| [第3章：从一次请求看懂 Agent 的闭环](/claude-code/chapter03) | 用一次真实请求串起完整执行流程 |

### 第二部分：把运行时主链路拆开

| 章节 | 核心问题 |
|------|----------|
| [第4章：模型在 Agent 里到底负责什么](/claude-code/chapter04) | 模型是决策引擎，不是万能大脑 |
| [第5章：工具不是外挂，而是 Agent 的手和脚](/claude-code/chapter05) | 工具系统的设计、注册、执行与结果回填 |
| [第6章：记忆、状态与上下文，不是一个东西](/claude-code/chapter06) | 拆清三个常被混淆的概念 |
| [第7章：上下文为什么总会失控](/claude-code/chapter07) | 上下文膨胀的根因与治理策略 |
| [第8章：规划不是写给人看的漂亮计划](/claude-code/chapter08) | Agent 规划的实际运作方式 |
| [第9章：什么时候该停，什么时候该问人](/claude-code/chapter09) | 终止条件与人机交互边界 |

### 第三部分：从单 Agent 走向更复杂系统

| 章节 | 核心问题 |
|------|----------|
| [第10章：什么时候真的需要多 Agent](/claude-code/chapter10) | 多 Agent 的判断标准与常见误用 |
| [第11章：为什么 Agent 需要一层协议来接外部世界](/claude-code/chapter11) | MCP 等协议的设计动机 |
| [第12章：配置不是参数堆，而是运行时控制面](/claude-code/chapter12) | 配置系统的分层与治理 |
| [第13章：为什么 Agent 一旦产品化，迟早会走向服务化](/claude-code/chapter13) | 服务化的驱动力与架构演进 |
| [第14章：持久化不是顺手存一下](/claude-code/chapter14) | 让 Agent 拥有长期状态 |
| [第15章：交互承载层不是界面皮肤](/claude-code/chapter15) | Agent 的协作表面设计 |

### 第四部分：从应用走向平台

| 章节 | 核心问题 |
|------|----------|
| [第16章：什么时候一个 Agent 应用开始平台化](/claude-code/chapter16) | 平台化的分水岭判断 |
| [第17章：扩展点不是一堆名词，而是平台的能力接口](/claude-code/chapter17) | 扩展点的设计原则 |
| [第18章：多 Agent 一旦落地，真正难的是编排不是数量](/claude-code/chapter18) | 编排策略与协同机制 |

### 第五部分：工程化闭环与全书收束

| 章节 | 核心问题 |
|------|----------|
| [第19章：一个 Agent 系统怎样才算真的能长期活着](/claude-code/chapter19) | 长期存活的工程化条件 |
| [第20章：把整本书收束成一个判断框架](/claude-code/chapter20) | 压缩为可复用的分析框架 |

---

<ChapterActionPanel
  :items="[
    { text: '从第1章开始', link: '/claude-code/chapter01', type: 'primary' },
    { text: '查看阅读指南', link: '/claude-code/reading-guide', type: 'secondary' },
    { text: '返回首页', link: '/', type: 'secondary' }
  ]"
/>

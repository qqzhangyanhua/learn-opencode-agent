---
layout: home

hero:
  name: 从零构建 AI Coding Agent
  text: OpenCode 源码剖析与实战
  tagline: 面向中文开发者的 Agent 工程学习站，覆盖源码带读、可运行实践与工程专题
  actions:
    - theme: brand
      text: 开始阅读理论篇
      link: /00-what-is-ai-agent/index
    - theme: brand
      text: 动手实践 23 个项目
      link: /practice/
    - theme: alt
      text: 阅读地图
      link: /reading-map
    - theme: alt
      text: 阅读中级篇
      link: /intermediate/
    - theme: alt
      text: Star 支持本书
      link: https://github.com/qqzhangyanhua/learn-opencode-agent
    - theme: alt
      text: 查看源码基线
      link: https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc
---

<script setup>
import LearningPath from '../.vitepress/theme/components/LearningPath.vue'
import RuntimeLifecycleDiagram from '../.vitepress/theme/components/RuntimeLifecycleDiagram.vue'
import TechStackGrid from '../.vitepress/theme/components/TechStackGrid.vue'
import PracticePreview from '../.vitepress/theme/components/PracticePreview.vue'
</script>

## 这三条线分别回答什么

- **理论篇**：回答“OpenCode 这类 AI Coding Agent 是怎么实现的”，重点是看懂真实源码的主链路与工程边界。
- **实践篇**：回答“如果你自己来做，最小可运行版本该怎么搭起来”，重点是把核心模式落到可执行 TypeScript 示例。
- **中级篇**：回答“当你开始碰到稳定性、协作、成本、安全这些工程问题时，应该按什么专题继续深化”。

## 学习方式

本书提供**理论篇 + 实践篇 + 中级篇**三条互相衔接的学习路径：

- **理论篇**（第 1-16 章）：深入剖析 OpenCode 源码架构，理解 Agent 系统设计原理
- **实践篇**（P1-P23）：23 个可运行项目，从最小 Agent 到生产部署全覆盖
- **中级篇**（第 25-32 章）：围绕 RAG、多智能体、Planning、上下文工程、安全与成本等工程专题继续深化

建议**理论与实践穿插学习**：看完理论篇第 1-4 章后，先跑通实践篇 P1-P4，建立感性认知后再深入后续章节。

当你完成基础理解，想把理论转向更具体的工程专题，可以通过“阅读中级篇”这一入口继续深化。

## 双轨学习体系

<PracticePreview :theoryChapters="16" :practiceProjects="23" :practicePhases="7" />

## 核心学习路径

<LearningPath />

## 先记住这条主链路

<RuntimeLifecycleDiagram />

## 辅助阅读入口

- [阅读地图](/reading-map)：先选路线，再决定按哪条主链路进入全书。
- [版本说明](/version-notes)：确认本书基于哪份源码、写到什么边界。
- [术语表](/glossary)：统一理解 `Agent`、`Subagent`、`Primary Agent`、`运行时`、`工作台` 等高频概念。
- [封版清单](/release-checklist)：查看当前版本完成度、已知非阻塞项和发布前检查项。

> **阅读边界**：本书默认以 commit 锚定的源码基线为准，重点解释已经落在仓库里的结构、主链路和工程约束；只有在明确说明“追踪最新实现”时，才额外回到 `dev` 分支对照差异。若文档与代码不一致，以当前仓库给出的源码快照与入口文件为准。

## 这本书怎么读

- 如果你是第一次系统学习 Agent 开发，先按**阶段 1**的 `01 -> 02 -> 03 -> 04` 建立最小运行时闭环。
- 如果你更关心产品化落地，再进入**阶段 2**，优先看 `05、06、08、09`。
- 如果你更关心界面、IDE 集成和扩展生态，再进入**阶段 3**，优先看 `07、10、11、12`。
- `13、14、15` 对应**阶段 4**，回答部署、质量与长期演进问题。
- **阶段 5** 是扩展篇，以 oh-my-openagent 插件为案例，深入多 Agent 编排、Hook 分层架构和工具扩展的工程实现（第17-24章）。

## 技术栈

<TechStackGrid />

## 你会得到什么

- 一张真实 AI Coding Agent 的系统总图，而不是零散功能点列表。
- 一套按“入口文件 -> 主链路 -> 关键边界”阅读大型源码仓库的方法。
- 对模型抽象、工具系统、会话系统、MCP、多端 UI 和扩展体系的工程直觉。
- 一组能迁移到自己项目里的设计原则，而不只是对 OpenCode 的局部记忆。

## 适合人群

- 想要深入理解 AI Coding Agent 架构的开发者
- 希望学习大型 TypeScript 项目工程实践的工程师
- 对 AI 辅助开发工具感兴趣的技术爱好者
- 想要为 OpenCode 贡献代码的开源贡献者

---
layout: home

hero:
  name: 从零构建 AI Coding Agent
  text: OpenCode 源码剖析与实战
  tagline: 面向中文开发者的 Agent 工程学习站，覆盖源码带读、可运行实践与工程专题
  actions:
    - theme: brand
      text: 30 秒选起步路线
      link: /discover/
    - theme: brand
      text: 直接开始第一个项目
      link: /practice/p01-minimal-agent/
    - theme: alt
      text: 先看 Agent 主链路
      link: /00-what-is-ai-agent/
    - theme: alt
      text: 阅读地图
      link: /reading-map
---

<script setup>
import LearningPath from '../.vitepress/theme/components/LearningPath.vue'
import RuntimeLifecycleDiagram from '../.vitepress/theme/components/RuntimeLifecycleDiagram.vue'
import TechStackGrid from '../.vitepress/theme/components/TechStackGrid.vue'
import PracticePreview from '../.vitepress/theme/components/PracticePreview.vue'
import SectionRoleGrid from '../.vitepress/theme/components/SectionRoleGrid.vue'
</script>

## 30 秒选你的起步路线

<HomeStartPanel />

## 这站怎么帮你学

建议**理论与实践穿插学习**：看完理论篇第 1-4 章后，先跑通实践篇 P1-P4，建立感性认知后再深入后续章节。

<SectionRoleGrid />

## 你会得到什么

- 一张真实 AI Coding Agent 的系统总图，而不是零散功能点列表。
- 一套按"入口文件 -> 主链路 -> 关键边界"阅读大型源码仓库的方法。
- 对模型抽象、工具系统、会话系统、MCP、多端 UI 和扩展体系的工程直觉。
- 一组能迁移到自己项目里的设计原则，而不只是对 OpenCode 的局部记忆。

## 适合人群

- 想要深入理解 AI Coding Agent 架构的开发者
- 希望学习大型 TypeScript 项目工程实践的工程师
- 对 AI 辅助开发工具感兴趣的技术爱好者
- 想要为 OpenCode 贡献代码的开源贡献者

## 起步后，你会继续经过这三段

<PracticePreview />

## 按目标走完整路线

<LearningPath />

## 先记住这条主链路

<RuntimeLifecycleDiagram />

## 技术栈

<TechStackGrid />

## 辅助阅读入口

- [开始学习](/discover/)：统一发现中心，先按目标选路线，再按主题或内容类型继续探索。
- [学习路径](/learning-paths/)：按目标选起步路线，30 秒内知道先读什么、先练什么。
- [阅读地图](/reading-map)：先选路线，再决定按哪条主链路进入全书。
- [版本说明](/version-notes)：确认本书基于哪份源码、写到什么边界。
- [术语表](/glossary)：统一理解 `Agent`、`Subagent`、`Primary Agent`、`运行时`、`工作台` 等高频概念。
- [封版清单](/release-checklist)：查看当前版本完成度、已知非阻塞项和发布前检查项。
- [阅读中级篇](/intermediate/)：进入第 25-32 章，深化 RAG、多智能体、成本与安全等工程专题。
- [查看源码基线](https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc)：本书基于此 commit 进行解析。

> **阅读边界**：本书默认以 commit 锚定的源码基线为准，重点解释已经落在仓库里的结构、主链路和工程约束；只有在明确说明"追踪最新实现"时，才额外回到 `dev` 分支对照差异。若文档与代码不一致，以当前仓库给出的源码快照与入口文件为准。

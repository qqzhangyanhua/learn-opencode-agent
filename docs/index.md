---
layout: home

hero:
  name: 从零构建 AI Coding Agent
  text: OpenCode 源码剖析与实战
  tagline: 面向 Agent 开发初学者的 OpenCode 源码带读电子书
  actions:
    - theme: brand
      text: 开始阅读
      link: /01-agent-basics/index
    - theme: alt
      text: 阅读地图
      link: /reading-map
    - theme: alt
      text: 查看 OpenCode 源码
      link: https://github.com/anomalyco/opencode/tree/dev
---

<script setup>
import LearningPath from '../.vitepress/theme/components/LearningPath.vue'
import RuntimeLifecycleDiagram from '../.vitepress/theme/components/RuntimeLifecycleDiagram.vue'
import TechStackGrid from '../.vitepress/theme/components/TechStackGrid.vue'
</script>

## 核心学习路径

<LearningPath />

## 先记住这条主链路

<RuntimeLifecycleDiagram />

## 辅助阅读入口

- [阅读地图](/reading-map)：先选路线，再决定按哪条主链路进入全书。
- [版本说明](/version-notes)：确认本书基于哪份源码、写到什么边界。
- [术语表](/glossary)：统一理解 `Agent`、`Subagent`、`Primary Agent`、`运行时`、`工作台` 等高频概念。
- [封版清单](/release-checklist)：查看当前版本完成度、已知非阻塞项和发布前检查项。

> **阅读边界**：本书以当前 `dev` 分支源码实现为准，重点解释已经落在仓库里的结构、主链路和工程约束，不承诺覆盖未来版本变更。若文档与代码不一致，以当前仓库源码为准。

## 这本书怎么读

- 如果你是第一次系统学习 Agent 开发，先按**阶段 1**的 `01 -> 02 -> 03 -> 04` 建立最小运行时闭环。
- 如果你更关心产品化落地，再进入**阶段 2**，优先看 `05、06、08、09`。
- 如果你更关心界面、IDE 集成和扩展生态，再进入**阶段 3**，优先看 `07、10、11、12`。
- `13、14、15` 对应**阶段 4**，更适合最后阅读，它们回答的是部署、质量与长期演进问题。

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

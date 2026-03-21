---
title: 版本说明
description: 本书的源码基线、写作范围与阅读边界说明
---

<script setup>
import SourceSnapshotCard from '../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

这一页说明三件事：

1. 这本书基于哪一份源码来写
2. 这本书希望解决什么问题
3. 阅读时哪些地方应当视为“当前实现状态”，而不是长期承诺

## 源码基线

本书当前拆成两类仓库语义，阅读时不要混淆：

- OpenCode 源码仓库：`anomalyco/opencode`
- 文中源码链接默认基线：`f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc`
- 最新实现追踪分支：`dev`
- 电子书站点目录：`docs/book/`
- 本书维护仓库：`qqzhangyanhua/learn-opencode-agent`

这意味着本书首先是一份“基于当前实现的源码带读”，而不是脱离仓库现实的 Agent 理论教材；源码锚点和书稿维护入口不是同一个仓库。

<SourceSnapshotCard
  title="全书统一源码快照语义"
  description="后续各章顶部都会复用同一张快照卡。它不是装饰，而是告诉读者：这一章到底基于哪一份源码、该先抓哪些入口文件。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: '全书基线仓库',
      path: 'https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc',
      href: 'https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc'
    },
    {
      label: '电子书站点目录',
      path: 'docs/book/'
    },
    {
      label: '章节源码链接默认基线',
      path: 'f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc'
    },
    {
      label: '最新实现追踪分支',
      path: 'dev'
    },
    {
      label: '本书维护仓库',
      path: 'https://github.com/qqzhangyanhua/learn-opencode-agent',
      href: 'https://github.com/qqzhangyanhua/learn-opencode-agent'
    }
  ]"
/>

## 为什么现在要加“源码快照卡”

这本书的定位不是泛泛讲概念，而是带着读者沿真实仓库走主链路。

所以每一篇都应该先说清楚四件事：

- 基于哪一个仓库
- 基于哪一个分支
- 基于哪一个 commit 基线
- 本章最值得先抓的入口文件是什么

这样做的目的很简单：

- 降低“文档看起来对，但源码已经变了”的错觉
- 让初学者不用先通读整章，先抓住最稳定的源码锚点
- 让后续章节都挂回同一套版本语义，而不是各写各的

## 写作范围

这本书重点解释的是：

- OpenCode 当前仓库怎样组织 Agent 运行时
- 多模型、工具、会话、MCP、UI、持久化等能力怎样落到真实代码
- 一个面向开发工作流的 Agent 产品，为什么会长成今天这套工程结构

这本书刻意不把重心放在：

- 泛泛介绍 LLM、Prompt、RAG 等通用概念
- 脱离当前仓库去设计“更理想”的未来架构
- 把尚未在代码里落地的能力写成既成事实

## 阅读边界

阅读本书时，建议默认采用下面这个判断原则：

- 文中明确指向文件和代码路径的内容，优先视为“当前已实现”。
- 文中写明“实验性”“当前状态”“更适合理解为”的内容，优先视为“基于现状的工程判断”。
- 如果仓库未来发生重构，章节里的结构理解方法通常仍然有价值，但具体文件路径和实现细节可能变化。

## 默认为什么改成 commit 锚定

这本书现在默认采用 commit 锚定链接，而不是直接把 `dev` 当作唯一入口，原因很简单：

- 源码带读首先要保证“你看到的文字”和“你点开的代码”能稳定对齐
- 章节之间要共享同一份快照语义，不能今天对着这版代码解释，明天链接已经漂走
- 阅读型内容优先解决“可复现”和“可验证”，再解决“追踪最新”

因此现在的链接策略是两层：

- 默认阅读：优先使用 commit 锚定链接，确保章节解释和源码快照稳定一致
- 追踪最新：只有在明确说明“对照最新实现”时，才额外给出 `dev` 分支入口

这样做不是否认 `dev` 的价值，而是把它放回更合理的位置：它适合做增量对照，不适合做全书默认基线。

## 如何理解“当前实现状态”

在 Agent 项目里，有些能力天然变化很快，例如：

- provider 支持范围
- MCP 集成方式
- LSP 能力完整度
- 云端产品边界

因此本书更强调：

- 先理解当前代码怎样工作
- 再提炼背后的设计原则
- 最后再判断哪些东西适合迁移到自己的项目

这比一开始追求“写一份永远不过时的文档”更现实。

## 适合谁

这本书最适合下面三类读者：

- 想系统理解 Agent 工程实现的初学者
- 想从真实仓库学习大型 TypeScript 项目拆分方式的工程师
- 想基于 OpenCode 继续做扩展、实验或贡献的开发者

## 推荐使用方式

如果你准备把这本书当作源码带读材料，我建议这样使用：

1. 先看 [阅读地图](/reading-map)，选一条路线。
2. 每一篇先抓“入口文件 + 主链路 + 最容易误解的点”。
3. 遇到和代码不一致的地方，以当前仓库源码为准。

## 最后说明

本书的目标不是替你记住每一个文件，而是帮你建立一种更可靠的阅读方法：

- 先定边界
- 再抓主链路
- 再回到实现细节

如果你能把这套方法迁移到自己的 Agent 项目里，这本书就已经达成目的。

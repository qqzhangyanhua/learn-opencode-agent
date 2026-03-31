---
title: Claude Code 拆解
description: 基于 Claude Code 官方仓库的源码解析，深入理解插件系统、Hook 机制、多 Agent 协作与工程化实践
contentType: theory
series: claude-code
contentId: claude-code-index
shortTitle: Claude Code 拆解
summary: 拆解 Claude Code 官方仓库的 15 章源码解析，从项目总览到工程化基础设施
difficulty: intermediate
estimatedTime: 6-10 小时
learningGoals:
  - 理解 Claude Code 插件系统的四大组件（命令/Agent/Hook/技能）
  - 掌握 Hook 机制的实现原理与最佳实践
  - 学会多 Agent 协作的实战模式
  - 了解 GitHub 自动化与 CI/CD 工程化方案
prerequisites:
  - 了解 AI Agent 基本概念
  - 熟悉 Python 或 TypeScript
recommendedNext:
  - /intermediate/
practiceLinks: []
searchTags:
  - claude-code
  - 插件系统
  - hook
  - 多Agent
navigationLabel: Claude Code 拆解
entryMode: read-first
roleDescription: 想深入理解 Claude Code 架构的工程师
---

# Claude Code 拆解

> 基于 Claude Code 官方仓库的源码解析，拆解 13 个插件的实现原理与设计决策。

## 本书特点

**基于真实代码**：每一章都对应 Claude Code 仓库里的真实代码，直接分析具体文件。

**三条主线**：
- **入门线**：理解插件系统的四大组件（命令/Agent/Hook/技能）
- **实战线**：从简单到复杂，拆解 13 个插件的实现
- **进阶线**：GitHub 自动化架构、TypeScript 脚本、工程实践

## 章节目录

### 第一部分：基础架构

| 章节 | 说明 |
|------|------|
| [第1章：项目总览](/claude-code/chapter01) | 仓库结构、202 个文件的组织方式 |
| [第2章：插件系统核心概念](/claude-code/chapter02) | 四大组件的设计原理 |
| [第3章：开发环境与配置](/claude-code/chapter03) | 开发环境搭建与配置管理 |

### 第二部分：Hook 与自动化

| 章节 | 说明 |
|------|------|
| [第4章：hookify - 规则引擎](/claude-code/chapter04) | 规则引擎的实现与 Hook 机制 |
| [第5章：commit-commands - Git 工作流自动化](/claude-code/chapter05) | Git 自动化工作流 |
| [第6章：security-guidance - 安全检查 Hook](/claude-code/chapter06) | 安全检查与审批机制 |

### 第三部分：多 Agent 协作

| 章节 | 说明 |
|------|------|
| [第7章：code-review - 多 Agent 协作审查](/claude-code/chapter07) | 多 Agent 代码审查模式 |
| [第8章：feature-dev - 7阶段开发工作流](/claude-code/chapter08) | 完整的功能开发流水线 |
| [第9章：pr-review-toolkit - 多维度专业审查工具包](/claude-code/chapter09) | 专业审查工具集成 |

### 第四部分：SessionStart Hook 应用

| 章节 | 说明 |
|------|------|
| [第10章：ralph-wiggum - 自引用循环与 SessionStart Hook](/claude-code/chapter10) | Hook 自引用循环设计 |
| [第11章：输出风格插件 - SessionStart Hook 的教育性应用](/claude-code/chapter11) | 输出风格定制化 |
| [第12章：frontend-design 与 claude-opus-4-5-migration](/claude-code/chapter12) | 专项工具插件实现 |

### 第五部分：开发工具包

| 章节 | 说明 |
|------|------|
| [第13章：agent-sdk-dev - Agent SDK 应用开发工具包](/claude-code/chapter13) | SDK 级 Agent 开发 |
| [第14章：plugin-dev - 插件开发工具包](/claude-code/chapter14) | 插件开发完整工具链 |

### 第六部分：工程化基础设施

| 章节 | 说明 |
|------|------|
| [第15章：GitHub 自动化与 CI/CD](/claude-code/chapter15) | 工程化基础设施全景 |

---

<ChapterActionPanel
  :items="[
    { text: '从第1章开始', link: '/claude-code/chapter01', type: 'primary' },
    { text: '查看学习路径', link: '/claude-code/reading-guide', type: 'secondary' },
    { text: '返回首页', link: '/', type: 'secondary' }
  ]"
/>

# 从零构建 AI Coding Agent 电子书站点 - 架构文档

## 变更记录 (Changelog)

- **2026-03-21 00:00:00** - 完整架构扫描完成，覆盖率 100%

---

## 项目概述

**项目名称**：从零构建 AI Coding Agent — OpenCode 源码剖析与实战

**技术栈**：VitePress 1.5 + Vue 3 + TypeScript + Mermaid + Lottie

**项目类型**：技术电子书站点（理论篇 + 实践篇 + 中级篇）

**核心特性**：
- 24 章理论篇（深入剖析 OpenCode 源码架构）
- 23 章实践篇（可运行 TypeScript 项目）
- 8 章中级篇（工程专题深化）
- 33 个 Vue 交互演示组件
- 浏览器内 Practice Playground（在线运行实践代码）
- Cyber Teal 设计系统（品牌色 #0d9488）

---

## 模块结构图

```mermaid
graph TD
    A["(根) docs/book"] --> B[".vitepress"];
    B --> C["config.mts"];
    B --> D["theme/"];
    D --> E["components/"];
    E --> F["核心展示组件 (5)"];
    E --> G["交互演示组件 (11)"];
    E --> H["第五部分组件 (5)"];
    E --> I["实践篇组件 (6)"];
    E --> J["动画组件 (5)"];
    E --> K["practice-playground/ (9)"];
    D --> L["custom.css"];
    D --> M["index.ts"];
    A --> N["docs/"];
    N --> O["理论篇 (24章)"];
    N --> P["practice/ (23章)"];
    N --> Q["intermediate/ (8章)"];
    N --> R["辅助页面 (6)"];
    A --> S["scripts/"];
    A --> T["工具脚本 (2)"];

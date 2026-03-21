---
layout: home

hero:
  name: 从零构建 AI Coding Agent
  text: OpenCode 源码剖析与实战
  tagline: 面向开发者的实战学习站：系统化构建 Agent 知识体系，深入剖析真实生产级框架。
  actions:
    - theme: brand
      text: 理论篇：系统构建体系
      link: /00-what-is-ai-agent/index
    - theme: alt
      text: 实践篇：动手写 23 个 Agent
      link: /practice/

features:
  - title: 理论篇：源码剖析
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>'
    details: 基于真实生产级仓库，按主链路深剖源码实现，掌握 Agent 核心运行机制。
    link: /01-agent-basics/index
  - title: 实践篇：动手演进
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'
    details: 提供 23 个可运行的渐进式项目，从 0 搭建基础环境，手写 Agent 核心循环。
    link: /practice/
  - title: 中级篇：工程落地
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
    details: 解决 RAG 失效、安全边界、性能与成本、多智能体协作等真实生产环境工程挑战。
    link: /intermediate/
---

<script setup>
import LearningPath from '../.vitepress/theme/components/LearningPath.vue'
import PracticePreview from '../.vitepress/theme/components/PracticePreview.vue'
</script>

## 三线学习体系

本书提供清晰的三条主线：理解机制的**理论与源码剖析**，真实落地的**工程实战**，以及面向生产环境的**工程进阶**。

<PracticePreview :theoryChapters="24" :practiceProjects="23" :practicePhases="7" :intermediateChapters="8" />

## 学习路径图

直观了解从基础理论、可运行实践、源码带读到工程专题进阶的整体知识结构。这其中包含了我们为你准备的完整实战路径。

<LearningPath />

## 进一步探索

- **全书学习地图**：[阅读地图](/reading-map) —— 规划属于你的学习主线路线。
- **专业概念拉齐**：[术语表](/glossary) —— 统一对各项高频 AI Agent 领域词汇的理解。
- **源码基线锚点**：[版本说明](/version-notes) —— 确认本书代码参考了哪份源码截面以及它的演进边界。
- **开源发布进度**：[封版清单](/release-checklist) —— 获悉当前书籍的编写完整度。

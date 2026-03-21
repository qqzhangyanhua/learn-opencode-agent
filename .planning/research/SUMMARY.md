# 产品化 AI Agent 学习站研究总结

**研究日期：** 2026-03-21
**研究主题：** 如何在现有 VitePress 电子书仓库基础上，把项目升级为更产品化的学习站

## 一句话结论

最优路线不是重建站点，而是在现有 VitePress 基础上建立“课程元数据层 + 学习路径层 + 实践闭环层”，把现有内容资产重新组织成更像学习产品的体验。

## Key Findings

### Stack

- **继续使用 VitePress 自定义主题** 是正确方向，官方能力已经覆盖：
  - 自定义 Theme
  - 导航与侧边栏定制
  - 导航中插入自定义组件
  - 本地搜索 / Algolia
  - 构建期数据加载
- **关键增量能力不是新框架，而是结构化元数据**
- 推荐通过 **frontmatter + data loaders + Vue 组件** 实现课程化能力

### Table Stakes

对于一个产品化技术学习站，v1 至少应具备：

- 清晰起步入口
- 学习路径
- 章节学习目标
- 前置知识说明
- 练习或挑战闭环
- 实践篇课程化入口
- 章节间下一步推荐

### Architecture

推荐结构：

1. 内容源层：Markdown + 实践脚本
2. 元数据层：frontmatter + loader 聚合
3. 体验编排层：首页 / 路径页 / 推荐模块 / 实践索引
4. 展示层：VitePress theme + 组件

核心判断：
- 不要继续把所有课程结构都手写在 `.vitepress/config.mts`
- 应尽快建立数据驱动的学习路径和章节索引机制

### Watch Out For

最关键的风险有三个：

1. 只改视觉，不改学习结构
2. 不建立元数据层，导致后续不可维护
3. 实践篇仍像脚本目录，无法形成跟练闭环

## 对当前项目最重要的建议

### 应优先做

- 重构首页为“角色分流 + 学习入口”
- 定义统一章节元信息结构
- 生成学习路径页
- 重构实践篇入口与卡片体系
- 在章节页补足“目标 / 前置 / 练习 / 下一步”

### 应暂缓做

- 登录与云端进度
- AI 助教
- 评论系统
- 评分型题库
- 视频化

## 对需求阶段的直接影响

需求应围绕以下主线展开：

- 信息架构重构
- 首页和导航产品化
- 章节模板统一
- 实践篇课程化重构
- 搜索和推荐优化

## 研究置信度

- **高**：主框架继续使用 VitePress
- **高**：以学习路径、章节目标、练习闭环作为 v1 基础盘
- **高**：不应在 v1 引入账号与重后端功能
- **中高**：元数据层应成为接下来 roadmap 的第一批建设重点

## 参考来源

- MDN Curriculum: https://developer.mozilla.org/en-US/curriculum/
- MDN Resources for educators: https://developer.mozilla.org/en-US/docs/Learn_web_development/Educators
- VitePress official docs:
  - https://vitepress.dev/guide/custom-theme
  - https://vitepress.dev/guide/data-loading
  - https://vitepress.dev/reference/default-theme-config.html
  - https://vitepress.dev/reference/default-theme-nav
  - https://vitepress.dev/reference/default-theme-sidebar
  - https://vitepress.dev/reference/default-theme-search

---
*Research complete. Next consumer: REQUIREMENTS.md and ROADMAP.md*

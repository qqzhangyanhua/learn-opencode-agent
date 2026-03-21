# 产品化 AI Agent 学习站研究：技术栈

**研究日期：** 2026-03-21
**项目阶段：** Subsequent milestone（在现有 VitePress 学习站上继续演进）
**研究问题：** 对于一个面向中文开发者、强调学习路径与实践闭环的 AI Agent 学习站，当前最合适的实现栈是什么？

## 结论摘要

对于当前仓库，这不是“换框架重做”的问题，而是“在现有 VitePress 基础上把学习产品能力做厚”的问题。最合理的主栈仍然是：

- **VitePress 1.x + 自定义 Theme** 作为主框架
- **Vue 3 组件** 作为课程化交互、卡片化入口与学习状态提示承载层
- **VitePress Data Loaders / `createContentLoader`** 作为“章节元数据、学习路径、推荐卡片、实践索引”生成层
- **本地搜索优先**，必要时评估 Algolia 或 Pagefind 等增强方案
- **TypeScript + Markdown frontmatter** 作为课程元数据的主存储形式

这条路线的关键原因是：官方能力已经支持自定义导航组件、侧边栏、搜索、页面 frontmatter 和构建期数据加载，足够支撑“产品化学习站”的 v1，不需要为了登录、数据库或复杂后端提前切换架构。

## 推荐技术组合

### 1. 站点主框架

**推荐：VitePress 1.x，继续深度定制当前主题**

**理由：**
- VitePress 官方明确定位为适合构建“fast, content-centric websites”的静态站点，且支持技术文档类网站
- 官方支持自定义主题入口 `.vitepress/theme/index.ts`
- 官方支持在导航中插入自定义 Vue 组件，这意味着可以把“学习路径入口”“当前推荐路线”“角色切换器”直接做进导航，而不是只停留在普通链接层

**与当前项目的适配性：**
- 当前仓库已经有自定义 theme 和大量全局组件
- 当前问题主要是信息架构和学习体验，不是底层框架能力不足
- 换框架的收益远小于在现有 VitePress 上提升内容组织与交互层

### 2. 课程元数据层

**推荐：Markdown frontmatter + build-time data loaders**

**建议元数据字段：**
- `track`：理论 / 实践 / 中级 / 专题
- `persona`：适合哪些人
- `goals`：本章你会得到什么
- `prerequisites`：前置知识
- `estimatedTime`：预计时长
- `difficulty`：难度
- `next`：下一步推荐
- `exercise`：配套练习或实践入口
- `practiceEntry`：对应脚本

**理由：**
- VitePress 官方支持页面 frontmatter，并允许在页面和组件中读取
- VitePress 官方的 build-time data loading 与 `createContentLoader` 非常适合做“从本地 Markdown 自动生成课程索引、路径页面、推荐卡片、章节列表”
- 这套方式不会把额外复杂度推到客户端或后端

### 3. 搜索方案

**v1 推荐：先保留本地搜索，但做“课程化搜索增强”**

**官方事实：**
- VitePress 官方支持 `themeConfig.search.provider = 'local'`
- 官方也给出了 Algolia DocSearch 作为增强方案
- 本地搜索支持自定义 `_render`，可以在索引阶段控制内容怎么被收录，也可以通过 frontmatter 排除页面

**建议：**
- v1 不急着接第三方搜索
- 先重构搜索内容质量：让章节标题、学习目标、实践入口、路径页、标签页更容易被搜到
- 如果后续章节数、专题页和实践内容继续增多，再评估 Algolia 或 Pagefind

### 4. 交互能力层

**推荐：Vue 组件继续承担“学习产品化”的 UI/UX 功能**

**适合新增的组件类型：**
- 学习路线选择器
- 新手起步卡 / 角色入口卡
- 本章学习目标与前置知识卡片
- 实践任务清单 / 跟练步骤卡
- 章节结尾的“下一步推荐”模块
- 进度提示组件（本地、非登录态）

**理由：**
- 当前仓库已经证明主题层可承载丰富交互演示
- 新需求大多是“课程产品式 UI 组织能力”，不是复杂业务系统

## 不推荐的方向

### 不推荐 1：为了产品化立即引入后端账号系统

**原因：**
- 当前 v1 明确不做登录和真实进度系统
- 引入账号、数据库、认证会稀释核心任务

### 不推荐 2：为了搜索升级先切到重型全文检索系统

**原因：**
- 当前更大的问题是“信息没有被组织好”，不是“搜不到任何东西”
- 先提升路径设计、元数据和入口页面，通常比换搜索方案更有价值

### 不推荐 3：继续只靠手写导航硬编码扩展

**原因：**
- 当前章节、实践和中级专题已不少
- 如果路线、推荐和课程化入口继续增长，完全手写 `config.mts` 的可维护性会快速下降
- 应尽早把“课程元数据 -> 页面/路径汇总”自动化

## 对当前项目的明确建议

1. 保持 VitePress 作为主框架，不重建基础设施
2. 把“课程元数据层”作为下一阶段核心建设内容
3. 用 data loaders 生成：
   - 首页推荐路径
   - 不同用户角色的入门路线
   - 实践篇课程索引
   - 章节间前置依赖与下一步推荐
4. 搜索先保留本地搜索，但围绕课程结构优化被索引内容
5. 在导航和首页引入更强的角色选择与学习入口，不再只是文档栏目

## 置信度

- **高**：继续使用 VitePress 自定义主题、frontmatter、data loaders
- **中高**：本地搜索先保留，后续再视规模增强
- **高**：不引入登录/后端，先做内容产品化

## 参考来源

- VitePress 官方“Using a Custom Theme”: https://vitepress.dev/guide/custom-theme
- VitePress 官方“Build-Time Data Loading”: https://vitepress.dev/guide/data-loading
- VitePress 官方“Default Theme Config / Nav / Sidebar / Search”:
  - https://vitepress.dev/reference/default-theme-config.html
  - https://vitepress.dev/reference/default-theme-nav
  - https://vitepress.dev/reference/default-theme-sidebar
  - https://vitepress.dev/reference/default-theme-search

---
*供 ROADMAP 使用：主框架不变，重点建设元数据层、学习路径入口和课程化交互层。*

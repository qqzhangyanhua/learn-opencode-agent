# 产品化 AI Agent 学习站研究：架构方式

**研究日期：** 2026-03-21
**项目阶段：** Subsequent milestone
**研究问题：** 在现有仓库基础上，产品化学习站的推荐系统结构应该如何划分？

## 结论摘要

最适合这个项目的不是“内容系统”和“产品系统”分离，而是建立一个**内容驱动的产品架构**：

1. **内容源层**：Markdown 章节与实践脚本
2. **课程元数据层**：frontmatter / data loader 生成的结构化学习信息
3. **体验编排层**：首页、路径页、实践索引、推荐组件、章节页增强模块
4. **展示层**：VitePress 主题、导航、侧边栏、卡片组件、搜索入口

换句话说，内容仍然是源头，但站点行为不再只依赖手写导航，而是由结构化元数据驱动。

## 推荐组件边界

### 1. Content Source Layer

**Purpose:**
- 保留所有原始学习内容和代码示例

**Contains:**
- `docs/**/index.md`
- `practice/*.ts`
- 辅助页面如 `docs/reading-map.md`、`docs/glossary.md`

**特点：**
- 这是事实来源
- 不应把“课程组织逻辑”全部硬编码在正文里

### 2. Learning Metadata Layer

**Purpose:**
- 把散落在章节中的课程信息结构化

**Contains:**
- 章节 frontmatter
- 数据 loader 输出的章节索引、路径图、实践映射

**推荐数据对象：**
- ChapterMeta
- TrackMeta
- PracticeMeta
- RouteMeta

**为什么关键：**
- 没有这一层，首页、路径页、推荐模块都会回到手写维护地狱

### 3. Experience Orchestration Layer

**Purpose:**
- 用元数据生成“像课程产品”的页面和模块

**典型页面/模块：**
- 首页角色分流区
- 学习路线页
- 章节顶部“本章目标 / 前置知识 / 适合谁”
- 章节底部“练习 / 下一步 / 关联实践”
- 实践篇课程索引页
- 相关推荐卡片

**建议：**
- 尽量做成可复用 Vue 组件，而不是每章重复拼 Markdown 片段

### 4. Delivery Layer

**Purpose:**
- 承接最终渲染与交互体验

**Contains:**
- `.vitepress/config.mts`
- `.vitepress/theme/index.ts`
- `.vitepress/theme/components/*.vue`

**关键官方能力：**
- 自定义 Theme
- 自定义 nav component
- sidebar 分区
- search provider
- build-time data loading

## 推荐数据流

### 学习站构建数据流

1. 作者维护 Markdown 正文和实践脚本
2. 章节 frontmatter 提供结构化学习字段
3. Data loaders 在构建期聚合这些字段
4. 首页 / 路径页 / 实践页 / 推荐组件消费聚合结果
5. VitePress 构建为静态站点

### 页面访问数据流

1. 用户进入首页
2. 首页先按角色/目标分流，而不是先暴露完整目录树
3. 进入章节后，看到本章目标、前置知识和推荐下一步
4. 到实践页后，看到跟练顺序和完成建议
5. 用户通过路径组件在理论、实践、中级篇之间跳转

## 建议构建顺序

### Phase 1
- 建课程元数据模型
- 建路径页和首页新入口

### Phase 2
- 章节模板增强（目标、前置、练习、下一步）

### Phase 3
- 实践篇课程化重构

### Phase 4
- 搜索/推荐/导航优化与统一收口

## 关键架构判断

### 判断 1：不要把所有信息架构继续堆在 `config.mts`

**原因：**
- `config.mts` 适合承载导航配置，不适合作为课程系统主数据源

### 判断 2：产品化的关键不是新页面更多，而是结构化复用

**原因：**
- 如果每章手工定制“目标/练习/下一步”模块，维护成本会很快失控

### 判断 3：实践篇应该被视为“课程模块”，不是纯脚本目录

**原因：**
- 它对核心用户价值极高，是形成行动闭环的关键

## 风险边界

- 如果不先建立元数据层，后面所有产品化页面都会变成重复劳动
- 如果过早上本地进度或账号系统，会冲掉当前最重要的 IA 重构阶段
- 如果只改首页不改章节结构，用户仍会在第二跳失去方向感

## 参考来源

- VitePress Build-Time Data Loading: https://vitepress.dev/guide/data-loading
- VitePress Custom Theme: https://vitepress.dev/guide/custom-theme
- VitePress Nav / Sidebar / Config:
  - https://vitepress.dev/reference/default-theme-nav
  - https://vitepress.dev/reference/default-theme-sidebar
  - https://vitepress.dev/reference/default-theme-config.html
- MDN Educators guidance on learning pathways:
  - https://developer.mozilla.org/en-US/docs/Learn_web_development/Educators

---
*供 ROADMAP 使用：优先做“元数据层 + 体验编排层”，再做具体页面重构。*

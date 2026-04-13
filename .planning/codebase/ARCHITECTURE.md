# 架构

**分析日期：** 2026-04-13

## 模式概览

**整体模式：**
- 这是一个以 VitePress 为壳的静态电子书站点
- 架构本质是“内容文件 + 元数据数据层 + 自定义主题组件 + 校验脚本”的单仓库文档应用
- 站点没有传统业务后端，工程复杂度主要来自内容编排、导航一致性和教学交互组件

**关键特征：**
- 内容优先：绝大多数知识资产直接存在 `docs/**`
- 元数据驱动：学习路径、实践项目、发现页等由 `.vitepress/theme/data/*.ts` 提供结构化数据
- 主题增强：大量教学演示组件通过 `.vitepress/theme/index.ts` 全局注册
- 脚本守门：`scripts/check-*.mjs` 负责构建前的一致性与内容质量校验

## 分层

**内容层：**
- 目的：承载章节正文、附录、阅读路线、发布说明
- 包含：`docs/**/index.md`、系列专题 Markdown、`README.md`
- 依赖：VitePress Markdown 渲染、frontmatter 约定
- 被谁使用：内容加载器、主题组件、导航系统、校验脚本

**元数据层：**
- 目的：把章节、实践项目、学习路线抽象成统一结构
- 包含：`.vitepress/theme/data/content-meta.ts`、`learning-paths.data.ts`、`practice-projects.ts`、`content-index.data.ts`
- 依赖：TypeScript 类型、VitePress `createContentLoader`
- 被谁使用：首页、发现页、实践页、校验脚本

**表现层：**
- 目的：把静态内容转成更强引导感与交互感的阅读体验
- 包含：`.vitepress/theme/index.ts`、`.vitepress/theme/components/*.vue`、`.vitepress/theme/custom.css`
- 依赖：Vue、VitePress 主题接口、元数据层
- 被谁使用：浏览器中的站点页面

**验证层：**
- 目的：在构建前拦截元数据缺失、链接漂移、入口页不一致等问题
- 包含：`scripts/check-content.mjs` 及其它 10 个 `check-*.mjs`
- 依赖：Node 文件系统 API、约定式目录结构、frontmatter 规则
- 被谁使用：`bun run build:strict`

**示例代码层：**
- 目的：为实践篇与中级专题提供可运行代码样本
- 包含：`practice/*.ts`、`docs/intermediate/examples/**`
- 依赖：OpenAI SDK、MCP SDK、Python 依赖等
- 被谁使用：读者在本地运行，站点通过文档与元数据进行引用

## 数据流

**页面构建流：**
1. 编辑者在 `docs/**` 或 `.vitepress/theme/data/**` 更新内容与元数据
2. `scripts/check-*.mjs` 扫描 Markdown、frontmatter、导航关系和实践条目引用
3. `.vitepress/config.mts` 定义站点级配置、边栏、导航、OG 信息与构建参数
4. `.vitepress/theme/data/content-index.data.ts` 等加载或组合内容数据
5. `.vitepress/theme/index.ts` 把组件注册到主题
6. VitePress 构建静态页面到 `.vitepress/dist/`

**实践篇页面流：**
1. `practice/*.ts` 提供源码示例
2. `.vitepress/theme/data/practice-projects.ts` 为每个项目维护标题、命令、目标、前置知识、关联理论
3. `docs/practice/pNN-*/index.md` 页面引用元数据与组件展示项目卡片、运行指令和源码入口
4. `scripts/check-practice-entries.mjs` 保证文档中引用的脚本真实存在

## 状态管理

- 站点运行时基本无业务状态
- 构建期状态来自文件系统、frontmatter 和 TypeScript 数据模块
- 交互组件可能有局部前端状态，但不构成全局业务状态层

## 关键抽象

**LearningContentFrontmatter：**
- 目的：统一章节类内容的 frontmatter 契约
- 位置：`.vitepress/theme/data/content-meta.ts`
- 作用：约束 `contentType`、`series`、`difficulty`、`entryMode` 等字段

**PracticeProjectDefinition：**
- 目的：统一实践项目元数据
- 位置：`.vitepress/theme/data/practice-projects.ts`
- 作用：驱动实践页呈现、路线推荐、运行命令展示、关联理论链接

**SectionRoleSummary / LearningPathDefinition：**
- 目的：为首页、发现页和学习路径提供结构化摘要
- 位置：`.vitepress/theme/data/content-meta.ts`、`learning-paths.data.ts`

## 入口点

**站点入口：**
- `docs/index.md` - 首页内容入口
- `.vitepress/config.mts` - 站点配置入口
- `.vitepress/theme/index.ts` - 主题增强入口

**质量入口：**
- `package.json` 中的 `build:strict` - 串联全部校验脚本后再执行构建
- 单项校验入口如 `scripts/check-content.mjs`、`scripts/check-learning-metadata.mjs`

**示例入口：**
- `practice/*.ts` - 本地运行的实践代码入口
- `docs/intermediate/examples/**` - 中级专题的代码示例入口

## 错误处理

**总体策略：**
- 构建前失败优先，通过校验脚本直接 `process.exit(1)` 阻断问题进入发布

**典型模式：**
- 读取文件后逐项收集 issue，最后统一报错并退出
- 主题数据层遇到缺失内容时直接抛错，例如 `discovery-content.ts` 的 `resolveContentLink()`

## 横切关注点

**一致性：**
- frontmatter 与内容索引必须同步
- 文档导航、首页入口、实践项目元数据之间存在强耦合

**可维护性：**
- 通过集中式数据文件避免在 Markdown 中散落重复信息
- 代价是多个数据源之间需要脚本持续校验

**可读性：**
- 中文内容为主，站点设计明显偏“教学引导型”而不是纯 API 文档

---
*架构分析：2026-04-13*
*当内容组织方式、主题层职责或校验链路发生变化时更新*

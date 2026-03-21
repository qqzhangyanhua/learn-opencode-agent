# Architecture

**Analysis Date:** 2026-03-21

## Pattern Overview

**Overall:** VitePress 文档站 + Vue 交互组件 + 仓库内可运行实践脚本的单仓库内容工程

**Key Characteristics:**
- 以 Markdown 章节为主体，交互能力通过 VitePress 主题层注入
- 站点本身是静态输出，动态行为仅存在于浏览器端组件
- 实践篇代码与文档共存于同一仓库，形成“文档解释 + 代码示例”双轨结构
- 缺少传统后端服务层，主要是内容编排与前端展示工程

## Layers

**Content Layer:**
- Purpose: 承载理论篇、实践篇、中级篇和补充页面的实际内容
- Contains: Markdown 章节、frontmatter、源码链接、Mermaid 图、内嵌组件引用
- Location: `docs/**`, `README.md`, `practice/README.md`
- Depends on: 主题组件层提供展示能力
- Used by: VitePress 构建流程

**Theme Layer:**
- Purpose: 提供站点视觉系统、交互组件、全局注册和 composable
- Contains: Vue 组件、TypeScript 类型、全局样式、辅助 hooks
- Location: `.vitepress/theme/index.ts`, `.vitepress/theme/components/*`, `.vitepress/theme/composables/*`, `.vitepress/theme/custom.css`
- Depends on: Vue/VitePress 运行时和组件 props 类型
- Used by: Markdown 页面中的自定义标签与首页布局

**Tooling Layer:**
- Purpose: 保证内容完整性、实践入口一致性和部署可运行
- Contains: 内容校验脚本、练习入口校验脚本、构建配置、部署配置
- Location: `scripts/*.mjs`, `package.json`, `tsconfig.json`, `railpack.toml`, `Caddyfile`
- Depends on: Node.js、TypeScript、VitePress CLI
- Used by: 本地开发、发布前检查、部署平台

**Example Layer:**
- Purpose: 提供与文档配套的可运行示例和教学样例
- Contains: `practice/*.ts` 项目、`docs/intermediate/examples/**` Python/README 示例
- Depends on: OpenAI 兼容 API、Node.js 执行环境
- Used by: 实践篇读者、文档作者验证示例

## Data Flow

**Documentation Build Flow:**
1. 开发者修改 `docs/**`、`.vitepress/**` 或 `practice/**`
2. `vitepress` 从 `.vitepress/config.mts` 加载站点配置与主题
3. Markdown 页面解析 frontmatter，并在需要时挂载 Vue 全局组件
4. 构建输出静态资源到 `.vitepress/dist`
5. Caddy 或 `vitepress preview` 提供浏览访问

**Practice Script Flow:**
1. 用户根据文档运行 `practice/*.ts` 对应命令
2. 脚本从 `.env` 读取模型配置
3. 使用 `openai` SDK 调用模型或演示本地逻辑
4. 输出终端结果，供读者对照文档理解实现

**State Management:**
- 站点无统一后端状态
- 交互组件多采用局部响应式状态，例如 `.vitepress/theme/composables/useDemoPlayer.ts`
- 构建状态体现在本地缓存目录 `.vitepress/cache`

## Key Abstractions

**Chapter-as-Module:**
- Purpose: 每个章节目录都是独立内容单元
- Examples: `docs/02-agent-core/index.md`, `docs/intermediate/27-planning-mechanism/index.md`
- Pattern: 目录即路由，`index.md` 作为页面入口

**Global Demo Component:**
- Purpose: 把复杂示意图、动画、交互演示从 Markdown 正文中解耦出来
- Examples: `RunCommand`, `RuntimeLifecycleDiagram`, `PlanningTreeDemo`
- Pattern: 在 `.vitepress/theme/index.ts` 中全局注册后，由 Markdown 直接使用

**Practice Entry Script:**
- Purpose: 给每个实践项目一个可直接运行的入口
- Examples: `practice/p01-minimal-agent.ts`, `practice/p22-project.ts`
- Pattern: 单文件脚本，对应单个教程主题

## Entry Points

**Site Configuration Entry:**
- Location: `.vitepress/config.mts`
- Triggers: `vitepress dev/build/preview`
- Responsibilities: 定义站点元数据、导航、侧边栏、Vite 行为与 Mermaid 集成

**Theme Entry:**
- Location: `.vitepress/theme/index.ts`
- Triggers: VitePress 启动主题时
- Responsibilities: 扩展默认主题、注册全局组件、加载全局样式

**Content Validation Entry:**
- Location: `scripts/check-content.mjs`, `scripts/check-practice-entries.mjs`
- Triggers: `build:strict` 或手动执行
- Responsibilities: 防止遗漏页面、未收口文案和无效实践入口引用

**Practice Runtime Entry:**
- Location: `practice/*.ts`
- Triggers: 用户按文档命令执行脚本
- Responsibilities: 演示各章节的 Agent 能力或工程模式

## Error Handling

**Strategy:** 工具脚本 fail-fast，站点交互组件以局部降级为主

**Patterns:**
- 校验脚本在发现问题时 `process.exit(1)`，例如 `scripts/check-content.mjs`
- Vue 组件常用早返回和 Promise `catch` 做局部兜底，例如 `.vitepress/theme/components/RunCommand.vue`
- 实践脚本通常在入口 `.catch` 中设置 `process.exitCode = 1`

## Cross-Cutting Concerns

**Content Consistency:**
- frontmatter、导航、阅读地图和实践入口需要同步维护

**Static-first Delivery:**
- 一切最终都要可编译为静态产物 `.vitepress/dist`

**Teachability:**
- 文档、示意图与示例代码三者必须相互对齐，否则读者会在“能读不能跑”和“能跑但看不懂”之间失衡

---
*Architecture analysis: 2026-03-21*
*Update when major patterns change*

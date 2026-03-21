# Codebase Structure

**Analysis Date:** 2026-03-21

## Directory Layout

```text
book/
├── .vitepress/          # 站点配置、主题组件、构建缓存与静态产物
├── docs/                # 全部章节与辅助页面
├── practice/            # P1-P23 可运行实践脚本与说明
├── scripts/             # 发布前内容校验脚本
├── .superpowers/        # 本地技能/脑暴产物目录
├── .claude/             # 本地协作工具工作目录
├── Caddyfile            # 静态服务配置
├── package.json         # 项目脚本与依赖
├── tsconfig.json        # TypeScript 编译配置
├── railpack.toml        # Railpack 部署配置
└── README.md            # 仓库总说明
```

## Directory Purposes

**`.vitepress/`:**
- Purpose: VitePress 站点核心配置与主题扩展
- Contains: `config.mts`、`theme/`、`tsconfig.json`、缓存和构建产物
- Key files: `.vitepress/config.mts`, `.vitepress/theme/index.ts`, `.vitepress/theme/custom.css`
- Subdirectories: `theme/components/`, `theme/composables/`, `cache/`, `dist/`

**`docs/`:**
- Purpose: 电子书正文和辅助页面
- Contains: 各章节 `index.md`、阅读地图、术语表、版本说明、superpowers 设计/计划文档
- Key files: `docs/index.md`, `docs/reading-map.md`, `docs/version-notes.md`, `docs/release-checklist.md`
- Subdirectories: `00-what-is-ai-agent/` 到 `20-best-practices/`、`practice/`、`intermediate/`、`superpowers/`

**`practice/`:**
- Purpose: 与实践篇文档对应的可运行 TypeScript 示例
- Contains: `p01` 到 `p23` 单文件脚本，以及 `practice/README.md`
- Key files: `practice/p01-minimal-agent.ts`, `practice/p22-project.ts`, `practice/p23-production.ts`
- Subdirectories: 当前无深层结构，采用扁平布局

**`scripts/`:**
- Purpose: 站点内容健康检查
- Contains: Node ESM 脚本
- Key files: `scripts/check-content.mjs`, `scripts/check-practice-entries.mjs`
- Subdirectories: 无

## Key File Locations

**Entry Points:**
- `.vitepress/config.mts` - 站点构建入口配置
- `.vitepress/theme/index.ts` - 主题与全局组件入口
- `practice/*.ts` - 实践脚本运行入口

**Configuration:**
- `package.json` - 命令、依赖、运行模式
- `tsconfig.json` - TS 编译范围与规则
- `.env.example` - 模型 API 环境变量模板
- `Caddyfile` - 静态服务配置
- `railpack.toml` - 部署平台配置

**Core Logic:**
- `.vitepress/theme/components/` - 交互组件实现
- `.vitepress/theme/composables/` - 组件共享逻辑
- `scripts/` - 内容规则校验

**Documentation:**
- `docs/**/index.md` - 章节页
- `README.md` - 项目总览
- `practice/README.md` - 实践环境准备与运行说明

## Naming Conventions

**Files:**
- 文档章节使用 `目录/index.md` 模式，例如 `docs/02-agent-core/index.md`
- 实践脚本使用 `pNN-topic.ts` 命名，例如 `practice/p10-react-loop.ts`
- Vue 组件使用 `PascalCase.vue`，例如 `.vitepress/theme/components/RunCommand.vue`
- composable 使用 `useXxx.ts`，例如 `.vitepress/theme/composables/useDemoPlayer.ts`

**Directories:**
- 文档目录多为 kebab-case 或带数字前缀的章节目录
- 功能集合目录通常为复数，如 `components/`, `composables/`, `scripts/`

**Special Patterns:**
- 关键章节页都要求 frontmatter `title` + `description`
- `.vitepress/cache/` 与 `.vitepress/dist/` 为生成目录，已在 `.gitignore` 中忽略

## Where to Add New Code

**新章节内容:**
- 正文: `docs/<chapter>/index.md`
- 目录/导航: `.vitepress/config.mts`
- 关联辅助页: 视情况同步 `docs/reading-map.md` 或 `docs/glossary.md`

**新交互组件:**
- 实现: `.vitepress/theme/components/<PascalCase>.vue`
- 类型: `.vitepress/theme/components/types.ts`
- 全局注册: `.vitepress/theme/index.ts`

**新校验脚本:**
- 实现: `scripts/*.mjs`
- 命令入口: `package.json` 的 `scripts`

**新实践示例:**
- 实现: `practice/pNN-topic.ts`
- 文档入口: `docs/practice/pNN-topic/index.md`
- 一致性校验: 更新 `practice/README.md` 与 `docs/practice/index.md`

## Special Directories

**`.vitepress/cache/`:**
- Purpose: 开发/构建缓存
- Source: VitePress 自动生成
- Committed: No

**`.vitepress/dist/`:**
- Purpose: 静态构建产物
- Source: `vitepress build`
- Committed: No

**`docs/superpowers/`:**
- Purpose: 设计稿与实现计划文档
- Source: 人工维护的规划文档
- Committed: Yes

**`.superpowers/`:**
- Purpose: 本地技能工作流产物
- Source: 本地工具生成
- Committed: 当前目录已存在，但是否长期保留需按团队约定判断

---
*Structure analysis: 2026-03-21*
*Update when directory structure changes*

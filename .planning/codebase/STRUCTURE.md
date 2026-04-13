# 代码库结构

**分析日期：** 2026-04-13

## 目录布局

```text
book/
├── .vitepress/                  # VitePress 配置、主题代码、数据层、构建缓存/产物
│   └── theme/                   # 自定义组件、composables、数据模块、样式
├── docs/                        # 电子书正文、系列专栏、实践页、中级专题、发布说明
├── practice/                    # 可运行的 TypeScript 实践示例
├── scripts/                     # 构建前内容校验脚本
├── claude-code/                 # 辅助材料与外部系列目录
├── new-claude/                  # 额外内容树（非主 docs 根）
├── package.json                 # 依赖与命令入口
├── bun.lockb                    # Bun 锁文件
├── pnpm-lock.yaml               # 历史/兼容锁文件
├── README.md                    # 项目说明
└── AGENTS.md                    # 仓库协作规范
```

## 目录用途

**`.vitepress/`：**
- 用途：站点配置与主题实现
- 包含：`config.mts`、`tsconfig.json`、`theme/components/*`、`theme/data/*`
- 关键文件：
  - `.vitepress/config.mts`
  - `.vitepress/theme/index.ts`
  - `.vitepress/theme/custom.css`
- 子目录：
  - `theme/components/`：约 132 个 Vue/TS 组件与辅助数据文件
  - `theme/data/`：内容元数据、学习路径、发现页数据、实践项目定义
  - `cache/`、`dist/`：开发缓存与构建产物

**`docs/`：**
- 用途：主站点内容根目录
- 包含：章节 `index.md`、系列专题 `.md`、阅读地图、术语表、发布清单
- 关键路径：
  - `docs/index.md`
  - `docs/practice/`
  - `docs/intermediate/`
  - `docs/claude-code/`
  - `docs/new-claude/`
  - `docs/hermes-agent/`
- 规模：当前约 182 个 Markdown 文件

**`practice/`：**
- 用途：实践篇可运行代码
- 包含：`p01` 到 `p28` 的 TypeScript 示例，以及 `p14-mcp-server.ts`
- 关键文件：`practice/README.md`
- 规模：当前 29 个 `p*.ts` 文件

**`scripts/`：**
- 用途：质量守卫与一致性检查
- 包含：11 个 `check-*.mjs` 脚本
- 关键文件：
  - `scripts/check-content.mjs`
  - `scripts/check-practice-entries.mjs`
  - `scripts/check-learning-metadata.mjs`

## 关键文件位置

**入口：**
- `package.json` - 全部开发/构建/检查命令入口
- `docs/index.md` - 首页内容入口
- `.vitepress/config.mts` - 站点配置入口
- `.vitepress/theme/index.ts` - 主题组件注册入口

**配置：**
- `.vitepress/tsconfig.json` - 主题层类型检查范围
- `.gitignore` - 忽略缓存、构建产物、本地环境变量
- `railpack.toml`、`Caddyfile` - 部署/运行配置

**核心逻辑：**
- `.vitepress/theme/data/content-meta.ts` - frontmatter 契约与基础类型
- `.vitepress/theme/data/practice-projects.ts` - 实践项目主数据源
- `.vitepress/theme/data/content-index.data.ts` - 章节内容索引加载器
- `.vitepress/theme/data/discovery-content.ts` - 发现页的精选内容映射

**文档：**
- `README.md` - 仓库总览
- `docs/reading-map.md` - 阅读路径
- `docs/release-checklist.md` - 发布核对项

## 命名约定

**文件：**
- 章节目录使用 `NN-topic/index.md`，如 `docs/01-agent-basics/index.md`
- 实践目录使用 `docs/practice/pNN-topic/index.md`
- 实践代码使用 `practice/pNN-topic.ts`
- 校验脚本统一为 `scripts/check-*.mjs`
- Vue 组件使用 PascalCase，如 `.vitepress/theme/components/PracticeProjectGuide.vue`

**目录：**
- 内容目录以 kebab-case 或编号前缀命名
- 专题系列目录直接反映栏目名，如 `docs/hermes-agent/`、`docs/new-claude/`

## 新代码放哪里

**新增理论/专题章节：**
- 内容：`docs/NN-topic/index.md` 或对应系列目录下的 `.md`
- 元数据：frontmatter 按 `content-meta.ts` 契约补齐
- 导航同步：必要时更新 `.vitepress/config.mts` 与相关数据文件

**新增实践项目：**
- 源码：`practice/pNN-topic.ts`
- 页面：`docs/practice/pNN-topic/index.md`
- 元数据：`.vitepress/theme/data/practice-projects.ts`
- 校验：确保 `scripts/check-practice-entries.mjs` 可通过

**新增交互组件：**
- 实现：`.vitepress/theme/components/`
- 组件注册：`.vitepress/theme/index.ts`
- 共享数据或逻辑：`.vitepress/theme/data/` 或 `.vitepress/theme/composables/`

## 特殊目录

**`.vitepress/dist/`：**
- 用途：构建产物
- 来源：`bun run build`
- 是否提交：否，已在 `.gitignore`

**`.vitepress/cache/`：**
- 用途：Vite/VitePress 依赖缓存
- 是否提交：否，已在 `.gitignore`

**`.claude/`、`.superpowers/`：**
- 用途：本地协作/计划辅助目录
- 不属于站点运行时主链路，但会影响协作流程

---
*结构分析：2026-04-13*
*目录新增、重命名或入口迁移后应更新*

# OpenCode 电子书站点

这是 `docs/` 对应的发布站点工程，用于将章节草稿渲染为可浏览的电子书。

## 当前实现

本项目当前使用 **VitePress**，不是 Astro 或 Starlight。

关键文件：

- 站点配置：`docs/book/.vitepress/config.mts`
- 首页：`docs/book/docs/index.md`
- 章节内容：`docs/book/docs/*/index.md`
- 自定义组件：`docs/book/.vitepress/theme/components/`

## 目录结构

```text
docs/book/
├── .vitepress/
│   ├── config.mts
│   └── theme/
├── docs/
│   ├── index.md
│   ├── 00-what-is-ai-agent/index.md
│   ├── 01-agent-basics/index.md
│   ├── 02-agent-core/index.md
│   └── ...
├── add-frontmatter.ts
├── remove-duplicate-titles.ts
└── package.json
```

## 本地开发

在仓库根目录执行：

```bash
cd docs/book

bun install
bun dev
```

默认会启动 VitePress 本地站点。

当前已知情况：

- `docs/book` 启动时此前出现的根 `tsconfig.json` 告警已修复。
- 如果你在受限环境里运行 `bun dev`，仍可能遇到端口监听失败，这通常是本地环境权限问题，不是站点配置问题。
- 纯静态验证可直接执行 `bun build`。

## 构建与预览

```bash
cd docs/book

bun build
bun preview
```

## 内容来源

当前正式维护的电子书内容位于：

- `docs/book/docs/00-what-is-ai-agent/index.md`
- `docs/book/docs/01-agent-basics/index.md`
- `docs/book/docs/02-agent-core/index.md`
- ...
- `docs/book/docs/15-advanced-topics/index.md`

根目录 `docs/*.md` 如仍存在，更适合视为历史整理材料或迁移来源，不再作为当前发布版本的主维护目标。

## 维护约定

- 首页导航、侧边栏、搜索等站点行为以 `.vitepress/config.mts` 为准。
- 章节页面统一使用 frontmatter，避免正文重复一级标题。
- 文中源码路径应与当前仓库真实结构一致。
- 发布前建议至少执行一次 `bun build`。
- `阅读地图`、`版本说明`、`术语表`、`封版清单` 属于发布配套页，改动正文结构时应同步检查这些页面是否仍然成立。

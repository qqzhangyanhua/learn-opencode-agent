[根目录](../CLAUDE.md) > **scripts**

# 内容校验脚本模块

> Node.js ESM 校验脚本，守护内容、导航、实践、学习元数据、动画实验的一致性。在 `package.json` 的 `build:strict` 中串联执行。

## 模块职责

- 在构建前做静态校验，确保 Markdown 内容、侧边栏链接、学习元数据、实践项目、动画实验数据彼此一致，发布质量可控。
- 非阻塞开发，但 `build:strict` 中任一校验失败会阻断构建。

## 入口与运行

- 每个脚本独立可跑：`node scripts/<name>.mjs`，亦有对应 `bun run check:*` 别名。
- `scripts/check.sh`：聚合执行壳脚本。
- 路径基准：脚本以 `import.meta.url` 解析仓库根（`scripts/..`）。

## 对外接口（脚本清单）

| 脚本 | 校验内容 | npm 别名 |
| --- | --- | --- |
| `check-content.mjs` | 必需 Markdown 文件存在性、禁止词（TODO/FIXME/TBD/待补/需要补充） | `check:content` |
| `check-practice-entries.mjs` | `practice/*.ts` 与 `docs/practice/` 一一对应 | `check:practice` |
| `check-learning-metadata.mjs` | 章节 frontmatter 学习元数据字段完整性 | `check:learning-metadata` |
| `check-learning-paths.mjs` | `learning-paths.data.ts` 中 `step.contentId` 全站可解析 | `check:learning-paths` |
| `check-homepage-entry.mjs` | 首页组件与入口完整性 | `check:homepage-entry` |
| `check-navigation-entry.mjs` | 侧边栏链接对应页面真实存在 | `check:navigation-entry` |
| `check-entry-context.mjs` | `EntryContextBanner` 使用规范 | `check:entry-context` |
| `check-chapter-experience.mjs` | `ChapterLearningGuide` / `ChapterActionPanel` 使用规范 | `check:chapter-experience` |
| `check-practice-course-experience.mjs` | 实践章节体验组件使用规范 | `check:practice-course-experience` |
| `check-discovery-experience.mjs` | 发现中心组件使用规范 | `check:discovery-experience` |
| `check-learning-progress.mjs` | `LearningProgressToggle` 使用规范 | `check:learning-progress` |
| `check-animation-lab.mjs` | 动画实验数据/导入/注册/布局一致性 | `check:animation-lab` |
| `check-practice-motion.mjs` | 实践↔动画实验映射一致性 | `check:practice-motion` |

## 关键依赖与配置

- 仅依赖 Node 内置模块（`node:fs/promises`、`node:path`、`node:url`），无外部依赖。
- 允许白名单：`check-content.mjs` 中 `allowLinePatterns` 放行示例性禁止词。

## 测试与质量

- 脚本本身无单测；其正确性由 `build:strict` 全量串联运行间接验证。

## 常见问题 (FAQ)

- 构建报禁止词？检查正文是否含 TODO/FIXME/TBD/待补/需要补充，确为示例则加入 `allowLinePatterns`。
- 新增内容专区后侧边栏校验失败？同步 `.vitepress/config.mts` 侧边栏与实际页面。

## 相关文件清单

- `check-*.mjs`（13 个）、`check.sh`。

## 变更记录 (Changelog)

- **2026-06-06** - 首次生成模块级文档；记录 13 个校验脚本及其 npm 别名。

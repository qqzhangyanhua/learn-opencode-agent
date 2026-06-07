# 从零理解如何构建 AI Agent — OpenCode 源码剖析与实战

这是一个基于 VitePress 构建的 AI Agent 工程学习站点。项目不只是一本线性电子书，而是围绕「源码拆解、工程实践、智能体选型、动画理解、面试复盘、企业落地」组织的多专区知识库。

核心目标：

- 用固定源码快照拆解 OpenCode、Claude Code、Hermes Agent 等真实 Agent 系统
- 用 TypeScript 实践项目串起工具调用、记忆、RAG、规划、多 Agent、评估与部署
- 用动画实验室把 Agent 运行闭环、上下文、工具边界、测试修复等机制可视化
- 用智能体选型专区把 Agent Framework、RAG、搜索、模型、工具、权限、观测和成本预算收束成工程决策
- 用企业 Agent 专栏把 IMS AI Copilot 这类真实业务场景拆成可落地的工程契约

## 站点入口

| 模块 | 路径 | 用途 |
|------|------|------|
| 首页 | `/` | 站点总入口 |
| 发现中心 | `/discover/` | 按目标和主题浏览内容 |
| 学习路径 | `/learning-paths/` | 按学习目标选择路线 |
| OpenCode 拆解 | `/02-agent-core/` | OpenCode 源码主线 |
| 实践篇 | `/practice/` | 28 个实践章节 |
| 中级篇 | `/intermediate/` | RAG、多 Agent、上下文、生产化等进阶专题 |
| 智能体选型 | `/agent-selection/` | Agent Framework、RAG、搜索、模型、工具和生产准入的选型指南 |
| 动画实验室 | `/animation-lab/` | Agent 机制的交互式可视化实验 |
| 面试题专区 | `/interview/` | Agent 工程面试复盘 |
| Claude Code 架构思维 | `/claude-code/` | 从架构视角理解 Agent 工程判断 |
| Claude Code 源码业务流 | `/new-claude/` | 从业务链路还原 Claude Code 执行流 |
| Hermes Agent 拆解 | `/hermes-agent/` | 商业 Agent 产品工程拆解 |
| 从零设计企业 Agent | `/enterprise-agent/` | 以 IMS AI Copilot 为主线的企业 Agent 落地专栏 |

## 内容结构

| 专区 | 位置 | 说明 |
|------|------|------|
| OpenCode 拆解 | `docs/00-what-is-ai-agent/` 至 `docs/20-best-practices/`，以及 `docs/oh-*` | 24 章主线，覆盖 Agent 基础、工具系统、多模型、TUI、插件与最佳实践 |
| 实践篇 | `docs/practice/` + `practice/` | 28 个实践章节，配套 P1-P28 示例脚本；其中 P14 额外包含一个 MCP Server 脚本 |
| 中级篇 | `docs/intermediate/` | 第 25-32 章，覆盖 RAG、协作、规划、上下文、生产架构、安全与成本 |
| 智能体选型 | `docs/agent-selection/` | 24 篇选型指南 + 官方资源速查，覆盖 Agent Framework、LangGraph、RAG、搜索、模型、数据库、工具、安全、观测和成本 |
| 动画实验室 | `docs/animation-lab/` + `.vitepress/theme/data/animation-lab*` | 数据驱动的 Agent 机制可视化实验 |
| 面试题专区 | `docs/interview/` | 按基础、工具、RAG、记忆、多 Agent、规划、工程化等主题组织 |
| Claude Code 架构思维 | `docs/claude-code/` | 20 章架构判断框架 |
| Claude Code 源码业务流 | `docs/new-claude/` | 4 卷 14 章 + 附录 |
| Hermes Agent 拆解 | `docs/hermes-agent/` | 主干章节 + A-Z 附录 |
| 企业 Agent 专栏 | `docs/enterprise-agent/` | 18 章理论主线 + 落地工具包 |

## 本地开发

从仓库根目录执行：

```bash
bun install
bun run dev        # 启动开发服务器，默认端口 5173
bun run build      # 构建静态产物到 .vitepress/dist/
bun run preview    # 预览构建结果
bun run typecheck  # 检查 .vitepress 主题层 TypeScript
```

发布前执行完整检查：

```bash
bun run build:strict
```

`build:strict` 会依次运行内容、实践、学习路径、首页入口、导航入口、章节体验、发现中心、学习进度、动画实验室、实践动画治理等 13 个校验脚本，最后执行站点构建。

## 常用检查

| 命令 | 用途 |
|------|------|
| `bun run check:content` | 校验正文结构和必需元数据 |
| `bun run check:practice` | 校验实践章节与脚本入口 |
| `bun run check:learning-metadata` | 校验学习内容元数据 |
| `bun run check:learning-paths` | 校验学习路径配置 |
| `bun run check:navigation-entry` | 校验导航入口 |
| `bun run check:chapter-experience` | 校验章节体验组件和结构 |
| `bun run check:discovery-experience` | 校验发现中心体验 |
| `bun run check:animation-lab` | 校验动画实验室数据与入口 |
| `bun run check:practice-motion` | 校验实践演示与动画实验映射 |

## 项目结构

```text
.
├── .context/                    # 项目协作偏好、工作流规则与决策记录
├── .vitepress/
│   ├── config.mts               # VitePress 配置、导航、侧边栏、搜索与页面元数据
│   └── theme/
│       ├── agent-selection-redirects.ts # 智能体选型旧路由重定向
│       ├── components/          # 全局 Vue 教学组件与交互演示
│       ├── data/                # 内容索引、学习路径、实践项目、动画实验数据
│       ├── index.ts             # 主题入口与组件注册
│       └── custom.css           # 全站样式
├── docs/
│   ├── index.md                 # 首页
│   ├── discover/                # 发现中心
│   ├── learning-paths/          # 学习路径
│   ├── animation-lab/           # 动画实验室
│   ├── practice/                # 实践篇页面
│   ├── intermediate/            # 中级专题
│   ├── agent-selection/         # 智能体选型指南与官方资源速查
│   ├── interview/               # 面试题专区
│   ├── claude-code/             # Claude Code 架构思维
│   ├── new-claude/              # Claude Code 源码业务流
│   ├── hermes-agent/            # Hermes Agent 拆解
│   ├── enterprise-agent/        # 企业 Agent 专栏
│   ├── superpowers/             # Superpowers 相关计划与规范
│   ├── 00-what-is-ai-agent/ ... # OpenCode 主线章节
│   ├── oh-prelude/ oh-config/ oh-flow/
│   ├── reading-map.md
│   ├── glossary.md
│   ├── version-notes.md
│   └── release-checklist.md
├── practice/                    # 可运行 TypeScript 示例脚本
├── scripts/                     # check-*.mjs 内容质量校验脚本
├── Caddyfile                    # 生产静态服务配置
├── LICENSE                      # MIT License
└── package.json
```

## 内容维护规则

- 站点导航和侧边栏以 `.vitepress/config.mts` 为准，新增专区或入口时必须同步更新配置。
- 智能体选型专区的旧编号入口由 `.vitepress/theme/agent-selection-redirects.ts` 维护；重编号时必须同步侧边栏、索引页、阅读地图和重定向表。
- 首页、发现中心、学习路径、实践页和动画实验室依赖 `.vitepress/theme/data/` 下的数据源，新增内容时优先维护数据结构，再补页面展示。
- 每个章节页必须保留 frontmatter，至少包含 `title` 和 `description`，正文不要重复一级标题。
- 实践篇新增项目时，需要同时维护 `docs/practice/pNN-*/index.md`、`practice/pNN-*.ts` 和 `.vitepress/theme/data/practice-projects.ts`。
- 动画实验室新增实验时，复用现有数据驱动模式和 `FlowExperimentCanvas`，不要在内容区新增独立菜单。
- 企业 Agent 专栏保持 IMS AI Copilot 案例主线，落地工具包放在理论模块之后。
- 图表使用 Mermaid，交互演示使用 `.vitepress/theme/components/` 中的 Vue 组件。
- 文中引用的 OpenCode 源码路径默认与 [源码基线](https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc) 一致。
- 内容密集变更后，至少运行相关 `check:*` 脚本、`bun run typecheck` 和 `bun run build`；发布前运行 `bun run build:strict`。

## 生产部署

静态产物由 Caddy 托管，监听 `:3000`：

```bash
bun run build
bun run start
```

等价的 Caddy 命令：

```bash
caddy run --config /Caddyfile --adapter caddyfile
```

---
title: "第13章：agent-sdk-dev - Agent SDK 应用开发工具包"
description: "Claude Code 源码解析 - 第13章：agent-sdk-dev - Agent SDK 应用开发工具包"
contentType: theory
series: claude-code
contentId: claude-code-ch13
shortTitle: "第13章：agent-sdk-dev - Agent SDK 应用开发工具包"
summary: "Claude Code 源码解析：第13章：agent-sdk-dev - Agent SDK 应用开发工具包"
difficulty: intermediate
estimatedTime: 30-45 分钟
learningGoals:
  - 理解本章核心实现原理
  - 掌握相关设计模式
prerequisites:
  - 了解 AI Agent 基本概念
recommendedNext: []
practiceLinks: []
searchTags:
  - claude-code
  - 源码解析
navigationLabel: "第13章：agent-sdk-dev - Agent SDK 应用开发工具包"
entryMode: read-first
roleDescription: 想深入理解 Claude Code 架构的工程师
---


# 第13章：agent-sdk-dev - Agent SDK 应用开发工具包

## 本章导读

**仓库路径**：`plugins/agent-sdk-dev/`

**系统职责**：
- 引导式创建新的 Claude Agent SDK 应用（交互式问答）
- 自动验证 SDK 配置和最佳实践合规性
- 支持 TypeScript 和 Python 双语言

**能学到什么**：
- 引导式工作流命令的设计模式
- 双语言验证 Agent 的实现策略
- SDK 应用脚手架的自动化生成
- 外部 API 集成（WebFetch/WebSearch）的最佳实践

---

## 13.1 插件定位

### 解决的问题

```
开发者创建 Agent SDK 应用时的痛点：
1. 不知道从哪里开始
2. SDK 版本更新频繁，文档难以追踪
3. TypeScript 配置复杂（tsconfig、模块解析）
4. Python 环境管理繁琐
5. 最佳实践不明确
```

### 解决方案

```
agent-sdk-dev 提供：
- 交互式引导，逐步收集需求
- 自动获取最新 SDK 版本
- 生成符合最佳实践的项目结构
- 专业验证 Agent 确保配置正确
```

---

## 13.2 /new-sdk-app 命令详解

### 命令签名

```
/new-sdk-app [project-name]
```

参数 `project-name` 可选，如果提供则跳过询问项目名称。

### 交互式问答流程

命令采用逐一询问的方式，避免一次性提问造成的信息过载：

```
问题 1：语言选择
┌─────────────────────────────────┐
│ 请选择开发语言：                  │
│ 1. TypeScript（推荐）            │
│ 2. Python                       │
└─────────────────────────────────┘

问题 2：项目名称（如果未提供参数）
┌─────────────────────────────────┐
│ 请输入项目名称：                  │
│ > my-agent-app                  │
└─────────────────────────────────┘

问题 3：Agent 类型
┌─────────────────────────────────┐
│ 请选择 Agent 类型：               │
│ 1. 编码 Agent                   │
│ 2. 业务 Agent                   │
│ 3. 自定义 Agent                  │
└─────────────────────────────────┘

问题 4：起始模板
┌─────────────────────────────────┐
│ 请选择起始模板：                  │
│ 1. Hello World（最简单）         │
│ 2. 基础功能（推荐）              │
│ 3. 特定用例                     │
└─────────────────────────────────┘

问题 5：工具链确认
┌─────────────────────────────────┐
│ 请选择包管理器：                  │
│ TypeScript: npm / pnpm / bun    │
│ Python: pip / poetry            │
└─────────────────────────────────┘
```

### 执行阶段

收集完所有信息后，命令自动执行 6 个阶段：

```
阶段 1：项目初始化
├── 创建目录结构
├── 生成 package.json（TS）或 requirements.txt（Python）
└── 设置基础配置文件

阶段 2：检查最新版本
├── WebSearch 查询 npm 最新版本
├── 或 PyPI 最新版本
└── 确保使用最新稳定版

阶段 3：SDK 安装
├── TypeScript: @anthropic-ai/claude-agent-sdk
└── Python: claude-agent-sdk

阶段 4：创建入口文件
├── TypeScript: index.ts（含类型注解）
└── Python: main.py（含类型提示）

阶段 5：环境配置
├── 创建 .env.example
├── 配置 .gitignore
└── 添加 API Key 说明

阶段 6：可选 .claude 目录
├── 创建 .claude/settings.json
└── 配置基础 Claude Code 设置
```

---

## 13.3 双语言验证 Agent

### agent-sdk-verifier-ts（TypeScript 验证器）

**模型**：sonnet（速度优先）

**6 维验证框架**：

```
维度 1：SDK 安装和配置
检查项：
- package.json 中的 SDK 版本是否最新
- Node.js 版本是否满足要求（≥ 18）
- "type": "module" 是否正确设置

维度 2：TypeScript 配置
检查项：
- tsconfig.json 是否存在
- moduleResolution 是否为 "bundler" 或 "node16"
- target 是否为 "ES2022" 或更高

维度 3：SDK 使用模式
检查项：
- 导入方式是否正确（ESM import）
- 初始化是否传入正确参数
- 响应处理是否覆盖所有事件类型

维度 4：类型安全和编译
检查项：
- 运行 npx tsc --noEmit
- 无类型错误
- 无 any 类型滥用

维度 5：脚本和构建配置
检查项：
- package.json 包含 build/start/typecheck 脚本
- 构建输出目录配置正确

维度 6：环境和安全
检查项：
- API Key 通过环境变量传入
- .env 文件在 .gitignore 中
- 无硬编码的敏感信息
```

### agent-sdk-verifier-py（Python 验证器）

**模型**：sonnet（速度优先）

**5 维验证框架**：

```
维度 1：SDK 安装和配置
检查项：
- requirements.txt 或 pyproject.toml 中的 SDK 版本
- Python 版本是否满足要求（≥ 3.9）

维度 2：Python 环境
检查项：
- 虚拟环境是否配置
- 依赖管理文件是否完整

维度 3：SDK 使用模式
检查项：
- 导入语句是否正确
- 初始化参数是否完整
- 异步处理是否正确（async/await）

维度 4：代码质量
检查项：
- 语法正确性
- 错误处理是否完整
- 类型提示是否使用

维度 5：环境和安全
检查项：
- API Key 通过 os.environ 获取
- .env 文件在 .gitignore 中
```

---

## 13.4 外部 API 集成

### WebFetch 使用

```
用途：获取官方 SDK 文档
目标 URL：
- https://docs.claude.com/en/api/agent-sdk/overview
- https://docs.claude.com/en/api/agent-sdk/typescript
- https://docs.claude.com/en/api/agent-sdk/python

时机：
- 生成代码示例时
- 验证 API 使用方式时
- 用户询问 SDK 功能时
```

### WebSearch 使用

```
用途：查找最新 SDK 版本
查询示例：
- "@anthropic-ai/claude-agent-sdk latest version npm"
- "claude-agent-sdk pypi latest"

时机：
- 阶段 2（检查最新版本）
- 用户询问版本信息时
```

---

## 13.5 设计模式分析

### 模式：引导式脚手架命令

```
核心特征：
1. 交互式收集需求（逐一询问）
2. 自动获取外部信息（版本、文档）
3. 生成完整的项目结构
4. 专业验证确保质量

优势：
- 降低入门门槛
- 确保最佳实践
- 减少配置错误
- 提供即时反馈
```

### 模式：双语言并行支持

```
实现策略：
- 两个独立的验证 Agent
- 共享相同的验证维度框架
- 各自处理语言特定的细节

好处：
- 专业化验证
- 易于维护和扩展
- 清晰的职责分离
```

### 与 feature-dev 的对比

| 维度 | agent-sdk-dev | feature-dev |
|------|---------------|-------------|
| 目标 | 创建新项目 | 开发现有功能 |
| 阶段数 | 6 | 7 |
| 验证方式 | 专用 Agent | 内置检查 |
| 外部依赖 | WebFetch/Search | 无 |
| 语言支持 | TS + Python | 项目语言 |

---

## 相关文件清单

```
plugins/agent-sdk-dev/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── new-sdk-app.md          # 引导式创建命令
├── agents/
│   ├── agent-sdk-verifier-ts.md # TypeScript 验证器
│   └── agent-sdk-verifier-py.md # Python 验证器
└── CLAUDE.md
```

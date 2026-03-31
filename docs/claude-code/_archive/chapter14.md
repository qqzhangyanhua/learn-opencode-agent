---
title: "第14章：plugin-dev - 插件开发工具包"
description: "Claude Code 源码解析 - 第14章：plugin-dev - 插件开发工具包"
contentType: theory
series: claude-code
contentId: claude-code-ch14
shortTitle: "第14章：plugin-dev - 插件开发工具包"
summary: "Claude Code 源码解析：第14章：plugin-dev - 插件开发工具包"
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
navigationLabel: "第14章：plugin-dev - 插件开发工具包"
entryMode: read-first
roleDescription: 想深入理解 Claude Code 架构的工程师
---


# 第14章：plugin-dev - 插件开发工具包

## 本章导读

**仓库路径**：`plugins/plugin-dev/`

**系统职责**：
- 提供 7 个专业技能，覆盖插件开发全生命周期
- 8 阶段引导式插件创建工作流
- AI 辅助 Agent 生成和验证

**能学到什么**：
- 插件开发的完整工作流设计
- 渐进式披露（Progressive Disclosure）的三层结构
- 7 个专业技能的设计与实现
- 如何用插件开发插件（自举）

---

## 14.1 插件开发的挑战

### 为什么需要专门的插件开发工具

```
开发 Claude Code 插件的挑战：
1. 组件类型多样（命令/Agent/技能/Hook/MCP）
2. 每种组件有不同的配置格式
3. 最佳实践分散在文档各处
4. 验证和测试流程不统一
5. 发布准备工作繁琐
```

### plugin-dev 的解决方案

```
统一的插件开发体验：
- 一个命令启动完整工作流
- 7 个专业技能按需加载
- AI 辅助生成各类组件
- 内置验证和测试流程
```

---

## 14.2 /plugin-dev:create-plugin 工作流

### 命令签名

```
/plugin-dev:create-plugin [可选描述]
```

### 8 阶段工作流

```
阶段 1：Discovery（发现）
目标：理解插件目标和问题
活动：
- 询问插件要解决什么问题
- 了解目标用户和使用场景
- 确定插件的核心价值主张

阶段 2：Component Planning（组件规划）
目标：确定需要的组件类型
活动：
- 分析需要哪些组件（技能/命令/Agent/Hook/MCP）
- 评估每个组件的必要性
- 制定组件优先级

阶段 3：Detailed Design & Clarifying Questions（详细设计）
目标：细化每个组件的规格
活动：
- 为每个组件定义接口
- 澄清模糊需求
- 确认技术约束

阶段 4：Structure Creation（结构创建）
目标：创建目录和 manifest
活动：
- 创建插件目录结构
- 生成 plugin.json
- 设置基础文件

阶段 5：Component Implementation（组件实现）
目标：使用 AI 辅助 Agent 实现各组件
活动：
- 调用 agent-creator 生成 Agent
- 实现命令和技能
- 配置 Hook 和 MCP

阶段 6：Validation（验证）
目标：运行 plugin-validator 和组件检查
活动：
- 运行 plugin-validator Agent
- 检查 manifest 格式
- 验证组件配置

阶段 7：Testing（测试）
目标：验证插件在 Claude Code 中工作
活动：
- 安装插件到测试环境
- 执行各组件的功能测试
- 收集反馈并修复问题

阶段 8：Documentation（文档）
目标：完善 README 和发布准备
活动：
- 生成 README.md
- 更新 CLAUDE.md
- 准备发布材料
```

### 核心原则

```
1. 每个阶段前问清歧义再推进
   - 不假设，不猜测
   - 确认后再执行

2. 使用 Skill 工具按需加载技能
   - 避免一次性加载所有技能
   - 根据当前阶段加载相关技能

3. 使用 TodoWrite 跟踪全流程进度
   - 每个阶段创建 Todo 项
   - 完成后标记为已完成

4. 遵循 plugin-dev 自身的验证模式
   - 用自己的工具验证自己
   - 自举（bootstrapping）
```

---

## 14.3 7 个专业技能详解

### 技能 1：plugin-structure（插件结构）

```
触发短语：
- "plugin structure"
- "plugin.json"

核心内容：
- 目录布局规范
- plugin.json manifest 配置
- 自动发现机制

资源：3 示例 + 2 参考文档
```

### 技能 2：command-development（命令开发）

```
触发短语：
- "create a slash command"
- "command frontmatter"

核心内容：
- 命令创建流程
- YAML frontmatter 格式
- 参数定义和处理

资源：10 示例 + 7 参考文档
```

### 技能 3：agent-development（Agent 开发）

```
触发短语：
- "create an agent"
- "agent frontmatter"

核心内容：
- Agent 创建流程
- 触发条件配置
- 系统提示词设计原则

资源：2 示例 + 3 参考文档 + 1 脚本
```

### 技能 4：skill-development（技能开发）

```
触发短语：
- "create a skill"
- "improve skill"

核心内容：
- 技能结构设计
- 渐进式披露实现
- 触发描述优化

资源：参考文档
```

### 技能 5：hook-development（Hook 开发）

```
触发短语：
- "create a hook"
- "PreToolUse hook"

核心内容：
- 6 种 Hook 事件类型
- 验证脚本编写
- 安全实践

资源：3 示例 + 3 参考文档 + 3 脚本
```

### 技能 6：mcp-integration（MCP 集成）

```
触发短语：
- "add MCP server"
- "Model Context Protocol"

核心内容：
- MCP 配置格式
- 服务器类型（stdio/sse）
- 认证模式

资源：3 示例 + 3 参考文档
```

### 技能 7：plugin-settings（插件设置）

```
触发短语：
- "plugin settings"
- ".local.md files"

核心内容：
- 配置模式设计
- YAML frontmatter 使用
- 状态管理策略

资源：3 示例 + 2 参考文档 + 2 脚本
```

---

## 14.4 渐进式披露三层结构

### 设计理念

```
问题：技能文档太长会占用大量上下文
解决：按需加载，只在需要时加载详细内容

三层结构：
┌─────────────────────────────────────┐
│ 层 1：元数据层（始终加载）            │
│ - 技能名称                          │
│ - 简短描述（1-2 句）                 │
│ - 触发短语列表                       │
│ 大小：< 100 字                       │
└─────────────────────────────────────┘
         ↓ 触发时加载
┌─────────────────────────────────────┐
│ 层 2：核心 SKILL.md（触发时加载）     │
│ - 关键概念和原则                     │
│ - 常用模式和反模式                   │
│ - API 参考                          │
│ 大小：1,500-2,000 字                 │
└─────────────────────────────────────┘
         ↓ 按需加载
┌─────────────────────────────────────┐
│ 层 3：参考/示例层（按需加载）         │
│ - 完整代码示例                       │
│ - 详细实现指南                       │
│ - 可运行的 demo                      │
│ 大小：不限                           │
└─────────────────────────────────────┘
```

### 实现机制

```
Skill 工具调用流程：
1. 用户触发技能（通过触发短语）
2. 系统加载 SKILL.md
3. Claude 根据需要请求参考文档
4. 参考文档按需加载到上下文
```

---

## 14.5 3 个专业 Agent

### agent-creator（AI 辅助 Agent 生成）

```
职责：根据描述自动生成 Agent 配置
输入：Agent 的目标和职责描述
输出：完整的 Agent markdown 文件

生成内容：
- YAML frontmatter（模型、工具、触发条件）
- 系统提示词
- 行为指南
```

### plugin-validator（插件验证）

```
职责：验证插件配置的正确性
检查项：
- plugin.json 格式
- 组件文件存在性
- 配置一致性
- 最佳实践合规性
```

### skill-reviewer（技能审查）

```
职责：审查技能质量
检查项：
- 触发短语的有效性
- SKILL.md 的完整性
- 渐进式披露的实现
- 参考文档的质量
```

---

## 14.6 自举（Bootstrapping）模式

### 什么是自举

plugin-dev 使用自身的工具来开发和验证自身：

```
自举循环：
plugin-dev 插件
    ├── 使用 plugin-structure 技能 → 设计自身目录结构
    ├── 使用 agent-development 技能 → 创建自身的 Agent
    ├── 使用 hook-development 技能 → 实现自身的 Hook
    └── 使用 plugin-validator → 验证自身的配置
```

### 自举的价值

```
1. 验证工具的实用性
   - 如果工具不好用，开发者自己会发现

2. 确保文档准确性
   - 用工具开发工具，文档必须准确

3. 建立信任
   - "我们用自己的工具构建自己"
```

---

## 相关文件清单

```
plugins/plugin-dev/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── create-plugin.md         # 8 阶段工作流命令
├── agents/
│   ├── agent-creator.md         # AI 辅助 Agent 生成
│   ├── plugin-validator.md      # 插件验证
│   └── skill-reviewer.md        # 技能审查
├── skills/
│   ├── plugin-structure/
│   │   └── SKILL.md
│   ├── command-development/
│   │   └── SKILL.md
│   ├── agent-development/
│   │   └── SKILL.md
│   ├── skill-development/
│   │   └── SKILL.md
│   ├── hook-development/
│   │   └── SKILL.md
│   ├── mcp-integration/
│   │   └── SKILL.md
│   └── plugin-settings/
│       └── SKILL.md
└── CLAUDE.md
```

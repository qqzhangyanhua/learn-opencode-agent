---
title: 第19章：配置系统实战
description: 打开 .opencode/oh-my-opencode.jsonc 之前先读这章——最小可用配置、常见场景配置、配置错了会发生什么，以及用户配置和项目配置的合并规则
contentType: theory
series: book
contentId: book-oh-config
shortTitle: 配置系统实战
summary: 打开 .opencode/oh-my-opencode.jsonc 之前先读这章——最小可用配置、常见场景配置、配置错了会发生什么，以及用户配置和项目配置的合并规则
difficulty: intermediate
estimatedTime: 15 分钟
learningGoals:
  - 打开 .opencode/oh-my-opencode.jsonc 之前先读这章——最小可用配置
  - 常见场景配置
  - 配置错了会发生什么
  - 以及用户配置和项目配置的合并规则
prerequisites:
  - 建议按当前章节顺序继续阅读
recommendedNext:
  - /oh-flow/
  - /practice/p23-production/
practiceLinks:
  - /practice/
  - /17-multi-model-orchestration/
searchTags:
  - 配置系统实战
  - OpenCode
  - 源码阅读
navigationLabel: 配置系统实战
entryMode: bridge
roleDescription: 掌握配置系统的使用方法，理解配置加载与合并规则。
---
<ChapterLearningGuide />

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

---

## 先看最小可用配置

很多教程上来就给你一个几十行的配置示例，看完你还是不知道哪些是必须的。

**oh-my-openagent 的最小可用配置是：什么都不写。**

空配置文件或者不存在配置文件，插件用默认值启动，11 个 Agent 全部可用，26 个工具全部注册。

如果你只是想试用，直接安装后就能用。配置文件是用来**调整行为**的，不是用来"让系统运行"的。

---

## 配置文件的位置

oh-my-openagent 会从两个位置加载配置，然后合并：

```
~/.config/opencode/oh-my-opencode.jsonc   ← 用户级（你个人的偏好）
.opencode/oh-my-opencode.jsonc             ← 项目级（这个项目特有的设置）
```

**合并规则**（重要，很多人搞错）：

| 字段类型 | 合并方式 | 例子 |
|---------|---------|------|
| 普通字段 | 项目覆盖用户 | `default_run_agent` |
| `agents`/`categories` | 深度合并 | 用户设了模型，项目设了技能，两者都生效 |
| `disabled_*` 数组 | 合并去重 | 用户禁了 A，项目禁了 B，两个都被禁 |

实际场景：

- 你在用户配置里设了"我习惯用 GPT-5 作为 Hephaestus 的模型"
- 项目配置里设了"这个项目禁用 Multimodal-Looker（因为没有图片需求）"
- 两个配置合并后：Hephaestus 用 GPT-5，同时 Multimodal-Looker 被禁用

---

## 核心字段速查

配置文件的根结构是一个 JSON 对象，这里列出你最可能用到的字段：

### 控制哪些东西开着

```jsonc
{
  // 禁用特定 Agent（不在委托表中出现，也不能被调用）
  "disabled_agents": ["multimodal-looker", "librarian"],

  // 禁用特定 Hook（关掉某些自动行为）
  "disabled_hooks": ["auto-update-checker", "session-notification"],

  // 禁用特定工具（Agent 无法调用它）
  "disabled_tools": ["tmux"],

  // 禁用特定 MCP
  "disabled_mcps": ["websearch"]
}
```

### 换模型

```jsonc
{
  "agents": {
    "sisyphus": {
      "model": "claude-opus-4-6"    // 覆盖默认模型
    },
    "oracle": {
      "model": "claude-sonnet-4-6"  // 用更便宜的模型做查询
    }
  }
}
```

### 按分类配置模型

分类（category）是 oh-my-openagent 的一个重要概念。Sisyphus-Junior 会根据任务类型分配到不同分类，每个分类可以用不同的模型：

```jsonc
{
  "categories": {
    "frontend": {
      "model": "gemini-3-pro"      // 前端任务用 Gemini
    },
    "backend": {
      "model": "gpt-5.3-codex"     // 后端任务用 Codex
    },
    "exploration": {
      "model": "grok-code-fast-1"  // 代码探索用快速模型
    }
  }
}
```

> **注**：上面的模型名（`gemini-3-pro`、`gpt-5.3-codex` 等）是示例标识符，用来展示配置结构。实际填写时，换成你在 OpenCode 里已经配置好的模型 ID 即可。`bunx oh-my-opencode doctor` 会列出当前可用的模型列表。

### 后台任务并发

```jsonc
{
  "background_task": {
    "concurrency_limits": {
      "openai": 5,      // OpenAI 模型最多同时跑 5 个后台任务
      "google": 3       // Google 模型最多 3 个
    }
  }
}
```

### 开启 hashline-edit

精确编辑工具，默认关闭，建议开启：

```jsonc
{
  "hashline_edit": true
}
```

### 开启运行时 fallback

当某个模型 API 报错时自动切换到备用模型：

```jsonc
{
  "runtime_fallback": true
  // 或者更精细的控制：
  // "runtime_fallback": {
  //   "enabled": true,
  //   "retry_on_errors": [429, 503]
  // }
}
```

---

## 四个常见场景的完整配置

### 场景 1：节省成本（只保留必要 Agent）

如果你的项目不需要图片分析、不需要网络搜索，禁掉相关 Agent 和 Hook：

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/schema.json",

  "disabled_agents": [
    "multimodal-looker",   // 不处理图片/PDF
    "librarian"            // 不需要网络搜索
  ],

  "disabled_hooks": [
    "auto-update-checker", // 不需要自动更新检查
    "session-notification" // 不需要桌面通知
  ],

  "agents": {
    "oracle": {
      "model": "claude-sonnet-4-6"  // 查询用 Sonnet，比 Opus 便宜
    }
  }
}
```

### 场景 2：高强度编码项目（最大化编码能力）

```jsonc
{
  "hashline_edit": true,
  "runtime_fallback": true,

  "agents": {
    "hephaestus": {
      "model": "gpt-5.3-codex"    // 确保用 Codex
    },
    "sisyphus": {
      "model": "claude-opus-4-6"  // 主编排器用最强的
    }
  },

  "background_task": {
    "concurrency_limits": {
      "openai": 8,       // 允许更多并发
      "anthropic": 5
    }
  }
}
```

### 场景 3：Tmux 可视化（想看到子 Agent 在干什么）

```jsonc
{
  "tmux": {
    "enabled": true,
    "layout": "main-vertical",
    "main_pane_size": 65
  }
}
```

开启后，每个后台 Agent 会在 Tmux 的独立窗格里显示执行过程。

### 场景 4：团队共享配置（项目级）

把这个放到 `.opencode/oh-my-opencode.jsonc`，提交到 git，所有人用同样的模型配置：

```jsonc
{
  // 告诉编辑器用哪个 Schema 做自动补全
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/schema.json",

  "agents": {
    "sisyphus": { "model": "claude-opus-4-6 max" },
    "hephaestus": { "model": "gpt-5.3-codex medium" }
  },

  "categories": {
    "frontend": { "model": "gemini-3-flash" },
    "backend": { "model": "gpt-5.3-codex medium" }
  },

  "hashline_edit": true,
  "runtime_fallback": true
}
```

---

## 配置错了会发生什么

这里是新手最怕的部分：配置写错了，会不会崩溃？

**答案：不会崩溃，但会有部分功能降级。**

oh-my-openagent 使用 Zod 做分段验证（`parseConfigPartially`）：

```
配置文件 → 逐字段校验
  → 某个字段非法 → 跳过该字段，使用默认值，记录警告
  → 其他字段正常 → 正常加载
```

**去哪里看错误**：

```bash
# 实时查看日志（包括配置加载错误）
tail -f /tmp/oh-my-opencode.log
```

日志里会出现类似这样的内容：

```
[plugin-config] Partial config loaded — invalid sections skipped:
  agents.sisyphus.model: Expected string, received number
```

**健康检查命令**：

```bash
bunx oh-my-opencode doctor
```

这个命令会告诉你：
- 从哪里加载了配置
- 哪些字段校验失败了
- 当前实际生效的配置是什么

---

## 配置的优先级图

当同一个字段在多个地方都有值时，优先级是：

```
环境变量（最高）
  ↓
项目配置 (.opencode/oh-my-opencode.jsonc)
  ↓
用户配置 (~/.config/opencode/oh-my-opencode.jsonc)
  ↓
代码默认值（最低）
```

注意：`agents` 和 `categories` 是深度合并的，不是简单覆盖。如果用户配置里 `agents.sisyphus.model = "claude-opus-4-6"`，项目配置里 `agents.sisyphus.temperature = 0.7`，最终效果是两个都生效，而不是项目配置覆盖掉用户配置里的 model。

---

## 配置自动补全

在 VS Code 里，加上 `$schema` 字段后，编辑配置文件时会有自动补全和字段说明：

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/schema.json"
}
```

这个 schema 文件是由 `bun run build:schema` 自动从 Zod 定义生成的，始终与代码保持同步。

---

## 一个实用技巧：从空配置开始

不要一开始就写一个大配置。先从空配置跑起来，发现"哪里不满意"再加对应的配置。

常见的"不满意"和对应的配置修复：

| 不满意的现象 | 对应配置 |
|------------|---------|
| 每次启动都弹更新提示 | `disabled_hooks: ["auto-update-checker"]` |
| 任务完成后没有桌面通知 | 不要禁用 `session-notification` |
| Hephaestus 用的模型太慢 | `agents.hephaestus.model` 换更快的 |
| 不想看到 Tmux 窗格 | `tmux.enabled: false`（或者不设 tmux 字段） |
| 编辑文件经常失败 | `hashline_edit: true` |
| API 限速导致任务中断 | `runtime_fallback: true` |

---

---

**上一章** ← [第18章：插件系统概述](/16-plugin-overview/)

**下一章** → [第20章：多模型编排系统](/17-multi-model-orchestration/)

配置写好了，下一章看 11 个 Agent 是怎么定义和协作的。

---

<SourceSnapshotCard
  title="配置系统核心源码"
  description="配置加载的两个核心文件：plugin-config.ts 负责读取合并，config/schema/ 负责校验类型。"
  repo="code-yeongyu/oh-my-openagent"
  repo-url="https://github.com/code-yeongyu/oh-my-openagent/tree/d80833896cc61fcb59f8955ddc3533982a6bb830"
  branch="dev"
  commit="d80833896cc61fcb59f8955ddc3533982a6bb830"
  verified-at="2026-03-17"
  :entries="[
    { label: '配置加载与合并逻辑', path: 'src/plugin-config.ts', href: 'https://github.com/code-yeongyu/oh-my-openagent/blob/d80833896cc61fcb59f8955ddc3533982a6bb830/src/plugin-config.ts' },
    { label: '根配置 Schema（28 个字段）', path: 'src/config/schema/oh-my-opencode-config.ts', href: 'https://github.com/code-yeongyu/oh-my-openagent/blob/d80833896cc61fcb59f8955ddc3533982a6bb830/src/config/schema/oh-my-opencode-config.ts' },
    { label: 'Agent 覆盖配置 Schema', path: 'src/config/schema/agent-overrides.ts', href: 'https://github.com/code-yeongyu/oh-my-openagent/blob/d80833896cc61fcb59f8955ddc3533982a6bb830/src/config/schema/agent-overrides.ts' },
    { label: '分类配置 Schema', path: 'src/config/schema/categories.ts', href: 'https://github.com/code-yeongyu/oh-my-openagent/blob/d80833896cc61fcb59f8955ddc3533982a6bb830/src/config/schema/categories.ts' },
    { label: '后台任务配置 Schema', path: 'src/config/schema/background-task.ts', href: 'https://github.com/code-yeongyu/oh-my-openagent/blob/d80833896cc61fcb59f8955ddc3533982a6bb830/src/config/schema/background-task.ts' },
  ]"
/>

---
title: 第24章：实战案例与最佳实践
description: 四个实战案例带你掌握 oh-my-openagent 插件开发——添加新 Agent、扩展工具、自定义 Hook、调试排错，以及生产环境的性能与可靠性技巧
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：全项目
> **前置阅读**：第18-22章
> **学习目标**：能够独立添加 Agent、工具、Hook，掌握调试技巧，理解生产环境的最佳实践
> **阅读提醒**：本章更强调“你该去哪个入口改”，不是让你逐字复制代码。下面的代码块都做了教学删减，重点是帮助新手先建立接入点，再回源码补全细节。

---

## 本章导读

前四章讲了系统架构和核心机制，这一章回归实战。四个案例由简到难，覆盖最常见的扩展需求：

1. **添加一个新 Agent**（最常见需求）
2. **扩展工具系统**（添加自定义工具）
3. **自定义 Hook**（修改系统行为）
4. **调试与测试**（排查问题的正确姿势）

---

## 案例 1：添加新 Agent「Reviewer」

**需求**：添加一个专门做 Code Review 的 Agent，使用 Claude Opus，只读不写，每次审查后输出结构化报告。

### 步骤 1：创建 Agent 工厂

```typescript
// src/agents/reviewer.ts
import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentFactory, AgentPromptMetadata } from "./types"
import { createAgentToolRestrictions } from "../shared/permission-compat"

export const REVIEWER_PROMPT_METADATA: AgentPromptMetadata = {
  category: "advisor",
  cost: "EXPENSIVE",
  promptAlias: "Reviewer",
  triggers: [
    {
      domain: "Code review",
      trigger: "After finishing a larger implementation and needing a second opinion",
    },
  ],
  useWhen: ["完成较大改动后", "需要结构化审查意见时"],
  avoidWhen: ["只是改一行文案", "还没开始实现就想过早审查"],
}

export const createReviewerAgent: AgentFactory = (model: string): AgentConfig => {
  const restrictions = createAgentToolRestrictions([
    "write",
    "edit",
    "apply_patch",
    "task",
  ])

  return {
    description: "Read-only review specialist",
    mode: "subagent",
    model,
    temperature: 0.2,
    ...restrictions,
    prompt: "你是 Reviewer，负责做严格的代码审查，只给意见，不直接改文件。",
  }
}

createReviewerAgent.mode = "subagent"
```

对新手来说，这一步只要先看懂三件事就够了：

- Agent 工厂最终返回的是 `AgentConfig`
- 只读 Agent 不要靠 prompt 口头约束，而要靠 `createAgentToolRestrictions(...)`
- 想让 Sisyphus 会“想到”这个 Agent，还要补 prompt metadata

### 步骤 2：注册到 builtin-agents

```typescript
// src/agents/builtin-agents.ts（添加）
import { createReviewerAgent, REVIEWER_PROMPT_METADATA } from "./reviewer"

// 在 agentSources 对象中添加
const agentSources: Record<BuiltinAgentName, AgentSource> = {
  // ... 现有的 ...
  reviewer: createReviewerAgent,  // 新增
}

// 在 agentMetadata 中添加
const agentMetadata = {
  // ... 现有的 ...
  reviewer: REVIEWER_PROMPT_METADATA,  // 新增
}
```

### 步骤 3：把名字接进 Schema

```typescript
// src/config/schema/agent-names.ts（添加）
export const BuiltinAgentNameSchema = z.enum([
  // ...现有的...
  "reviewer",
])
```

如果你希望它也能在配置文件 `agents.reviewer` 里被覆盖，还要同步补到 `OverridableAgentNameSchema`。

### 步骤 4：验证

```bash
bun run typecheck  # 检查类型

# 在配置中测试
# .opencode/oh-my-opencode.jsonc
# {
#   "agents": {
#     "reviewer": {
#       "model": "claude-opus-4-6"
#     }
#   }
# }
```

**关键点**：

- 只读约束要放在 `createAgentToolRestrictions(...)`，不要只写在 prompt 里
- `REVIEWER_PROMPT_METADATA` 决定 Sisyphus 会不会把某类任务想到 Reviewer
- 低温度（0.2）适合 Code Review，因为你希望输出结果是确定性的，不需要“创意”

---

## 案例 2：添加工具「GitHub PR Checker」

**需求**：添加一个工具，让 Agent 能查询 GitHub PR 的状态（CI 状态、review 意见等）。

### 步骤 1：创建工具实现

```typescript
// src/tools/github-pr/index.ts
import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { log } from "../../shared"

export function createGithubPrCheckTool(): ToolDefinition {
  return tool({
    description: "检查 GitHub PR 的状态、评论数和可合并性",
    args: {
      repo: tool.schema.string().describe("owner/repo 格式"),
      pr_number: tool.schema.number().describe("PR 编号"),
    },
    async execute({ repo, pr_number }) {
      const token = process.env.GITHUB_TOKEN
      if (!token) throw new Error("缺少 GITHUB_TOKEN 环境变量")

      log("[github-pr] checking PR", { repo, pr_number })

      // 这里省略 fetch 细节，重点是：
      // 1. 调 GitHub API
      // 2. 处理 response.ok
      // 3. 返回结构化结果给 Agent
      return `PR #${pr_number} of ${repo} is ready to inspect`
    },
  })
}
```

### 步骤 2：注册到工具列表

```typescript
// src/plugin/tool-registry.ts（添加）
import { createGithubPrCheckTool } from "../tools/github-pr"

const allTools = {
  // ...现有工具...
  github_pr_check: createGithubPrCheckTool(),
}
```

为什么不是去改 `src/create-tools.ts`？因为 `create-tools.ts` 现在更像总装配层，真正把工具对象拼进注册表的是 `src/plugin/tool-registry.ts`。

**关键点**：

- 工具的 `description` 要对 AI 友好，说清楚“什么时候用”
- 真实注册名通常是 `snake_case`
- 敏感信息（如 token）从环境变量读取，不要写死
- 先找对注册入口，再谈实现细节

---

## 案例 3：自定义 Hook「自动提醒剩余 Token」

**需求**：当会话上下文使用超过 70% 时，自动向 Agent 注入一条提醒，让它总结当前状态。

### 新手最稳的做法：不要从零发明 Hook 形状，先复制同层 Hook 再改

和 Agent、工具不同，Hook 更容易因为“接错层”而失效。最稳妥的流程是：

1. 先确定它属于哪一层
   - 会话类：看 `create-session-hooks.ts`
   - Tool Guard 类：看 `create-tool-guard-hooks.ts`
   - Transform 类：看 `create-transform-hooks.ts`

2. 找一个最像的现成 Hook 当模板
   - 想在会话阶段提醒用户，可以先读 `agent-usage-reminder`
   - 想做失败重试，可以先读 `edit-error-recovery`
   - 想做模型相关恢复，可以先读 `runtime-fallback`

3. 再做三处接线
   - 在 `src/hooks/` 下新增模块
   - 在对应 `create-xxx-hooks.ts` 里注册
   - 在 `src/config/schema/hooks.ts` 里把名字加进 `HookNameSchema`

下面是一个**接入点示意**：

```typescript
// 1. 新建 src/hooks/context-warning/index.ts
export function createContextWarningHook(...) {
  // 这里复制同层 Hook 的基本结构
  // 只改你的判断条件和输出内容
}

// 2. 在 src/plugin/hooks/create-session-hooks.ts 中注册
const contextWarning = safeCreateHook("context-warning", () =>
  isHookEnabled("context-warning")
    ? createContextWarningHook(...)
    : null
)

// 3. 在 src/config/schema/hooks.ts 里补名字
const HookNameSchema = z.enum([
  // ...现有名字...
  "context-warning",
])
```

如果这个 Hook 会保存跨请求状态，最后还要再检查一次：它需不需要加入 `disposeHooks()` 的清理链路。

---

## 案例 4：调试与测试

### 日志系统

所有日志写到 `/tmp/oh-my-opencode.log`。在代码中使用 `log()` 函数：

```typescript
import { log } from "../../shared"

// 正确用法：有意义的上下文
log("[my-hook] processing message", { sessionID, messageLength })

// 错误用法：没有足够信息
log("done")
```

实时查看日志：

```bash
tail -f /tmp/oh-my-opencode.log
```

### 健康检查

```bash
bunx oh-my-opencode doctor
```

输出示例：
```
✓ Configuration loaded from .opencode/oh-my-opencode.jsonc
✓ 26 tools registered
✓ 11 agents configured
✓ 46 hooks active (3 disabled)
✗ Tmux not found (tmux features disabled)
```

### 单元测试

测试风格遵循 Given-When-Then（项目规范）：

```typescript
// src/hooks/context-warning/index.test.ts（示意）
import { describe, it, expect } from "bun:test"
import { createContextWarningHook } from "./index"

describe("createContextWarningHook", () => {
  describe("#given hook is enabled", () => {
    const hook = createContextWarningHook({
      ctx: {} as PluginContext,
      isHookEnabled: () => true,
    })

    describe("#when usage is below threshold", () => {
      it("#then returns no extra effect", async () => {
        const result = await hook?.onSessionIdle?.("session-1", 0.5)
        expect(result).toBeUndefined()
      })
    })

    describe("#when usage exceeds threshold", () => {
      it("#then produces warning output", async () => {
        const result = await hook?.onSessionIdle?.("session-1", 0.8)
        expect(result).toBeDefined()
      })
    })
  })

  describe("#given hook is disabled", () => {
    it("#then returns null", () => {
      const hook = createContextWarningHook({
        ctx: {} as PluginContext,
        isHookEnabled: () => false,
      })
      expect(hook).toBeNull()
    })
  })
})
```

运行：

```bash
bun test src/hooks/context-warning/index.test.ts
```

### 常见问题排查

**问题：插件没有加载**

```bash
# 检查插件配置
cat .opencode/oh-my-opencode.jsonc

# 检查日志
grep "ENTRY" /tmp/oh-my-opencode.log
```

**问题：Agent 不出现在可用列表**

可能的原因：
1. Agent 名称未在 `agent-names.ts` 注册
2. Agent 在 `disabled_agents` 中
3. 创建 Agent 时抛出异常（检查日志中的错误）

**问题：Hook 没有生效**

1. 检查 Hook 名称是否在 `disabled_hooks` 中
2. 检查 `safeHookEnabled` 是否捕获了创建异常
3. 在 Hook 函数开头加 `log()` 确认是否被调用

---

## 生产环境最佳实践

### 并发控制

后台任务的并发数默认为每模型 5 个。如果你的使用场景有高并发需求：

```jsonc
{
  "background_task": {
    "concurrency_limits": {
      "anthropic": 10,
      "openai": 8
    }
  }
}
```

但注意：更高的并发会消耗更多 API 配额和费用，设置前评估实际需求。

### 模型成本优化

不是所有任务都需要最强的模型：

```jsonc
{
  "categories": {
    "exploration": {
      "model": "grok-code-fast-1"  // 快速、便宜，适合代码探索
    },
    "coding": {
      "model": "gpt-5.3-codex medium"  // 专业编码
    },
    "review": {
      "model": "claude-opus-4-6 max"  // 最强推理，适合审查
    }
  }
}
```

> 这里的模型名是示例。换成你实际可用的模型 ID，思路不变：探索任务用快速模型，重要决策用慢而强的模型。

### 禁用不需要的功能

```jsonc
{
  "disabled_hooks": [
    "auto-update-checker",  // 如果不需要自动更新检查
    "session-notification"  // 如果不需要 OS 通知
  ],
  "disabled_agents": [
    "multimodal-looker"  // 如果不处理图像/PDF
  ]
}
```

禁用不需要的组件能减少启动时间和资源消耗。

---

## 总结：扩展 oh-my-openagent 的思维框架

开始任何扩展前，先问这三个问题：

1. **这是新行为还是修改现有行为？**
   - 新行为 → 考虑添加工具或 Agent
   - 修改现有行为 → 考虑添加 Hook

2. **这个扩展需要状态吗？**
   - 无状态 → 简单函数 Hook 或无状态工具
   - 有状态 → 需要实现 `dispose()` 方法

3. **会影响其他组件吗？**
   - 只影响自己 → 直接实现
   - 影响其他 Agent → 考虑通过工具权限限制或 ToolGuard 做隔离
   - 影响所有会话 → 写全面的测试，用 `safeHookEnabled` 保护

---

---

**上一章** ← [第23章：一条消息的完整旅程](/oh-flow/)

第五部分到此结束。如果你想从头复习，回到 [导读：为什么需要多个 Agent？](/oh-prelude/)。

---

<SourceSnapshotCard
  title="第24章参考源码"
  description="四个实战案例的参考实现：最简 Agent 工厂、最简工具、有状态 Hook，以及各模块完整文档索引。"
  repo="code-yeongyu/oh-my-openagent"
  repo-url="https://github.com/code-yeongyu/oh-my-openagent/tree/d80833896cc61fcb59f8955ddc3533982a6bb830"
  branch="dev"
  commit="d80833896cc61fcb59f8955ddc3533982a6bb830"
  verified-at="2026-03-17"
  :entries="[
    { label: '最简 Agent 工厂参考', path: 'src/agents/oracle.ts', href: 'https://github.com/code-yeongyu/oh-my-openagent/blob/d80833896cc61fcb59f8955ddc3533982a6bb830/src/agents/oracle.ts' },
    { label: '最简工具参考实现', path: 'src/tools/skill-mcp/', href: 'https://github.com/code-yeongyu/oh-my-openagent/tree/d80833896cc61fcb59f8955ddc3533982a6bb830/src/tools/skill-mcp' },
    { label: '有状态 Hook 参考实现', path: 'src/hooks/edit-error-recovery/', href: 'https://github.com/code-yeongyu/oh-my-openagent/tree/d80833896cc61fcb59f8955ddc3533982a6bb830/src/hooks/edit-error-recovery' },
    { label: 'Hook 模块完整索引', path: 'src/hooks/CLAUDE.md', href: 'https://github.com/code-yeongyu/oh-my-openagent/blob/d80833896cc61fcb59f8955ddc3533982a6bb830/src/hooks/CLAUDE.md' },
    { label: 'Agent 模块完整文档', path: 'src/agents/CLAUDE.md', href: 'https://github.com/code-yeongyu/oh-my-openagent/blob/d80833896cc61fcb59f8955ddc3533982a6bb830/src/agents/CLAUDE.md' },
    { label: '工具模块完整文档', path: 'src/tools/CLAUDE.md', href: 'https://github.com/code-yeongyu/oh-my-openagent/blob/d80833896cc61fcb59f8955ddc3533982a6bb830/src/tools/CLAUDE.md' },
  ]"
/>

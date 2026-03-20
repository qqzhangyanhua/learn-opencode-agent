# 实践篇 API 格式修复计划

## 问题摘要

实践篇 23 个章节的文档内嵌代码使用 **Anthropic Messages API** 格式，但实际 `.ts` 示例文件使用正确的 **OpenAI Chat Completions API** 格式。读者照文档代码敲无法运行。

## 修复范围

### 问题分类

| 问题 | 影响范围 | 严重度 |
|------|----------|--------|
| A. Anthropic API 格式（stop_reason, tool_use, input_schema 等） | 11 章 74 处 | 致命 |
| B. `system:` 顶层参数（应为 messages 中 role: system） | 18 章 31 处 | 致命 |
| C. `const anthropic = new OpenAI()` 变量名 | 8 章 | 严重 |
| D. "仓库根目录"路径描述不准确 | 23 章 46 处 | 严重 |
| E. P5 引用 Claude API (`POST /messages`, `"model": "claude-..."`) | 1 章 | 严重 |
| F. setup.md 使用 pnpm（应为 bun） | 1 文件 | 严重 |
| G. CLAUDE.md 组件清单缺失 ProjectCard/RunCommand/PracticePreview | 1 文件 | 一般 |

### 问题 A 受影响章节（Anthropic API 格式）

需要全面重写代码块的章节（按 occurrence 数量排序）：

| 章节 | Anthropic API 出现次数 | 复杂度 |
|------|----------------------|--------|
| P20 可观测性 | 14 | 高 |
| P14 MCP 协议 | 9 | 高 |
| P16 子 Agent | 9 | 高 |
| P01 最小 Agent | 8 | 中 |
| P19 安全防护 | 8 | 高 |
| P04 错误处理 | 7 | 中 |
| P03 流式输出 | 6 | 中 |
| P18 模型路由 | 6 | 中 |
| P15 多 Agent | 5 | 中 |
| P10 ReAct Loop | 1 | 低 |
| P22 完整项目 | 1 | 低 |

### 问题 B 受影响章节（system: 顶层参数）

除问题 A 已覆盖的章节外，还需修复 `system:` 参数的章节：

P02, P05, P06, P07, P08, P09, P11, P12, P17, P21, P23

### 问题 C 受影响章节（anthropic 变量名）

P14, P15, P16, P17, P18, P19, P20, P22

---

## API 格式对照表（核心转换规则）

修复时按此表逐项替换：

| Anthropic 格式（文档当前） | OpenAI 格式（目标） |
|---------------------------|---------------------|
| `response.stop_reason === 'end_turn'` | `response.choices[0].finish_reason === 'stop'` |
| `response.stop_reason === 'tool_use'` | `response.choices[0].finish_reason === 'tool_calls'` |
| `response.content`（content blocks 数组） | `response.choices[0].message` |
| `response.content.filter(b => b.type === 'text')` | `response.choices[0].message.content` |
| `block.type === 'tool_use'` | `message.tool_calls[i]` |
| `block.name`, `block.input`, `block.id` | `toolCall.function.name`, `JSON.parse(toolCall.function.arguments)`, `toolCall.id` |
| `{ type: 'tool_result', tool_use_id, content }` | `{ role: 'tool', tool_call_id, content }` |
| `messages.push({ role: 'user', content: toolResults })` | 逐个 push `{ role: 'tool', ... }` |
| `{ name, description, input_schema: {...} }` | `{ type: 'function', function: { name, description, parameters: {...} } }` |
| `tool_choice: { type: 'tool', name: '...' }` | `tool_choice: { type: 'function', function: { name: '...' } }` |
| `system: "..."` 顶层参数 | `messages` 数组首项 `{ role: 'system', content: '...' }` |
| `OpenAI.ChatCompletionToolResultBlockParam` | 无直接对应类型，用 `OpenAI.ChatCompletionToolMessageParam` |
| `OpenAI.ChatCompletionToolUseBlock` | 无直接对应类型，用 `message.tool_calls` |
| `(b): b is OpenAI.ChatCompletionMessage => b.type === 'text'` | 直接用 `message.content` |
| `const anthropic = new OpenAI()` | `const client = new OpenAI()` |

---

## 实施步骤

### 修复策略

**最可靠的方式**：从实际 `.ts` 文件（`practice/pXX-*.ts`）中提取代码片段，替换到对应章节的文档代码块中。不要手动改 API 调用格式——直接用已验证可运行的代码。

对于文档中添加了额外注释和教学说明的代码块，保留教学注释但替换 API 调用部分。

### Step 1：修复 11 个 Anthropic API 格式章节（致命 - 最高优先级）

按复杂度从低到高处理：

#### 1.1 P01 最小 Agent
- 源：`practice/p01-minimal-agent.ts`
- 目标：`docs/practice/p01-minimal-agent/index.md`
- 重点：工具声明格式、Agent 循环、stop_reason → finish_reason
- 估计改动：3 个代码块

#### 1.2 P03 流式输出
- 源：`practice/p03-streaming.ts`
- 目标：`docs/practice/p03-streaming/index.md`
- 重点：streaming API 差异（Anthropic stream vs OpenAI stream）
- 估计改动：3-4 个代码块

#### 1.3 P04 错误处理
- 源：`practice/p04-error-handling.ts`
- 目标：`docs/practice/p04-error-handling/index.md`
- 重点：错误类型、重试逻辑
- 估计改动：3-4 个代码块

#### 1.4 P10 ReAct Loop
- 源：`practice/p10-react-loop.ts`
- 目标：`docs/practice/p10-react-loop/index.md`
- 重点：system 参数位置（仅 1 处 Anthropic 格式，但整个 ReAct 循环需核对）
- 估计改动：1-2 个代码块

#### 1.5 P14 MCP 协议
- 源：`practice/p14-mcp.ts` + `practice/p14-mcp-server.ts`
- 目标：`docs/practice/p14-mcp/index.md`
- 重点：MCP Client 与 OpenAI Client 变量混用、工具格式转换
- 估计改动：4-5 个代码块

#### 1.6 P15 多 Agent
- 源：`practice/p15-multi-agent.ts`
- 目标：`docs/practice/p15-multi-agent/index.md`
- 重点：Orchestrator + Worker 的 API 调用
- 估计改动：3-4 个代码块

#### 1.7 P16 子 Agent
- 源：`practice/p16-subagent.ts`
- 目标：`docs/practice/p16-subagent/index.md`
- 重点：子 Agent 创建和通信
- 估计改动：4-5 个代码块

#### 1.8 P18 模型路由
- 源：`practice/p18-model-routing.ts`
- 目标：`docs/practice/p18-model-routing/index.md`
- 重点：多模型切换逻辑
- 估计改动：3-4 个代码块

#### 1.9 P19 安全防护
- 源：`practice/p19-security.ts`
- 目标：`docs/practice/p19-security/index.md`
- 重点：输入验证、输出校验
- 估计改动：4-5 个代码块

#### 1.10 P20 可观测性（最复杂）
- 源：`practice/p20-observability.ts`
- 目标：`docs/practice/p20-observability/index.md`
- 重点：14 处 Anthropic API 调用，tracing/logging 包装
- 估计改动：6-8 个代码块

#### 1.11 P22 完整项目
- 源：`practice/p22-project.ts`
- 目标：`docs/practice/p22-project/index.md`
- 重点：整个 Code Review Agent 的 API 调用链
- 估计改动：5-6 个代码块

### Step 2：修复 12 个 system 参数章节

这些章节不使用 Anthropic 特有的 stop_reason/tool_use 格式，但 `system:` 作为顶层参数需要改为 messages 数组中的 system 角色。

#### 逐章处理：
- P02, P05, P06, P07, P08, P09, P11, P12, P13, P17, P21, P23

每章操作：
1. 读取对应 `.ts` 文件，提取 system message 的写法
2. 在文档代码块中将 `system: "..."` 改为 `messages` 数组首项

### Step 3：修复变量名（8 章）

在 P14, P15, P16, P17, P18, P19, P20, P22 的文档代码中：
- `const anthropic = new OpenAI()` → `const client = new OpenAI()`
- 后续所有 `anthropic.` 引用 → `client.`

注意：需同步检查实际 `.ts` 文件中的客户端变量名以确保一致。

### Step 4：修复路径描述（23 章 + setup.md + index.md）

在所有章节中：
- "示例文件位置：仓库根目录 `pXX-*.ts`" → "示例文件位置：`practice/pXX-*.ts`"
- "本章建议入口命令：`bun run pXX-*.ts`" → 确认实际运行路径

在 `practice/index.md` 的运行索引中：
- 确认运行命令是否需要加 `cd practice/` 前缀

### Step 5：修复 P5 Claude API 引用

在 `docs/practice/p05-memory-arch/index.md` 中：
- `POST /messages` → `POST /chat/completions`
- `"model": "claude-..."` → `"model": "gpt-4o"`

### Step 6：修复 setup.md

在 `docs/practice/setup.md` 第 37-39 行：
- `pnpm install` → `bun install`
- `pnpm dev` → `bun dev`

### Step 7：更新 CLAUDE.md 组件清单

在 `CLAUDE.md` 的"Vue 全局组件清单"部分新增：

| 组件名 | 文件 | 用途 |
|--------|------|------|
| `ProjectCard` | `components/ProjectCard.vue` | 章节项目卡片（难度/时长/前置/标签） |
| `RunCommand` | `components/RunCommand.vue` | 运行命令展示（含已验证标识） |
| `PracticePreview` | `components/PracticePreview.vue` | 实践篇预览（首页引用） |

---

## 关键文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `docs/practice/p01-minimal-agent/index.md` | 修改 | API 格式 + 路径 |
| `docs/practice/p02-multi-turn/index.md` | 修改 | system 参数 + 路径 |
| `docs/practice/p03-streaming/index.md` | 修改 | API 格式 + 路径 |
| `docs/practice/p04-error-handling/index.md` | 修改 | API 格式 + 路径 |
| `docs/practice/p05-memory-arch/index.md` | 修改 | system 参数 + Claude 引用 + 路径 |
| `docs/practice/p06-memory-retrieval/index.md` | 修改 | system 参数 + 路径 |
| `docs/practice/p07-rag-basics/index.md` | 修改 | system 参数 + 路径 |
| `docs/practice/p08-graphrag/index.md` | 修改 | system 参数 + 路径 |
| `docs/practice/p09-hybrid-retrieval/index.md` | 修改 | system 参数 + 路径 |
| `docs/practice/p10-react-loop/index.md` | 修改 | API 格式 + system + 路径 |
| `docs/practice/p11-planning/index.md` | 修改 | system 参数 + 路径 |
| `docs/practice/p12-reflection/index.md` | 修改 | system 参数 + 路径 |
| `docs/practice/p13-multimodal/index.md` | 修改 | 路径 |
| `docs/practice/p14-mcp/index.md` | 修改 | API 格式 + anthropic 变量 + 路径 |
| `docs/practice/p15-multi-agent/index.md` | 修改 | API 格式 + anthropic 变量 + 路径 |
| `docs/practice/p16-subagent/index.md` | 修改 | API 格式 + anthropic 变量 + 路径 |
| `docs/practice/p17-agent-comm/index.md` | 修改 | anthropic 变量 + system + 路径 |
| `docs/practice/p18-model-routing/index.md` | 修改 | API 格式 + anthropic 变量 + 路径 |
| `docs/practice/p19-security/index.md` | 修改 | API 格式 + anthropic 变量 + 路径 |
| `docs/practice/p20-observability/index.md` | 修改 | API 格式 + anthropic 变量 + 路径 |
| `docs/practice/p21-evaluation/index.md` | 修改 | system 参数 + 路径 |
| `docs/practice/p22-project/index.md` | 修改 | API 格式 + anthropic 变量 + 路径 |
| `docs/practice/p23-production/index.md` | 修改 | system 参数 + 路径 |
| `docs/practice/index.md` | 修改 | 运行命令路径 |
| `docs/practice/setup.md` | 修改 | pnpm → bun |
| `CLAUDE.md` | 修改 | 补充组件清单 |

共 **26 个文件**需要修改。

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 代码块替换后教学注释丢失 | 对比文档注释与 .ts 文件，保留有教学价值的注释 |
| .ts 文件与文档逻辑结构不同 | 以文档的分步教学结构为主，从 .ts 提取对应片段 |
| 遗漏某些 Anthropic API 用法 | 修完后全局 grep 验证无残留 |
| 修改量大导致引入新错误 | 每修完一个 Step 执行 `bun build` 验证站点构建 |

---

## 验证清单

修复完成后执行：

1. `grep -r "stop_reason\|end_turn\|tool_use_id\|input_schema\|ChatCompletionToolResultBlockParam\|ChatCompletionToolUseBlock" docs/practice/` → 应为 0 结果
2. `grep -r "const anthropic = new OpenAI" docs/practice/` → 应为 0 结果
3. `grep -r "仓库根目录" docs/practice/` → 应为 0 结果
4. `grep -r "claude-\.\.\." docs/practice/` → 应为 0 结果
5. `grep -r "pnpm" docs/practice/setup.md` → 应为 0 结果
6. `bun build` → 站点构建无错误

---

## SESSION_ID

- CODEX_SESSION: N/A（文档内容任务，无需外部模型）
- GEMINI_SESSION: N/A

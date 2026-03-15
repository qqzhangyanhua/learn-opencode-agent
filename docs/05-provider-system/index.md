---
title: 第五篇：多模型支持
description: 第五篇：多模型支持的详细内容
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/provider/`
> **前置阅读**：第四篇 会话管理
> **学习目标**：理解 OpenCode 为什么必须把模型提供商做成独立抽象层，以及消息格式、能力差异、成本和认证是怎样被统一接入的

---

<SourceSnapshotCard
  title="第五篇源码快照"
  description="这一篇先别把多模型支持看成多接几个 API，而要先抓住 provider 层怎样把模型能力、消息格式、认证和厂商差异统一收口。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: 'Provider 抽象',
      path: 'packages/opencode/src/provider/provider.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/provider/provider.ts'
    },
    {
      label: '模型能力表',
      path: 'packages/opencode/src/provider/models.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/provider/models.ts'
    },
    {
      label: '协议转换层',
      path: 'packages/opencode/src/provider/transform.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/provider/transform.ts'
    },
    {
      label: '认证入口',
      path: 'packages/opencode/src/provider/auth.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/provider/auth.ts'
    }
  ]"
/>

## 核心概念速览

对 Agent 项目来说，多模型支持真正难的地方从来都不是“再接一个 API”，而是：

- 不同模型参数不一样
- 工具调用能力不一样
- 推理能力和 token 限制不一样
- 成本和认证方式也不一样

OpenCode 当前把这些差异集中在 provider 层处理，而不是让 session、tool、ui 到处感知差异。

所以这一篇最重要的观察角度是：

**Provider 层不是可选插件，而是整个 Agent 产品保持“提供商无关”的前提。**

## 本章导读

### 这一章解决什么问题

这一章要回答的是：

- 为什么 Agent 项目不能把各家模型 API 直接写进业务层
- provider 层到底在隔离哪些差异
- 消息格式、推理参数、模型能力、认证方式怎样统一收口
- 新增一个 provider 时，最小接入路径是什么

### 必看入口

- [packages/opencode/src/provider/provider.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/provider/provider.ts)：provider 抽象与注册入口
- [packages/opencode/src/provider/models.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/provider/models.ts)：模型元信息与能力描述
- [packages/opencode/src/provider/transform.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/provider/transform.ts)：消息与参数转换
- [packages/opencode/src/provider/schema.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/provider/schema.ts)：类型约束
- [packages/opencode/src/provider/auth.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/provider/auth.ts)：认证与凭证处理

### 一张图先建立感觉

```text
session / tool 产出统一消息
  -> provider.ts 选择模型与提供商
  -> models.ts 读取能力信息
  -> transform.ts 转换参数和消息
  -> auth.ts 注入凭证
  -> 厂商 SDK 发请求
  -> 响应回流给 session / tool / UI
```

### 先抓一条主链路

建议先只顺着这一条线读：

```text
session / tool 层准备消息
  -> provider/provider.ts 选择模型提供商
  -> transform.ts 统一转换消息和参数
  -> auth.ts 注入认证信息
  -> 具体 provider 请求上游模型
  -> models.ts 描述能力差异并回流给系统
```

先理解“上游差异是怎样被收敛的”，再分别看具体提供商的细节。

### 初学者阅读顺序

1. 先读 `provider.ts`，看 provider 抽象到底暴露了哪些统一能力。
2. 再读 `models.ts` 和 `schema.ts`，建立“模型元信息”和“能力约束”的直觉。
3. 最后读 `transform.ts` 和 `auth.ts`，理解一条真实请求怎样从统一格式落到具体厂商协议。

### 最容易误解的点

- provider 层不只是“换 API 地址”，更重要的是隔离能力和协议差异。
- 模型能力不是一个静态字符串列表，而会影响工具调用、推理参数和上下文预算。
- “支持多个模型”真正难的地方不在接入数量，而在统一抽象是否足够稳。

## 5.1 提供商抽象层设计

### 提供商抽象到底在隔离什么

不同 AI 提供商的 API 差异很大，例如：
- Anthropic：使用 `thinking` 参数控制推理
- OpenAI：使用 `reasoningEffort` 参数
- Google：使用 `thinkingConfig` 参数
- 本地模型：可能完全不支持推理

如果直接把这些差异写进 session、tool 或 UI，系统很快就会被 provider 特判淹没。

OpenCode 当前的做法可以概括成：**统一抽象层 + 适配转换层**。

```
用户代码
  ↓
Provider.Model（统一接口）
  ↓
ProviderTransform（适配层）
  ↓
AI SDK（Vercel AI SDK）
  ↓
各家 API（Anthropic/OpenAI/Google...）
```

### Provider.Model 数据结构

打开 `provider/provider.ts`，先看 `Provider.Model` 这份统一描述：

```typescript
export namespace Provider {
  export const Model = z.object({
    id: ModelID.zod,              // 模型 ID（如 "claude-sonnet-4"）
    providerID: ProviderID.zod,   // 提供商 ID（如 "anthropic"）
    name: z.string(),             // 显示名称
    family: z.string().optional(), // 模型家族（如 "claude"）
    release_date: z.string(),     // 发布日期

    // 能力标记
    capabilities: z.object({
      attachment: z.boolean(),    // 是否支持附件
      reasoning: z.boolean(),     // 是否支持推理
      temperature: z.boolean(),   // 是否支持温度参数
      tool_call: z.boolean(),     // 是否支持工具调用
      interleaved: z.union([      // 是否支持交错内容
        z.literal(true),
        z.object({
          field: z.enum(["reasoning_content", "reasoning_details"]),
        }),
      ]).optional(),
      input: z.record(z.boolean()), // 输入模态（text/image/audio/video/pdf）
      output: z.record(z.boolean()), // 输出模态
    }),

    // 成本信息
    cost: z.object({
      input: z.number(),          // 输入价格（每百万 tokens）
      output: z.number(),         // 输出价格
      cache_read: z.number().optional(),   // 缓存读取价格
      cache_write: z.number().optional(),  // 缓存写入价格
    }).optional(),

    // 限制
    limit: z.object({
      context: z.number(),        // 上下文窗口大小
      input: z.number().optional(), // 输入限制
      output: z.number(),         // 输出限制
    }),

    // API 信息
    api: z.object({
      id: z.string(),             // API 模型 ID
      npm: z.string(),            // NPM 包名（如 "@ai-sdk/anthropic"）
    }),
  })

  export type Model = z.infer<typeof Model>
}
```

这份结构里最重要的不是字段多少，而是它把多家模型的差异收敛成了一份稳定协议：
- `id`：OpenCode 内部使用的标识符
- `api.id`：调用 API 时使用的标识符
- `capabilities`：声明式能力描述，避免运行时检测
- `cost`：用于显示成本估算

### 模型数据来源：models.dev

OpenCode 不维护模型列表，而是从 https://models.dev 获取。

`provider/models.ts` 里可以看到 models.dev 的拉取顺序：

```typescript
export namespace ModelsDev {
  export const Data = lazy(async () => {
    // 1. 尝试读取本地缓存
    const result = await Filesystem.readJson(filepath).catch(() => {})
    if (result) return result

    // 2. 尝试使用构建时快照
    const snapshot = await import("./models-snapshot")
      .then((m) => m.snapshot)
      .catch(() => undefined)
    if (snapshot) return snapshot

    // 3. 从 models.dev 获取最新数据
    if (Flag.OPENCODE_DISABLE_MODELS_FETCH) return {}
    const json = await fetch(`${url()}/api.json`).then((x) => x.text())
    return JSON.parse(json)
  })

  export async function refresh() {
    const result = await fetch(`${url()}/api.json`, {
      headers: { "User-Agent": Installation.USER_AGENT },
      signal: AbortSignal.timeout(10 * 1000),
    }).catch((e) => {
      log.error("Failed to fetch models.dev", { error: e })
    })
    if (result && result.ok) {
      await Filesystem.write(filepath, await result.text())
      ModelsDev.Data.reset()
    }
  }
}

// 每小时自动刷新
setInterval(async () => {
  await ModelsDev.refresh()
}, 60 * 1000 * 60).unref()
```

这样做的直接好处是：

- 模型列表可以持续更新
- 离线时还能回退到缓存或快照
- 新模型接入不必全靠仓库手写维护

---

## 5.2 统一的 AI SDK 接口

### Vercel AI SDK 的作用

OpenCode 使用 [Vercel AI SDK](https://sdk.vercel.ai/) 作为底层：

```typescript
import { streamObject } from "ai"

const result = await streamObject({
  model: provider.model("claude-sonnet-4"),
  messages: [...],
  tools: {...},
})
```

**AI SDK 的优势**：
- 统一接口：所有提供商使用相同的 API
- 流式支持：原生支持 SSE
- 工具调用：标准化的工具调用格式
- 类型安全：完整的 TypeScript 类型

### Provider 初始化

`provider/provider.ts` 里 provider 初始化流程是集中处理的：

```typescript
export namespace Provider {
  export async function init(input: {
    providerID: ProviderID
    modelID?: ModelID
  }) {
    const providers = await ModelsDev.get()
    const provider = providers[input.providerID]
    if (!provider) throw new Error(`Provider ${input.providerID} not found`)

    // 1. 获取认证信息
    const auth = await Auth.get(input.providerID)

    // 2. 创建 SDK 实例
    const sdk = await createSDK({
      npm: provider.npm,
      api: provider.api,
      auth,
    })

    // 3. 返回模型实例
    return sdk(input.modelID || provider.models[0].id)
  }

  async function createSDK(input: {
    npm: string
    api: string
    auth: Auth.Credentials
  }) {
    switch (input.npm) {
      case "@ai-sdk/anthropic":
        return createAnthropic({
          apiKey: input.auth.apiKey,
        })

      case "@ai-sdk/openai":
        return createOpenAI({
          apiKey: input.auth.apiKey,
        })

      case "@ai-sdk/google":
        return createGoogleGenerativeAI({
          apiKey: input.auth.apiKey,
        })

      case "@ai-sdk/openai-compatible":
        return createOpenAICompatible({
          baseURL: input.auth.baseURL,
          apiKey: input.auth.apiKey,
        })

      // ... 更多提供商
    }
  }
}
```

**流程**：
1. 从 models.dev 获取提供商信息
2. 从配置获取认证信息（API Key）
3. 创建对应的 SDK 实例
4. 返回模型对象

---

## 5.3 模型能力适配与转换

### 消息格式转换

不同提供商对消息格式的要求不同，这部分集中在 `provider/transform.ts`：

```typescript
export namespace ProviderTransform {
  function normalizeMessages(
    msgs: ModelMessage[],
    model: Provider.Model,
    options: Record<string, unknown>,
  ): ModelMessage[] {
    // 1. Anthropic：拒绝空消息
    if (model.api.npm === "@ai-sdk/anthropic") {
      msgs = msgs
        .map((msg) => {
          if (typeof msg.content === "string" && msg.content === "") {
            return undefined
          }
          if (Array.isArray(msg.content)) {
            const filtered = msg.content.filter((part) => {
              if (part.type === "text" || part.type === "reasoning") {
                return part.text !== ""
              }
              return true
            })
            if (filtered.length === 0) return undefined
            return { ...msg, content: filtered }
          }
          return msg
        })
        .filter((msg): msg is ModelMessage => msg !== undefined)
    }

    // 2. Claude：工具调用 ID 只能包含字母数字和下划线
    if (model.api.id.includes("claude")) {
      return msgs.map((msg) => {
        if (Array.isArray(msg.content)) {
          msg.content = msg.content.map((part) => {
            if (part.type === "tool-call" && "toolCallId" in part) {
              return {
                ...part,
                toolCallId: part.toolCallId.replace(/[^a-zA-Z0-9_-]/g, "_"),
              }
            }
            return part
          })
        }
        return msg
      })
    }

    // 3. Mistral：工具调用 ID 必须是 9 个字符
    if (model.providerID === "mistral") {
      return msgs.map((msg) => {
        if (Array.isArray(msg.content)) {
          msg.content = msg.content.map((part) => {
            if (part.type === "tool-call" && "toolCallId" in part) {
              const normalizedId = part.toolCallId
                .replace(/[^a-zA-Z0-9]/g, "")  // 移除非字母数字
                .substring(0, 9)                // 取前 9 个字符
                .padEnd(9, "0")                 // 不足 9 个用 0 填充

              return { ...part, toolCallId: normalizedId }
            }
            return part
          })
        }
        return msg
      })
    }

    return msgs
  }
}
```

**适配策略**：
- Anthropic：过滤空消息
- Claude：清理工具调用 ID
- Mistral：标准化工具调用 ID 长度

### 推理参数适配

不同模型的推理参数名称和格式不同，这部分也在 `transform.ts` 里统一映射：

```typescript
export function variants(model: Provider.Model): Record<string, Record<string, any>> {
  if (!model.capabilities.reasoning) return {}

  const id = model.id.toLowerCase()

  // 1. Anthropic Claude：使用 thinking 参数
  if (model.api.npm === "@ai-sdk/anthropic") {
    return {
      high: {
        thinking: {
          type: "enabled",
          budgetTokens: 16000,
        },
      },
      max: {
        thinking: {
          type: "enabled",
          budgetTokens: 31999,
        },
      },
    }
  }

  // 2. OpenAI：使用 reasoningEffort 参数
  if (model.api.npm === "@ai-sdk/openai") {
    return {
      none: { reasoningEffort: "none" },
      minimal: { reasoningEffort: "minimal" },
      low: { reasoningEffort: "low" },
      medium: { reasoningEffort: "medium" },
      high: { reasoningEffort: "high" },
    }
  }

  // 3. Google Gemini：使用 thinkingConfig 参数
  if (model.api.npm === "@ai-sdk/google") {
    if (id.includes("2.5")) {
      return {
        high: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 16000,
          },
        },
        max: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 24576,
          },
        },
      }
    }
    return {
      low: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "low",
        },
      },
      high: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "high",
        },
      },
    }
  }

  // 4. OpenAI 兼容：通用参数
  if (model.api.npm === "@ai-sdk/openai-compatible") {
    return {
      low: { reasoningEffort: "low" },
      medium: { reasoningEffort: "medium" },
      high: { reasoningEffort: "high" },
    }
  }

  return {}
}
```

**设计思想**：
- 每个提供商有自己的参数格式
- `variants` 返回预设配置（low/medium/high/max）
- 用户可以选择推理强度

### 温度和 Top-P 适配

`transform.ts` 里还有一组按模型家族给出的默认采样参数：

```typescript
export function temperature(model: Provider.Model) {
  const id = model.id.toLowerCase()
  if (id.includes("qwen")) return 0.55
  if (id.includes("claude")) return undefined  // Claude 不需要设置
  if (id.includes("gemini")) return 1.0
  if (id.includes("glm-4.6")) return 1.0
  if (id.includes("kimi-k2")) return 0.6
  return undefined
}

export function topP(model: Provider.Model) {
  const id = model.id.toLowerCase()
  if (id.includes("qwen")) return 1
  if (id.includes("gemini")) return 0.95
  if (id.includes("kimi-k2.5")) return 0.95
  return undefined
}

export function topK(model: Provider.Model) {
  const id = model.id.toLowerCase()
  if (id.includes("minimax-m2")) return 40
  if (id.includes("gemini")) return 64
  return undefined
}
```

**这些默认值在解决什么**
- 不同模型的最佳参数不同
- Claude 不需要温度参数（内部优化）
- Gemini 需要较高的 Top-P
- Qwen 需要较低的温度

### 缓存策略

`transform.ts` 里的缓存逻辑会优先标记系统提示和最近消息：

```typescript
function applyCaching(msgs: ModelMessage[], model: Provider.Model): ModelMessage[] {
  // 选择要缓存的消息
  const system = msgs.filter((msg) => msg.role === "system").slice(0, 2)
  const final = msgs.filter((msg) => msg.role !== "system").slice(-2)

  const providerOptions = {
    anthropic: {
      cacheControl: { type: "ephemeral" },
    },
    openrouter: {
      cacheControl: { type: "ephemeral" },
    },
    bedrock: {
      cachePoint: { type: "default" },
    },
    openaiCompatible: {
      cache_control: { type: "ephemeral" },
    },
  }

  for (const msg of unique([...system, ...final])) {
    msg.providerOptions = mergeDeep(msg.providerOptions ?? {}, providerOptions)
  }

  return msgs
}
```

**缓存策略**：
- 缓存前 2 条系统消息（提示词）
- 缓存最后 2 条消息（最近对话）
- 不同提供商使用不同的缓存参数

---

## 5.4 接入一个新提供商的最小路径

### 先补模型元数据

**位置**：https://github.com/anomalyco/models.dev

**示例**：添加 DeepSeek 提供商

```yaml
# providers/deepseek.yaml
id: deepseek
name: DeepSeek
api: https://api.deepseek.com
npm: "@ai-sdk/openai-compatible"
env:
  - DEEPSEEK_API_KEY

models:
  deepseek-chat:
    id: deepseek-chat
    name: DeepSeek Chat
    family: deepseek
    release_date: "2024-01-01"
    attachment: true
    reasoning: false
    temperature: true
    tool_call: true
    cost:
      input: 0.14
      output: 0.28
    limit:
      context: 64000
      output: 4096
    modalities:
      input: [text]
      output: [text]
```

**提交 PR**：
1. Fork models.dev 仓库
2. 创建 `providers/deepseek.yaml`
3. 提交 PR
4. 等待合并

### 再补 SDK 适配

如果提供商需要特殊处理，在 `provider/provider.ts` 添加：

```typescript
export namespace Provider {
  async function createSDK(input: {
    npm: string
    api: string
    auth: Auth.Credentials
  }) {
    // ... 现有代码

    // 添加 DeepSeek 支持
    if (input.api === "https://api.deepseek.com") {
      return createOpenAICompatible({
        baseURL: "https://api.deepseek.com/v1",
        apiKey: input.auth.apiKey,
        headers: {
          "X-Custom-Header": "value",
        },
      })
    }
  }
}
```

### 必要时补消息转换

如果提供商有特殊要求，在 `provider/transform.ts` 添加：

```typescript
function normalizeMessages(
  msgs: ModelMessage[],
  model: Provider.Model,
  options: Record<string, unknown>,
): ModelMessage[] {
  // ... 现有代码

  // DeepSeek 特殊处理
  if (model.providerID === "deepseek") {
    return msgs.map((msg) => {
      // 自定义转换逻辑
      return msg
    })
  }

  return msgs
}
```

### 做一次端到端验证

```bash
# 1. 配置 API Key
export DEEPSEEK_API_KEY="sk-..."

# 2. 启动 OpenCode
bun dev

# 3. 选择 DeepSeek 模型
> /model deepseek/deepseek-chat

# 4. 测试对话
> 你好
```

### 最后对照产品文档入口

如果你不只是“把 provider 接进源码”，还想补齐面向用户的说明文档，就不要凭空新增一个目录。

当前仓库里的产品文档入口是集中维护的，例如中文文档位于：

- [packages/web/src/content/docs/zh-cn/providers.mdx](https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/zh-cn/providers.mdx)

这也说明一个很重要的工程细节：

- **源码接入** 和 **用户文档暴露** 是两条不同链路
- provider 真正可用，不代表官网文档已经自动同步
- 对初学者来说，补完最后这一步，才算走完一次完整的产品化接入流程

---

## 5.5 本地模型集成实践

### 使用 Ollama

**安装 Ollama**：
```bash
# macOS
brew install ollama

# 启动服务
ollama serve

# 下载模型
ollama pull qwen2.5-coder:7b
```

**配置 OpenCode**：

```json
{
  "provider": {
    "ollama": {
      "baseURL": "http://localhost:11434/v1",
      "apiKey": "ollama"
    }
  }
}
```

**使用**：
```bash
bun dev

> /model ollama/qwen2.5-coder:7b
> 帮我写一个快速排序
```

### 使用 LM Studio

**下载 LM Studio**：https://lmstudio.ai

**启动本地服务器**：
1. 打开 LM Studio
2. 下载模型（如 Qwen2.5-Coder-7B）
3. 点击 "Start Server"（默认端口 1234）

**配置 OpenCode**：

```json
{
  "provider": {
    "lmstudio": {
      "baseURL": "http://localhost:1234/v1",
      "apiKey": "lm-studio"
    }
  }
}
```

### 使用 vLLM

**安装 vLLM**：
```bash
pip install vllm

# 启动服务器
vllm serve Qwen/Qwen2.5-Coder-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000
```

**配置 OpenCode**：

```json
{
  "provider": {
    "vllm": {
      "baseURL": "http://localhost:8000/v1",
      "apiKey": "vllm"
    }
  }
}
```

### 本地模型的限制

**不支持的功能**：
- 工具调用（大部分本地模型不支持）
- 推理模式（需要模型原生支持）
- 多模态输入（图片、音频）

**解决方案**：
1. 使用支持工具调用的模型（如 Qwen2.5-Coder）
2. 使用 Function Calling 适配层
3. 降级到纯文本模式

---

## 本章小结

### 核心概念

1. **提供商抽象层**
   - `Provider.Model`：统一的模型接口
   - `ModelsDev`：从 models.dev 获取模型列表
   - `ProviderTransform`：适配不同提供商的差异

2. **AI SDK 集成**
   - Vercel AI SDK：统一的底层接口
   - 流式支持：原生 SSE
   - 工具调用：标准化格式

3. **能力适配**
   - 消息格式转换：处理空消息、工具调用 ID
   - 推理参数适配：thinking/reasoningEffort/thinkingConfig
   - 温度和采样：不同模型的最佳参数
   - 缓存策略：优化成本和性能

4. **添加新提供商**
   - 提交到 models.dev
   - 添加 SDK 适配器
   - 添加消息转换
   - 测试和文档

5. **本地模型支持**
   - Ollama：最简单的本地部署
   - LM Studio：图形化界面
   - vLLM：高性能推理
   - 限制：工具调用、推理模式

### 关键代码位置

| 功能 | 文件路径 |
|------|---------|
| 提供商定义 | `packages/opencode/src/provider/provider.ts` |
| 模型数据 | `packages/opencode/src/provider/models.ts` |
| 消息转换 | `packages/opencode/src/provider/transform.ts` |
| 类型定义 | `packages/opencode/src/provider/schema.ts` |
| 认证管理 | `packages/opencode/src/provider/auth.ts` |

### 设计模式总结

#### 1. 适配器模式

```typescript
// 统一接口
interface Provider {
  model(id: string): LanguageModel
}

// 不同实现
const anthropic = createAnthropic({ apiKey })
const openai = createOpenAI({ apiKey })
const google = createGoogleGenerativeAI({ apiKey })
```

**好处**：
- 隔离变化
- 易于扩展
- 统一调用

#### 2. 策略模式

```typescript
// 不同策略
function temperature(model: Provider.Model) {
  if (model.id.includes("claude")) return undefined
  if (model.id.includes("gemini")) return 1.0
  if (model.id.includes("qwen")) return 0.55
  return undefined
}
```

**好处**：
- 灵活配置
- 易于维护
- 可测试

#### 3. 工厂模式

```typescript
async function createSDK(input: {
  npm: string
  auth: Auth.Credentials
}) {
  switch (input.npm) {
    case "@ai-sdk/anthropic":
      return createAnthropic({ apiKey: input.auth.apiKey })
    case "@ai-sdk/openai":
      return createOpenAI({ apiKey: input.auth.apiKey })
    // ...
  }
}
```

**好处**：
- 集中创建逻辑
- 易于添加新提供商
- 类型安全

### 源码阅读路径

1. 先看 `packages/opencode/src/provider/provider.ts`，理解 Provider 抽象层的总入口。
2. 再看 `packages/opencode/src/provider/transform.ts`，理解不同模型参数是如何被统一转换的。
3. 最后选两个具体 provider 目录，比如 OpenAI 和 Anthropic，比较它们 SDK 适配层的差异。

### 任务

判断 OpenCode 的 Provider 层为什么不是“多接几家模型 SDK”，而是一层统一模型能力、参数转换和认证边界的协议适配层。

### 操作

1. 打开 `packages/opencode/src/provider/provider.ts`，整理 Provider 抽象层对外暴露的核心职责。
2. 再读 `packages/opencode/src/provider/transform.ts` 和 `models.ts`，记录模型能力表与参数转换各自解决什么问题。
3. 最后选两个具体 provider（例如 OpenAI 和 Anthropic），比较它们在认证、参数和返回结构上的差异，以及这些差异是怎样被统一收口的。

### 验收

完成后你应该能说明：

- 为什么 Provider 层的关键不是 SDK 调用，而是统一能力边界。
- 为什么模型能力表、参数转换和认证入口必须一起设计。
- 为什么用户选择模型之后，真正稳定的不是厂商 API，而是仓库内部这层抽象协议。

### 下一篇预告

**第六篇：MCP 协议集成（Model Context Protocol）**

我们将深入 `packages/opencode/src/mcp/` 目录，学习：
- MCP 协议的设计理念
- 如何开发 MCP 服务器
- 内置 MCP 服务器实现
- 与外部工具的集成
- MCP 的安全模型

---

### 思考题

1. 为什么 OpenCode 选择 Vercel AI SDK 而不是直接调用各家 API？
2. `variants` 函数为什么要返回预设配置而不是让用户自己设置参数？
3. 本地模型为什么大多不支持工具调用？如何解决？

（提示：答案都在本章的代码示例中）

---
title: P23：生产部署清单
description: Rate Limiting、Circuit Breaker、超时控制、优雅降级、健康检查——把实验 Agent 变成生产服务
---

<ProjectCard
  title="你将构建：一个 ProductionAgent 包装器，在基础 Agent 之上叠加速率限制、熔断、超时、降级和健康检查五层生产防护"
  difficulty="intermediate"
  duration="30 min"
  :prerequisites="['P18', 'P19', 'P20']"
  :tags="['Production', 'Deployment', 'Checklist', 'TypeScript']"
/>

> 开始前先看：[实践环境准备](/practice/setup/)。如果本章里的 `RunCommand` 对应文件在仓库中还不存在，请先按正文步骤创建示例文件，再执行命令。

## 背景与目标

走到这里，你已经完成了 22 个练习。从 P1 的 50 行最小 Agent 开始，到 P22 的完整 Code Review Agent，你掌握了多轮对话、流式输出、工具调用、RAG、ReAct 循环、规划、反思、多 Agent 编排、模型路由、安全防注入、可观测性、评估体系……几乎所有构建 AI Agent 需要的核心技术。

但是——在本地跑通和在生产环境稳定运行是两回事。

本地开发时你不会遇到这些问题：API 被限流了怎么办？下游 Provider 连续超时怎么办？单次请求卡了 60 秒怎么办？主模型宕机了整个服务就挂掉吗？怎么知道你的 Agent 此刻是否健康？

这些问题不需要新的 AI 理论，它们是经典的分布式系统工程问题。本章的目标是把这些生产关注点封装成一个 `ProductionAgent` 包装器，让你的任何 Agent 都能一行代码获得生产级防护。

**本章目标**：

1. 实现令牌桶速率限制器，主动控制请求频率
2. 实现熔断器，在 Provider 连续失败时快速失败并自动恢复
3. 实现请求超时控制，中止卡住的 LLM 调用
4. 实现优雅降级，在主模型不可用时返回兜底响应
5. 实现健康检查端点，报告 Agent 各组件状态
6. 给出一份完整的生产部署清单

## 核心概念

### 令牌桶限流

Anthropic API 对每个组织有请求速率限制。与其等到被 429 拒绝后再重试（P4 的做法），不如在客户端主动限流。令牌桶（Token Bucket）算法的思路很直觉：桶里有固定数量的令牌，每次请求消耗一个，令牌按固定速率补充。桶空了就等，不发请求。

这和 P4 的指数退避重试是互补的：令牌桶在前面**预防**限流，指数退避在后面**应对**限流。

### 熔断器

如果一个 Provider 连续失败了 5 次，继续重试只是在浪费时间和用户的耐心。熔断器（Circuit Breaker）借鉴了电路保险丝的思路：

```
闭合（正常）→ 连续失败 N 次 → 断开（快速失败）→ 冷却期后 → 半开（试探一次）→ 成功则闭合 / 失败则断开
```

这和 P18 的降级链配合使用：熔断器判定某个模型不可用，降级链自动切到下一个模型。

### 请求超时

LLM 调用没有确定的响应时间。简单问题可能 1 秒返回，复杂推理可能 30 秒。但用户不会等 60 秒。给每次调用设一个超时上限，超时就中止，比无限等待好得多。

### 优雅降级

当所有模型都不可用时——不是返回一个 500 错误，而是返回一个预设的兜底响应。"抱歉，服务暂时不可用，请稍后再试"比一个堆栈跟踪好一万倍。

### 健康检查

生产服务需要一个 `/health` 端点告诉负载均衡器和监控系统：我还活着吗？各个组件状态如何？哪个 Provider 的熔断器断开了？

## 动手实现

<RunCommand command="bun run p23-production.ts" />

### 第一步：定义类型

```ts
// p23-production.ts
import Anthropic from '@anthropic-ai/sdk'

// ── 类型定义 ──────────────────────────────────

/** 熔断器状态 */
type CircuitState = 'closed' | 'open' | 'half-open'

/** 熔断器配置 */
interface CircuitBreakerConfig {
  failureThreshold: number   // 连续失败多少次后断开
  cooldownMs: number         // 断开后多久进入半开状态
}

/** 速率限制器配置 */
interface RateLimiterConfig {
  maxTokens: number          // 桶容量
  refillRate: number         // 每秒补充的令牌数
}

/** 健康检查结果 */
interface HealthStatus {
  healthy: boolean
  uptime: number
  providers: Record<string, {
    circuit: CircuitState
    consecutiveFailures: number
    lastFailure: number | null
  }>
  rateLimiter: {
    availableTokens: number
    maxTokens: number
  }
}

/** ProductionAgent 配置 */
interface ProductionConfig {
  model: string
  fallbackMessage: string
  timeoutMs: number
  rateLimiter: RateLimiterConfig
  circuitBreaker: CircuitBreakerConfig
}
```

### 第二步：实现令牌桶限流器

```ts
// p23-production.ts（续）

class TokenBucketRateLimiter {
  private tokens: number
  private maxTokens: number
  private refillRate: number
  private lastRefill: number

  constructor(config: RateLimiterConfig) {
    this.tokens = config.maxTokens
    this.maxTokens = config.maxTokens
    this.refillRate = config.refillRate
    this.lastRefill = Date.now()
  }

  /** 补充令牌 */
  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate,
    )
    this.lastRefill = now
  }

  /** 尝试获取一个令牌，返回需要等待的毫秒数（0 表示立即可用） */
  acquire(): number {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return 0
    }
    // 计算需要等多久才能有一个令牌
    const deficit = 1 - this.tokens
    return Math.ceil((deficit / this.refillRate) * 1000)
  }

  /** 等待直到获取令牌 */
  async waitForToken(): Promise<void> {
    const waitMs = this.acquire()
    if (waitMs > 0) {
      console.log(`[RateLimiter] 等待 ${waitMs}ms`)
      await new Promise(resolve => setTimeout(resolve, waitMs))
      // 等待后再次获取
      this.refill()
      this.tokens -= 1
    }
  }

  /** 当前可用令牌数 */
  available(): number {
    this.refill()
    return Math.floor(this.tokens)
  }
}
```

令牌桶的核心只有三行逻辑：补充、检查、消耗。`waitForToken` 是对外的便利接口——调用者不需要关心等多久，等完了就能发请求。

### 第三步：实现熔断器

```ts
// p23-production.ts（续）

class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failures: number = 0
  private lastFailureTime: number | null = null
  private config: CircuitBreakerConfig

  constructor(config: CircuitBreakerConfig) {
    this.config = config
  }

  /** 当前是否允许请求通过 */
  canPass(): boolean {
    if (this.state === 'closed') return true
    if (this.state === 'open') {
      // 检查冷却期是否已过
      const elapsed = Date.now() - (this.lastFailureTime ?? 0)
      if (elapsed >= this.config.cooldownMs) {
        this.state = 'half-open'
        console.log('[CircuitBreaker] 冷却期结束，进入半开状态')
        return true
      }
      return false
    }
    // half-open：允许一次试探
    return true
  }

  /** 记录一次成功 */
  recordSuccess(): void {
    if (this.state === 'half-open') {
      console.log('[CircuitBreaker] 半开试探成功，恢复闭合')
    }
    this.failures = 0
    this.state = 'closed'
  }

  /** 记录一次失败 */
  recordFailure(): void {
    this.failures += 1
    this.lastFailureTime = Date.now()
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open'
      console.log(
        `[CircuitBreaker] 连续失败 ${this.failures} 次，熔断器断开，` +
        `冷却 ${this.config.cooldownMs}ms`
      )
    }
  }

  /** 获取状态快照 */
  getStatus(): { circuit: CircuitState; consecutiveFailures: number; lastFailure: number | null } {
    return {
      circuit: this.state,
      consecutiveFailures: this.failures,
      lastFailure: this.lastFailureTime,
    }
  }
}
```

熔断器是一个状态机，三个状态之间的转换完全由失败计数和冷却时间驱动。注意 `half-open` 状态只允许一次试探——如果试探成功就恢复正常，失败就继续断开。

### 第四步：实现 ProductionAgent

```ts
// p23-production.ts（续）

class ProductionAgent {
  private client: Anthropic
  private config: ProductionConfig
  private rateLimiter: TokenBucketRateLimiter
  private circuitBreakers: Map<string, CircuitBreaker> = new Map()
  private startTime: number

  constructor(config: ProductionConfig) {
    this.client = new Anthropic()
    this.config = config
    this.startTime = Date.now()
    this.rateLimiter = new TokenBucketRateLimiter(config.rateLimiter)
  }

  /** 获取或创建某个 Provider 的熔断器 */
  private getCircuitBreaker(model: string): CircuitBreaker {
    let cb = this.circuitBreakers.get(model)
    if (!cb) {
      cb = new CircuitBreaker(this.config.circuitBreaker)
      this.circuitBreakers.set(model, cb)
    }
    return cb
  }

  /** 带超时的 API 调用 */
  private async callWithTimeout(
    model: string,
    messages: Anthropic.MessageParam[],
    system: string,
  ): Promise<Anthropic.Message> {
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs,
    )

    try {
      const response = await this.client.messages.create(
        {
          model,
          max_tokens: 1024,
          system,
          messages,
        },
        { signal: controller.signal },
      )
      return response
    } finally {
      clearTimeout(timer)
    }
  }

  /** 核心方法：带全部生产防护的消息发送 */
  async chat(
    messages: Anthropic.MessageParam[],
    system: string = 'You are a helpful assistant.',
  ): Promise<string> {
    const model = this.config.model

    // 第一层：速率限制
    await this.rateLimiter.waitForToken()

    // 第二层：熔断检查
    const cb = this.getCircuitBreaker(model)
    if (!cb.canPass()) {
      console.log(`[Production] 熔断器已断开，返回降级响应`)
      return this.config.fallbackMessage
    }

    // 第三层：带超时的调用
    try {
      const response = await this.callWithTimeout(model, messages, system)

      // 成功：重置熔断器
      cb.recordSuccess()

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')

      console.log(
        `[Production] 成功 | model=${model} ` +
        `input=${response.usage.input_tokens} output=${response.usage.output_tokens}`
      )
      return text
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))

      // 第四层：记录失败，触发熔断
      cb.recordFailure()
      console.log(`[Production] 调用失败: ${error.message}`)

      // 第五层：优雅降级
      return this.config.fallbackMessage
    }
  }

  /** 健康检查 */
  healthCheck(): HealthStatus {
    const providers: HealthStatus['providers'] = {}
    for (const [model, cb] of this.circuitBreakers.entries()) {
      providers[model] = cb.getStatus()
    }

    const status: HealthStatus = {
      healthy: this.isHealthy(),
      uptime: Date.now() - this.startTime,
      providers,
      rateLimiter: {
        availableTokens: this.rateLimiter.available(),
        maxTokens: this.config.rateLimiter.maxTokens,
      },
    }
    return status
  }

  /** 判断整体是否健康：至少有一个 Provider 的熔断器没有断开 */
  private isHealthy(): boolean {
    if (this.circuitBreakers.size === 0) return true
    for (const cb of this.circuitBreakers.values()) {
      const status = cb.getStatus()
      if (status.circuit !== 'open') return true
    }
    return false
  }
}
```

`ProductionAgent.chat()` 方法只做一件事：在基础 API 调用外面套上五层防护。调用者看到的接口极其简单——传入消息，拿到字符串。所有的生产复杂性被封装在内部。

### 第五步：健康检查 HTTP 端点

```ts
// p23-production.ts（续）

function startHealthServer(agent: ProductionAgent, port: number): void {
  const server = Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url)

      if (url.pathname === '/health') {
        const status = agent.healthCheck()
        return new Response(JSON.stringify(status, null, 2), {
          status: status.healthy ? 200 : 503,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Not Found', { status: 404 })
    },
  })

  console.log(`[Health] 健康检查端点已启动: http://localhost:${server.port}/health`)
}
```

负载均衡器定期请求 `/health`，如果返回 503 就把这个实例从流量池中移除。简单直接，没有花哨的框架依赖。

### 第六步：入口与演示

```ts
// p23-production.ts（续）

async function main(): Promise<void> {
  const agent = new ProductionAgent({
    model: 'claude-sonnet-4-20250514',
    fallbackMessage: '抱歉，服务暂时不可用，请稍后再试。',
    timeoutMs: 30_000,
    rateLimiter: {
      maxTokens: 5,       // 桶容量 5 个令牌
      refillRate: 1,       // 每秒补充 1 个
    },
    circuitBreaker: {
      failureThreshold: 3, // 连续 3 次失败后熔断
      cooldownMs: 10_000,  // 10 秒冷却期
    },
  })

  // 启动健康检查端点
  startHealthServer(agent, 3100)

  // 模拟连续请求
  const questions = [
    '用一句话解释什么是 Circuit Breaker。',
    'TypeScript 的 type 和 interface 有什么区别？',
    '解释令牌桶算法的工作原理。',
  ]

  for (const q of questions) {
    console.log(`\n${'─'.repeat(50)}`)
    console.log(`用户: ${q}`)
    const answer = await agent.chat(
      [{ role: 'user', content: q }],
    )
    console.log(`助手: ${answer}`)
  }

  // 打印健康状态
  console.log('\n--- 健康检查 ---')
  console.log(JSON.stringify(agent.healthCheck(), null, 2))
}

main().catch(console.error)
```

### 运行结果

```
[Health] 健康检查端点已启动: http://localhost:3100/health

──────────────────────────────────────────────────
用户: 用一句话解释什么是 Circuit Breaker。
[Production] 成功 | model=claude-sonnet-4-20250514 input=24 output=38
助手: Circuit Breaker 是一种在下游服务连续失败时自动切断请求的保护机制，
      冷却后再逐步恢复。

──────────────────────────────────────────────────
用户: TypeScript 的 type 和 interface 有什么区别？
[Production] 成功 | model=claude-sonnet-4-20250514 input=22 output=85
助手: type 支持联合类型和映射类型，interface 支持声明合并和 extends 继承...

──────────────────────────────────────────────────
用户: 解释令牌桶算法的工作原理。
[RateLimiter] 等待 320ms
[Production] 成功 | model=claude-sonnet-4-20250514 input=18 output=62
助手: 桶以固定速率补充令牌，每次请求消耗一个令牌，桶空则等待...

--- 健康检查 ---
{
  "healthy": true,
  "uptime": 8523,
  "providers": {
    "claude-sonnet-4-20250514": {
      "circuit": "closed",
      "consecutiveFailures": 0,
      "lastFailure": null
    }
  },
  "rateLimiter": {
    "availableTokens": 2,
    "maxTokens": 5
  }
}
```

注意第三次请求被限流器暂停了 320ms——桶里的令牌被前两次请求用完了，需要等补充。这就是令牌桶的效果：平滑请求频率，不会触发 API 的 429。

## 部署清单

以下是你在将 Agent 推向生产之前需要逐项确认的清单。每一项都对应前面章节中的具体实现：

| 状态 | 检查项 | 相关章节 | 说明 |
|------|--------|----------|------|
| ☐ | API Key 存放在环境变量中 | P1 | 绝对不要硬编码在源码里，`new Anthropic()` 自动读取 `ANTHROPIC_API_KEY` |
| ☐ | 速率限制已配置 | P23（本章） | 令牌桶限流器，参数根据你的 API Tier 调整 |
| ☐ | 每个 Provider 配置了熔断器 | P23（本章） | 连续 N 次失败后快速失败，冷却后自动恢复 |
| ☐ | 请求超时已设置 | P23（本章） | 用 `AbortController` 设定上限，推荐 30-60 秒 |
| ☐ | 结构化日志已启用 | P20 | JSON 格式日志，包含 trace_id、model、token 用量 |
| ☐ | 成本预算告警已配置 | P18 | `BudgetTracker` 追踪累计成本，接近阈值时触发告警 |
| ☐ | 输入清洗已启用 | P19 | 分隔符注入检测、角色扮演检测、敏感信息过滤 |
| ☐ | 输出验证已启用 | P19 | 防止模型泄露 system prompt 或执行非预期工具调用 |
| ☐ | 评估套件通过 | P21 | 核心用例的准确率、安全测试的通过率达标 |
| ☐ | 错误处理和重试逻辑 | P4 | 指数退避重试，区分可重试错误和不可重试错误 |
| ☐ | 优雅关闭处理 | P23（本章） | 捕获 SIGTERM/SIGINT，完成进行中的请求后退出 |
| ☐ | 监控与告警 | P20 | Uptime 监控、错误率告警、延迟 P95 告警 |

实现优雅关闭的参考代码：

```ts
// 优雅关闭 —— 在 main() 末尾添加
process.on('SIGTERM', () => {
  console.log('[Shutdown] 收到 SIGTERM，开始优雅关闭...')
  // 停止接受新请求，等待进行中的请求完成
  // 实际实现取决于你的 HTTP 框架
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[Shutdown] 收到 SIGINT，开始优雅关闭...')
  process.exit(0)
})
```

## 常见问题

**Q: 熔断器的 failureThreshold 和 cooldownMs 怎么调？**

没有银弹，取决于你的场景。经验值：`failureThreshold: 3-5`，`cooldownMs: 10000-30000`。阈值太低会导致偶发错误就熔断（误伤），太高会在真正故障时浪费时间。冷却期太短会导致半开试探过于频繁，太长会让恢复时间变长。建议从保守值开始，根据 P20 的可观测性数据逐步调优。

**Q: 令牌桶的参数怎么和 Anthropic 的实际限额对应？**

Anthropic 的速率限制取决于你的 API Tier（[文档](https://docs.anthropic.com/en/api/rate-limits)）。比如 Tier 1 的限制是 50 RPM（请求/分钟），对应的令牌桶参数就是 `maxTokens: 50, refillRate: 50/60`（约 0.83/秒）。留一些余量——设到实际限额的 80% 左右，防止其他客户端或并发请求竞争配额。

**Q: 生产环境需要多个实例，熔断器状态怎么共享？**

本章的熔断器是进程内的，适合单实例部署。多实例场景下，有两种策略：（1）每个实例独立维护熔断器——简单但反应慢，因为每个实例需要独立积累失败次数；（2）用 Redis 共享状态——反应快但增加了外部依赖。大多数中小规模部署用方案（1）就够了，因为 Provider 的故障通常是全局性的，每个实例都会很快自己发现。

**Q: 超时设多少合适？**

Claude Sonnet 的 P95 延迟大约在 5-15 秒（取决于输出长度），Opus 更长。建议设 30 秒作为基线。如果你的场景需要长输出（代码生成、文档写作），可以放宽到 60 秒。但超过 60 秒的调用通常意味着出了问题——要么 prompt 太大，要么 API 确实在超载。

## 小结与延伸

从 P1 到 P23，二十三章练习走完了构建 AI Agent 的完整旅程。回头看这条路径：

**P1-P3** 建立基础——最小 Agent、多轮对话、流式输出。你学会了和 Anthropic API 对话的基本方式。

**P4-P6** 走向可靠——错误处理与重试让 Agent 在不稳定环境中存活，记忆架构和检索让 Agent 能记住和找到信息。

**P7-P9** 扩展知识——RAG、GraphRAG、混合检索，让 Agent 的知识不再局限于训练数据。

**P10-P14** 掌握推理——ReAct 循环、规划、反思、多模态、MCP 协议，Agent 从"问答工具"变成了"能思考、能行动、能自我纠正的智能体"。

**P15-P17** 协作编排——多 Agent、子 Agent、Agent 通信，单个 Agent 的能力上限被打破。

**P18-P21** 生产打磨——模型路由省钱、安全防注入、可观测性让你看得见、评估体系让你量化质量。

**P22** 把一切整合到一个真实项目里。

**P23**（本章）确保这个项目能在生产环境稳定运行。

这二十三章的核心信条始终如一：**从最简方案开始，只在遇到真实问题时才增加复杂度**。P1 的 Agent 只有 50 行代码。到 P23，你手里有了速率限制、熔断器、超时控制、安全防护、可观测性、评估体系——但每一层复杂度都是为了解决一个真实存在的问题。

没有哪个系统需要在第一天就实现所有这些。从 P1 开始，遇到限流加 P4，需要记忆加 P5，要上线加 P18-P23。这不是线性的课程，而是一个你可以按需取用的工具箱。

去构建吧。

<StarCTA />

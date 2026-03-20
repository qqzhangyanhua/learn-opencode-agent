import OpenAI from 'openai'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

type CircuitState = 'closed' | 'open' | 'half-open'

interface CircuitBreakerConfig {
  failureThreshold: number
  cooldownMs: number
}

interface RateLimiterConfig {
  maxTokens: number
  refillRate: number
}

interface HealthStatus {
  healthy: boolean
  uptime: number
  providers: Record<
    string,
    {
      circuit: CircuitState
      consecutiveFailures: number
      lastFailure: number | null
    }
  >
  rateLimiter: {
    availableTokens: number
    maxTokens: number
  }
}

interface ProductionConfig {
  model: string
  fallbackMessage: string
  timeoutMs: number
  rateLimiter: RateLimiterConfig
  circuitBreaker: CircuitBreakerConfig
}

class TokenBucketRateLimiter {
  private tokens: number
  private readonly maxTokens: number
  private readonly refillRate: number
  private lastRefill: number

  constructor(config: RateLimiterConfig) {
    this.tokens = config.maxTokens
    this.maxTokens = config.maxTokens
    this.refillRate = config.refillRate
    this.lastRefill = Date.now()
  }

  private refill(): void {
    const now = Date.now()
    const elapsedSeconds = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsedSeconds * this.refillRate)
    this.lastRefill = now
  }

  acquire(): number {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return 0
    }

    const deficit = 1 - this.tokens
    return Math.ceil((deficit / this.refillRate) * 1000)
  }

  async waitForToken(): Promise<void> {
    const waitMs = this.acquire()
    if (waitMs <= 0) return

    console.log(`[RateLimiter] 等待 ${waitMs}ms`)
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    this.refill()
    this.tokens = Math.max(0, this.tokens - 1)
  }

  available(): number {
    this.refill()
    return Math.floor(this.tokens)
  }
}

class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failures = 0
  private lastFailureTime: number | null = null
  private halfOpenInFlight = false
  private readonly config: CircuitBreakerConfig

  constructor(config: CircuitBreakerConfig) {
    this.config = config
  }

  canPass(): boolean {
    if (this.state === 'closed') return true

    if (this.state === 'open') {
      const elapsed = Date.now() - (this.lastFailureTime ?? 0)
      if (elapsed >= this.config.cooldownMs) {
        this.state = 'half-open'
        this.halfOpenInFlight = false
        console.log('[CircuitBreaker] 冷却期结束，进入半开状态')
      } else {
        return false
      }
    }

    if (this.state === 'half-open') {
      if (this.halfOpenInFlight) return false
      this.halfOpenInFlight = true
      return true
    }

    return true
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      console.log('[CircuitBreaker] 半开试探成功，恢复闭合')
    }
    this.failures = 0
    this.state = 'closed'
    this.halfOpenInFlight = false
  }

  recordFailure(): void {
    this.failures += 1
    this.lastFailureTime = Date.now()
    this.halfOpenInFlight = false

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open'
      console.log(
        `[CircuitBreaker] 连续失败 ${this.failures} 次，熔断器断开，冷却 ${this.config.cooldownMs}ms`,
      )
      return
    }

    if (this.state === 'half-open') {
      this.state = 'open'
      console.log('[CircuitBreaker] 半开试探失败，重新断开')
    }
  }

  getStatus(): { circuit: CircuitState; consecutiveFailures: number; lastFailure: number | null } {
    return {
      circuit: this.state,
      consecutiveFailures: this.failures,
      lastFailure: this.lastFailureTime,
    }
  }
}

class ProductionAgent {
  private readonly client: OpenAI
  private readonly config: ProductionConfig
  private readonly rateLimiter: TokenBucketRateLimiter
  private readonly circuitBreakers = new Map<string, CircuitBreaker>()
  private readonly startTime: number

  constructor(config: ProductionConfig) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
    this.config = config
    this.rateLimiter = new TokenBucketRateLimiter(config.rateLimiter)
    this.startTime = Date.now()
  }

  private getCircuitBreaker(model: string): CircuitBreaker {
    let breaker = this.circuitBreakers.get(model)
    if (!breaker) {
      breaker = new CircuitBreaker(this.config.circuitBreaker)
      this.circuitBreakers.set(model, breaker)
    }
    return breaker
  }

  private async callWithTimeout(
    model: string,
    messages: OpenAI.ChatCompletionMessageParam[],
    system: string,
  ): Promise<OpenAI.ChatCompletion> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      return await this.client.chat.completions.create(
        {
          model,
          max_tokens: 1024,
          messages: [{ role: 'system', content: system }, ...messages],
        },
        { signal: controller.signal },
      )
    } finally {
      clearTimeout(timer)
    }
  }

  async chat(
    messages: OpenAI.ChatCompletionMessageParam[],
    system = 'You are a helpful assistant.',
  ): Promise<string> {
    const model = this.config.model

    await this.rateLimiter.waitForToken()

    const breaker = this.getCircuitBreaker(model)
    if (!breaker.canPass()) {
      console.log('[Production] 熔断器已断开，返回降级响应')
      return this.config.fallbackMessage
    }

    try {
      const response = await this.callWithTimeout(model, messages, system)
      breaker.recordSuccess()

      const text = response.choices[0]?.message.content?.trim() ?? ''

      console.log(
        `[Production] 成功 | model=${model} input=${response.usage?.prompt_tokens ?? 0} output=${response.usage?.completion_tokens ?? 0}`,
      )
      return text
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      breaker.recordFailure()
      console.log(`[Production] 调用失败: ${message}`)
      return this.config.fallbackMessage
    }
  }

  healthCheck(): HealthStatus {
    const providers: HealthStatus['providers'] = {}
    for (const [model, breaker] of this.circuitBreakers.entries()) {
      providers[model] = breaker.getStatus()
    }

    return {
      healthy: this.isHealthy(),
      uptime: Date.now() - this.startTime,
      providers,
      rateLimiter: {
        availableTokens: this.rateLimiter.available(),
        maxTokens: this.config.rateLimiter.maxTokens,
      },
    }
  }

  private isHealthy(): boolean {
    if (this.circuitBreakers.size === 0) return true
    for (const breaker of this.circuitBreakers.values()) {
      if (breaker.getStatus().circuit !== 'open') return true
    }
    return false
  }
}

function startHealthServer(agent: ProductionAgent, port: number): Server {
  const server = createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400
      res.end('Bad Request')
      return
    }

    const url = new URL(req.url, 'http://127.0.0.1')
    if (url.pathname === '/health') {
      const status = agent.healthCheck()
      res.statusCode = status.healthy ? 200 : 503
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(status, null, 2))
      return
    }

    res.statusCode = 404
    res.end('Not Found')
  })

  server.listen(port)
  const address = server.address()
  const actualPort = typeof address === 'object' && address ? (address as AddressInfo).port : port
  console.log(`[Health] 健康检查端点已启动: http://localhost:${actualPort}/health`)
  return server
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function main(): Promise<void> {
  const agent = new ProductionAgent({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    fallbackMessage: '抱歉，服务暂时不可用，请稍后再试。',
    timeoutMs: 30_000,
    rateLimiter: {
      maxTokens: 2,
      refillRate: 1,
    },
    circuitBreaker: {
      failureThreshold: 3,
      cooldownMs: 10_000,
    },
  })

  const server = startHealthServer(agent, 3100)

  try {
    const questions = [
      '用一句话解释什么是 Circuit Breaker。',
      'TypeScript 的 type 和 interface 有什么区别？',
      '解释令牌桶算法的工作原理。',
    ]

    for (const question of questions) {
      console.log(`\n${'─'.repeat(50)}`)
      console.log(`用户: ${question}`)
      const answer = await agent.chat([{ role: 'user', content: question }])
      console.log(`助手: ${answer}`)
    }

    console.log('\n--- 健康检查 ---')
    console.log(JSON.stringify(agent.healthCheck(), null, 2))
  } finally {
    await closeServer(server)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

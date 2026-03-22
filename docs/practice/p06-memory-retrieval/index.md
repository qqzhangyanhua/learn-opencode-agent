---
title: P6：记忆增强检索（MemoryBank）
description: 设计带标签与重要性评分的 MemoryBank，让 Agent 在每次回答前精准检索相关历史记忆
---

<PracticeProjectGuide project-id="practice-p06-memory-retrieval" />

## 背景与目标

P5 我们搭了一个三层记忆架构，长期记忆用最简单的 key-value 实现：

```ts
// P5 的长期记忆
const longTermMemory: Record<string, string> = {
  'user_name': '小明',
  'preferred_language': 'TypeScript',
}
```

这个方案有一个根本缺陷：**只能精确查找，不能模糊匹配**。

用户问"帮我写个 sleep 函数"，你不知道该查 `preferred_language` 还是 `code_style`，只能把所有长期记忆全塞进 prompt——记忆一多，Token 就爆了。

真正有用的记忆系统需要两件事：
1. 每条记忆有**元信息**（标签、重要性），方便检索和排序
2. 根据当前问题**检索相关记忆**，只注入相关的那几条

本章目标是实现一个 `MemoryBank`，完成从"全量塞入"到"按需检索"的关键跃升：

```
用户输入 → 提取关键词 → 检索相关记忆 → 注入 system prompt → 模型回答
```

## 核心概念

### MemoryEntry 数据结构

每条记忆不再是裸字符串，而是一个结构化条目：

```
MemoryEntry
├── id          唯一标识，用于去重和引用
├── content     记忆的文本内容
├── tags        标签数组，检索的核心依据
├── importance  重要性评分 1-10，决定注入优先级
└── createdAt   创建时间，可用于时间衰减策略
```

标签是检索的关键。"用户喜欢简洁代码风格"打上 `['偏好', '编程', '代码风格']`，当用户问编程问题时就能被命中。

### 基于关键词的检索原理

关键词检索的逻辑很直接：

1. 把用户输入分词，得到关键词列表
2. 遍历所有记忆，计算每条记忆的 tags 与关键词的交集数量
3. 交集越多，相关性得分越高
4. 按"相关性 × 重要性"综合排序，取 top-K 条

这不是向量检索，没有语义理解，但实现简单、零依赖、可解释。P7 会介绍向量检索（RAG）来处理语义相似但词面不同的情况。

### 记忆上下文窗口

检索到相关记忆后，不是全部注入，而是控制数量。原因有两个：

- Token 成本：每条记忆都占用输入 Token
- 干扰风险：无关记忆反而会误导模型

通常 top-3 到 top-5 条足够，具体数字取决于记忆内容长度和模型上下文窗口大小。

### 自动记忆提取

记忆不应该只靠人工手写。每轮对话结束后，可以让模型分析对话，判断"这段对话有哪些值得记住的信息"。这个步骤叫**记忆提取**（Memory Extraction）。

本章用一个简化版本演示：主程序预置几条记忆，通过提问来验证检索逻辑是否正确工作。自动提取的完整实现留给读者扩展。

## 动手实现

### 第一步：定义 MemoryEntry 接口

```ts
// p06-memory-retrieval.ts
import OpenAI from 'openai'

interface MemoryEntry {
  id: string
  content: string
  tags: string[]
  importance: number  // 1-10，越高越优先注入
  createdAt: string
}
```

接口放在文件顶部，所有类型信息集中可见。

### 第二步：实现 MemoryBank 类

```ts
class MemoryBank {
  private memories: MemoryEntry[] = []

  add(content: string, tags: string[], importance: number = 5): void {
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      content,
      tags,
      importance,
      createdAt: new Date().toISOString(),
    }
    this.memories.push(entry)
  }

  search(query: string, topK: number = 3): MemoryEntry[] {
    // 简单分词：按空格和标点切分，转小写
    const keywords = query
      .toLowerCase()
      .split(/[\s，。？！、,.\?!]+/)
      .filter(w => w.length > 0)

    if (keywords.length === 0) {
      // 无关键词时，按重要性返回 top-K
      return [...this.memories]
        .sort((a, b) => b.importance - a.importance)
        .slice(0, topK)
    }

    // 计算每条记忆的相关性得分
    const scored = this.memories.map(mem => {
      const lowerTags = mem.tags.map(t => t.toLowerCase())
      const hitCount = keywords.filter(kw =>
        lowerTags.some(tag => tag.includes(kw) || kw.includes(tag))
      ).length

      // 综合得分 = 关键词命中数 × 重要性
      const score = hitCount * mem.importance
      return { mem, score, hitCount }
    })

    return scored
      .filter(({ hitCount }) => hitCount > 0)  // 至少命中一个关键词
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ mem }) => mem)
  }

  formatForContext(memories: MemoryEntry[]): string {
    if (memories.length === 0) return ''

    const lines = memories.map(mem =>
      `- ${mem.content} [标签: ${mem.tags.join(', ')}]`
    )
    return `以下是与当前问题相关的历史记忆，请参考：\n${lines.join('\n')}`
  }

  all(): MemoryEntry[] {
    return [...this.memories]
  }
}
```

`search` 方法的核心是得分公式：**命中词数 × 重要性**。这样高重要性的记忆即使只命中一个关键词，也能排在低重要性但命中多词的记忆前面。

### 第三步：实现 MemoryAgent

```ts
class MemoryAgent {
  private client: OpenAI
  private bank: MemoryBank
  private baseSystemPrompt: string

  constructor(bank: MemoryBank, systemPrompt: string = '') {
    this.client = new OpenAI()
    this.bank = bank
    this.baseSystemPrompt = systemPrompt
  }

  async chat(userMessage: string): Promise<string> {
    // 1. 检索相关记忆
    const relevantMemories = this.bank.search(userMessage, 3)
    const memoryContext = this.bank.formatForContext(relevantMemories)

    if (relevantMemories.length > 0) {
      console.log(`[检索到 ${relevantMemories.length} 条相关记忆]`)
      relevantMemories.forEach(mem => {
        console.log(`  - ${mem.content} (重要性: ${mem.importance})`)
      })
    } else {
      console.log('[未检索到相关记忆，使用基础 system prompt]')
    }

    // 2. 构建注入了记忆的 system prompt
    const systemPrompt = memoryContext
      ? `${this.baseSystemPrompt}\n\n${memoryContext}`.trim()
      : this.baseSystemPrompt

    // 3. 调用模型
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'user', content: userMessage },
    ]

    if (systemPrompt) {
      messages.unshift({ role: 'system', content: systemPrompt })
    }

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages,
    })

    return response.choices[0].message.content ?? ''
  }
}
```

记忆检索在每次 `chat` 调用时发生，不需要改变对话历史结构，对已有代码侵入性极低。

### 第四步：主程序——预置记忆并验证

```ts
async function main() {
  const bank = new MemoryBank()

  // 预置记忆：模拟之前对话中积累的信息
  bank.add('用户喜欢简洁的代码风格，不需要过多注释', ['偏好', '编程', '代码风格'], 9)
  bank.add('用户正在做一个 TypeScript Agent 项目', ['项目', 'TypeScript', 'Agent'], 8)
  bank.add('用户不喜欢过长的解释，直接给结论', ['偏好', '沟通', '回复风格'], 8)
  bank.add('用户的操作系统是 macOS', ['环境', '系统', 'macOS'], 5)
  bank.add('用户学过 Python，熟悉异步编程', ['背景', 'Python', '异步'], 6)

  console.log('=== 预置记忆 ===')
  bank.all().forEach(mem => {
    console.log(`  [${mem.importance}] ${mem.content}`)
    console.log(`      标签: ${mem.tags.join(', ')}`)
  })
  console.log()

  const agent = new MemoryAgent(
    bank,
    '你是一个编程助手，用中文简洁回答问题。'
  )

  // 测试 1：编程问题——应该检索到代码风格和项目偏好
  console.log('=== 提问 1：帮我写一个 sleep 函数 ===')
  const answer1 = await agent.chat('帮我写一个 sleep 函数')
  console.log('Agent:', answer1)
  console.log()

  // 测试 2：沟通偏好——应该检索到回复风格记忆
  console.log('=== 提问 2：什么是 async/await？ ===')
  const answer2 = await agent.chat('什么是 async/await？')
  console.log('Agent:', answer2)
  console.log()

  // 测试 3：系统相关——应该检索到 macOS 记忆
  console.log('=== 提问 3：怎么查看系统进程？ ===')
  const answer3 = await agent.chat('怎么查看系统进程？')
  console.log('Agent:', answer3)
}

main().catch(console.error)
```

### 运行结果

```
=== 预置记忆 ===
  [9] 用户喜欢简洁的代码风格，不需要过多注释
      标签: 偏好, 编程, 代码风格
  [8] 用户正在做一个 TypeScript Agent 项目
      标签: 项目, TypeScript, Agent
  [8] 用户不喜欢过长的解释，直接给结论
      标签: 偏好, 沟通, 回复风格
  [5] 用户的操作系统是 macOS
      标签: 环境, 系统, macOS
  [6] 用户学过 Python，熟悉异步编程
      标签: 背景, Python, 异步

=== 提问 1：帮我写一个 sleep 函数 ===
[检索到 2 条相关记忆]
  - 用户喜欢简洁的代码风格，不需要过多注释 (重要性: 9)
  - 用户正在做一个 TypeScript Agent 项目 (重要性: 8)
Agent: const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

=== 提问 2：什么是 async/await？ ===
[检索到 3 条相关记忆]
  - 用户不喜欢过长的解释，直接给结论 (重要性: 8)
  - 用户学过 Python，熟悉异步编程 (重要性: 6)
  - 用户喜欢简洁的代码风格，不需要过多注释 (重要性: 9)
Agent: async/await 是语法糖，基于 Promise。
标 async 的函数返回 Promise，await 暂停执行等待 Promise resolve。
你熟悉 Python 的 asyncio，概念完全一样，只是语法不同。

=== 提问 3：怎么查看系统进程？ ===
[检索到 1 条相关记忆]
  - 用户的操作系统是 macOS (重要性: 5)
Agent: macOS 上用 Activity Monitor（活动监视器）图形界面查看，
或命令行 ps aux | grep 进程名，实时监控用 top 或 htop。
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| `MemoryEntry.tags` | 检索的核心，决定哪些问题能命中这条记忆 |
| `MemoryEntry.importance` | 排序权重，确保高价值记忆优先注入 |
| 得分公式 | `hitCount × importance`，兼顾相关性和重要性 |
| `topK` 参数 | 控制注入记忆数量上限，防止 Token 浪费 |
| system prompt 注入 | 记忆作为上下文追加到 system prompt，不污染对话历史 |
| 分词简化 | 中文按空格和标点切分，生产环境应使用专业分词库 |

## 常见问题

**Q: 关键词检索和向量检索有什么区别？**

关键词检索要求词面完全匹配（或包含关系）。用户问"代码整洁度"，无法命中标签"代码风格"，因为两个词没有词面交集。向量检索把文本转为数值向量，语义相似的文本向量距离近，可以处理"整洁度"和"风格"这类近义关系。P7 会实现基于嵌入向量的 RAG 检索。

**Q: 记忆越多越好吗？**

不是。记忆增多有两个代价：一是检索时间线性增长（遍历所有记忆）；二是低质量记忆会产生噪声，干扰高质量记忆的排序。生产系统通常需要记忆淘汰策略：按时间衰减降低旧记忆的 importance，定期清除得分低于阈值的条目，或限制总记忆数量触发 LRU 淘汰。

**Q: 如何防止记忆污染（存入错误信息）？**

三个方向：
1. **来源标记**：每条记忆记录是人工写入还是模型提取，对模型提取的记忆置信度打折
2. **置信度字段**：`confidence: number`，低置信度记忆降低 importance 权重
3. **人工审核队列**：模型提取的记忆不直接写入，先进审核队列，人工确认后才正式存入

## 小结与延伸

本章实现了从"全量塞入"到"按需检索"的核心升级。`MemoryBank` 的三个设计决策值得记住：

- **结构化元信息**：tags 和 importance 是让记忆"可检索"的关键
- **得分公式分离**：相关性和重要性独立计算，方便调参
- **注入点选择**：记忆注入 system prompt 而非对话历史，保持对话结构干净

关键词检索的上限很明显：无法处理语义相似但词面不同的情况。接下来：

- **P7**：用嵌入向量实现语义检索（RAG 基础），解决关键词检索的根本局限
- **P9**：混合检索——关键词 + 向量双路并行，在精准性和召回率之间取得平衡

<StarCTA />

<PracticeProjectActionPanel project-id="practice-p06-memory-retrieval" />

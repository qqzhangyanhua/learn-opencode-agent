---
title: P10：ReAct Loop 实现
description: 实现 Reason-Act 循环，让 Agent 在每次行动前显式输出推理过程，使思考链可见、可调试
contentType: practice
series: practice
contentId: practice-p10-react-loop
shortTitle: ReAct Loop
summary: 实现显式 Thought / Action / Observation 推理链，让 Agent 的决策过程可见、可调试、可复盘。
difficulty: intermediate
estimatedTime: 60 min
learningGoals:
  - 理解 ReAct 与普通工具调用的核心区别
  - 实现 ReActAgent 类并解析推理链
  - 跑通一个需要多步推理的实际问题
prerequisites:
  - P1：最小 Agent
  - P4：错误处理
recommendedNext:
  - /intermediate/27-planning-mechanism/
  - /04-session-management/
practiceLinks:
  - /intermediate/27-planning-mechanism/
  - /04-session-management/
searchTags:
  - ReAct
  - Reasoning
  - Agent Loop
  - TypeScript
  - OpenAI SDK
navigationLabel: P10 ReAct Loop
entryMode: build-first
roleDescription: 把最小 Agent 升级成显式推理链，让你能看见每一步为什么行动，并为后续 Planning 主题搭桥。
---

<PracticeProjectGuide project-id="practice-p10-react-loop" />

## 背景与目标

P1 实现的最小 Agent 循环能用，但有一个调试噩梦：**你不知道模型为什么调用某个工具**。

模型直接跳到 `tool_calls`，没有中间过程。出问题时只能盲猜：是 prompt 不清楚？工具选错了？参数理解有偏差？

2022 年，Google 发表了 ReAct 论文（*ReAct: Synergizing Reasoning and Acting in Language Models*），提出了一个简洁的解法：**在每次行动前，强制模型先写出推理过程**。

```
Thought: [我在想什么，为什么要做下一步]
Action: [工具名]
Action Input: [参数]
Observation: [工具返回的结果]
Thought: [看到结果后我又想到什么]
...
Final Answer: [最终回复]
```

这个格式的价值不只是可读性，它从根本上改变了调试体验——你现在能看到完整的推理链，知道 Agent 在哪一步走偏了。

**本章目标**：

1. 理解 ReAct 与普通工具调用的核心区别
2. 实现 `ReActAgent` 类，解析和打印推理链
3. 跑通一个需要多步推理的实际问题

## 核心概念

### ReAct 与 CoT 的区别

**Chain-of-Thought（CoT）**：让模型先推理再回答，但只是文字推理，不能调用工具。

```
Q: 北京今天适合跑步吗？
A: 让我思考一下... 北京位于华北，春季多晴...
   (模型靠训练数据猜，不知道今天实际天气)
   适合跑步。
```

**ReAct**：推理和行动交替进行，推理驱动工具调用，工具结果驱动下一步推理。

```
Thought: 需要查询北京实时天气才能判断
Action: get_weather
Action Input: {"city": "北京"}
Observation: 晴，22°C，东南风 3 级
Thought: 22°C 晴天，风力不大，适合户外运动
Final Answer: 今天北京适合跑步...
```

CoT 在推理闭环内转，ReAct 把推理和真实世界的数据打通了。

### 为什么推理链能减少幻觉

当模型被要求先写 `Thought:` 再行动，它必须在文本层面"承诺"自己的推理路径。这有两个效果：

1. **自我约束**：模型在 Thought 里声明了意图，后续 Action 会倾向于与之一致
2. **可检验**：如果 Thought 里的前提有误，观察者（或自动化检查）可以发现并中断

相比之下，没有 Thought 的直接工具调用相当于一个黑盒决策。

### ReAct 的实现策略

有两种实现路径，各有取舍：

**策略 A：System Prompt 格式约束**

用 system prompt 告诉模型"你必须按 Thought/Action/Action Input/Observation/Final Answer 格式输出"，然后用正则解析模型输出的文本。

- 优点：简单，无需特殊 API 支持
- 缺点：模型不一定严格遵守格式，需要容错处理

**策略 B：原生工具调用 + 思考前缀**

用 `tools` 参数做工具调用，在工具调用前让模型先输出一段 `thinking` 文本（部分模型 API 支持 extended thinking）。

- 优点：工具调用更可靠，参数解析由 SDK 处理
- 缺点：依赖特定模型能力，推理和行动之间的耦合不如文本格式直观

本章使用**策略 A**，这是最接近 ReAct 论文原始设计的实现，也是理解 ReAct 机制的最好起点。

### 解析推理链

策略 A 的核心挑战是解析模型输出。模型会产生类似这样的文本：

```
Thought: 用户问的是哪个城市更适合户外，我需要查两个城市的天气。
Action: get_weather
Action Input: {"city": "北京"}
```

需要提取：
- `Thought` 内容（打印展示）
- `Action` 名称（找到对应函数）
- `Action Input` 的 JSON（调用函数）
- 或者 `Final Answer`（结束循环）

## 动手实现

### 第一步：System Prompt 定义格式

```ts
// p10-react-loop.ts
import OpenAI from 'openai'

const client = new OpenAI()

const REACT_SYSTEM_PROMPT = `你是一个使用 ReAct（Reasoning and Acting）框架的 AI 助手。

在每次回答时，你必须严格遵守以下格式：

当需要使用工具时：
Thought: [你的推理过程，解释为什么需要这个工具]
Action: [工具名称]
Action Input: [JSON 格式的参数，必须是合法 JSON]

当你看到工具结果（以 Observation: 开头）后，继续：
Thought: [基于观察结果的再推理]
Action: [下一个工具] 或
Final Answer: [当你有足够信息时，给出最终回答]

规则：
1. 每次只能执行一个 Action
2. Action Input 必须是合法的 JSON 对象
3. 有足够信息后必须输出 Final Answer 结束
4. 不要在 Thought 外增加额外解释文字`
```

### 第二步：工具实现

```ts
// 工具函数类型
type ToolFunction = (input: Record<string, string>) => string

// 天气查询（模拟）
function get_weather(input: Record<string, string>): string {
  const data: Record<string, string> = {
    北京: '晴，22°C，东南风 3 级，空气质量良',
    上海: '小雨，18°C，东风 4 级，空气质量优',
    广州: '多云，28°C，南风 2 级，空气质量良',
    深圳: '阵雨，27°C，东南风 3 级，空气质量优',
    成都: '阴，16°C，静风，空气质量中',
  }
  const city = input['city'] ?? ''
  return data[city] ?? `暂无 ${city} 的天气数据`
}

// 网页搜索（模拟）
function search_web(input: Record<string, string>): string {
  const query = input['query'] ?? ''
  const results: Record<string, string> = {
    '户外运动 最佳温度': '户外运动最佳温度：跑步 15-22°C，骑行 10-25°C，登山 8-20°C',
    '小雨 跑步': '小雨天气跑步：轻微小雨（降水量<2mm/h）可以跑步，建议穿防水外套',
    '空气质量 运动': '空气质量建议：优良可正常运动，中等减少强度，差避免户外运动',
  }
  // 简单关键词匹配
  for (const [key, value] of Object.entries(results)) {
    if (key.split(' ').some(k => query.includes(k))) {
      return value
    }
  }
  return `搜索"${query}"：未找到相关结果`
}

// 简单计算
function calculate(input: Record<string, string>): string {
  const expression = input['expression'] ?? ''
  try {
    // 只允许数字和基本运算符，防止注入
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return '只支持基本数学运算（+ - * /）'
    }
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expression})`)() as number
    return `计算结果：${expression} = ${result}`
  } catch {
    return `计算失败：${expression} 不是合法的数学表达式`
  }
}

// 工具注册表
const toolRegistry: Record<string, ToolFunction> = {
  get_weather,
  search_web,
  calculate,
}

// 工具说明（给模型参考）
const TOOLS_DESCRIPTION = `
可用工具：

1. get_weather
   描述：查询指定城市的当前天气
   参数：{"city": "城市名称"}

2. search_web
   描述：搜索网页获取信息
   参数：{"query": "搜索关键词"}

3. calculate
   描述：执行数学计算
   参数：{"expression": "数学表达式，如 '(22 + 18) / 2'"}
`
```

### 第三步：解析模型输出

```ts
// 解析结果类型
type ReActOutput =
  | { type: 'action'; thought: string; action: string; actionInput: Record<string, string> }
  | { type: 'final'; thought: string; answer: string }
  | { type: 'unknown'; raw: string }

function parseReActOutput(text: string): ReActOutput {
  const thoughtMatch = text.match(/Thought:\s*([\s\S]*?)(?=\nAction:|\nFinal Answer:|$)/)
  const actionMatch = text.match(/Action:\s*(.+)/)
  const actionInputMatch = text.match(/Action Input:\s*(\{[\s\S]*?\})/)
  const finalAnswerMatch = text.match(/Final Answer:\s*([\s\S]+)/)

  const thought = thoughtMatch?.[1]?.trim() ?? ''

  // 情况1：找到 Final Answer
  if (finalAnswerMatch) {
    return {
      type: 'final',
      thought,
      answer: finalAnswerMatch[1].trim(),
    }
  }

  // 情况2：找到 Action
  if (actionMatch && actionInputMatch) {
    const actionName = actionMatch[1].trim()
    let actionInput: Record<string, string> = {}

    try {
      const parsed: unknown = JSON.parse(actionInputMatch[1])
      if (typeof parsed === 'object' && parsed !== null) {
        actionInput = parsed as Record<string, string>
      }
    } catch {
      // JSON 解析失败，保留空对象
      console.warn(`[ReAct] Action Input 解析失败: ${actionInputMatch[1]}`)
    }

    return {
      type: 'action',
      thought,
      action: actionName,
      actionInput,
    }
  }

  // 情况3：格式不符合预期
  return { type: 'unknown', raw: text }
}
```

### 第四步：ReAct 主循环

```ts
class ReActAgent {
  constructor(private readonly maxSteps = 10) {}

  async run(userInput: string): Promise<void> {
    console.log(`用户: ${userInput}\n`)

    // 构建初始对话：system prompt 包含工具说明和格式要求
    const systemPrompt = `${REACT_SYSTEM_PROMPT}\n\n${TOOLS_DESCRIPTION}`

    // ReAct 使用纯文本对话，不使用 tools 参数
    // 工具调用通过文本格式约定，手动解析执行
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ]

    for (let step = 0; step < this.maxSteps; step++) {
      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages,
      })

      const responseText = response.choices[0].message.content ?? ''

      const parsed = parseReActOutput(responseText)

      if (parsed.type === 'final') {
        // 打印最后的 Thought（如果有）
        if (parsed.thought) {
          console.log(`Thought: ${parsed.thought}`)
        }
        console.log(`\nFinal Answer: ${parsed.answer}`)
        return
      }

      if (parsed.type === 'action') {
        // 打印推理过程
        console.log(`Thought: ${parsed.thought}`)
        console.log(`Action: ${parsed.action}`)
        console.log(`Action Input: ${JSON.stringify(parsed.actionInput)}`)

        // 执行工具
        const toolFn = toolRegistry[parsed.action]
        const observation = toolFn
          ? toolFn(parsed.actionInput)
          : `错误：未知工具 "${parsed.action}"，可用工具：${Object.keys(toolRegistry).join(', ')}`

        console.log(`Observation: ${observation}\n`)

        // 把这一步的推理和观察加入对话历史
        messages.push({ role: 'assistant', content: responseText })
        messages.push({
          role: 'user',
          content: `Observation: ${observation}`,
        })

        continue
      }

      // 格式解析失败：尝试直接作为最终回答处理
      console.warn(`[ReAct] 格式解析失败，原始输出：\n${parsed.raw}`)
      console.log(`\nFinal Answer: ${parsed.raw}`)
      return
    }

    console.log(`\n[ReAct] 已达到最大步数限制 (${this.maxSteps})，停止执行。`)
  }
}

// 运行示例
async function main(): Promise<void> {
  const agent = new ReActAgent()
  await agent.run('北京和上海哪个城市今天更适合户外跑步？')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

### 运行结果

```
用户: 北京和上海哪个城市今天更适合户外跑步？

Thought: 用户想比较北京和上海哪个城市今天更适合户外跑步。我需要先查询两个城市的天气情况，然后结合跑步的适宜条件来判断。先查北京的天气。
Action: get_weather
Action Input: {"city": "北京"}
Observation: 晴，22°C，东南风 3 级，空气质量良

Thought: 北京今天晴天，22°C，风力适中，空气质量良好。接下来查上海的天气。
Action: get_weather
Action Input: {"city": "上海"}
Observation: 小雨，18°C，东风 4 级，空气质量优

Thought: 我已经获得两个城市的天气数据。北京：晴 22°C 空气质量良，上海：小雨 18°C 空气质量优。让我查一下雨天是否适合跑步，以及跑步的最佳温度范围。
Action: search_web
Action Input: {"query": "户外运动 最佳温度"}
Observation: 户外运动最佳温度：跑步 15-22°C，骑行 10-25°C，登山 8-20°C

Thought: 跑步最佳温度是 15-22°C。北京 22°C 正好在范围上限，晴天；上海 18°C 也在范围内，但在下小雨。小雨会影响跑步体验，还需要考虑安全。综合来看北京条件更好。
Final Answer: 今天北京更适合户外跑步。

北京：晴天 22°C，东南风 3 级，空气质量良好，正好处于跑步最佳温度范围（15-22°C）的上限，是非常理想的跑步天气。

上海：小雨 18°C，温度虽然也合适，但雨天路面湿滑、视线较差，跑步体验和安全性不如晴天，不推荐户外跑步。

建议选择北京，注意做好防晒（晴天紫外线较强），并在跑步结束后及时补充水分。
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| ReAct 格式 | `Thought` / `Action` / `Action Input` / `Observation` / `Final Answer` 五个标签 |
| System Prompt 约束 | 通过 system prompt 定义格式规则，是策略 A 的核心 |
| `parseReActOutput` | 用正则提取标签内容，需要处理 JSON 解析失败等边界情况 |
| 对话历史扩展 | 每步把模型输出和 `Observation` 追加到 `messages`，形成推理链上下文 |
| `maxSteps` 保护 | 防止死循环，生产环境必须设置 |
| `Final Answer` 信号 | 模型写出 `Final Answer:` 时结束循环，类似 P1 中的 `finish_reason: 'stop'` |
| 工具未知处理 | 工具名解析失败时返回错误信息作为 Observation，让模型自行纠错 |

## 常见问题

**Q: ReAct 和 P1 普通工具调用有什么实际区别？**

P1 的工具调用通过 API 的 `tools` 参数实现，由 SDK 负责解析工具调用请求，更可靠。ReAct 策略 A 把工具调用"藏"在文本格式里，要自己解析。

核心差异在于**推理可见性**：P1 中模型的决策是黑盒（直接跳到 `tool_calls`），ReAct 中 `Thought:` 把决策过程暴露出来。两者不互斥，实际项目里可以结合——用原生工具调用保证可靠性，同时要求模型在工具调用前输出 reasoning 文本。

**Q: 模型不按格式输出怎么办？**

这是策略 A 最大的痛点。几个缓解方法：

1. **重试机制**：解析失败时把原始输出加回对话，追加一条 user 消息提示"请严格按格式输出"
2. **容错解析**：`parseReActOutput` 里做宽松匹配，比如 `Action Input` 里的 JSON 格式错误时尝试修复
3. **换更强的模型**：格式遵从度和模型能力强相关，Claude 3 Opus 比小模型稳定得多
4. **切换策略 B**：如果格式稳定性是核心需求，改用原生工具调用 + extended thinking

**Q: Thought 越长越好吗？**

不是。过长的 Thought 有两个副作用：

1. **Token 消耗**：每步的 Thought 都会进入对话历史，多轮推理后 context 急剧增长
2. **推理漂移**：模型在过长的推理中容易"说服自己"走向错误方向

实践建议：通过 system prompt 限制 Thought 的长度和形式，比如"Thought 不超过两句话，只描述当前的核心判断"。这和人类思考类似——好的推理是精准的，不是冗长的。

## 小结与延伸

你现在有了一个完整的 ReAct Agent：

- `REACT_SYSTEM_PROMPT` 定义了推理格式协议
- `parseReActOutput` 把文本推理链解析为结构化数据
- `ReActAgent.run` 实现了"推理 - 行动 - 观察"的完整循环

这个模式在复杂任务（需要多步规划、多工具协作）上比黑盒工具调用更容易调试和优化。

接下来可以探索的方向：

- **P11 Planning**：在 ReAct 的基础上，加入任务分解和计划阶段，让 Agent 先制定完整计划再逐步执行
- **P12 Reflection**：在每轮结束后增加自我反思步骤，检查推理链是否有错误并修正
- **P20 Observability**：把 ReAct 的推理链接入结构化日志和 tracing 系统，用于生产环境监控

<StarCTA />

<PracticeProjectSourceFiles project-id="practice-p10-react-loop" />
<PracticeProjectActionPanel project-id="practice-p10-react-loop" />

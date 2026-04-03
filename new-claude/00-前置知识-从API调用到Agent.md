# 00 前置知识：从 API 调用到 Agent

这一章写给有一类特定背景的读者：

你写过这样的代码——

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "解释一下快速排序"}]
)
print(response.choices[0].message.content)
```

你知道 `messages` 是个列表，知道 `role` 有 `user` 和 `assistant`，知道模型会返回文字。

但你没做过工具调用（tool use），也没写过 Agent 主循环。

这章的目标是：**用你已有的认知，搭一座桥，通向本书所有章节。**

---

## 1. 你的代码哪里不够用

假设你想让模型帮你修复一个 bug：

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "帮我把 main.py 里的 bug 修掉"}]
)
print(response.choices[0].message.content)
# 输出："你可以把第 23 行的 = 改成 =="
```

模型说了怎么改，但文件还是你自己去改的。

**模型只能"说"，不能"做"。** 它不能读你的文件，不能执行命令，不能写入磁盘。

那如果我们想让模型真的去读文件、真的执行命令、真的完成任务——API 调用这一行代码哪里不够用？

答案是：**我们需要给模型"手"，也就是工具调用（Tool Use）。**

---

## 2. 工具调用是什么

### 2.1 定义工具：告诉模型"你有哪些手"

在调用模型时，多传一个 `tools` 参数，描述模型可以使用的工具：

```python
tools = [{
    "type": "function",
    "function": {
        "name": "read_file",
        "description": "读取本地文件内容，返回文件的文字内容",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "文件路径"}
            },
            "required": ["path"]
        }
    }
}]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "帮我看看 main.py 有什么问题"}],
    tools=tools
)
```

### 2.2 模型不执行工具，只是"申请"

模型看到工具列表后，如果它认为需要调用工具，返回的不是文字，而是一个调用申请：

```python
# response.choices[0].finish_reason == "tool_calls"

tool_call = response.choices[0].message.tool_calls[0]
print(tool_call.function.name)        # "read_file"
print(tool_call.function.arguments)   # '{"path": "main.py"}'
```

**这里有一个关键认知，很多人第一次做工具调用时都会误解：**

> 模型没有权限直接读你的文件。它只是说"我想调用 `read_file`，参数是 `main.py`"。
> 执行权在你手里——你可以执行、可以拒绝、可以修改参数、可以记录日志。

这不是 API 设计的偶然选择。这是 Agent 安全治理的基础：**工具的执行权永远在开发者手里，不在模型手里。**

### 2.3 执行工具，把结果还给模型

你自己执行工具，再把结果追加进消息列表，继续对话：

```python
# 你来执行
file_content = open("main.py").read()

# 把 assistant 的申请和你的执行结果都追加进消息
messages.append(response.choices[0].message)   # assistant 发出的申请
messages.append({
    "role": "tool",
    "tool_call_id": tool_call.id,
    "content": file_content                    # 你的执行结果
})

# 再调一次模型，它现在能看到文件内容了
response2 = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools
)
print(response2.choices[0].message.content)
# "第 23 行有个赋值错误，应该是 == 而不是 ="
```

消息格式对照：

| 消息 | role | 谁生成 | 含义 |
|---|---|---|---|
| 工具申请 | `assistant` + `tool_calls` | 模型 | "我想调这个工具" |
| 执行结果 | `tool` + `tool_call_id` | 你 | "工具跑完了，结果在这里" |

**一次工具往返就是这样：模型申请 → 你执行 → 把结果还给模型。**

---

## 3. 为什么需要循环

一次往返之后，模型拿到了文件内容，给出了分析。但真实任务往往不会在一轮结束：

- 模型看完文件，觉得还需要看另一个依赖文件
- 模型想先读文件、再运行测试、再修改代码，需要连续调 3 个工具
- 工具执行报错，模型想换个参数重试

**你的代码需要变成一个循环：**

```python
messages = [{"role": "user", "content": "帮我修掉 main.py 的 bug"}]

while True:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools
    )

    if response.choices[0].finish_reason == "tool_calls":
        # 模型还想调工具：执行，把结果追加进消息，继续循环
        messages.append(response.choices[0].message)
        for tool_call in response.choices[0].message.tool_calls:
            result = execute_tool(tool_call)      # 你来执行
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result
            })
        # 回到循环顶部，继续调模型

    else:
        # 模型认为任务完成，输出最终回答
        print(response.choices[0].message.content)
        break
```

**这个 while 循环，就是所有 Agent 框架的心脏。**

无论是 LangChain、AutoGPT、CrewAI，还是本书分析的 Claude Code，它们的核心都是这 15 行的某种扩展版本。

### 和 Claude Code 的连接

Claude Code 的 `query.ts` 里有一个叫 `queryLoop()` 的函数，本书**第 04 章**会完整拆解它。

你现在看到的这个 while 循环，和 `queryLoop()` 是同一件事——只是 Claude Code 的版本要处理更多真实工程问题。这些问题在**第 01 章**的学习地图里会逐一列出，每一个都对应本书的一个章节。

---

## 4. 本章词汇表

读正文时遇到这些词，可以回来查：

| 词汇 | 一句话含义 |
|---|---|
| **tool_use / tool_calls** | 模型发出的工具调用申请（Anthropic 叫 `tool_use`，OpenAI 叫 `tool_calls`，概念相同） |
| **tool_result / tool** | 你把工具执行结果还给模型的消息（Anthropic 叫 `tool_result`，OpenAI 用 `role: "tool"`） |
| **ToolUseContext** | Claude Code 里贯穿整个循环的"运行时容器"，装着权限、工具列表、消息历史等所有状态 |
| **MCP** | 让 Agent 能调用外部服务（数据库、浏览器、第三方 API）的标准协议，不用自己手写每个工具实现 |
| **Skill** | 一段 Markdown 文件，描述"做某件事的正确方法"，Agent 加载后就知道该怎么做 |
| **Plugin** | 可安装的能力包，有自己的生命周期（安装、启用、卸载），类似 VS Code 插件 |
| **compact** | 上下文压缩：把过长的消息历史摘要化，腾出空间让循环继续工作 |
| **stop hooks** | 每轮循环结束前触发的检查点，决定"这轮真的完成了吗" |
| **token budget** | 系统侧对 token 用量的追踪与调度，用来决定"该继续还是该停" |

---

## 5. 三个常见误区

**误区 1："Agent 就是带记忆的聊天机器人"**

记忆是手段，不是本质。Agent 的核心是**能执行动作**：读文件、跑命令、调 API、提交代码。没有工具调用，再长的记忆也只是聊天。

**误区 2："工具调用就是函数调用，模型直接执行"**

模型只能"申请"，执行权在你手里。你可以拒绝（权限拦截）、修改参数、记录日志、弹窗让用户确认。这个"执行权在我手里"是 Agent 安全治理的基础——Claude Code 的权限系统（第 10 章）就建立在这个基础上。

**误区 3："模型说任务完成了就真完成了"**

`finish_reason == "stop"` 只是模型的自我评估，不一定可靠。Claude Code 有独立的 token budget 系统（第 04 章 4.10 节），会从系统侧判断"任务真的做完了吗"，必要时强制让模型继续或停止。不完全依赖模型的自我判断，是生产级 Agent 和玩具 Agent 的重要区别。

---

## 6. 读完这章，用这 5 个问题自测

能回答这些问题，说明前置知识已经到位，可以进入正文：

1. `tool_calls` 是谁生成的？`role: "tool"` 的消息是谁生成的？
2. 模型返回 tool call 之后，工具由谁来执行？
3. while 循环的退出条件是什么？谁来决定"任务完成了"？
4. 如果你自己的循环跑了 50 轮还没停，你会怎么处理？（不用给出正确答案，想一想就够了）
5. MCP 和 Skill 都是"扩展能力"，它们解决的是同一类问题吗？

带着对第 4、5 题的困惑去读正文——那正是本书要回答的问题。

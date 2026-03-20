---
title: 第28章：Prompt 不够用了，上下文工程实战
description: 从“选、排、压、拼”四个动作切入，理解为什么决定智能体上限的不是一句 Prompt，而是整个上下文供应系统。
---

> **对应路径**：`packages/opencode/src/session/processor.ts`、`packages/opencode/src/session/prompt.ts`、`packages/opencode/src/session/compaction.ts`、`packages/opencode/src/tool/truncation.ts`、`docs/intermediate/examples/28-context-engineering/`
> **前置阅读**：[第5章：会话管理](/04-session-management/)、[P6：记忆增强检索](/practice/p06-memory-retrieval/)、[第16章：高级主题与最佳实践](/15-advanced-topics/)
> **学习目标**：理解上下文工程为什么比 Prompt 工程更接近真实 Agent 系统；掌握“选、排、压、拼”四步，以及预算分配、历史压缩、动态 prompt 组装的基本工程思路。

---

## 这篇解决什么问题

很多人一开始做 Agent，会把问题都归结成“Prompt 还不够好”。但系统一旦进入真实业务，你很快会发现答案质量受影响的远不止一句 Prompt：

- 历史对话太长，关键事实被淹没
- 检索结果太多，真正相关的片段没排到高注意力位置
- 工具输出很长，把上下文窗口吃满
- 用户当前问题其实只需要一部分历史，系统却把全部旧消息都塞进去了

这说明问题已经不是“怎么写一句更好的指令”，而是：

**怎么把所有该给模型的信息，按预算、有顺序、可压缩地组装出来。**

这就是上下文工程。

## 为什么真实系统里重要

上下文工程之所以重要，是因为真实 Agent 的输入从来不是一段 Prompt，而是一个上下文包：

```text
system prompt
  + 用户当前问题
  + 历史对话
  + 检索结果
  + 工具输出
  + few-shot 示例
  + 运行时规则
```

这些信息有三个共同特点：

- 都想进入上下文窗口
- 彼此之间会竞争注意力
- 一旦组织不好，模型就会答偏、漏答或者成本暴涨

所以真实系统里，决定上限的往往不是模型有多强，而是你有没有把信息供给组织好。

## 核心概念与主链路

这章可以直接记成四个动作：

```text
选：哪些信息值得进窗口
排：进来以后按什么顺序摆放
压：放不下时保留什么、牺牲什么
拼：最后如何组装成 messages
```

### 28.1 选：先过滤，再谈组装

示例里的 `filter_by_relevance()` 和 `select_relevant_history()` 都在处理同一个问题：**不是所有拿到的信息都值得保留。**

`filter_by_relevance()` 的思路很直白：对候选文档逐段打分，低于阈值就丢掉。

```python
def filter_by_relevance(
    query: str, documents: list[dict], threshold: float = 0.6
) -> list[dict]:
    filtered = []
    for doc in documents:
        response = client.chat.completions.create(...)
        ...
        if score >= threshold:
            doc["relevance_score"] = score
            filtered.append(doc)
    return sorted(filtered, key=lambda x: x["relevance_score"], reverse=True)
```

这一步的工程意义在于：

- 先把“可能相关”缩成“高度相关”
- 让后续预算分配面对的是更干净的候选集合
- 降低无关信息和噪声占用窗口的概率

而 `select_relevant_history()` 补上的，是历史消息的另一条原则：

- 最近的消息优先保留，保证连贯性
- 更早的消息按相关性和主题复用价值筛选

### 28.2 排：顺序会影响模型注意力

上下文不是一个无序集合。信息放在哪里，会直接影响模型先注意到什么。

示例里的 `arrange_context()` 给出的顺序是：

```python
def arrange_context(
    system_prompt: str,
    retrieved_docs: list[dict],
    history: list[dict],
    user_query: str,
    tool_results: list[str] | None = None
) -> list[dict]:
    messages: list[dict] = []
    messages.append({"role": "system", "content": system_prompt})
    messages.extend(history)
    ...
    context_parts.append(f"基于以上信息，请回答：{user_query}")
```

也就是：

```text
system prompt
  -> 历史
  -> 参考资料
  -> 工具结果
  -> 用户当前问题
```

这对应一个很实用的经验：把指令放前面，把当前要回答的问题放在最后，让模型在“知道自己是谁、看过什么材料之后”再聚焦到当前任务。

### 28.3 压：压缩不是删掉，而是保留能继续决策的核心

上下文工程里最容易做错的事，是把压缩理解成简单截断。真正有用的压缩，是保留足够支撑后续决策的事实。

示例里的 `progressive_compress()` 很适合拿来理解这个层次：

```python
def progressive_compress(
    history: list[dict],
    max_tokens: int = 4000
) -> list[dict]:
    ...
    recent = turns[-3:]
    middle = turns[-8:-3] if len(turns) > 3 else []
    old = turns[:-8] if len(turns) > 8 else []
```

它把历史分成三层：

- 近处：保留原文
- 中段：压成摘要
- 更远：抽成关键事实

这比“只留最近 N 轮”强得多，因为它承认了一个事实：旧历史里可能还有长期有效信息，但不值得继续保留全部原文。

### 28.4 拼：上下文要按预算分配，不是想到什么塞什么

在真实系统里，你永远面临预算问题。示例里的 `ContextBudget` 很好地把这个问题显式化了：

```python
class ContextBudget:
    def __init__(self, max_tokens: int = 8000, reserved_for_output: int = 2000):
        self.max_tokens = max_tokens
        self.reserved_for_output = reserved_for_output
        self.available = max_tokens - reserved_for_output

    def allocate(self) -> dict[str, int]:
        alloc["system_prompt"] = min(1000, budget)
        alloc["current_query"] = min(500, budget)
        alloc["retrieved_docs"] = int(budget * 0.5)
        alloc["tool_results"] = int(budget * 0.4)
        alloc["history"] = budget
```

这里最重要的不是具体比例，而是“先预留输出，再给输入分配预算”这件事。

很多系统溢出，不是因为输入绝对太大，而是因为它们只会看“已经用了多少”，不会提前给下一轮生成预留空间。

### 28.5 最终要把四步串成一个引擎

示例最后把这些能力收成了 `ContextEngine` 和 `ContextAwareAgent`。这正是上下文工程和 Prompt 工程最本质的区别：

- Prompt 工程关心单次文本编写
- 上下文工程关心系统如何持续、动态、预算化地构造输入

也正因为如此，这一章其实和会话管理、输出裁剪、记忆检索是天然连着的，不是孤立技巧。

## OpenCode 源码映射

这章和 OpenCode 的联系是最直接的，因为 OpenCode 整个会话系统本来就在做上下文工程。

- `session/processor.ts`：决定主循环每一轮向模型提交哪些消息。
- `session/prompt.ts`：负责把用户消息、上下文和运行时规则装配进一次会话请求，更贴近“拼”这一步的主链入口。
- `session/compaction.ts`：做上下文预算控制，给未来输出预留空间。
- `tool/truncation.ts`：对超长工具输出做裁剪，避免单次输出挤爆窗口。

如果把这一章读懂，再回头看 OpenCode，你会发现它的很多设计都可以重新命名成一句话：

**OpenCode 不是在“管理聊天记录”，它是在持续做上下文工程。**

<SourceSnapshotCard
  title="第28章源码映射"
  description="上下文工程在 OpenCode 里不是额外模块，而是会话主循环、消息组装、压缩预算和工具输出裁剪共同组成的基础设施。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-17"
  :entries="[
    {
      label: '执行循环核心',
      path: 'packages/opencode/src/session/processor.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/processor.ts'
    },
    {
      label: '消息组装入口',
      path: 'packages/opencode/src/session/prompt.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/prompt.ts'
    },
    {
      label: '上下文预算控制',
      path: 'packages/opencode/src/session/compaction.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/compaction.ts'
    },
    {
      label: '工具输出裁剪',
      path: 'packages/opencode/src/tool/truncation.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/tool/truncation.ts'
    }
  ]"
/>

## 教学代码示例映射

**下面这些都是教学示例，不是 OpenCode 原仓实现。** 本章对应示例目录是 `docs/intermediate/examples/28-context-engineering/`，核心文件为 `context_engine.py`。

由于这份脚本很长，这里只抓三段最关键的骨架。

### 关键片段 1：预算管理器先定义“窗口怎么分”

```python
class ContextBudget:
    def __init__(self, max_tokens: int = 8000, reserved_for_output: int = 2000):
        self.max_tokens = max_tokens
        self.reserved_for_output = reserved_for_output
        self.available = max_tokens - reserved_for_output
        self.allocations: dict[str, int] = {}
```

### 关键片段 2：上下文引擎把选、排、压、拼收成一条链

```python
class ContextEngine:
    def build_context(
        self,
        system_prompt: str,
        user_query: str,
        history: list[dict] | None = None,
        retrieved_docs: list[dict] | None = None,
        tool_results: list[str] | None = None
    ) -> list[dict]:
        ...
```

### 关键片段 3：最终 Agent 不再手写 prompt，而是调用上下文引擎

```python
class ContextAwareAgent:
    def chat(self, user_input: str) -> str:
        system_prompt = get_dynamic_system_prompt(user_input)
        docs = self._retrieve(user_input)
        messages = self.engine.build_context(
            system_prompt=system_prompt,
            user_query=user_input,
            history=self.history,
            retrieved_docs=docs,
        )
        response = client.chat.completions.create(...)
```

这三段连起来看，就是一条完整主链：

```text
先分配预算
  -> 再构造上下文
  -> 最后让 Agent 基于构造好的 messages 调模型
```

完整实现和运行说明请直接查看示例目录中的 `README.md` 与 `context_engine.py`。

## 常见误区

### 误区1：上下文工程就是 Prompt 工程换了个名字

**错误理解**：只要把 Prompt 写得更精细，就等于做了上下文工程。

**实际情况**：Prompt 只是上下文的一部分。历史、检索、工具输出、预算分配、压缩策略，全都属于上下文工程范畴。它比 Prompt 工程的范围大得多。

### 误区2：上下文越完整越好

**错误理解**：为了避免漏信息，最好把拿到的内容全都喂给模型。

**实际情况**：完整不等于有效。过长上下文会带来注意力稀释、成本上涨和关键信息埋没。好的上下文工程首先要学会丢弃不重要的信息。

### 误区3：压缩就是截断

**错误理解**：超过窗口上限时，从尾部直接截掉最简单。

**实际情况**：机械截断会丢掉真正关键的事实。有效压缩应该保留结构、结论和关键数字，而不是随机损失信息。

### 误区4：只有超长对话才需要上下文工程

**错误理解**：窗口没满之前，不需要做预算控制和组装优化。

**实际情况**：上下文工程不是窗口爆了才补救，而是从一开始就决定哪些信息应该进入模型视野。越早做，系统越稳。

## 延伸阅读与回链

- 如果你想先把会话循环、摘要压缩和历史消息组织读透，回到 [第5章：会话管理](/04-session-management/)。
- 如果你关心“记忆为什么不该全部回灌”，可以重看 [P6：记忆增强检索](/practice/p06-memory-retrieval/)。
- 如果你想把这章和 OpenCode 的成本控制、多 Agent 协作、输出裁剪放到一起理解，建议连读 [第16章：高级主题与最佳实践](/15-advanced-topics/)。

---
title: 第27章：为什么智能体要先列清单再干活
description: 从 ReAct 的局限出发，理解 Planning 为什么能提升复杂任务的完成率，并掌握 Plan-and-Execute 与动态重规划的工程权衡。
---

> **对应路径**：`packages/opencode/src/agent/agent.ts`、`packages/opencode/src/session/processor.ts`、`packages/opencode/src/tool/task.ts`、`docs/intermediate/examples/27-planning-mechanism/`
> **前置阅读**：[P10：ReAct Loop](/practice/p10-react-loop/)、[P11：Planning 机制](/practice/p11-planning/)
> **学习目标**：理解为什么复杂任务不能只靠“边想边做”，学会区分 ReAct、Plan-and-Execute、自适应规划三种执行方式，并知道它们各自的成本和边界。

---

## 这篇解决什么问题

ReAct 很适合短任务，但一旦任务跨越多个子目标，它就会暴露一个根本问题：**没有全局视角**。

典型症状包括：

- 重复搜索已经搜过的信息
- 做到一半忘了还有哪些子目标没完成
- 先开始生成结论，后面才发现证据还没补齐
- 碰到意外信息时，不知道该局部修补还是整体改计划

所以这一章真正要回答的是：

- 什么时候“走一步看一步”已经不够了
- 什么时候值得先花一轮模型调用做计划
- 如果计划在执行中失效，系统该怎么纠偏

## 为什么真实系统里重要

Planning 看起来像在执行前多做一步，其实它解决的是复杂任务里的三个高频故障：

- **遗漏**：计划把未完成事项显式化，不再靠模型临场记忆。
- **重复**：已有步骤和已完成结果变成结构化状态，便于避免重复劳动。
- **可审查**：计划本身可以被观察、修改和重规划，而不是埋在模型隐式思考里。

也正因为这样，Planning 在下面这些任务里特别有价值：

- 结构化调研报告
- 多步信息搜集与汇总
- 需要中间产物串联的复杂执行链
- 执行中可能因为外部信息变化而改路线的任务

## 核心概念与主链路

先把三种模式放在一条连续谱里看：

```text
ReAct
  -> 每一步现场决定下一步

Plan-and-Execute
  -> 先生成完整步骤，再逐步执行

Adaptive Planning
  -> 先有计划，但允许中途重算剩余步骤
```

### 27.1 ReAct 的问题不是不聪明，而是不保留全局结构

ReAct 的本质是局部最优：当前看到什么，就处理什么。这个模式在“查天气”“算价格”“找一个文件”这种任务上很高效，但对多步骤任务很容易失控。

一旦任务需要同时满足多个子目标，例如“调研三个框架并给出对比建议”，模型就必须在执行过程中不断记住：

- 哪几个框架已经处理过
- 哪几个维度还没覆盖
- 当前拿到的信息是否足够支持最终结论

这正是 Planning 要解决的部分。

### 27.2 Plan-and-Execute 的核心是把任务转成显式状态

示例里的 `PLAN_PROMPT` 非常直接：先让模型把任务拆成 JSON 步骤数组。

```python
PLAN_PROMPT = """你是任务规划专家。把以下任务拆解成 3-8 个具体步骤。
每步标注工具：get_weather/calculate/search_news/get_exchange_rate/search_web/none
任务：{task}
输出 JSON 数组：[{{"step": 1, "action": "描述", "tool": "工具名"}}]
只输出 JSON，不要其他文字。"""
```

一旦计划被结构化，后面的执行就不再是“想到什么做什么”，而变成：

```text
任务
  -> 生成计划
  -> 遍历计划
  -> 为每一步选择工具
  -> 保存步骤结果
  -> 最后统一汇总
```

这就是 Planning 最重要的工程价值：把隐式推理转成可检查的显式状态。

### 27.3 执行阶段要解决的是“步骤如何落地”

仅有计划还不够，执行阶段还要把“步骤描述”真正翻译成工具调用。示例里的 `_execute_step()` 就做了这件事：

```python
def _execute_step(self, step: dict) -> str:
    action = step.get("action", "")
    tool_hint = step.get("tool", "")
    prompt = (
        f"步骤：{action}\n建议工具：{tool_hint}\n"
        f"可用：get_weather(city), calculate(expression), search_news(keyword), "
        f"get_exchange_rate(from_currency, to_currency), search_web(query)\n"
        f'输出 JSON：{{"tool": "名", "args": {{}}}} 或 {{"tool": null}}'
    )
    ...
```

这段代码提醒你一个很关键的点：

- Planning 不是把工具路由写死
- Planning 是先用计划限制搜索空间，再让模型在小范围里做执行决策

也就是说，Planning 提供的是“宏观顺序”，不是“微观每一步都人工硬编码”。

### 27.4 自适应规划是在处理“计划赶不上变化”

一次性计划的最大弱点，是它默认世界不会在执行中变化。但真实任务往往不是这样。

示例文章里提到的“Pinecone 定价变化”就是典型例子：执行到一半发现新信息以后，后续比较维度必须更新。这时如果继续沿原计划执行，系统虽然“按步骤完成”，但结论已经落后了。

所以更高级的形态是：

```text
执行一步
  -> 检查结果是否偏离预期
  -> 如有必要，重算剩余步骤
  -> 用新计划替换旧的 pending 部分
```

这就是自适应规划真正的价值：不是让计划更复杂，而是让计划可以被现实修正。

### 27.5 什么时候该用哪一种

可以用一个简单的判断：

- **任务 1-3 步，信息需求明确**：优先 ReAct
- **任务 5-10 步，结构稳定**：优先 Plan-and-Execute
- **任务长、外部信息不稳定、目标可能变动**：再考虑自适应规划

不要一上来就上最重的方案。Planning 能提升成功率，但也一定增加调用次数、状态维护成本和调试复杂度。

## 教学代码示例映射

**下面这些都是教学示例，不是 OpenCode 原仓实现。** 本章对应示例目录是 `docs/intermediate/examples/27-planning-mechanism/`，核心文件为 `plan_and_execute.py`。

它主要分成两层：

- `PlanAndExecuteAgent`：先做计划，再逐步执行
- `SmartAgent`：根据任务复杂度在 `react` 和 `plan_execute` 之间自动路由

这份脚本接近页面可读性的上限，因此正文只保留关键片段。完整版本请直接看示例目录。

### 关键片段 1：Planner 负责把任务转成显式步骤

```python
class PlanAndExecuteAgent:
    def __init__(self):
        self.plan: list[dict] = []
        self.results: dict = {}

    def _make_plan(self, task: str) -> list[dict]:
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": PLAN_PROMPT.format(task=task)}]
        )
        content = resp.choices[0].message.content.strip()
        if "```" in content:
            content = content.split("```")[1].replace("json", "").strip()
        self.plan = json.loads(content)
        return self.plan
```

### 关键片段 2：执行器逐步推进并累积结果

```python
for step in self.plan:
    s_num = step.get("step", "?")
    result = self._execute_step(step)
    self.results[s_num] = result
    print(f"  Step {s_num}: {result[:80]}{'...' if len(result) > 80 else ''}")
```

### 关键片段 3：路由器根据复杂度决定是否值得先做计划

```python
class SmartAgent:
    def _select_mode(self, task: str) -> str:
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": f"评估任务复杂度（1-10...）。只输出数字。\n任务：{task}"}]
        )
        try:
            score = int(resp.choices[0].message.content.strip())
            return "react" if score <= 3 else "plan_execute"
        except:
            return "plan_execute"
```

这三个片段足够你抓住 Planning 示例的骨架：

```text
先决定要不要规划
  -> 规划后把步骤结构化
  -> 按步骤执行
  -> 收集中间结果
  -> 最后统一汇总
```

## 常见误区

### 误区1：Planning 一定比 ReAct 高级，所以复杂任务都该先上 Planning

**错误理解**：只要任务稍微复杂一点，就默认先做完整规划。

**实际情况**：Planning 有明确成本，包括额外的模型调用、计划解析、状态维护和重规划逻辑。短任务上这些成本往往高于收益。

### 误区2：计划越细越好

**错误理解**：把 5 步能做完的事拆成 20 步，会让系统更稳。

**实际情况**：过度规划会让系统花大量 token 在维护计划本身，执行灵活性反而下降。好的计划粒度，应该让每一步都是“可执行且有单一目标”，而不是“无限细分”。

### 误区3：有了计划，执行阶段就不需要灵活性

**错误理解**：计划一旦生成，就应该严格照着走，不能动。

**实际情况**：计划只是当前信息下的最优猜测。只要外部事实变化、工具返回异常、查询结果不足，系统就必须有能力修正剩余步骤，否则会稳定地走向错误答案。

### 误区4：Planning 只是一个 Prompt 技巧

**错误理解**：让模型“先列步骤再回答”，就等于实现了 Planning。

**实际情况**：真正的 Planning 还包括结构化解析、步骤状态、执行器、结果汇总，甚至重规划策略。没有这些配套，Planning 只是一段好看的提纲，不是工程能力。

## 延伸阅读与回链

- 如果你还在理解“边想边做”的工作方式，先回看 [P10：ReAct Loop](/practice/p10-react-loop/)。
- 如果你想动手实现完整的 Plan-and-Execute 主链，直接阅读 [P11：Planning 机制](/practice/p11-planning/)。
- 如果你想把 Planning 和 OpenCode 的角色/权限/会话循环结合起来理解，建议串读 [第3章：OpenCode 项目介绍](/02-agent-core/) 与 [第5章：会话管理](/04-session-management/)。

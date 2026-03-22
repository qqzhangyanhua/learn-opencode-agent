---
title: 第26章：让多个 AI 协作起来
description: 从主从、辩论、流水线三种模式切入，理解多智能体协作为什么能提升复杂任务的可控性，以及它的真实成本与边界。
contentType: intermediate
contentId: intermediate-26-multi-agent-collaboration
series: book
roleDescription: 深入多 Agent 协作机制，理解任务分配与状态同步。
---

<ChapterLearningGuide />


## 这篇解决什么问题

单智能体在很多简单任务上已经够用，但任务一复杂，很快会暴露三个问题：

- 一个 Agent 同时扮演调研、写作、审稿多个角色，提示词会越来越臃肿
- 同一轮上下文里塞太多职责，模型容易角色漂移
- 多维度任务必须串行执行，总耗时和上下文压力都会上升

多智能体协作的目标，不是让系统显得更高级，而是解决三个更具体的问题：

1. **角色专门化**：每个 Agent 只干一种事
2. **流程结构化**：谁先做、谁后做、谁汇总变得明确
3. **质量可对照**：不同角色可以互相补足和校验

## 为什么真实系统里重要

很多团队第一次做多智能体，会把重点放在“让它们互相聊天”。但真实系统里，多智能体真正重要的地方反而更朴素：

- **降低单体 Prompt 复杂度**：让调研员只调研，让审稿人只审稿。
- **降低上下文串味**：不同角色各自持有自己的局部上下文，不必共享所有中间细节。
- **提升可组合性**：同一套 Writer、Reviewer、Researcher 可以被不同任务复用。
- **提升工程可控性**：你可以单独替换某个角色的 prompt、模型、权限，而不必重写整条链路。

这也是为什么多智能体经常适合下面这几类任务：

- 长文生成前的调研、写作、审校分工
- 多视角评估，如安全、性能、代码风格并行审查
- 明确流水线步骤的内容生产与结构化处理

## 核心概念与主链路

先抓住一个最重要的判断：

**多智能体不是更聪明，而是更分工。**

一套典型的协作链路通常长这样：

```text
用户目标
  -> 协调者决定拆分方式
  -> 各角色按自己的 prompt 和上下文执行
  -> 结果被汇总、审查或继续传递
  -> 最终输出返回给用户
```

<MultiAgentWorkflowDetailed
  :agents="[
    { id: 'orchestrator', name: 'Orchestrator', role: '总协调' },
    { id: 'planner', name: 'Planner', role: '任务拆解' },
    { id: 'coder', name: 'Coder', role: '代码实现' },
    { id: 'reviewer', name: 'Reviewer', role: '代码审查' }
  ]"
  :messages="[
    { from: 'orchestrator', to: 'planner', type: 'task', content: '重构用户认证模块，分离关注点并添加测试' },
    { from: 'planner', to: 'orchestrator', type: 'result', content: '拆分为3个子任务：1.接口定义 2.核心实现 3.单元测试' },
    { from: 'orchestrator', to: 'coder', type: 'task', content: '任务1：定义 AuthService 接口与类型' },
    { from: 'coder', to: 'orchestrator', type: 'tool_call', content: 'write_file(auth/types.ts)', metadata: { tokens: 312 } },
    { from: 'coder', to: 'orchestrator', type: 'result', content: 'AuthService + UserCredentials 类型已导出' },
    { from: 'orchestrator', to: 'reviewer', type: 'task', content: '审查接口设计，检查类型是否完备' },
    { from: 'reviewer', to: 'orchestrator', type: 'result', content: '接口合理，建议补充 RefreshToken 方法签名' },
    { from: 'orchestrator', to: 'coder', type: 'task', content: '任务2：实现 AuthService 核心逻辑（含 RefreshToken）' },
    { from: 'coder', to: 'orchestrator', type: 'result', content: 'login / logout / refreshToken 三个方法实现完成' },
    { from: 'orchestrator', to: 'coder', type: 'task', content: '任务3：为 AuthService 编写单元测试' },
    { from: 'coder', to: 'orchestrator', type: 'tool_call', content: 'run_tests(auth/service.test.ts)', metadata: { passed: 8, failed: 0 } },
    { from: 'orchestrator', to: 'reviewer', type: 'decision', content: '全部测试通过，任务完成，输出最终 PR 摘要' }
  ]"
  :playSpeed="900"
/>

### 26.1 模式一：主从模式最像项目经理带小组

主从模式的结构最清晰：一个 Orchestrator 负责拆任务，多个 Worker 负责执行。示例里的 `OrchestratorAgent` 就是这个思路：

```python
class OrchestratorAgent:
    def __init__(self):
        self.workers = {
            "researcher": Agent("你是信息调研专家，负责搜索收集资料。输出简洁有条理。"),
            "writer": Agent("你是技术写手，负责把资料整理成结构清晰的文章。300字以内。"),
            "reviewer": Agent("你是严格的审稿人，检查文章质量给出修改意见。简洁。"),
        }
        self.orchestrator = Agent(
            "你是项目经理，把任务拆解成子任务并指定执行者。"
            '只输出 JSON 数组：[{"worker":"xxx","subtask":"xxx"}]'
        )
```

这个模式适合：

- 任务能自然拆成若干角色分工
- 中间产物需要被最终汇总
- 你希望某个角色拥有全局视角，但执行者只处理局部问题

它的最大优点是结构稳定，最大的风险是协调者如果拆错了，下面全线跟着错。

### 26.2 模式二：辩论模式适合做方案拉扯

如果任务不是“拆分执行”，而是“多角度评估”，辩论模式更合适。示例里的 `DebateSystem` 用正方、反方和裁判构成闭环：

```python
class DebateSystem:
    def __init__(self):
        self.pro = Agent("你是辩论正方，支持给定观点。论据简洁有力，100字以内。")
        self.con = Agent("你是辩论反方，反驳给定观点。论据简洁有力，100字以内。")
        self.judge = Agent(
            "你是辩论裁判。听取正反双方论点后，给出客观、平衡的总结。"
        )
```

它适合的问题往往长这样：

- “这个架构方案该不该上？”
- “这条产品路线的风险在哪？”
- “应该优先优化性能还是优先补功能？”

辩论模式的价值，不在于让两个模型互喷，而在于强制系统生成相反观点，从而降低“单一叙事”的偏差。

### 26.3 模式三：流水线模式适合步骤明确的加工链

如果任务本身就有明显的先后依赖，比如“需求整理 -> 技术方案 -> 工期评估”，流水线比主从和辩论都更省心。示例的 `Pipeline` 非常直接：

```python
class Pipeline:
    def __init__(self, agents: list[tuple[str, Agent]]):
        self.agents = agents

    def run(self, initial_input: str) -> str:
        current = initial_input
        for name, agent in self.agents:
            current = agent.run(current)
        return current
```

这个模式的优点是：

- 数据流天然可追踪
- 每一段输入输出都容易测试
- 出错时容易定位是哪个阶段的问题

缺点也很明显：一旦前面的阶段产生偏差，后面的阶段会把偏差继续放大。

### 26.4 真正的核心不是模式，而是边界

这三种模式看似不同，背后都在处理同一个工程问题：

- 谁负责决策
- 谁能看到什么上下文
- 谁拥有执行权限
- 结果如何回流

如果这些问题不先讲清楚，多智能体只会变成“更多调用、更贵成本、更多调试困难”。

## 教学代码示例映射

**下面这些都是教学示例，不是 OpenCode 原仓实现。** 本章对应的示例目录是 `docs/intermediate/examples/26-multi-agent-collaboration/`，当前目录里主要就是一个 `multi_agent.py` 文件。

它做了三件事：

- 用 `OrchestratorAgent` 演示主从模式
- 用 `DebateSystem` 演示多轮观点拉扯
- 用 `Pipeline` 演示严格顺序加工链

由于 `multi_agent.py` 长度适中，这里直接折叠展示完整代码，方便你边读边对照。

::: details 教学示例：`multi_agent.py`（完整代码）

```python
"""
多智能体协作：主从、辩论、流水线
原始来源：AI 智能体系列第 08 篇
当前对应：中级篇第 26 章

运行：
    export DEEPSEEK_API_KEY="your_key"
    python multi_agent.py
"""
import os
import json
from openai import OpenAI

client = OpenAI(
    base_url="https://api.deepseek.com",
    api_key=os.getenv("DEEPSEEK_API_KEY")
)
MODEL_NAME = "deepseek-chat"


class Agent:
    """统一的 Agent 基类"""

    def __init__(self, system_prompt: str):
        self.system_prompt = system_prompt

    def run(self, message: str) -> str:
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": message}
            ]
        )
        return resp.choices[0].message.content.strip()


class OrchestratorAgent:
    """主从模式：老板拆任务，员工执行"""

    def __init__(self):
        self.workers = {
            "researcher": Agent("你是信息调研专家，负责搜索收集资料。输出简洁有条理。"),
            "writer": Agent("你是技术写手，负责把资料整理成结构清晰的文章。300字以内。"),
            "reviewer": Agent("你是严格的审稿人，检查文章质量给出修改意见。简洁。"),
        }
        self.orchestrator = Agent(
            "你是项目经理，把任务拆解成子任务并指定执行者。"
            "可用执行者：researcher（调研）、writer（写作）、reviewer（审阅）。"
            '只输出 JSON 数组：[{"worker":"xxx","subtask":"xxx"}]'
        )

    def run(self, task: str) -> str:
        print(f"\n--- 主从模式 ---")
        plan_str = self.orchestrator.run(f"任务：{task}")
        if "```" in plan_str:
            plan_str = plan_str.split("```")[1].replace("json", "").strip()
        try:
            plan = json.loads(plan_str)
        except json.JSONDecodeError:
            return f"计划解析失败：{plan_str}"

        results = {}
        for step in plan:
            worker_name = step["worker"]
            subtask = step["subtask"]
            context = subtask
            if results:
                context += "\n\n已有结果：\n" + "\n".join(
                    f"- {k}: {v[:200]}" for k, v in results.items()
                )
            print(f"  [{worker_name}] {subtask[:50]}...")
            if worker_name in self.workers:
                results[worker_name] = self.workers[worker_name].run(context)
        return results.get("reviewer", results.get("writer", list(results.values())[-1]))


class DebateSystem:
    """辩论模式：正方反方辩论，裁判总结"""

    def __init__(self):
        self.pro = Agent("你是辩论正方，支持给定观点。论据简洁有力，100字以内。")
        self.con = Agent("你是辩论反方，反驳给定观点。论据简洁有力，100字以内。")
        self.judge = Agent(
            "你是辩论裁判。听取正反双方论点后，给出客观、平衡的总结。"
            "指出哪方论据更有力，给出你的判断。200字以内。"
        )

    def run(self, topic: str, rounds: int = 2) -> str:
        print(f"\n--- 辩论模式 ---")
        print(f"辩题：{topic}")
        history: list[str] = []

        for r in range(rounds):
            print(f"\n  第 {r+1} 轮：")
            context = f"辩题：{topic}"
            if history:
                context += "\n之前的辩论：\n" + "\n".join(history)

            pro_arg = self.pro.run(context + "\n请发表正方观点。")
            print(f"  [正方] {pro_arg[:100]}...")
            history.append(f"正方第{r+1}轮：{pro_arg}")

            con_arg = self.con.run(context + f"\n正方说：{pro_arg}\n请反驳。")
            print(f"  [反方] {con_arg[:100]}...")
            history.append(f"反方第{r+1}轮：{con_arg}")

        debate_record = "\n".join(history)
        verdict = self.judge.run(f"辩题：{topic}\n\n辩论记录：\n{debate_record}\n\n请做出裁判。")
        return verdict


class Pipeline:
    """流水线模式：每个 Agent 处理后传给下一个"""

    def __init__(self, agents: list[tuple[str, Agent]]):
        self.agents = agents

    def run(self, initial_input: str) -> str:
        print(f"\n--- 流水线模式 ---")
        current = initial_input
        for name, agent in self.agents:
            print(f"  [{name}] 处理中...")
            current = agent.run(current)
        return current
```

:::

如果你要自己扩展这个示例，建议第一步不是加更多 Agent，而是先把每个角色的输入输出契约写清楚。

## 常见误区

### 误区1：多智能体一定比单智能体更强

**错误理解**：只要把任务拆成多个 Agent，结果就会自动更好。

**实际情况**：多智能体只是把复杂度重新分配。角色设计得不好、上下文传递不清楚、协调者拆分不准时，结果只会比单智能体更贵、更慢、更难调试。

### 误区2：让 Agent 彼此充分对话，效果一定更好

**错误理解**：Agent 之间交流越多，集体智慧越强。

**实际情况**：通信越多，上下文越大，串味和信息回声也越严重。大多数场景真正需要的是最小必要通信，而不是无限对话。

### 误区3：角色只要靠 prompt 口头区分就够了

**错误理解**：写一句“你是审稿人”“你是研究员”，角色边界就成立了。

**实际情况**：真实系统里，角色边界还包括可见上下文、工具能力、权限范围、最大步数和是否允许继续委派。OpenCode 之所以值得学，就在于它把这些边界写进系统而不是写进愿望。

### 误区4：多智能体的收益主要来自并行

**错误理解**：多智能体最大的优势是并发提速。

**实际情况**：并行只是副产品。多智能体真正的收益通常来自职责专门化和结果互校；如果任务本身强依赖前序输出，盲目并行只会制造更多合并成本。

## 延伸阅读与回链

- 如果你想先从可运行的编排模式入手，回到 [P15：多 Agent 编排](/practice/p15-multi-agent/)。
- 如果你更关心“主代理如何安全地下发子任务”，继续看 [P16：子 Agent 与任务分解](/practice/p16-subagent/)。
- 如果你关注状态共享、结果汇总和消息格式，接着看 [P17：Agent 间通信与状态共享](/practice/p17-agent-comm/)。
- 如果你想把本章和 OpenCode 的正式协作协议对应起来，建议重读 [第16章：高级主题与最佳实践](/15-advanced-topics/) 中关于 `task.ts` 与权限收口的部分。

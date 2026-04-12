# 08｜子 Agent 与并行执行：Hermes 如何把复杂任务拆开做

## 先看复杂任务怎么拆

当一个 Agent 只处理简单请求时，让同一个主循环一路做到底通常没问题。

但一旦任务开始变复杂，你很快会碰到几个瓶颈：

- 上下文越来越长
- 任务分支越来越多
- 某些子问题其实可以独立做
- 主代理既要统筹，又要亲自下场做所有细节，效率很低

这时候，系统就会自然走向一个更工程化的方向：

把复杂任务拆成子任务，让子 Agent 在受控边界内独立完成。

Hermes 在这件事上的核心实现，就是 `tools/delegate_tool.py`。

所以这一章要回答的问题是：

Hermes 为什么要做子 Agent？它又是怎么避免把“多代理协作”做成一团新的混乱？

---

## 1. `delegate_tool.py` 一开头就把边界说透了：子 Agent 不是复制一个大自己

打开 `tools/delegate_tool.py`，文件头注释写得非常清楚：

- 这是 Subagent Architecture
- 会 spawn child AIAgent
- child 有 isolated context
- restricted toolsets
- own terminal sessions
- parent blocks until all children complete

这几句注释其实已经把 Hermes 的基本判断说完了：

子 Agent 不是把主 Agent 原样复制一份出去，而是：

给它一个隔离上下文、受限工具面、独立执行空间的专用工作线程。

这个判断非常关键。

因为很多人一说多智能体，很容易把想象停留在“再开几个 Agent 一起跑”。

但真正的难点不在“能不能多开几个”，而在：

- 这些子 Agent 知道多少上下文
- 它们能用哪些工具
- 它们会不会无限递归再派代理
- 它们会不会把共享状态写乱
- 父代理最后看见的是全量细节还是摘要结果

Hermes 正是在这些边界上做了非常明确的约束。

---

## 2. Hermes 的第一原则不是并行，而是隔离

看 `delegate_tool.py` 文件头的这句说明：

Each child gets:

- A fresh conversation
- Its own task_id
- A restricted toolset
- A focused system prompt

这其实已经说明，Hermes 对子 Agent 的第一原则不是“多开几个加速”，而是“先隔离清楚”。

为什么隔离这么重要？

因为如果子 Agent 和父 Agent 共享太多东西，复杂性会急剧上升：

- 谁改了上下文？
- 谁调用了哪个工具？
- 谁写进了共享记忆？
- 错误来自哪个执行分支？

而 Hermes 的做法是：

让子 Agent 尽量像一个带目标的专用工作单元。

它有：

- 自己的 task_id
- 自己的终端会话
- 自己的 focused prompt
- 受限的工具范围

这样父 Agent 最后接回来的，不是整个混乱过程，而是一个收束后的摘要。

文件头甚至明确写到：

The parent only sees the delegation call and the summary result,
never the child’s intermediate tool calls or reasoning.

这一步非常像真实团队里的分工原则：

负责人不需要看每个成员脑中每一步推理，而需要看边界清晰的任务结果。

Hermes 把这个原则实现成了运行时机制。

---

## 3. `DELEGATE_BLOCKED_TOOLS` 说明 Hermes 对子 Agent 的态度是“能做事，但别乱来”

往下看代码，很快会看到一个非常关键的常量：

`DELEGATE_BLOCKED_TOOLS`

当前明确被子 Agent 禁掉的包括：

- `delegate_task`
- `clarify`
- `memory`
- `send_message`
- `execute_code`

这组禁用名单非常值得细讲，因为它几乎就是 Hermes 对子 Agent 风险模型的缩影。

### 3.1 禁掉 `delegate_task`

不允许递归委托。

这意味着 Hermes 不希望代理树无限长。

文件里也有 `MAX_DEPTH = 2`，直接把深度卡住。

这是典型的工程理性：

多级代理当然更“酷”，但复杂性和调试成本会爆炸。

Hermes 明显更重视可控性。

### 3.2 禁掉 `clarify`

子 Agent 不应该自己跑去问用户。

这说明 Hermes 把人机交互入口牢牢留在父代理手里。

否则你很快会得到一个非常混乱的用户体验：同时有多个子代理来找你补信息。

### 3.3 禁掉 `memory`

子 Agent 不能直接写共享长期记忆。

这一步很重要，因为长期记忆是全局状态。如果任何子 Agent 都能随手写，很快就会污染。

### 3.4 禁掉 `send_message`

子 Agent 不能随便产生跨平台副作用。

这等于把“对外发消息”这种高影响动作保留给父代理统一决策。

### 3.5 禁掉 `execute_code`

代码执行工具在 Hermes 里属于高能力、高副作用面。

子 Agent 默认被要求 step-by-step 推理，而不是随手写脚本扩大不可控范围。

你会发现，Hermes 在这里的设计不是“尽量给子 Agent 更多能力”，而是：

先把最危险、最会扩散复杂性的能力关掉。

这也是一个成熟系统对多代理最该有的态度。

---

## 4. Hermes 不是简单 spawn 子 Agent，而是先给子 Agent 重写任务边界

看 `_build_child_system_prompt()`，Hermes 并没有把父代理的大 system prompt 原封不动塞给孩子。

相反，它会构造一个非常聚焦的 child prompt：

- 先告诉它你是一个 focused subagent
- 明确写 `YOUR TASK`
- 如有需要附 `CONTEXT`
- 如能解析出 workspace path，就明确注入路径
- 最后要求它返回简洁清晰的 summary

这个设计很有代表性。

因为它说明 Hermes 认为：

子 Agent 的价值不在于“拥有和父代理一样宽的世界观”，而在于“在更窄的任务边界里完成工作”。

这和很多初学者的直觉相反。

初学者往往觉得，给子 Agent 更多上下文更稳。

但实际工程里，过宽上下文反而会带来两个问题：

- 注意力分散
- 子 Agent 开始自己扩展任务边界

Hermes 的做法，是主动把子 Agent 的任务环境收紧。

这其实是一种“提示词层面的任务封装”。

---

## 5. 子 Agent 也不是凭空生成的，它仍然受父代理工具面和运行配置约束

再看 `_build_child_agent()`，你会发现 Hermes 在这里做了很多保护：

- 如果没显式传 toolsets，就从 parent 有效工具面继承
- 子 Agent 不得获得 parent 没有的工具
- 再经过 `_strip_blocked_tools()` 二次裁剪
- model、provider、base_url、api_key 都有继承与 override 逻辑
- reasoning 配置也会继承或按 delegation config 调整

这说明什么？

说明子 Agent 不是新世界，而是父代理约束下的局部执行体。

它的能力边界不是自己长出来的，而是由父代理与 delegation config 共同决定的。

这一步很重要。

因为一旦子 Agent 能获得比父代理更大的能力面，系统就会变得非常危险，也很难解释。

Hermes 在这里的原则很明确：

子 Agent 只能更窄，不能更野。

---

## 6. 并行只是第二层收益，真正第一层收益是“把复杂任务压回可控粒度”

很多人一提子 Agent，第一反应就是“并行提速”。

但 Hermes 这套实现更值得你注意的，其实不是提速，而是任务粒度治理。

为什么？

因为一个复杂任务如果全塞给主代理，会出现两个问题：

- 主代理既做统筹，又做细节实现，角色混乱
- 一个失败分支会不断污染整个主上下文

而子 Agent 的意义在于：

让主代理把某个明确子问题打包出去。

例如：

- 去调查某个 bug 根因
- 去收集某组文件的证据
- 去完成某个边界明确的小实现

这样主代理就能把精力放在：

- 分解任务
- 决策下一步
- 汇总结果

这和真实工程组织很像。

所以并行当然有价值，但更大的价值是：

让系统不必永远用一个上下文硬扛所有复杂性。

---

## 7. Hermes 也没有神化并行，它对并发是克制的

看文件里的几个常量：

- `_DEFAULT_MAX_CONCURRENT_CHILDREN = 3`
- `MAX_DEPTH = 2`

这说明 Hermes 对并行 delegation 的态度非常克制。

它没有把系统推向“无限横向扩展的代理群”。

原因也很现实：

- 并发一多，成本会上去
- 输出整合会更难
- 用户更难理解系统在干什么
- 工具冲突和工作目录冲突风险会增加

Hermes 明显更偏向这样一种策略：

在真正有必要时，开少量受限子 Agent；
而不是默认把所有复杂任务都拆成一个代理集群。

这也是很值得初学者学的一点。

多代理不等于更高级。

多代理真正有价值的前提是：边界清晰、收益明确、整合成本可控。

Hermes 的实现里，这个倾向非常明显。

---

## 8. 这一层对初学者最大的启发：别把多 Agent 想成“更智能”，先把它想成“更好的任务隔离”

如果你以后要自己做 Agent，子 Agent 这一层最值得学的，不是“我也要有很多代理”，而是下面三个原则。

### 8.1 复杂任务先拆边界，再谈并行

你首先要问的是：

- 哪些子问题真的能独立做？
- 哪些子问题需要独立上下文？

不是先问“能不能并行”。

### 8.2 子 Agent 必须能力收缩，不要能力膨胀

Hermes 的 blocked tools 就是在守这条线。

子 Agent 可以做事，但最好不要：

- 随便找用户说话
- 随便写共享长期状态
- 随便制造高副作用动作

### 8.3 父代理看到的应当是结果，不是全部噪声

如果父代理还要吞下所有子代理中间细节，那 delegation 带来的不是减压，而是更多噪声。

Hermes 把 child 的中间过程隐藏、只收 summary，这个设计非常值得抄。

---

## 9. 最后把拆分逻辑收一下

基于当前 `tools/delegate_tool.py` 已实现的 delegation 机制，我认为 Hermes 的子 Agent 系统可以这样概括：

它不是把主代理简单复制成多份，而是把复杂任务拆成一组带隔离上下文、受限工具面和清晰摘要出口的执行单元。

这个判断主要来自以下源码事实：

- child agent 使用 fresh conversation，而不是继承父代理整段历史
- `DELEGATE_BLOCKED_TOOLS` 和 `MAX_DEPTH` 明确限制了递归委托、共享记忆写入与高副作用动作
- `_build_child_system_prompt()` 会重写任务边界，而不是直接复用父代理的宽上下文
- `_build_child_agent()` 要求 child toolset 不能超出 parent 实际工具面

Hermes 的子 Agent 设计，真正厉害的地方不在“可以多开几个模型”，而在于它把复杂任务拆分成了受控的执行单元。

它做的关键动作包括：

- fresh conversation
- restricted toolsets
- focused child prompt
- depth / concurrency 限制
- 父子上下文隔离
- 只返回摘要结果

这说明 Hermes 理解的 delegation，不是“放大混乱”，而是“回收复杂性”。

所以，如果上一章的关键词是“经验外置化”，那么这一章的关键词就是：任务隔离。

下一章我们继续看另一个非常能体现 Agent 进化方向的能力：

Cron、后台任务与自动化。也就是 Hermes 怎么从“你叫它时它才工作”，慢慢走向“它会自己按时持续工作”。

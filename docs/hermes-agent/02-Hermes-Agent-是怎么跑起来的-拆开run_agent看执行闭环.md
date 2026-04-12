# 02｜Hermes Agent 是怎么跑起来的：拆开 run_agent.py 看执行闭环

## 先盯住真正的执行闭环

上一章我们先建立了全局地图，知道 Hermes Agent 不是一个“会调几个工具的聊天壳”，而是一个已经很有 runtime 味道的系统。

但只看地图还不够。

如果你真的想理解 Hermes Agent 的工程价值，下一步一定要进入它最核心的文件：run_agent.py。

因为一个 Agent 系统到底是不是“运行时”，关键不在它有多少工具、有多少平台接入，而在于它有没有一套稳定的执行闭环，去把下面这些事情串起来：

- 如何把用户请求变成可执行的消息流
- 如何把系统身份、记忆、技能、项目上下文装配成 system prompt
- 如何调用模型，并在模型要求时执行工具
- 如何把工具结果再喂回模型，继续推进任务
- 如何在中断、截断、空响应、429、上下文膨胀这些真实问题下尽量保持系统继续运转

所以这一章不讲外围能力，专门回答一句话：

Hermes Agent 到底是怎样从“用户发来一句话”，一路进入“模型—工具—模型”的执行闭环，并尽量稳定收束到最终结果的？

这个问题，不能靠概念回答，必须回到当前 hermes-agent 仓库的 `run_agent.py` 现有源码本身。

---

## 1. run_agent.py 为什么是整个系统最值得先啃的文件

从当前仓库结构看，Hermes Agent 当然不是只有一个核心文件。

它还有：

- model_tools.py：负责工具发现、schema 汇总、函数调用分发
- agent/prompt_builder.py：负责系统提示词相关装配
- hermes_state.py：负责 SessionDB
- cli.py：负责 CLI 编排
- gateway/：负责 Telegram、Discord、Slack 等平台接入

但如果你只能先精读一个文件，我仍然认为 run_agent.py 应该排第一。

理由很简单：

它是系统总编排器。

在这个文件里，你能直接看到 Hermes Agent 怎样把原本分散的几个层面收束成一条连续执行链：

1. 先装配系统提示词
2. 再构造 API 要看的 messages
3. 调模型
4. 检查返回里有没有 tool_calls
5. 如果有，就执行工具并回填 tool message
6. 再次请求模型
7. 如果没有工具调用，就把文本结果作为最终回答返回
8. 如果中途遇到截断、空响应、上下文压力、API 错误，就走恢复或降级分支

换句话说，run_agent.py 不是“其中一个模块”，而是 Hermes Agent 把各子系统接上线的地方。

这也是为什么理解 Hermes，不能只看 prompt_builder.py 或 tools/。那些文件分别解释“系统会说什么”“系统能做什么”，但只有 run_agent.py 解释“系统如何持续跑”。

---

## 2. 真正的起点不是调用模型，而是先造出一个可执行的系统提示词

很多人读 Agent 代码时，会本能先找 API 调用位置，想知道“模型是怎么被调用的”。

但在 Hermes 里，更合理的阅读顺序其实是先看 _build_system_prompt()。

因为在一个成熟一点的 Agent 里，模型不是直接面对用户一句原始输入，而是先面对一个被装配好的执行环境。

在 run_agent.py 里，_build_system_prompt() 从第 2694 行开始。函数注释写得很明确：

- 它负责组装 full system prompt
- 它会缓存到 self._cached_system_prompt
- 正常情况下一个 session 只构建一次
- 只有发生 context compression 之后才会重建
- 这样做是为了让 system prompt 在 session 内保持稳定，提高 prefix cache 命中率

这几句注释已经很能说明 Hermes 的工程思路。

它不是把 system prompt 当作“随手拼的一段说明文字”，而是把它当作一个尽量稳定、又能反映当前运行环境的执行前缀。

再看具体层次，源码注释已经把顺序写出来了：

1. Agent identity：优先加载 SOUL.md，否则回退到 DEFAULT_AGENT_IDENTITY
2. user / gateway system prompt
3. persistent memory
4. skills guidance
5. context files，比如 AGENTS.md、.cursorrules
6. 当前日期时间
7. 平台相关 hint

如果往下看实现，会发现这个层次比表面上更细。

例如：

- 如果 valid_tool_names 里有 memory，才注入 MEMORY_GUIDANCE
- 如果有 session_search，才注入 SESSION_SEARCH_GUIDANCE
- 如果有 skill_manage，才注入 SKILLS_GUIDANCE
- 如果开启了 tool-use enforcement，还会根据模型族额外注入工具使用纪律
- 对 Gemini / Gemma 会补 Google 模型操作规范
- 对 GPT / Codex 会补 OpenAI 模型执行纪律
- memory_store 和 user profile 会被格式化后注入
- 外部 memory provider 如果存在，也会追加它自己的 system prompt block
- skills 工具存在时，会通过 build_skills_system_prompt(...) 生成技能提示
- context files 则通过 build_context_files_prompt(...) 按当前工作目录继续发现
- 最后再拼上当前时间、session_id、model、provider 和 platform hint

从结构上看，这已经不是“提示词写得多不多”的问题了，而是一个很典型的 runtime 装配器。

Hermes 先做的不是回答用户，而是先回答一个内部问题：

当前这一轮，模型到底应该在什么身份、什么规则、什么能力边界、什么平台语境里执行？

只有这个问题先被回答，后面的模型调用才有一致的执行基座。

---

## 3. Hermes 真正的第一性机制，是多轮循环，而不是一次性生成

Agent 和普通聊天机器人最根本的差别，不是会不会“思考”，而是有没有闭环。

在 Hermes Agent 里，这个闭环的核心当然落在 run_conversation() 上。

虽然当前我们没有整段把它一次性读完，但从 AGENTS.md 对主循环的概括，以及 run_agent.py 后半段大量围绕 messages、tool_calls、finish_reason、retry、compression 的实现，可以非常清楚地看出它的基本范式：

- 构造好 messages 和 tools schema
- 调模型 API
- 看模型是否返回 tool_calls
- 如果有，就执行工具，把结果以 tool message 的形式 append 回 messages
- 再调模型
- 直到模型不再请求工具，而是直接输出最终文本

这套范式看起来并不花哨，但它决定了 Hermes Agent 是“执行系统”而不是“问答壳子”。

因为只有在这种循环里，模型才有机会：

- 根据外部环境反馈修正策略
- 先搜集信息，再下判断
- 把复杂任务拆成多步
- 在行动后继续思考，而不是一次性赌对全部答案

很多所谓 Agent 项目，其实真正运行起来仍然非常像单轮生成：模型在一次回复里尽量把话说满，工具只是偶尔调用一下。

而 Hermes 的源码重点明显不是“让模型一次说得更聪明”，而是“让系统在多轮里持续推进任务”。

这一点，从后面一整套工具执行、预算警告、截断恢复、上下文压缩分支就能看得非常明显。

---

## 4. 工具执行不是一个 if/else，而是一整套可编排的分发路径

当模型返回 tool_calls 之后，Hermes 并不是简单地 for 循环执行完事。

在 run_agent.py 第 6254 行附近，可以看到 _execute_tool_calls()。这个函数本身就是一个分发层。

它先拿到 assistant_message.tool_calls，然后根据 _should_parallelize_tool_batch(tool_calls) 的判断结果，决定走哪条路：

- 不适合并行：走 _execute_tool_calls_sequential()
- 适合并行：走 _execute_tool_calls_concurrent()

这一步非常关键。

因为很多 Agent 系统虽然支持工具调用，但默认认知里只有一种执行模式：顺序执行。

Hermes 已经明显往前走了一步：

只要一批工具调用彼此独立、且是 read-only 或目标路径不冲突，就允许并行执行，以降低整轮 latency。

这意味着 Hermes 在架构上已经把工具调用视为一个“调度问题”，而不只是“函数调用问题”。

你可以把这里理解成：

模型只负责提出动作意图；真正决定这些动作如何落地执行、能否并发、怎样回填消息流的，是 run_agent.py 里的运行时层。

这才是 runtime 的味道。

---

## 5. _invoke_tool() 暴露出一个很重要的设计事实：有些工具属于 Agent 内核

继续往下看，第 6277 行开始是 _invoke_tool()。

这个函数的注释说得很清楚：

- 它调用单个工具，返回结果字符串
- 不负责 display logic
- 它既处理 agent-level tools，也处理 registry-dispatched tools
- 它主要给并发执行路径使用

如果只看表面，你可能会觉得这只是“把调用代码提取成一个函数”。

但真正重要的是它暴露了 Hermes 对工具的分类。

在这个函数里，前几类工具并没有直接走通用的 handle_function_call()，而是被单独拦截：

- todo
- session_search
- memory
- clarify
- delegate_task
- 外部 memory_manager 自己暴露的工具

只有剩余的一般工具，才最后落到 handle_function_call(...)。

这说明 Hermes 不是把所有工具都看成同质能力。

它已经区分出一批“Agent 自己的内核工具”：

- todo 改变的是当前任务列表
- session_search 读的是会话数据库
- memory 写的是持久记忆
- clarify 会通过 callback 向用户发出问题
- delegate_task 会拉起子 Agent

这些工具对系统状态的影响，比“普通工具做一个外部动作”更深，所以它们被 agent loop 直接接管，而不是完全交给外部 registry。

这是一条很重要的阅读线索。

也就是说，Hermes 的工具体系并不是一个纯平面列表，而是至少分成两层：

第一层：Agent kernel tools
- 会直接影响会话结构、持久状态或交互流

第二层：registry tools
- 通过通用 schema / handler 机制调用

这会直接影响你后面理解整个系统时的关注点：

不是所有“工具”都只是能力扩展，其中有一部分其实已经是运行时本体的一部分。

---

## 6. 顺序执行路径体现的是“稳定优先”，不是“能跑就行”

第 6575 行开始的 _execute_tool_calls_sequential()，可以说是 Hermes 最能体现“执行纪律”的地方之一。

如果把这段代码拆开看，你会发现它在做的绝不只是：

for tool_call in tool_calls:
- 解析参数
- 调一下函数
- 拿结果 append 回 messages

真正发生的事情要复杂得多。

首先，函数一进入每轮 tool_call 前，就会先检查 self._interrupt_requested。

如果用户已经发出了中断信号，那么当前还没开始的剩余工具都会被直接跳过，并且为每个被跳过的工具补上一条 tool message，内容类似：

[Tool execution cancelled — xxx was skipped due to user interrupt]

这说明 Hermes 不是粗暴“停止整个进程”，而是在维护消息流一致性。

也就是说，即使工具没有真的执行，messages 里也会留下一个结构化结果，告诉后续模型：这个工具没有完成，是因为用户中断了。

这类细节特别重要。因为 Agent 的下游行为依赖消息历史。如果你只是硬停，不补消息，后续恢复时很容易出现 tool_call 与 tool_result 对不上的问题。

其次，顺序路径里还会做参数解析、verbose/quiet logging、tool_progress_callback、tool_start_callback、checkpoint snapshot、destructive command 前的保护。

例如：

- 对 write_file、patch 这样的文件修改工具，会先让 checkpoint manager 做快照
- 对 terminal 里的 destructive command，也会尝试在执行前留 checkpoint

这说明 Hermes 已经把“工具执行前的可回滚性”作为运行时的一部分考虑进来了。

再往后，工具完成后还会做：

- 错误检测与日志记录
- tool_progress_callback 的 completed 事件
- tool_complete_callback
- maybe_persist_tool_result(...)：必要时把大结果持久化
- _subdirectory_hints.check_tool_call(...)：从工具参数里发现额外上下文 hint
- 构造标准 tool message 并 append 到 messages
- enforce_turn_budget(...)：做每轮 aggregate budget 约束
- 如有必要，把 budget warning 注入最后一个 tool result

这一连串动作说明，Hermes 对工具结果的理解不是“拿到文本就完了”，而是：

工具执行结果本身，也是 runtime 要继续加工、包装、限流、补充上下文、再反馈给模型的一类中间状态。

所以顺序路径真正体现的是“稳定优先”的工程观。

不是只要工具被调起来就算成功，而是要保证：

- 可打断
- 可记录
- 可追踪
- 可回滚
- 可继续被后续轮次正确消费

---

## 7. 并发执行路径体现的是 Hermes 已经开始认真做“调度优化”

如果一批工具调用适合并行，Hermes 会进入第 6351 行开始的 _execute_tool_calls_concurrent()。

这段代码非常值得注意，因为它说明 Hermes 的工程目标已经不只是“功能正确”，还开始关心“吞吐和等待时间”。

先看整体结构：

1. 先做 interrupt pre-flight 检查
2. 解析每个 tool_call 的 arguments
3. 对 memory / skill_manage 做计数器重置
4. 对 write_file / patch / destructive terminal 做 checkpoint
5. 把这些调用整理成 parsed_calls
6. 用 ThreadPoolExecutor 并发执行 _run_tool
7. 等所有 future 完成
8. 再按原始顺序把结果逐个 append 回 messages

这里最关键的一点，不是“用了线程池”，而是“结果按原始 tool-call 顺序回填”。

这说明 Hermes 很清楚：

并发执行是底层优化，但给模型看的消息历史顺序必须稳定。

也就是说，它不会因为工具 A 先完成、工具 B 后完成，就把 tool messages 按完成时间乱序塞回去。相反，它会保留模型原本发出工具调用时的顺序，以保证 API 侧看到的消息结构仍然可预测。

这是一种非常典型的 runtime thinking：

内部可以激进优化，但外部语义要尽量稳定。

除此之外，并发路径里还做了不少与顺序路径对应的事情：

- 每个工具启动前发 started callback
- 每个工具结束后判断 is_error
- quiet mode 下使用 spinner
- tool completed 后同样做 maybe_persist_tool_result
- 同样检查 subdirectory hints
- 最后也会 enforce_turn_budget，并可能把 budget warning 注入最后一个 tool message

说明 Hermes 并没有因为并发路径更复杂，就牺牲统一的生命周期管理。

这也是成熟系统常见的特征：

不同执行策略可以不同，但生命周期钩子、结果包装方式、预算约束方式尽量统一。

---

## 8. Hermes 不是等出错再说，它在正常路径里就提前埋了“收束机制”

很多 Agent 项目只要能跑通 happy path，就已经算完成。

但 Hermes 的 run_agent.py 很明显在正常路径里就提前考虑了“别失控”。

一个特别典型的例子，是预算压力注入。

不管是顺序执行路径还是并发执行路径，在一轮工具调用处理完之后，都会调用 _get_budget_warning(api_call_count)。

而第 6910 行开始的 _get_budget_warning() 又定义了一个两级策略：

- 70% 左右进入 caution：提醒开始收束
- 90% 左右进入 warning：要求立刻准备 final response

而且这个 warning 不只是打印给用户看，还会被注入到最后一个 tool result 的 JSON 或文本里，让模型自己也能看见。

这一点很关键。

因为它代表 Hermes 的预算控制不是只在系统外部做，而是主动把“你快没迭代额度了”变成模型下一轮决策时的上下文。

这和很多系统的差别非常大。

很多系统只是外层计数，超了就硬停；而 Hermes 会先尽量让模型在额度耗尽前自己收束。

这是一种更像 runtime 的做法：

不是等系统崩溃才截断，而是尽量把资源约束前置为模型可感知的执行条件。

---

## 9. 上下文压力不是抽象风险，而是 run_agent.py 里被实时监控和显式提示的对象

另一个很能体现 Hermes 工程成熟度的点，是它对 context pressure 的处理。

在第 6934 行附近，可以看到 _emit_context_pressure(self, compaction_progress, compressor)。

这个函数本身不修改消息流，而是做用户可见的通知：

- CLI 下会打印格式化后的 context pressure 行
- Gateway 下会通过 status_callback 发出状态消息

从实现看，它会结合：

- 当前距离压缩阈值还有多远
- threshold_tokens / context_length 的比例
- compression_enabled 是否开启

然后生成对应提示。

这背后的思路其实很值得注意。

很多系统处理上下文长度的方式是：

能撑就撑，撑不住就压缩，压缩完继续跑。

而 Hermes 额外多做了一层：

在真正压缩之前，先把“上下文正在逼近风险区”这件事显式暴露出来。

这会带来两个好处：

第一，它让用户知道系统发生了什么，而不是突然感觉回答风格变了、历史细节丢了却不知道原因。

第二，它让上层交互渠道可以把这种状态事件当成一等信号，而不是只能从最终回答里间接猜测。

这说明 Hermes 的上下文管理并不是一个躲在后台的黑箱，而是被设计成可观测的运行时状态。

---

## 10. 真正拉开差距的地方，是它把“异常情况”当成主路径的一部分来设计

如果只看 happy path，很多 Agent 项目都能讲出一套差不多的故事：

- 调模型
- 调工具
- 把结果返回

Hermes 真正拉开差距的，是它把异常情况当成系统设计的主路径之一，而不是补丁。

从我们读到的第 7710 行之后那大段逻辑，就能非常明显地看到这一点。

### 10.1 空响应 / 畸形响应不会直接把会话打爆

run_agent.py 在拿到 API response 之后，会先判断 response shape 是否有效。

而且它不是只做一种 API 模式的判断，而是分三种：

- codex_responses：检查 response.output 是否为 list，是否为空，必要时看 output_text fallback
- anthropic_messages：检查 response.content 是否为 list，是否为空
- 其他 chat_completions 风格：检查 response.choices 是否存在、是否为空

如果响应被判定为 invalid：

- 会先停掉 spinner
- 增加 retry_count
- 优先尝试 fallback chain，而不是盲目长时间重试
- 记录 provider / model / error message / response time
- 如果超过 max_retries，返回结构化失败结果
- 否则按 jittered exponential backoff 等待后重试
- 等待期间还持续检查 interrupt，保证用户仍然能打断

这段逻辑非常像一个真正的 runtime，而不像 demo。

因为它默认承认一件事：

模型 API 并不会总是老老实实返回结构完整的结果，尤其在多 provider 环境下更是如此。

所以系统要做的不是“假设 API 永远正确”，而是先分类、再重试、再 fallback、最后才失败。

### 10.2 输出截断不是简单报错，而是尽量恢复

另一段非常关键的逻辑，是第 7857 行之后对 finish_reason == "length" 的处理。

Hermes 在这里并不是简单打印“输出超长”。

它会继续判断：

- 这是普通内容截断，还是 tool_call 被截断
- 是否出现了“thinking budget exhausted”，也就是模型把 token 全花在推理上，结果没有留下可见回答
- 是否应该请求 continuation
- 是否应该回滚到上一个完整 assistant turn

尤其是“thinking budget exhausted”这个分支，非常值得单独提一下。

代码里会检查：

- 有没有工具调用
- 截断内容里是否只有思考块，没有真正用户可见内容

如果判断成立，就直接返回一个面向用户的明确解释：

- 模型把输出 token 全用在 reasoning 上了
- 没给最终回答留下预算
- 建议降低 reasoning effort 或提高 max_tokens

这类逻辑说明 Hermes 不只是看 finish_reason 字面值，而是在推断“这次截断到底意味着什么问题”。

对普通内容截断，Hermes 还会在 chat_completions 模式下尝试 continuation：

- 把当前 assistant 截断内容先追加到 messages
- 如果还没超过 continuation 次数上限，就主动插入一条 system-style user message
- 要求模型“从刚才中断的地方继续，不要重复前文”

如果连续三次都还截断，才返回 partial 结果。

这说明 Hermes 的默认哲学不是“截断了就算失败”，而是“只要还有合理恢复路径，就尽量继续把答案做完”。

### 10.3 被截断的 tool call 会被拒绝执行

更细的一点是，如果响应因为长度限制而导致 tool_call 本身被截断，Hermes 会非常保守。

第一次发现时，它会重试一次 API 调用；
如果再次发现 truncated tool call，就明确拒绝执行不完整参数，并返回 partial/error。

这其实是非常对的取舍。

因为对普通文本来说，截断也许只是缺几句解释；
但对 tool_call 来说，参数不完整意味着可能直接触发错误动作。

Hermes 在这里选择了安全优先，而不是“差不多就执行”。

这说明它已经开始把 tool call 当成有副作用的执行指令，而不是普通文本片段。

---

## 11. 上下文压缩不是独立功能，而是主循环能继续跑下去的条件

在第 6200 行附近，我们还能看到 context compression 完成后的处理逻辑。

这里有几个非常关键的信号：

- 压缩完成后会更新 session DB 的 system prompt
- 如果 compression 次数已经达到 2 次以上，会提示用户精度可能下降，建议 /new
- 会重新估算压缩后的 token 数，并更新 context_compressor.last_prompt_tokens
- 如果压缩后压力降到 warning level 以下，还会重置 context pressure 的 warning 状态
- 会清空 file-read dedup cache，避免压缩后重新读取文件时只拿到“未变化” stub

这说明 Hermes 把压缩理解为：

不是简单“删掉一点历史”，而是一次会影响后续认知状态、缓存状态、数据库状态、文件读取行为的系统级事件。

这也正是为什么 _build_system_prompt() 的注释会说，system prompt 正常只构建一次，只有 compression 之后才会重建。

因为当上下文被压缩后，整个会话的认知前缀已经变了，系统必须承认自己进入了一个新的上下文阶段。

从 runtime 的角度说，这特别重要。

成熟 Agent 系统里，上下文压缩绝不是一个外挂优化，而是主循环继续存活的条件之一。

Hermes 在 run_agent.py 里明显已经按这个级别对待它了。

---

## 12. 这一切拼起来后，你会发现 Hermes 处理的其实是“持续执行”问题

如果把这一章看到的 run_agent.py 关键逻辑收束一下，会发现 Hermes Agent 真正在解决的不是“如何让模型回答得更像人”，而是“如何让一个带工具的大模型在真实执行环境里持续工作”。

这个“持续工作”具体落到源码里，就是下面这些能力被接到了同一个闭环里：

- system prompt 动态装配，但 session 内尽量稳定
- 模型调用不是一次性，而是多轮循环
- 工具调用既支持顺序，也支持有条件并发
- agent-level tools 由内核直接拦截处理
- 工具结果会被包装、持久化、预算约束、补充上下文 hint 后再喂回模型
- 接近迭代上限时，模型会被提前提醒尽快收束
- 上下文膨胀时，系统会先发出压力提示，再进入压缩
- API 空响应、畸形响应、401、429、截断、推理预算耗尽，都有对应恢复或失败路径
- 用户中断不会粗暴打断消息流，而是尽量保持结构一致性

当这些点连起来，你就会明白：

Hermes Agent 最值得学的，并不是某一个 prompt 技巧，也不是某一个工具定义，而是它已经开始认真面对 Agent 在真实环境中必然遇到的一整套“持续执行问题”。

这正是 run_agent.py 的价值。

它把 Hermes 从“模型接口外壳”拉成了“执行运行时”。

---

## 把这一轮闭环收住

基于当前 hermes-agent 仓库的 `run_agent.py` 现有源码，我认为 Hermes Agent 的执行内核可以这样概括：

它不是简单做一次模型调用，然后看情况调几个工具；而是围绕消息流、工具流、错误恢复、上下文控制和预算管理，搭起了一套尽量稳定的执行闭环。

这个结论主要来自以下源码事实：

- _build_system_prompt() 显示 system prompt 是按身份、记忆、技能、上下文、平台动态装配，并尽量缓存稳定
- _execute_tool_calls() 显示工具执行本身是运行时调度问题，而不是简单函数转发
- _invoke_tool() 显示 todo、memory、session_search、clarify、delegate_task 这类工具已经属于 Agent 内核层
- _execute_tool_calls_sequential() 和 _execute_tool_calls_concurrent() 显示 Hermes 同时关注稳定性、可中断性、可追踪性和执行效率
- _get_budget_warning()、_emit_context_pressure() 以及 finish_reason / invalid response 相关分支，说明 Hermes 已经把资源约束和异常恢复做成主路径能力

所以，如果第一章的关键词是“全局地图”，那么这一章的关键词就是：执行闭环。

下一章，我们可以继续沿着这条主线往外展开，去看 model_tools.py：Hermes 是怎样把 tools/ 目录里的分散能力，变成一套对模型可见、对运行时可控、对能力边界尽量对齐的工具系统的。

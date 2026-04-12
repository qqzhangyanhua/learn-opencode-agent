# 附录 K｜Agent Loop 接管工具专章：Hermes 为什么有些工具不能走普通 Registry Dispatch

## 先看哪些工具必须由 Agent Loop 接管

很多人第一次看 Hermes 的工具系统时，会自然形成一种预期：

- 所有 tool 都注册到 registry
- 模型发起 tool call
- `handle_function_call(...)` 统一 dispatch
- 每个 tool 像普通函数一样执行

这种理解对大部分工具都成立。

比如：

- `web_search`
- `terminal`
- `read_file`
- `browser_click`

它们基本都可以被理解为：

- 给参数
- 调 handler
- 返回 JSON 结果

但 Hermes 里偏偏有四个工具不是这么走的：

- `memory`
- `todo`
- `session_search`
- `delegate_task`

在 `model_tools.py` 里，它们甚至被单独列进了 `_AGENT_LOOP_TOOLS`，注释写得也很明确：

- 这些工具会被 `run_agent.py` 的 agent loop 拦截
- 因为它们需要 agent-level state
- registry 里仍然保留 schema
- 但普通 dispatch 只返回一个 stub error

这篇附录就专门回答一个很关键的问题：

Hermes 为什么要让 `memory`、`todo`、`session_search`、`delegate_task` 脱离普通 registry dispatch，而让 agent loop 亲自接管？

这一篇主要结合这些源码和测试文件来看：

- `model_tools.py`
- `run_agent.py`
- `tools/todo_tool.py`
- `tools/delegate_tool.py`
- `tools/memory_tool.py`
- `tools/session_search_tool.py`
- `tests/test_model_tools.py`
- `tests/run_agent/test_run_agent.py`
- `tests/run_agent/test_agent_loop.py`

---

## 1. Hermes 最重要的判断：不是所有 tool call 都只是“函数调用”

先看 `model_tools.py` 里这段定义：

- `_AGENT_LOOP_TOOLS = {"todo", "memory", "session_search", "delegate_task"}`

旁边的注释已经把原因说穿了：

这些工具需要 agent-level state。

这句话非常关键。

因为它说明 Hermes 对 tool 的理解不是“一律函数化”。

在 Hermes 看来，tool call 至少分两类：

### 1.1 普通工具

这类工具更像 stateless handler：

- 拿到参数
- 调用外部系统或执行本地动作
- 返回结果

例如：

- 搜网页
- 读文件
- 跑终端命令

### 1.2 运行时内核工具

这类工具虽然对模型暴露成“tool”，  
但本质上已经不是普通外部动作，而是 agent runtime 自己的一部分。

它们会直接依赖：

- 当前 `AIAgent` 实例里的内存状态
- 当前 session 的数据库句柄
- 当前 loop 的活动跟踪和中断传播
- 当前父 Agent 的权限边界与子 Agent 生命周期

所以这类工具如果还强行按“普通 registry 函数”执行，语义就会开始错位。

Hermes 选择的不是把所有东西硬塞进一个 dispatch 模型里，  
而是承认：

有些工具其实已经属于 agent loop 本身。

---

## 2. `model_tools.py` 的处理很成熟：schema 仍然统一暴露，但执行权回收到 agent loop

这是 Hermes 非常值得学的一点。

它并没有因为这四个工具特殊，就把它们完全踢出工具系统。  
相反，它做的是一种很稳的分层：

- schema 仍然在 registry 里
- 模型仍然把它们看成 tool
- 但真正执行时，普通 `handle_function_call(...)` 不直接跑

看 `model_tools.py` 的 `handle_function_call(...)`：

- 如果 `function_name in _AGENT_LOOP_TOOLS`
- 就直接返回一个 JSON error
- 告诉你这个工具必须由 agent loop 处理

`tests/test_model_tools.py` 也专门验证了这件事：

- 对 `_AGENT_LOOP_TOOLS` 里的每个名字做普通 `handle_function_call(...)`
- 返回结果必须含有 `"agent loop"`

这代表 Hermes 在架构上做了一个非常成熟的折中：

### 2.1 对模型来说，它们还是正式 tool

这样模型的决策接口保持统一，不用区分：

- “这是工具”
- “那不是工具”

### 2.2 对 runtime 来说，它们不是普通 handler

因为真正的语义需要读写 agent 实例状态，  
所以必须由 `run_agent.py` 自己在 loop 里接管。

这就是为什么 Hermes 没走两个极端：

- 既没有把这四个能力硬编码成“模型看不见的内部逻辑”
- 也没有为了统一而硬塞进普通 dispatch

而是把“暴露接口”和“执行宿主”拆开了。

---

## 3. `run_agent.py` 明确把这四个工具作为 loop 内部分支处理

继续看 `run_agent.py`。

无论是并发路径里的 `_invoke_tool(...)`，还是顺序路径里的 `_execute_tool_calls_sequential(...)`，  
你都会看到类似的分支：

- `if function_name == "todo"`
- `elif function_name == "session_search"`
- `elif function_name == "memory"`
- `elif function_name == "delegate_task"`

而只有剩下那些普通工具，才会走到：

- `handle_function_call(...)`

这一步非常重要。

因为它说明 Hermes 不是“偶尔例外”，  
而是系统性地把这四个工具定义为：

agent loop 自己负责的执行语义。

对学习智能体的人来说，这里最值得记住的一点是：

一个工具是否应该走统一 dispatch，标准不在于“它有没有 schema”，  
而在于：

它的执行是不是只依赖参数本身。

如果它还依赖：

- 当前 agent 持有的 store
- 当前 session id
- 当前 parent agent
- 当前 loop 的活动控制

那它往往就已经不是普通 dispatch 能完整表达的东西了。

---

## 4. `todo` 不能走普通 dispatch，因为它操作的是每个 Agent 自己那份任务状态

先看 `tools/todo_tool.py`。

这个文件头已经说得很直接：

- state lives on the `AIAgent` instance
- one per session

`TodoStore` 也是一个很明确的 in-memory store。

而在 `run_agent.py` 初始化时，你会看到：

- `self._todo_store = TodoStore()`

这说明 `todo` 根本不是一个单纯的“写文件工具”或者“调外部 API 工具”，  
而是在操作当前 agent 实例持有的一份会话级任务状态。

### 4.1 `todo` 需要直接拿到 `self._todo_store`

在 `run_agent.py` 里执行 `todo` 时，Hermes 调的不是普通 registry dispatch，  
而是：

- `_todo_tool(..., store=self._todo_store)`

这一步说明 `todo` 的真正语义不是：

- 给我一组参数，我独立执行

而是：

- 修改当前 agent 这轮会话正在维护的任务表

如果只走普通 `handle_function_call(...)`，它根本拿不到这份 agent 实例内的 store。

### 4.2 `todo` 还要参与上下文压缩后的状态延续

`TodoStore` 里还有一个非常关键的方法：

- `format_for_injection()`

它会在 context compression 之后，把仍然活跃的 task list 重新注回会话。

`run_agent.py` 里还有：

- `_hydrate_todo_store(...)`

也就是说，`todo` 不只是一次调用，它还要和：

- 会话历史
- 压缩恢复
- 当前 agent 的持续工作状态

绑在一起。

这已经明显不是普通 registry handler 的职责了。

所以 `todo` 被 agent loop 接管，本质上是在保护一件事：

任务状态必须属于具体 agent 会话，而不是某个脱离上下文的通用函数。

---

## 5. `memory` 不能走普通 dispatch，因为它不仅写 store，还要遵守 prompt 稳定性和 memory provider 桥接

`memory` 更是一个典型例子。

在 `run_agent.py` 初始化时，Hermes 会按配置创建：

- `self._memory_store = MemoryStore(...)`

并且立即：

- `self._memory_store.load_from_disk()`

这已经说明 `memory` 从一开始就是 agent 实例级状态。

### 5.1 `memory` 调用时必须拿到当前 agent 的 store

执行 `memory` 时，Hermes 走的是：

- `_memory_tool(..., store=self._memory_store)`

如果没有这份 store，`tools/memory_tool.py` 自己就会报：

- Memory is not available

所以它不可能是一个只靠 JSON 参数就能稳定执行的普通工具。

### 5.2 `memory` 还和当前 session 的 prompt 稳定性直接相关

你如果看过前面的附录 J，就会知道：

- `MemoryStore.format_for_system_prompt(...)` 返回的是 frozen snapshot
- mid-session writes 不会改当前 session 的 system prompt

这意味着 `memory` 的执行语义不只是“写成功没”，  
还隐含着：

- 这次写入什么时候才能影响后续 prompt
- 当前这轮系统前缀是否必须保持稳定

这种约束只有 agent loop 自己最清楚。

### 5.3 `memory` 还会桥接外部 memory provider

在 `run_agent.py` 里执行 `memory` 后，你还能看到一段 bridge 逻辑：

- 如果有 `self._memory_manager`
- 并且 action 是 `add` 或 `replace`
- 就调用 `self._memory_manager.on_memory_write(...)`

也就是说，`memory` 执行完不是简单返回结果就结束，  
它还要通知外部 memory provider 生态。

这更加说明：

`memory` 的语义已经跨过了普通 handler 边界，进入 agent runtime 的内部协调层。

---

## 6. `session_search` 不能走普通 dispatch，因为它依赖当前 session 数据库和当前 session 的排除逻辑

再看 `session_search`。

`run_agent.py` 里执行它时，会先判断：

- `if not self._session_db`

然后才调用：

- `_session_search(..., db=self._session_db, current_session_id=self.session_id)`

这里其实已经暴露了两个普通 dispatch 做不到的依赖。

### 6.1 它需要当前 agent 持有的 `SessionDB`

`session_search` 不是一个自己去全局找数据库连接的工具。  
它依赖的是当前 agent 已经绑定好的：

- `self._session_db`

而这个对象是在 `AIAgent` 初始化时注进来的，并且还会参与：

- `create_session(...)`
- `append_message(...)`
- `update_system_prompt(...)`

所以 `session_search` 其实是建立在“当前 agent 已经活在某个 session persistence 体系里”的前提上的。

### 6.2 它还必须知道“当前 session 是谁”，以避免自我污染

`tools/session_search_tool.py` 的测试里反复守一件事：

- current session 不能被召回
- current session 的 parent / child lineage 也要排除

而要做到这件事，工具执行时就必须拿到：

- `current_session_id=self.session_id`

如果只走普通 registry dispatch，它拿到的只是函数参数，  
并不知道当前 agent 正在跑哪一个 session。

这会直接破坏 `session_search` 的核心语义。

所以 `session_search` 被 agent loop 接管，核心原因并不是“它复杂”，  
而是：

它的正确性直接依赖当前会话身份。

---

## 7. `delegate_task` 最不可能走普通 dispatch，因为它本质上是在操纵父子 Agent 结构

四个里最典型的就是 `delegate_task`。

你看 `run_agent.py` 里执行它时，传进去的不只是普通参数，还有：

- `parent_agent=self`

这基本已经把答案写在脸上了。

`delegate_task` 不是一个普通工具动作，  
它本质上是在当前 agent 之上，再造一层 child agent runtime。

### 7.1 子 Agent 需要继承父 Agent 的真实运行条件

看 `tools/delegate_tool.py` 里的 `_build_child_agent(...)`，它会从 `parent_agent` 上拿很多东西：

- `enabled_toolsets`
- `valid_tool_names`
- `model`
- `provider`
- `base_url`
- `session_db`
- `session_id`
- `tool_progress_callback`
- `providers_allowed`

这说明 `delegate_task` 的真正语义不是：

- 帮我异步跑个函数

而是：

- 基于当前父 Agent 的运行状态，构造一个受限的子 Agent

如果没有 `parent_agent`，这件事根本不成立。

### 7.2 子 Agent 的权限边界也必须由父 Agent 来裁

`tools/delegate_tool.py` 里还有一段很关键的逻辑：

- 子 Agent 请求的 toolsets 要和父 Agent 的 toolsets 取交集
- `delegation`、`clarify`、`memory`、`code_execution` 这些 blocked toolsets 会被剥掉

这也是 `tests/tools/test_delegate_toolset_scope.py` 反复在守的东西。

所以 `delegate_task` 不是单纯启动一个新 agent，  
而是要在父 Agent 的权限边界里生成子 Agent。

这一步只有 parent agent 自己最有资格做。

### 7.3 它还要参与中断、活动心跳、子任务回传

继续看 `delegate_tool.py` 和 `run_agent.py` 的配合，你会发现还有更多 runtime 级语义：

- 父 Agent 维护 `_active_children`
- delegation 时要传 child progress callback
- 子 Agent 的工具活动要回传给父级 spinner / gateway progress
- 父级 inactivity timeout 期间要靠 child heartbeat 维持活动

这些都说明：

`delegate_task` 并不是“普通工具做了一些额外工作”，  
而是 agent loop 在做运行时编排。

所以它不走普通 registry dispatch，不是例外，而是必然。

---

## 8. 这四个工具的共同点，不是“比较复杂”，而是都在读写 Agent 自己的内部状态

把这四个工具放在一起看，其实就很清楚了。

### 8.1 `todo`

依赖：

- `self._todo_store`
- 压缩后任务恢复

### 8.2 `memory`

依赖：

- `self._memory_store`
- frozen snapshot 纪律
- external memory provider bridge

### 8.3 `session_search`

依赖：

- `self._session_db`
- `self.session_id`
- 当前会话排除逻辑

### 8.4 `delegate_task`

依赖：

- `parent_agent=self`
- 父子 Agent 的权限和生命周期协调

所以它们真正的共同点不是“工具逻辑长”，  
而是：

它们都不是纯参数函数，而是对当前 agent runtime 的内生操作。

一旦你明白这一点，就会发现 Hermes 这个设计其实非常合理。

因为它在守一个很重要的边界：

普通 registry 负责调度外部动作；  
agent loop 负责维护自己这台 runtime 机器的内部状态。

---

## 9. Hermes 这套设计对学习智能体的人最值得记住的四个原则

看完这一层，你其实能提炼出几条非常通用的设计原则。

### 9.1 不要为了“统一”而牺牲语义正确性

不是所有能力都适合硬塞进一个 dispatch 模型里。  
如果某个工具的正确性依赖 agent 内部状态，就应该承认它的特殊性。

### 9.2 schema 暴露和执行宿主可以分离

Hermes 最成熟的一点，就是：

- 对模型暴露成统一 tool interface
- 对 runtime 保留不同执行宿主

这让接口统一和内部正确性可以同时成立。

### 9.3 会话级状态应该属于具体 Agent 实例

`todo`、`memory`、`session_search` 都在提醒你：

只要一个能力依赖当前 session，就不应该把它做成脱离实例的全局函数。

### 9.4 子 Agent 不是普通异步任务，而是运行时编排行为

`delegate_task` 这类能力一旦涉及：

- 权限裁剪
- 回调桥接
- session 继承
- 中断传播

它就已经属于 runtime orchestration，而不是普通工具调用。

---

## 最后把接管边界收一下

如果把这一篇压缩成一句话，那就是：

Hermes 把 `memory`、`todo`、`session_search`、`delegate_task` 交给 agent loop 接管，不是因为它们“特殊到没法做成工具”，而是因为它们本质上已经是 runtime 自己的一部分。

在 Hermes 里：

- registry 负责统一暴露工具 schema
- 普通 dispatch 负责大多数外部动作
- agent loop 负责那些依赖实例状态、会话身份和父子编排关系的内核工具

也正因为这层边界划得清楚，Hermes 才能既保持工具接口统一，  
又不把真正的运行时语义做烂。

对学习智能体的人来说，这层非常值得抄。

因为它提醒我们：

真正成熟的 Agent Runtime，不只是“会调很多工具”，  
还知道哪些能力必须由 loop 自己亲自接管。

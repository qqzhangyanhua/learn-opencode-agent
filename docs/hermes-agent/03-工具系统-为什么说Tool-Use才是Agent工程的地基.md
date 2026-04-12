# 03｜工具系统才是 Agent 工程的地基：拆开 model_tools.py 看 Hermes 怎么把能力变成可控运行时

## 先把地基看清楚

如果说上一章我们回答的是“一个 Agent 到底是怎么跑起来的”，那么这一章要继续追问一个更底层的问题：

模型为什么能稳定地“看见”工具？

更进一步说，为什么 Hermes 里的工具不是一堆零散函数，而是一套对模型可见、对运行时可过滤、对平台可裁剪、对副作用可分层的能力系统？

这个问题，不能只去看 tools/ 目录。

因为 tools/ 目录只告诉你“有哪些工具”。
真正决定这些工具如何进入模型上下文、如何被不同入口裁剪、如何避免 schema 和实际可用性错位、如何被统一分发执行的，是 model_tools.py。

所以这一章的目标很明确：

严格基于当前 hermes-agent 仓库的 `model_tools.py` 现有源码，回答 Hermes 为什么能把工具系统做成 Agent 工程的地基，而不是一堆杂乱外挂。

---

## 1. model_tools.py 不是工具集合，而是“工具编排薄层”

打开 model_tools.py，文件开头的模块注释其实已经把定位说得非常明确。

它不是说“这里定义了所有工具”，而是说：

- 它是 tool registry 上方的一层 thin orchestration layer
- tools/ 里的每个工具文件通过 tools.registry.register() 自注册 schema、handler 和 metadata
- 这个模块负责触发 discovery
- 然后向 run_agent.py、cli.py、batch_runner.py、RL environments 暴露统一 public API

这段注释很重要，因为它直接说明 Hermes 对工具系统的基本哲学：

工具能力本身分散在各个实现文件里；
但工具如何被系统整体消费，必须经过一层统一编排。

这层统一编排，就是 model_tools.py。

从工程分层上看，这个选择非常对。

如果没有这一层，Hermes 会出现几个经典问题：

- run_agent.py 必须知道每个工具具体怎么注册
- CLI、Gateway、batch runner 可能各自维护一套工具加载逻辑
- 工具 schema 是否可见、工具运行时是否可用，会频繁错位
- 不同平台或 profile 想裁剪工具能力时，没有统一入口

而 model_tools.py 的作用，就是把这些分散问题压平。

所以这个文件最值得注意的地方，不是“写了哪些工具”，而是它把工具从分散实现，变成了一个可被整个 Hermes 运行时统一消费的能力层。

---

## 2. Hermes 的工具发现不是扫描目录，而是“导入即注册”

理解 Hermes 工具系统，第一步要看 _discover_tools()。

这个函数从第 132 行开始，注释写得很直白：

Import all tool modules to trigger their registry.register() calls.

也就是说，Hermes 采用的不是“扫描 tools 目录、解析文件名、动态反射类定义”那一套，而是更直接的一种模式：

每个工具模块在 import 时自己调用 registry.register() 完成注册；
model_tools.py 只负责把这些模块导入进来，触发注册副作用。

源码里可以看到一个明确的 _modules 列表，当前包括：

- tools.web_tools
- tools.terminal_tool
- tools.file_tools
- tools.vision_tools
- tools.skills_tool
- tools.skill_manager_tool
- tools.browser_tool
- tools.cronjob_tools
- tools.todo_tool
- tools.memory_tool
- tools.session_search_tool
- tools.clarify_tool
- tools.code_execution_tool
- tools.delegate_tool
- tools.process_registry
- tools.send_message_tool
- tools.homeassistant_tool

等等。

这里有两个工程信号非常值得注意。

第一，discover 过程被包在函数里，并且每个 import 都有 try/except。

源码注释专门提到：

这样即使某个可选工具依赖没装好，比如 fal_client 缺失，也不会阻止其他工具加载。

这说明 Hermes 的工具发现不是全有或全无，而是允许部分能力降级。

第二，基础工具发现完成后，文件还会继续做两轮扩展发现：

- MCP tool discovery：通过 tools.mcp_tool.discover_mcp_tools()
- Plugin discovery：通过 hermes_cli.plugins.discover_plugins()

这意味着 Hermes 的工具系统从一开始就不是“内置工具表”那么简单，而是至少包含三层来源：

1. 内置工具模块
2. MCP 外部工具
3. 插件工具

换句话说，Hermes 并不是把工具系统写死在仓库里，而是在架构上预留了外部能力接入位。

这会直接决定后面章节要谈的一件事：

Hermes 的 tool layer，不只是能力清单，更像一个能力总线。

---

## 3. registry 是能力底座，但 model_tools.py 决定“哪些能力真的对模型可见”

很多人看到 tools.registry.register() 之后，会本能觉得：

那 registry 才是关键，model_tools.py 只是转发而已。

这个理解只对一半。

registry 确实是能力底座，但真正决定“本次会话里哪些工具对模型可见”的，是 get_tool_definitions()。

这个函数从第 234 行开始，注释说得很清楚：

Get tool definitions for model API calls with toolset-based filtering.

它的职责不是返回“所有已注册工具”，而是返回“这一次模型 API 调用应该看到的工具 definitions”。

这两者差别非常大。

因为在一个真实 Agent 系统里：

- 已注册工具，不等于要全部开放
- 可安装工具，不等于当前平台适合暴露
- schema 存在，不等于依赖满足、当前真的能用
- 同一个 Hermes，不同 profile / platform / session 里，工具曝光面可以完全不同

get_tool_definitions() 正是在解决这个问题。

它先根据 enabled_toolsets / disabled_toolsets 算出 tools_to_include。

这里也能看到 Hermes 对兼容性的照顾：

- 如果 validate_toolset(toolset_name) 成立，就走新的 toolset 解析路径
- 如果是旧的 legacy 名称，比如 web_tools、browser_tools、file_tools，也还能映射到具体工具名单
- 如果什么都没指定，就默认加载所有 toolsets 解析出来的工具

这一步体现的是 Hermes 工具系统的第一个关键能力：

不是按“工具名列表”硬写，而是按 toolset 做分层暴露。

这样做的价值非常大。

因为一旦系统有了 toolset 这一层，平台、入口、配置和权限控制都可以在这个粒度上工作，而不是每次手写几十个工具名。

---

## 4. 工具可见性不由 schema 决定，而由“过滤后真实可用集合”决定

get_tool_definitions() 里最值得重视的一段，是第 301 行之后。

这里不是直接把 tools_to_include 原样返回，而是调用：

registry.get_definitions(tools_to_include, quiet=quiet_mode)

源码旁边的注释非常关键：

only returns tools whose check_fn passes

这意味着 Hermes 明确区分了两件事：

- 逻辑上想包含哪些工具
- 运行时真正可用哪些工具

一个工具即使属于当前启用的 toolset，如果它的 check_fn 没通过，最后也不会进入 filtered_tools。

然后 Hermes 还专门从 filtered_tools 里再提取出一份 available_tool_names。

注释解释得非常清楚：

后续任何会在 schema 描述里提到“其他工具名字”的逻辑，都必须基于这份真实可用集合，而不能基于原始 tools_to_include；否则模型会在描述里看见其实并不存在的工具，进而 hallucinate 不可用调用。

这段注释其实已经非常接近一本 Agent 工程书里最值钱的经验了。

很多工具系统最常见的 bug，不是工具本身坏了，而是：

schema 里说得好像能用，真正执行时才发现没 API key、没依赖、被禁用了。

对模型来说，这种“可见能力”和“真实能力”错位是非常致命的。

因为模型不是在读人类文档，而是在按你暴露给它的 schema 做行动决策。

Hermes 在这里做得非常工程化：

它把“真实可用工具集合”当成后续 schema 二次修正的唯一可信来源。

这说明 Hermes 的工具系统不是静态描述层，而是 runtime-aware 的能力暴露层。

---

## 5. execute_code 和 browser_navigate 两个特例，暴露出 Hermes 对“schema 幻觉”的强警惕

继续看 get_tool_definitions()，有两段非常值得单独分析。

### 5.1 execute_code 的 schema 会被动态重建

第 310 行之后，源码专门处理 execute_code：

- 从 tools.code_execution_tool 导入 SANDBOX_ALLOWED_TOOLS 和 build_execute_code_schema
- 取 sandbox_enabled = SANDBOX_ALLOWED_TOOLS ∩ available_tool_names
- 用这份交集动态生成 execute_code 的 schema
- 再把 filtered_tools 里原先的 execute_code definition 替换掉

为什么要这样做？

注释已经写明：

如果不这么做，模型会在 execute_code 的描述里看到“web_search 可以在沙箱里调用”之类的信息，即使这些工具当前 API key 没配或者 toolset 被禁用了。

这其实是非常典型的 Agent 工程问题。

因为 execute_code 这种“工具中的工具”天生带有跨工具引用，一旦静态 schema 写死，很容易出现描述比现实更乐观。

Hermes 的解决方案很干脆：

不信静态 schema，按当前会话真实可用工具重新生成。

### 5.2 browser_navigate 的描述会被动态去交叉引用

另一个例子是第 323 行之后对 browser_navigate 的处理。

静态 schema 里原本写着：

For simple information retrieval, prefer web_search or web_extract (faster, cheaper).

但如果当前 available_tool_names 里没有 web_search / web_extract，Hermes 会直接把这句从 description 里删掉。

原因同样非常现实：

如果描述里还保留这句，模型就会倾向去调用根本不存在的 web_search 或 web_extract。

这两个特例拼在一起，你会看到 Hermes 一个非常成熟的倾向：

它不把 schema 当成纯文档，而把 schema 当成模型决策界面。

既然 schema 会直接影响模型下一步要做什么，那么 schema 里任何跨工具引用都必须和当前运行时现实完全对齐。

这件事说起来很小，但实际上特别重要。

因为很多 Agent 系统到后期都会被这种“描述层失真”拖垮：

- 文档说能做
- 模型以为能做
- 运行时其实做不了
- 然后系统陷入错误重试、幻觉调用和无意义 token 消耗

Hermes 在 model_tools.py 里针对这类问题已经有了非常明确的防线。

---

## 6. _last_resolved_tool_names 这个小全局变量，说明工具系统不只是给模型看，还要给其他运行时组件看

在第 195 行附近，model_tools.py 定义了一个进程级变量：

_last_resolved_tool_names: List[str] = []

注释写的是：

Used by code_execution_tool to know which tools are available in this session.

到了 get_tool_definitions() 末尾，又会把当前 filtered_tools 的名字写回这个全局变量。

表面看，这像一个普通缓存。

但从系统结构上看，它暴露出一个更重要的事实：

工具可见性结果，不只是给模型 API 用的，还会反向影响某些运行时组件自己的行为。

最典型的就是 execute_code。

它并不只是“模型看见一个 execute_code schema 然后调用一下”这么简单；
它自己也需要知道当前 session 里到底有哪些工具可用，才能生成正确的 sandbox 能力边界。

这说明 Hermes 的工具系统不是单向的：

不是 registry -> schema -> model 这么一条线，
而是 schema 解析结果本身还会回流到运行时其他组件。

AGENTS.md 里还特别提醒过一件事：

_last_resolved_tool_names 是 process-global，delegate_tool.py 的 _run_single_child() 会在子 agent 执行时保存和恢复它。

这进一步说明工具系统已经不仅是配置问题，而是并发上下文问题。

也就是说，当 Hermes 开始支持子 Agent 和多执行上下文时，“当前有哪些工具可用”也成了一份必须被保护的运行时状态。

---

## 7. handle_function_call() 才是工具系统真正落地执行的统一入口

如果说 get_tool_definitions() 解决的是“模型看见什么工具”，那么 handle_function_call() 解决的就是“模型请求执行之后，系统到底怎么调”。

这个函数从第 459 行开始，注释写得很直接：

Main function call dispatcher that routes calls to the tool registry.

从职责上看，它做了几层非常关键的事情。

### 7.1 先做参数类型矫正，而不是盲目信任 LLM JSON

在真正 dispatch 之前，handle_function_call() 第一件事就是：

function_args = coerce_tool_args(function_name, function_args)

而 coerce_tool_args() 上面整整一段注释都在解释：

LLM 经常会把数字写成字符串、把布尔值写成字符串，所以这里会根据注册 schema 的类型定义，把 "42" 尝试转成 42，把 "true" / "false" 尝试转成布尔。

这其实非常实用。

因为真实模型输出的 JSON，远没有大家想象得那么严格。

如果没有这层矫正，很多工具执行错误根本不是业务错误，而只是因为模型把 limit="10" 而不是 limit=10。

Hermes 在这里选择的不是“要求模型永远完美遵守 schema”，而是运行时主动做一层保守修复。

这是非常典型的工程取向：

对上游不完美输入做容错，让工具层尽量看到更接近正确类型的参数。

### 7.2 Agent loop 自己管理的工具，不允许误走 registry

接着往下，第 497 行附近会先判断 function_name 是否属于 _AGENT_LOOP_TOOLS。

当前集合是：

- todo
- memory
- session_search
- delegate_task

如果命中，handle_function_call() 不会真的 dispatch，而是直接返回：

{"error": "xxx must be handled by the agent loop"}

这一点和上一章 run_agent.py 的 _invoke_tool() 正好互相印证。

也就是说，model_tools.py 自己明确承认：

有一批工具虽然 schema 在 registry 里，但执行权不在这里，而在 agent loop。

这再次说明 Hermes 工具系统不是平面模型。

Schema 可以统一暴露；
但执行时仍然要分出“运行时内核工具”和“普通 registry 工具”。

这是非常重要的架构边界。

### 7.3 正常工具统一走 registry.dispatch()

对于普通工具，handle_function_call() 最终都会落到 registry.dispatch()。

其中 execute_code 还有一个特例：

- 优先使用调用方传进来的 enabled_tools
- 否则回退到 _last_resolved_tool_names
- 再把这份 sandbox_enabled 传给 registry.dispatch()

这说明 execute_code 的执行权限不是固定写死，而是跟当前 session 实际启用工具强绑定。

而普通工具则带着 task_id、user_task 等上下文进入 dispatch。

换句话说，model_tools.py 做的不是“自己执行全部逻辑”，而是把执行入口统一、上下文补齐、边界分流之后，再交给 registry。

这个“薄，但关键”的位置，恰恰就是它的价值所在。

---

## 8. 工具调用前后还有插件 hook，这说明 Hermes 不是只想“能调”，而是想“可扩展地调”

继续看 handle_function_call()，还有一个容易被忽略但很重要的点：

在真正 dispatch 前后，它都会尝试调用 hermes_cli.plugins.invoke_hook()：

- pre_tool_call
- post_tool_call

也就是说，Hermes 不只是允许插件注册新工具，
它还允许插件在既有工具调用生命周期前后插入扩展逻辑。

这会给整个系统带来非常多可能性：

- 审计
- 遥测
- 调用观测
- 安全策略注入
- 额外日志归档
- 按平台做工具调用适配

这类 hook 设计特别说明一件事：

Hermes 的工具系统不是“工具注册完就结束”，而是已经开始考虑工具调用生命周期的二次编排。

这意味着它并不满足于“有工具可用”，而是在往“可插拔能力运行时”方向走。

对于一个 Agent 框架来说，这种能力往往比单独多几个工具更值钱。

因为它决定系统后期是否还能继续增长，而不会在新增需求面前只能不断改核心代码。

---

## 9. 异步桥接看起来像细节，其实决定了工具系统能不能在多入口环境里稳定活着

model_tools.py 前半部分还有一块非常关键，但很容易被忽视的内容：

_async bridging。

文件开头从第 35 行开始，就专门实现了一套 sync -> async 的桥接逻辑，包括：

- 主线程持久 event loop：_get_tool_loop()
- worker thread 的 thread-local event loop：_get_worker_loop()
- 统一桥接入口：_run_async(coro)

注释里反复提到一个真实问题：

如果每次都用 asyncio.run()，虽然方便，但会创建并关闭新的 event loop；而缓存的 httpx / AsyncOpenAI 客户端还绑定在旧 loop 上，后续垃圾回收或复用时就会报 “Event loop is closed”。

Hermes 的解决方案是：

- CLI 主线程上用持久 loop
- worker thread 上用 thread-local 持久 loop
- 如果当前已经在一个运行中的 event loop 内，比如 gateway 异步栈，就另开线程跑 asyncio.run()

这段逻辑单看似乎不像“工具系统”，更像底层兼容代码。

但实际上，它恰恰决定了工具系统能否在 Hermes 的多入口环境里稳定工作。

别忘了，Hermes 不是只跑在 CLI：

- gateway 是 async 环境
- delegate_task 可能在线程池里跑
- RL 环境也有自己的执行上下文

如果没有这层桥接保护，工具 handler 只要稍微涉及 async client，就很容易在不同入口里出现 loop 生命周期冲突。

所以这部分虽然不直接定义工具，却决定了工具系统有没有资格成为“全局能力底盘”。

一个只能在单线程单入口下勉强可用的工具系统，不能算成熟 Agent 工程；
而 Hermes 明显已经在这里下过功夫。

---

## 10. 从 model_tools.py 往回看，你会发现 Hermes 真正做的是“能力治理”

把前面这些点连起来看，model_tools.py 其实并不是一个简单中间层。

它做的事情可以概括为四个字：能力治理。

这里的“治理”，具体体现在：

### 10.1 统一发现

所有内置工具、MCP 工具、插件工具，最终都要先经过统一 discovery。

### 10.2 统一过滤

不是注册了就给模型看，而是要经过 toolset、legacy 兼容、check_fn 可用性过滤。

### 10.3 统一暴露

最终给模型看的不是静态 schema 仓库，而是当前 session / platform / config 条件下真实可用的 definitions。

### 10.4 统一调度入口

真正执行时，统一通过 handle_function_call() 进入 dispatch，必要时再把 agent-loop 工具分流出去。

这四件事叠在一起，Hermes 的工具系统就不再是“很多工具”，而变成“很多能力被统一治理后形成的一套运行时接口”。

这就是为什么我会说，Tool Use 不是 Hermes 的一个附属功能，而是它的地基。

没有这层治理：

- 模型看到的能力边界会混乱
- 不同平台会暴露出不一致甚至错误的工具集合
- 子 Agent、沙箱、插件之间的权限边界会不断穿透
- registry、schema、实际依赖状态会频繁错位
- 工具调用失败会有大量根本不必要的类型和上下文错误

而 model_tools.py 的价值，就是尽量让这些问题在进入主循环之前就被收束掉。

---

## 11. 这一章真正重要的结论：Hermes 的工具系统之所以像“地基”，是因为它已经从“功能枚举”升级成“运行时接口层”

很多项目在介绍工具系统时，重点总放在：

- 有多少工具
- 能不能联网
- 能不能读文件
- 能不能执行代码

但如果你认真读当前 hermes-agent 仓库里的 `model_tools.py`，会发现 Hermes 真正更在意的不是“工具多不多”，而是：

- 工具发现是不是统一的
- 工具可见性是不是 runtime-aware 的
- schema 和真实能力是否严格对齐
- 内核工具和普通工具是否分层
- 跨入口、跨线程、跨插件环境下的调用路径是否稳定

这几个问题一旦处理不好，工具越多，系统越乱。

而 Hermes 在 model_tools.py 里给出的答案，已经明显不是“把函数接给模型”这种初级做法了。

它在做的是：

把工具系统收束成一个可配置、可裁剪、可过滤、可扩展、可分流、可在多运行时环境稳定工作的能力接口层。

这就是它为什么像地基。

因为 run_agent.py 的多轮闭环能否成立，很大程度上取决于 model_tools.py 有没有先把“模型到底能看见什么、这些能力到底能不能安全稳定落地”处理好。

没有这个前提，再漂亮的主循环也只是空转。

---

## 最后把地基收一下

基于当前 hermes-agent 仓库的 `model_tools.py` 现有源码，我认为 Hermes 的工具系统可以这样概括：

它不是把一组工具函数塞给模型，而是围绕 discovery、toolset filtering、runtime availability、schema 动态修正、agent-loop 分流、统一 dispatch 和 async bridging，搭起了一层真正可运营的能力接口层。

这个结论主要来自以下源码事实：

- _discover_tools() 通过导入即注册触发内置工具发现，并继续扩展到 MCP 与插件工具
- get_tool_definitions() 不是返回全部注册工具，而是按 toolset 和 check_fn 过滤后生成当前会话真正可见的 definitions
- execute_code 与 browser_navigate 的 schema 会基于 available_tool_names 动态修正，避免模型看见虚假能力
- _last_resolved_tool_names 说明工具可见性结果还会回流到其他运行时组件，成为上下文状态的一部分
- handle_function_call() 在 dispatch 前做参数类型矫正、Agent 内核工具分流、插件 hook、上下文补齐和统一执行入口管理
- _run_async() 及其持久 event loop 机制说明工具系统被设计为可在 CLI、Gateway、线程池等多入口环境稳定工作

所以，如果第二章的关键词是“执行闭环”，那么这一章的关键词就是：能力治理。

下一章，我们可以继续往 Hermes 的长期状态层推进，去看记忆系统：为什么它不是每次都失忆，以及 memory / session_search / 用户画像到底是怎样被嵌入执行内核的。

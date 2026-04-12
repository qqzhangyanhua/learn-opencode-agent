# 附录 AD｜Tool Registry 与插件注册专章：Hermes 为什么工具系统不是一堆 if-else，而是一条统一注册总线

## 先把注册总线看成基础设施

很多人第一次给 Agent 接工具时，最容易写出一种很快能跑的结构：

- 在某个文件里手写一大堆 tool schema
- 再在另一个文件里写一大堆 `if function_name == ...`
- 然后慢慢补更多映射表

这种写法前期很快，
但工具一多，系统就会迅速开始分裂：

- schema 在一处
- handler 在一处
- toolset 分组在一处
- 可用性判断又在另一处
- 插件工具还要额外开旁路

最后你会得到一个典型问题：

- 工具系统表面上能跑
- 但没有统一的注册总线

Hermes 在这件事上的处理非常工程化。

它没有把工具系统做成：

- 一个巨大的 `if-else`
- 或几份互相同步的平行字典

而是明确以：

- `tools/registry.py`

作为工具世界的中心注册表，
再让：

- `tools/*.py`
- `model_tools.py`
- `toolsets.py`
- 插件系统
- Agent Loop

都围着这条注册总线工作。

这一章就专门回答这个问题：

Hermes 为什么坚持把工具系统做成一条统一的 Tool Registry，并且让插件注册也走同一条总线？

这一篇主要结合这些源码来看：

- `tools/registry.py`
- `model_tools.py`
- `toolsets.py`
- `hermes_cli/plugins.py`
- `run_agent.py`

---

## 1. Hermes 最核心的判断：工具不是“函数集合”，而是“带元数据的运行时实体”

先把问题想透。

在一个真正能跑多轮 Agent 的系统里，一把工具不只是一个 Python 函数。

它至少还自带这些信息：

- 工具名
- 所属 toolset
- 给模型看的 schema
- 真正执行的 handler
- 依赖检查函数
- 需要的环境变量
- 是否异步
- 展示描述
- emoji / UI 元信息
- 结果大小限制

也就是说，对 Hermes 来说，
工具从来不是：

- `def web_search(...): ...`

而是：

- 一份“函数 + 元数据 + 可用性 + 分组归属”的完整声明

这就是为什么 `tools/registry.py` 一上来就定义了：

- `ToolEntry`

它把每个工具都包装成一个统一的元数据对象。

这一点很重要。

因为它决定了 Hermes 后面可以用一套统一机制完成：

- schema 收集
- toolset 解析
- availability 检查
- 执行 dispatch
- UI 展示
- 插件工具接入

如果没有这层统一元数据对象，
后面每多一种能力，就会多长出一套平行结构。

---

## 2. `tools/registry.py` 的核心角色：它不是工具实现文件，而是全系统的工具账本

`tools/registry.py` 文件头注释已经把自己的定位写得很清楚：

- 每个工具文件在模块导入时调用 `registry.register()`
- `model_tools.py` 查询 registry
- 不再维护自己的平行数据结构

这几句话非常值钱。

因为它说明 Hermes 做 Registry 的目的，
不只是“集中一下工具列表”，
而是主动消灭这类老系统常见问题：

- schema 一套
- handler 一套
- toolset map 一套
- requirements 一套
- availability 判断又单独来一套

Hermes 的答案是：

- 这些都应该回到同一份 registry 真相源

### 2.1 `register(...)` 是这条总线的入口

一个工具注册进来时，至少会带上：

- `name`
- `toolset`
- `schema`
- `handler`
- `check_fn`
- `requires_env`
- `is_async`

也就是说，Registry 的入口不是：

- “把这个函数记住”

而是：

- “把这个工具的运行时身份完整声明出来”

### 2.2 name collision 也被显式看见

`register(...)` 里还有一段很值得注意：

- 如果已有同名工具，但来自不同 toolset
- 会打 warning

这说明 Hermes 不是把注册过程当成“静默覆盖”。

它至少要让你知道：

- 工具命名已经开始冲突

这对插件系统尤其关键。

因为一旦第三方工具也能接进来，
命名冲突就不再只是理论风险。

---

## 3. 为什么 Hermes 要让 `tools/*.py` 在 import 时自注册

Hermes 工具体系最核心的装配动作之一就是：

- 每个工具模块自己在 import 时调用 `registry.register()`

这点在 `tools/registry.py` 文件头注释和 `model_tools.py` 的 `_discover_tools()` 里都写得很清楚。

### 3.1 这意味着工具声明和工具实现被绑在一起

一个 `tools/*.py` 文件通常会同时包含：

- 工具实现
- 可用性检查
- schema
- `registry.register(...)`

这样做的直接好处是：

- 你不用去另一个中心文件同步登记一遍

也就是说，Hermes 避免了这种高成本模式：

1. 写工具实现
2. 去 schema 表里加一条
3. 去 dispatch 表里加一条
4. 去 toolset 表里再加一条

在 Hermes 里，工具模块自己对自己的注册负责。

### 3.2 `model_tools.py` 只负责“触发发现”，不负责重复维护定义

`model_tools.py` 的 `_discover_tools()` 会 import 一串工具模块：

- `tools.web_tools`
- `tools.terminal_tool`
- `tools.file_tools`
- `tools.skills_tool`
- ...

这些 import 的真正意义不是“为了调用里面的函数”，
而是：

- 触发模块级 `registry.register()`

这就是为什么 `model_tools.py` 文件头说它是：

- thin orchestration layer over the tool registry

它不再是工具定义中心，
而只是：

- 发现工具
- 向外暴露公共 API

这让系统分层变得清楚很多。

---

## 4. Registry 真正统一了哪些事情：schema、dispatch、toolset、availability 都回到了同一份数据

看 `tools/registry.py` 的方法集合，你会发现它解决的不是单点问题，而是一整组工具系统的基础问题。

### 4.1 schema retrieval

- `get_definitions(...)`
- `get_schema(...)`

这让“给模型看的函数定义”回到 registry。

### 4.2 dispatch

- `dispatch(...)`

这让“按工具名执行 handler”回到 registry。

### 4.3 toolset / requirements / availability

- `get_toolset_for_tool(...)`
- `get_tool_to_toolset_map(...)`
- `is_toolset_available(...)`
- `check_toolset_requirements(...)`
- `get_available_toolsets(...)`
- `get_toolset_requirements(...)`

这让“工具属于哪个组、这个组是否可用、依赖什么环境变量”也回到 registry。

### 4.4 UI / 展示元数据

- `get_emoji(...)`
- `max_result_size_chars`

这让“怎么显示工具”也不用另开一套表。

这正是统一注册总线最重要的价值：

- 一份声明
- 多个消费方共享

如果少了这层，
Hermes 后面的 CLI、Gateway、Prompt Builder、插件系统、toolset 选择器都会开始各自维护自己的工具世界观。

---

## 5. `model_tools.get_tool_definitions(...)`：Hermes 为什么还需要一个编排层，而不是直接让 run_agent 读 registry

如果 registry 已经这么强，为什么还要有 `model_tools.py`？

因为 Hermes 还需要一层“工具选择与运行时编排”。

`get_tool_definitions(...)` 做的核心事情是：

### 5.1 先根据 enabled / disabled toolsets 算出候选工具

它会：

- 解析 `enabled_toolsets`
- 或在 `disabled_toolsets` 基础上做差集
- 支持 legacy toolset 名称

也就是说，它先解决的是：

- 这一轮到底允许哪些工具进入模型视野

### 5.2 再调用 registry 做 availability 过滤

候选工具出来后，真正生成 schema 时还是会回到：

- `registry.get_definitions(...)`

这里会执行每个工具的 `check_fn()`

只有通过检查的工具，才真的出现在最终的 OpenAI-format tool definitions 里。

这一步非常关键。

因为它说明 Hermes 做的是两层过滤：

- toolset 级别的“想不想给”
- runtime 级别的“现在能不能用”

### 5.3 再做 schema 后处理

后面 `model_tools.py` 还会根据最终可用工具做一些动态修正：

- `execute_code` 的 sandbox tool schema 只保留当前真的可用的工具
- `browser_navigate` 在 web 工具不可用时，会删掉 description 里对它们的引用

这说明 `model_tools.py` 的意义不是和 registry 重复，
而是：

- 把 registry 产出的工具声明，修整成一轮具体 API 调用真正该看到的版本

所以它更像：

- registry 之上的运行时编排层

而不是：

- 第二套工具注册中心

---

## 6. `handle_function_call(...)`：Hermes 执行工具时也坚持先走统一总线，再让 Agent Loop 接管特例

`model_tools.py` 的另一个核心入口是：

- `handle_function_call(...)`

这个函数特别适合帮助你理解 Hermes 的执行边界。

### 6.1 默认路径：统一走 registry.dispatch(...)

绝大多数普通工具，最终都会走：

- `registry.dispatch(function_name, function_args, ...)`

也就是说，Hermes 的默认心智模型是：

- 工具执行应当由统一注册表分发

而不是：

- 在 Agent Loop 里一层层手写 `if name == ...`

### 6.2 但 Hermes 也明确承认：有些工具不属于普通 registry dispatch

源码里专门定义了：

- `_AGENT_LOOP_TOOLS = {"todo", "memory", "session_search", "delegate_task"}`

这些工具如果落到 `handle_function_call(...)`，
会直接返回：

- `must be handled by the agent loop`

这说明 Hermes 的态度不是教条式的“所有工具都必须走 registry”。

它更准确的态度是：

- 默认走统一总线
- 但需要 agent-level state 的工具，由 Agent Loop 接管

这和前面你让我补过的“Agent Loop 接管工具专章”正好能接上。

### 6.3 工具执行前后，插件 hook 也挂在同一条链上

`handle_function_call(...)` 在真正 dispatch 前后，还会调用：

- `invoke_hook("pre_tool_call", ...)`
- `invoke_hook("post_tool_call", ...)`

这意味着插件不是绕开工具总线插进去的，
而是挂在工具总线两端。

这点非常重要。

因为它保证了插件和内建工具没有两套执行世界。

Hermes 依然在坚持：

- 一条总线
- 插件只是挂载点，不是旁路系统

---

## 7. `toolsets.py` 为什么也要围着 registry 转：静态工具集与插件工具集最终必须汇合

如果只有内建工具，
`toolsets.py` 完全可以只维护一份静态 `TOOLSETS` 字典。

但 Hermes 没停在这里。

看 `toolsets.py` 后半段，你会发现它专门补了对插件工具集的兼容：

- `_get_plugin_toolset_names()`
- `get_all_toolsets()`
- `validate_toolset(...)`
- `resolve_toolset(...)`

### 7.1 插件 toolset 不是写死在 `TOOLSETS` 里的

`_get_plugin_toolset_names()` 会直接去看：

- `registry._tools.values()`

把所有：

- `entry.toolset not in TOOLSETS`

的工具集名找出来。

也就是说，在 Hermes 里，
插件工具集并不要求你提前改 `toolsets.py`。

只要插件注册工具时声明了某个 `toolset`，
这个 toolset 就能被动态感知到。

### 7.2 `resolve_toolset(...)` 会对未知静态 toolset 回退到 registry

如果某个 toolset 名称不在静态 `TOOLSETS` 里，
但在插件工具集名集合里，
Hermes 会直接从 registry 里把属于这个 toolset 的工具都找出来。

这一步特别重要。

因为它说明 Hermes 不是把插件工具“挂进 registry 但忘了 toolset 世界”。

它在有意识地让：

- 静态工具集
- 动态插件工具集

最后汇合到同一套解析逻辑里。

### 7.3 `get_all_toolsets()` 还会为插件工具集生成 synthetic entries

这样像 `hermes tools` 之类的 UI，
就能把插件 toolset 也展示出来。

这背后的方法论很清楚：

- 插件工具不是二等公民
- 一旦注册成功，就应该尽量进入 Hermes 原有的工具选择与展示体系

---

## 8. 插件工具为什么能天然接进这条总线：因为 `PluginContext.register_tool()` 直接委托给 registry

这就是这章最关键的连接点。

`hermes_cli/plugins.py` 里的：

- `PluginContext.register_tool(...)`

最终做的事情就是：

- 调 `registry.register(...)`

然后顺手把工具名记进：

- `_plugin_tool_names`

这意味着插件工具并不是：

- 单独一张注册表
- 单独一个 dispatch 分支
- 单独一套 schema 生成逻辑

而是直接进入 Hermes 现有的 Tool Registry 世界。

这是一个非常关键的工程选择。

因为它让插件作者只需要声明：

- 工具名
- toolset
- schema
- handler
- check_fn
- requires_env

然后后面的事情就自动复用 Hermes 原生机制：

- schema 出现在 `get_tool_definitions(...)`
- toolset 进入 `toolsets.py` 的动态解析
- availability 出现在 registry 检查里
- dispatch 走统一 `registry.dispatch(...)`
- UI 展示也能从 registry 拿元数据

如果没有这步“插件注册也走 registry”，
Hermes 很快就会分裂出：

- 内建工具系统
- 插件工具系统

两套平行世界。

而它显然不想要这个结果。

---

## 9. Registry 还解决了哪些“只有系统做大后才会痛”的问题

### 9.1 async handler 桥接

`registry.dispatch(...)` 里会识别：

- `entry.is_async`

然后通过 `model_tools._run_async(...)` 桥过去。

也就是说，异步工具不是另开一套调用协议，
而是被 registry 统一桥接。

### 9.2 异常格式统一

dispatch 时所有异常都会被兜成：

- `{"error": "..."}`

这让 LLM、UI、测试面对的错误格式更稳定。

### 9.3 MCP 动态工具更新的“拆旧建新”

`registry.deregister(...)` 的注释里还专门提到：

- 这用于 MCP 动态工具发现变化时的 nuke-and-repave

这说明 Registry 不只是启动时的一次性静态表，
它还能支持：

- 运行中的动态工具集变化

这对未来扩展特别关键。

---

## 10. 测试侧面说明了什么：Hermes 在验证“统一分发”，不是验证某个函数恰好能跑

虽然这一章不靠单个测试文件支撑，但已有测试已经侧面说明了几件关键事。

### 10.1 `test_invoke_tool_dispatches_to_handle_function_call`

`tests/run_agent/test_run_agent.py` 里这个测试验证：

- `_invoke_tool(...)` 对普通工具应路由到 `handle_function_call(...)`

这说明 Agent Loop 对普通工具的默认态度就是：

- 走统一总线

而不是自己私下 dispatch。

### 10.2 `test_skills_prompt_derives_available_toolsets_from_loaded_tools`

同一个测试文件里，还有一组关于 skills prompt 的测试，
会根据实际加载的工具反推出：

- `available_toolsets`

这说明 toolset 不是纯文档概念，
而是会反向影响 Prompt Builder 的运行时输入。

### 10.3 `telegram_menu_commands` 一类测试

`tests/hermes_cli/test_commands.py` 里关于 Telegram 命令菜单的测试，
本质上也在验证：

- 工具 / skill / plugin 命令最终必须进入统一的命令与展示体系

换句话说，Hermes 的统一总线不是只为了“代码好看”，
而是为了让：

- Prompt
- UI
- Dispatch
- Plugin
- Toolset

这些模块讲的是同一种工具语言。

---

## 11. 读完这一篇记住 5 点

### 11.1 工具系统一旦变复杂，就必须有单一事实源

schema、handler、toolset、availability、UI 元数据，
最好不要散在五个地方各维护一份。

### 11.2 默认走统一总线，特例再显式接管

Hermes 的做法不是“什么都强行 registry 化”，
而是：

- 普通工具走 registry
- 必须依赖 agent-level state 的工具明确由 Agent Loop 接管

这样边界最清楚。

### 11.3 插件工具最好复用原生工具注册机制

如果插件工具单独再来一套 schema / dispatch / toolset 逻辑，
系统迟早会裂成两半。

### 11.4 toolset 不是装饰，它是运行时过滤与提示词装配的一部分

Hermes 里 toolset 会影响：

- 工具是否进入本轮 API 调用
- Skills prompt 如何展示可用能力
- UI 如何让用户开关能力

所以它必须和 Registry 保持同一真相源。

### 11.5 好的 Registry 不只是“存东西”，还要承接演化

异步桥接、统一错误格式、动态 deregister、
插件工具集并入静态工具集解析，
这些都说明真正成熟的 Registry 是系统演化的基础设施。

---

## 最后把注册机制收一下

Hermes 的工具系统之所以能在内建工具、插件工具、toolset 选择、Prompt Builder、Gateway、CLI 之间保持一致，
核心原因不在于它有多少工具，
而在于它先建立了一条统一的 Tool Registry 总线。

顺着源码看，你会发现这条总线承担了整套工具世界的公共事实：

- `tools/*.py` 在 import 时自注册，把实现和声明绑在一起
- `tools/registry.py` 持有工具的 schema、handler、toolset、availability 与元数据
- `model_tools.py` 在 Registry 之上做运行时编排、toolset 过滤和 schema 后处理
- `toolsets.py` 又把静态工具集和插件工具集统一解析到同一逻辑里
- `PluginContext.register_tool()` 则让第三方工具直接复用这条总线，而不是另起炉灶

所以这章最值得你带走的一句话是：

当 Agent 开始拥有很多工具时，你真正需要设计的，往往不是“更多工具”，
而是“一条让所有工具声明、过滤、展示、执行都说同一种语言的注册总线”。

Hermes 的 Tool Registry，本质上就是这条工程原则在源码里的落地版本。

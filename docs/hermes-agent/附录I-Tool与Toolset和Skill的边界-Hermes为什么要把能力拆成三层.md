# 附录 I｜Tool 与 Toolset 和 Skill 的边界：Hermes 为什么要把能力拆成三层

## 先把三层能力边界切开

很多刚开始学 Agent 的人，第一次看一个复杂项目时，经常会把这三样东西混在一起：

- tool
- toolset
- skill

看起来它们都像“让 Agent 更会做事的能力”，于是就很容易产生一种模糊理解：

- 反正都是能力，放一起也差不多
- 多加几个 tool 就等于多几个 skill
- toolset 只是分组名字，没什么本质意义

但如果你带着这种理解去看 Hermes，很容易看晕。

因为 Hermes 明显不是把这三者混着设计的。

它做的是三层分工：

- tool：真正执行动作的原子能力
- toolset：控制当前会话暴露哪些动作能力
- skill：把可复用的方法论、流程和经验打包成按需加载的策略单元

这篇附录就专门回答一个对初学者非常关键的问题：

Hermes 为什么不把“能力”只做成一层，而要拆成 tool、toolset、skill 三层？

这一篇主要结合这些源码和测试文件来看：

- `tools/registry.py`
- `model_tools.py`
- `toolsets.py`
- `run_agent.py`
- `agent/prompt_builder.py`
- `tests/test_model_tools.py`
- `tests/tools/test_delegate_toolset_scope.py`
- `tests/agent/test_prompt_builder.py`

---

## 1. Hermes 最重要的判断：动作能力、能力暴露、经验复用，不是同一个问题

如果你先不看具体实现，只看目录结构，其实 Hermes 已经把这三层分得很明显了：

- `tools/` 目录里是一堆具体工具实现
- `toolsets.py` 单独定义工具集合与组合方式
- `skills` 相关逻辑又单独落在 `tools/skills_tool.py`、`agent/skill_commands.py`、`agent/prompt_builder.py`

这说明 Hermes 从架构上就在避免一个常见错误：

把“Agent 会什么”理解成一个单层列表。

在真实系统里，这其实至少是三个完全不同的问题：

### 1.1 它到底能执行什么动作

比如：

- `web_search`
- `terminal`
- `read_file`
- `browser_click`

这是 action layer，也就是 tool 层。

### 1.2 当前这一轮到底允许它看到哪些动作

比如：

- CLI 能不能开 terminal
- 某个子 Agent 能不能继续 delegation
- 某个平台是否要隐藏某些交互型工具

这是 capability surface，也就是 toolset 层。

### 1.3 当它遇到某类复杂任务时，应该遵循什么套路

比如：

- 调试应该先做什么检查
- 前端任务要遵循什么风格
- 某类平台操作有哪些坑

这是 reusable workflow，也就是 skill 层。

Hermes 把这三类问题拆开，最大的好处就是：

每一层都只解决自己那一类复杂度。

---

## 2. Tool 在 Hermes 里首先是“可注册、可调度、可校验的动作原语”

先看 `tools/registry.py`。

这个文件头已经把关系说得很直接：

- 每个 tool 文件在模块加载时调用 `registry.register()`
- 注册自己的 schema、handler、toolset membership、availability check
- `model_tools.py` 再统一向外提供 schema 和 dispatch 能力

这说明 Hermes 对 tool 的定义非常清楚：

tool 不是“模型知道的一个概念”，而是一个正式注册过的动作单元。

### 2.1 一个 tool 至少有五个正式属性

从 `ToolEntry` 和 `register(...)` 能看出来，一个 tool 至少带着这些东西：

- `name`
- `toolset`
- `schema`
- `handler`
- `check_fn`

再往后还有：

- `requires_env`
- `description`
- `emoji`
- `max_result_size_chars`

也就是说，Hermes 里的 tool 从一开始就不是 prompt 里的一句“你可以搜索网页”，  
而是一个完整的运行时对象。

### 2.2 tool 的本质是动作，不是经验

这一点特别重要。

例如 `web_search` 的职责很单纯：

- 接收参数
- 执行搜索
- 返回结果

它不负责告诉模型：

- 遇到什么场景该先搜什么
- 搜完以后怎么筛选
- 哪类问题更适合换另一条路径

这些不是 tool 的工作，而是上层策略的问题。

所以如果你把 tool 理解成“Agent 的知识”，就会很容易误判。  
tool 在 Hermes 里更接近：

可以被调度的执行接口。

### 2.3 tests 也在守这个边界

`tests/test_model_tools.py` 里对 `handle_function_call(...)` 的测试，本质上就在守一件事：

不管传进来的调用多乱，dispatch 这一层都要维持稳定、统一的接口语义。

比如：

- 未知 tool 必须返回 JSON error
- agent loop 接管的 tool 不能在普通 dispatch 里乱跑
- `get_toolset_for_tool(...)` 要能查到每个 tool 的归属

这进一步说明 Hermes 把 tool 当成正式执行原语，而不是提示词里的散装能力描述。

---

## 3. Toolset 在 Hermes 里不是“目录分类”，而是运行时可见面的裁剪层

很多人第一次看到 `toolsets.py`，容易低估它，以为只是把工具做个分组。

但 Hermes 里 toolset 的作用远远不只是“分类好看”。

先看 `toolsets.py` 开头，它直接说了：

- toolsets allow you to group tools together for specific scenarios
- can be composed from individual tools or other toolsets
- support dynamic toolset resolution

这说明 Hermes 把 toolset 设计成了：

控制当前会话到底暴露什么能力的中间层。

### 3.1 toolset 决定了“模型这轮能看到什么”

看 `model_tools.py` 里的 `get_tool_definitions(...)`。

这个函数的核心逻辑很清楚：

- 如果传了 `enabled_toolsets`
- 就先 `resolve_toolset(...)`
- 得到 `tools_to_include`
- 再交给 registry 取 schema

也就是说，模型看到的并不是“所有已注册工具”，  
而是“当前 toolset 解析后的可见工具”。

这点非常关键。

因为在 Agent 里，“系统里存在某工具”和“这一轮把它暴露给模型”是两回事。

Hermes 正是在用 toolset 解决这个问题。

### 3.2 toolset 还支持组合，不只是平铺

`toolsets.py` 里既有基础 toolset：

- `web`
- `terminal`
- `file`
- `skills`
- `memory`

也有组合型和场景型 toolset：

- `debugging`
- `safe`
- `hermes-cli`
- `hermes-gateway`

`resolve_toolset(...)` 还支持递归展开 `includes`。

这说明 Hermes 不是单纯在维护一个“标签系统”，  
而是在维护一套可以组合、复用、平台化装配的能力面。

### 3.3 同一个 Hermes，在不同入口可以长得不一样

`toolsets.py` 里有一整组：

- `hermes-cli`
- `hermes-telegram`
- `hermes-discord`
- `hermes-whatsapp`
- `hermes-gateway`

这些定义非常值得初学者注意。

因为它们说明 Hermes 从架构上接受一个现实：

同一个 Agent，不同运行入口，本来就应该暴露不同的能力组合。

这就是 toolset 层存在的根本价值：

它不是解释“工具是什么”，而是在回答：

当前这个运行面，应该把哪些工具交给模型。

---

## 4. `model_tools.py` 是这三层关系里的关键中间站：把 toolset 解析成真正的 tool surface

如果说 `tools/registry.py` 是工具总表，`toolsets.py` 是可见面配置，  
那 `model_tools.py` 就是两者真正接起来的地方。

### 4.1 `_discover_tools()` 先把工具都发现出来

`model_tools.py` 一开始会 import 各种 `tools.*` 模块，触发它们注册到 registry。

这一步建立的是：

- 系统里理论上有哪些 tool

### 4.2 `get_tool_definitions(...)` 再按 toolset 过滤

然后它再根据：

- `enabled_toolsets`
- `disabled_toolsets`

去解析出当前这轮真正该出现的工具。

而且这里还有一个特别值得学的工程细节：

Hermes 不只过滤“有没有这个工具”，  
还会基于实际可用的 `available_tool_names` 动态修 schema。

例如：

- `execute_code` 的 schema 会只列当前真的能在沙箱里用的工具
- 如果 `browser_navigate` 出现在当前工具面里，但 `web_search` / `web_extract` 没有，它就会删掉描述里对 web tools 的交叉引用

这一步很有代表性。

因为它说明 Hermes 真正在意的不是“系统内部有多少能力”，  
而是“模型此刻看到的能力说明，必须和 runtime 真实一致”。

这就是 toolset 层和 tool 层被严格接起来的方式。

### 4.3 `get_toolset_for_tool(...)` 让工具归属成为正式查询能力

无论在 registry 还是 `model_tools.py`，都能看到 `get_toolset_for_tool(...)`。

这看起来像一个小函数，但它其实非常重要。

因为一旦 toolset 成为 runtime 的正式一层，  
系统内部很多地方就需要知道：

- 这个 tool 属于哪个能力面
- 当前有哪些 toolset 实际已启用

后面你会看到，Hermes 连 skills 索引的裁剪都要依赖这个映射。

---

## 5. Skill 在 Hermes 里处理的，不是“能不能做”，而是“该怎么做更稳”

到了这一层，就能看出 skill 和 tool 的本质差异了。

tool 解决的是：

- 能执行什么动作

skill 解决的是：

- 面对某类问题，应该遵循什么策略、步骤和经验

这也是为什么 Hermes 要在 `run_agent.py` 的 system prompt 装配里，单独加上 skills 相关部分。

看 `run_agent.py` 的 `_build_system_prompt()`，你会发现它会：

- 按当前 `valid_tool_names` 决定是否注入 `MEMORY_GUIDANCE`
- 决定是否注入 `SESSION_SEARCH_GUIDANCE`
- 决定是否注入 `SKILLS_GUIDANCE`

然后如果当前工具面里有：

- `skills_list`
- `skill_view`
- `skill_manage`

它才会继续计算 `avail_toolsets`，再调用 `build_skills_system_prompt(...)`。

这一步非常关键。

因为它说明 skill 不是底层动作原语，而是建立在一组工具可见的前提之上的策略层。

换句话说：

- 没有 `skill_view`，模型就没法按需加载 skill
- 没有 `skill_manage`，模型也不该被鼓励去维护 skill
- 当前 toolset 不同，skills index 的可见面也会跟着变化

这代表 Hermes 的 skill 从来不是脱离 runtime 独立存在的一段说明文案，  
而是和当前工具面联动的上层能力。

---

## 6. Hermes 最有工程味的一点，是 skill 还会反过来依赖 toolset 做裁剪

这一点很容易被忽略，但其实特别能体现 Hermes 的成熟度。

`run_agent.py` 在构建 skills prompt 时，会先根据 `valid_tool_names` 反推出：

- 当前有哪些 `avail_toolsets`

再把这些信息传给 `build_skills_system_prompt(...)`。

而 `agent/prompt_builder.py` 里的 `_skill_should_show(...)` 会继续用这些信息决定：

- 某个 fallback skill 要不要隐藏
- 某个 requires skill 要不要显示

这就形成了一个非常漂亮的闭环：

1. toolset 决定当前可见 tool
2. 当前可见 tool 再反推出当前有效 toolset
3. 当前有效 toolset 再决定哪些 skill 应该被模型看到

对学习智能体的人来说，这里特别值得记住。

因为它说明 Hermes 不是在做三层彼此独立的能力系统，  
而是在做三层有边界、但相互约束的运行时结构。

`tests/agent/test_prompt_builder.py` 里关于 fallback / requires 的那批测试，本质上就在验证这个闭环没有断。

---

## 7. 子 Agent 的 toolset 约束，进一步说明 toolset 是权限边界，不是文档分组

如果你还觉得 toolset 只是“整理方便”，那 `tests/tools/test_delegate_toolset_scope.py` 非常值得看。

这些测试守的是一个很现实的问题：

如果父 Agent 只有某些 toolset，子 Agent 能不能自己申请更多？

答案是不行。

测试里明确验证了：

- 子 Agent 请求的 toolsets 必须和父 Agent 已有 toolsets 取交集
- `delegation`、`clarify`、`memory` 这类 blocked toolsets 会被剥掉
- 如果没有请求新的 toolsets，子 Agent 继承父级的可见面

这说明 toolset 在 Hermes 里已经不只是“能力组织单位”，  
还是正式的权限边界。

这一点对做多 Agent 系统的人尤其重要。

因为如果没有这层边界，模型完全可能在 delegation 时借机扩权。

Hermes 的处理很成熟：

- tool 是动作
- toolset 是动作边界
- delegation 时先继承边界，再做裁剪

这比“子 Agent 默认也能看到所有工具”安全得多。

---

## 8. 对学习智能体的人来说，这三层最值得记住的五个原则

看完 Hermes 这一套实现，你会发现它其实在反复强调几条很重要的设计原则。

### 8.1 不要把动作和策略混成一层

tool 负责做事，skill 负责指导怎么更稳地做事。  
这两者混在一起，系统会越来越乱。

### 8.2 不要把“系统里有”误当成“这轮该暴露”

toolset 的存在，就是为了把注册能力和当前暴露能力分开。

### 8.3 能力说明必须和 runtime 真实可见面一致

Hermes 动态修 schema、动态裁 skills index，本质都在守这个原则。

### 8.4 复用经验应该建立在真实工具面之上

skill 不是空中楼阁。  
它只有在相关 tools 真可用时，才值得被展示和调用。

### 8.5 多 Agent 系统一定要有能力边界

toolset 不只是开发便利，它还是 delegation 和权限收敛的关键抓手。

---

## 最后把三层分工收一下

如果把这一篇压缩成一句话，那就是：

Hermes 之所以把能力拆成三层，是因为“会做”“给不给做”“遇到这种事应该怎么做”本来就不是一回事。

在 Hermes 里：

- `tool` 是动作原语
- `toolset` 是运行时可见面和权限边界
- `skill` 是按需加载的复用策略包

也正因为它把这三层拆清楚了，Hermes 才能同时做到：

- 底层动作很多，但不会每轮都全暴露
- 平台和子 Agent 的能力面可以被精确裁剪
- 经验复用不会反过来污染整个 system prompt

对学习智能体的人来说，这一层非常值得抄。

因为它告诉我们：

真正成熟的 Agent，不是“能力名词越多越强”，  
而是“能力分层越清楚，系统越稳、越好扩展”。

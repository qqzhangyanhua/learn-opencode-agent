# 附录 F｜Code Execution 与 Terminal 的边界：Hermes 为什么同时保留两套执行能力

## 先把两套执行能力区分开

很多人第一次看到 Hermes 里既有 `terminal`，又有 `execute_code`，第一反应通常都是：

- 这两个是不是功能重复了
- 既然都能跑点东西，为什么不只留一个
- `execute_code` 会不会只是 `terminal` 的高级包装

如果只是从“能不能执行”这个角度看，它们确实有重叠。

但只要你认真看当前仓库里的源码，就会发现 Hermes 的理解完全不是这样。

在 Hermes 里：

- `terminal` 解决的是命令执行 runtime
- `execute_code` 解决的是程序化 tool orchestration

前者更像让 Agent 进入一个执行环境，去跑命令、管进程、接 PTY、做后台任务。  
后者更像给模型一块受限 Python 沙箱，让它在一个推理回合里自己写脚本，把多次工具调用压缩成一次程序化执行。

所以这一篇附录想回答的问题是：

Hermes 为什么不把 `execute_code` 合并进 `terminal`，也不把 `terminal` 合并进 `execute_code`，而是同时保留两套执行能力？

这一篇主要结合这些源码和测试文件来看：

- `tools/code_execution_tool.py`
- `tools/terminal_tool.py`
- `run_agent.py`
- `tests/tools/test_code_execution.py`
- `tests/test_subprocess_home_isolation.py`
- `tests/tools/test_terminal_tool.py`
- `tests/tools/test_terminal_tool_pty_fallback.py`

---

## 1. Hermes 最核心的判断：有些任务需要“执行环境”，有些任务需要“程序化中间层”

先看 `tools/code_execution_tool.py` 的文件头。

这个文件一上来就把自己的定位写得很清楚：

- Programmatic Tool Calling
- 让 LLM 写一个 Python 脚本
- 脚本通过 RPC 调 Hermes 的工具
- 中间工具结果不直接进入上下文窗口

这几句话其实已经把 `execute_code` 和 `terminal` 的边界讲透了。

`terminal` 的核心问题是：

- 在某个环境里执行命令
- 返回结果
- 必要时维持后台任务和会话状态

而 `execute_code` 的核心问题是：

- 让模型自己写一段程序
- 在程序里调用多次工具
- 用 Python 做循环、分支、过滤、规约
- 只把最终结果打印出来

也就是说，Hermes 并不是无意中做出了两套执行能力。  
它其实是在解决两类完全不同的工作负载：

- 环境型执行
- 编排型执行

这点特别值得初学者记住。

很多人做 Agent 时会把“会执行”和“会编排”混成一回事。  
但 Hermes 在结构上已经明确把两者拆开了。

---

## 2. `execute_code` 最重要的价值，不是能跑 Python，而是能把多步 tool chain 压进一次推理回合

看 `tools/code_execution_tool.py` 的开头说明，它明确写了：

- 让 LLM 写 Python 脚本
- 脚本调用 Hermes tools
- collapsing multi-step tool chains into a single inference turn

这句话非常关键。

因为它说明 `execute_code` 在 Hermes 里的根本价值，不是“又多了个可以运行 Python 的地方”，而是：

把本来需要模型来回思考多轮的工具链，收缩成一次程序化执行。

举个最典型的场景：

- 搜 10 个网页
- 逐个提取内容
- 筛掉无关结果
- 再汇总成最终答案

如果全靠普通 tool calling，模型往往要：

- 一次搜
- 再决定下一步
- 再调提取
- 再读大段结果
- 再总结

这不但回合多，而且中间结果非常容易挤爆上下文。

而 `execute_code` 的路径则是：

- 模型先写一段脚本
- 脚本自己循环调用工具
- 在 Python 里完成过滤和压缩
- 最后只把真正需要的摘要打印出来

所以 Hermes 的 `execute_code`，本质上是一个“上下文节流器 + 编排压缩器”。

这和 `terminal` 完全不是同一层东西。

---

## 3. `terminal` 给的是环境，`execute_code` 给的是受限工具沙箱

这两者最明显的差别之一，就是能力边界完全不同。

### 3.1 `terminal` 面向的是环境能力

前一篇附录已经讲过，`terminal` 背后连着：

- local / docker / ssh / modal / daytona / singularity
- 前后台执行
- PTY
- `notify_on_complete`
- `watch_patterns`
- 进程 registry

它本质上是一个环境执行入口。

### 3.2 `execute_code` 面向的是受限工具能力

再看 `tools/code_execution_tool.py`，它明确维护了一份 `SANDBOX_ALLOWED_TOOLS`：

- `web_search`
- `web_extract`
- `read_file`
- `write_file`
- `search_files`
- `patch`
- `terminal`

也就是说，`execute_code` 不是“脚本里什么都能干”，而是：

脚本可以通过 `hermes_tools.py` 这个 stub 模块，去调一小部分被允许的 Hermes 工具。

更关键的是，脚本里的 `terminal()` 还不是完整 terminal。

在 `_TOOL_DOC_LINES` 和 schema 里，Hermes 明确写着：

- `terminal()` 在 `execute_code` 里是 foreground-only
- 不支持 `background`
- 不支持 `pty`

`tests/tools/test_code_execution.py` 里也专门有一组断言在守这个边界：

- stub 必须跟真实 schema 对齐
- 但某些 terminal 参数是刻意 blocked 的
- `_BLOCKED_TERMINAL_PARAMS` 明确把 `background`、`pty`、`notify_on_complete` 这类参数排除了

这说明 Hermes 的判断非常明确：

`execute_code` 里的 terminal，只是为了让脚本偶尔跑一个前台命令，不是为了把整套环境执行 runtime 套进去。

这一步特别重要。

因为它说明 Hermes 并没有把 `execute_code` 当成“超级管理员模式”，而是在严控它的边界。

---

## 4. `execute_code` 真正新增的，不是更多权限，而是更多“程序结构”

很多人会误以为 `execute_code` 比 `terminal` 更强，是因为权限更大。

其实恰好相反。

Hermes 让它存在的核心原因，不是因为它能做更多事，而是因为它能用更适合机器的方式组织事情。

看 `generate_hermes_tools_module(...)` 生成出来的 `hermes_tools.py`，你会发现 Hermes 专门给脚本生成了：

- 工具 stub
- `json_parse`
- `shell_quote`
- `retry`

这三个 helper 很能说明问题。

Hermes 不是只想让脚本“会调工具”，而是希望它在程序层面具备这些典型能力：

- 解析脏一点的 JSON 输出
- 安全拼接 shell 参数
- 对瞬时失败做重试

再看 `build_execute_code_schema(...)` 的描述，它也写得很明确：

适合 `execute_code` 的场景包括：

- 3 次以上工具调用
- 工具结果进入模型前先过滤
- 有条件分支
- 需要循环
- 需要重试

这说明 Hermes 把 `execute_code` 的用途定义得非常克制：

不是“什么都拿去脚本里做”，而是：

当任务的难点在多步机械编排，而不是高价值推理时，用脚本比让模型一轮轮显式调工具更合适。

这其实是一种非常成熟的 Agent 成本观。

---

## 5. `execute_code` 为什么不能直接取代 `terminal`

如果理解了上面的边界，这个问题就会变得很清楚。

`execute_code` 不能取代 `terminal`，至少有四个非常现实的原因。

### 5.1 它没有完整环境生命周期能力

`terminal` 背后有环境抽象、后台进程、PTY、watcher、cleanup。  
`execute_code` 没有打算接手这些事情。

它更像一次短生命周期的脚本执行。

### 5.2 它刻意禁止了很多环境型能力

在 `execute_code` 里：

- terminal 是前台 only
- 不允许 background
- 不允许 pty
- 不允许 `notify_on_complete`
- 不允许 `watch_patterns`

这说明它从设计上就不是给长期任务、交互式命令或后台服务准备的。

### 5.3 它只适合 Python 中间层，不适合真实 shell 会话型工作

如果任务是：

- 启一个 dev server
- 跑一个长期 watch
- 进入某个 CLI 做交互
- 持续观察日志输出

那显然是 `terminal` 的工作，不是 `execute_code` 的工作。

### 5.4 它的目标是减少模型上下文负担，而不是暴露完整操作面

`execute_code` 的一大价值是：

中间工具结果不直接进入上下文窗口。

这很适合批处理、规约、筛选。  
但如果用户本来就需要看到完整原始输出、实时输出或者交互过程，那 `terminal` 才是合适工具。

所以 `execute_code` 和 `terminal` 的关系，不是替代关系，而是分工关系。

---

## 6. 反过来，`terminal` 也不能直接取代 `execute_code`

很多人会说：

既然 `terminal` 能跑 Python，那为什么不用 `terminal` 直接执行一段 Python 脚本？

这个问题表面上合理，但 Hermes 还是专门保留了 `execute_code`，原因也很现实。

### 6.1 `terminal` 不知道你在做的是“工具编排”

当模型通过 `terminal` 跑一段 Python，它本质上只是在执行一个命令。  
Hermes 无法像 `execute_code` 那样：

- 精确限制可用工具集合
- 统计 tool call 次数
- 通过 RPC 截获工具调用
- 对中间工具结果做统一调度

而 `execute_code` 正是围绕这些能力设计出来的。

### 6.2 `execute_code` 把工具调用变成结构化 RPC，而不是字符串 shell 约定

`tools/code_execution_tool.py` 里，不管是本地 UDS transport，还是远程 file-based RPC，本质上都在做同一件事：

- 子脚本发起结构化请求
- 父进程接收并 dispatch 到 Hermes 的真实工具实现
- 脚本拿到结构化结果再继续执行

这意味着它不是在“假装调工具”，而是在把工具调用真正嵌进脚本执行里。

而如果你只用 `terminal` 跑 Python，就得靠：

- shell 命令
- 文件中转
- 子进程自己处理环境

那就失去了 Hermes 想保留的这层可控编排语义。

### 6.3 `execute_code` 能限制结果如何回到模型

文件头里有一句特别重要：

- only the script's stdout is returned to the LLM
- intermediate tool results never enter the context window

这几乎就是 `execute_code` 存在的根本理由之一。

如果全靠普通 tool calling 或 terminal，中间每一步结果都更容易直接回流到模型上下文。  
而 `execute_code` 让中间步骤先在 Python 里被消化，再只把最后结果交回来。

这在长链路任务里非常值钱。

---

## 7. Hermes 连 `execute_code` 自己都做成了受限 runtime，而不是任意代码开放区

这篇里还有一个特别值得强调的点：

Hermes 虽然给了 `execute_code`，但并没有把它做成“随便跑点 Python 就行”。

从源码和测试能看到一整套明确限制：

- 5 分钟超时
- 最多 50 次 tool calls
- stdout / stderr 有大小上限
- Windows 上直接不可用
- 远程 backend 还要求环境里有 Python 3
- 环境变量会被过滤，不把 API key 和 token 默认传进去

`tests/tools/test_code_execution.py` 里对这些边界测得非常多：

- 空代码、语法错误、运行时异常怎么返回
- 输出太大时如何 head+tail 截断
- interrupt 到来时如何中止
- 远程 temp dir 怎么选择
- schema 和 stub 是否漂移
- 环境变量过滤是否真的生效

`tests/test_subprocess_home_isolation.py` 还进一步说明：

- `execute_code` 子进程和 terminal/background process 一样，会拿到 per-profile 的 `HOME`
- 但 Python 主进程自身的 `HOME` 并不会被污染

这说明 Hermes 很清楚：

只要给模型一块“能写代码”的地方，就必须把那块地方当成正式受限 runtime 来治理。

这不是彩蛋能力，而是高风险能力。

---

## 8. `run_agent.py` 为什么会对 `execute_code` 单独处理

再回头看 `run_agent.py`，你会发现 Hermes 甚至在 agent loop 层面对 `execute_code` 有特殊认识。

源码里明确写到：

- `execute_code` 属于 programmatic tool calling
- 相关迭代次数会被 refund

这件事很说明问题。

因为在 Hermes 看来，`execute_code` 不应该被简单当成“又一次普通工具调用”。

它更像一种：

- 用一个推理回合换一整串机械工具编排

也正因为如此，Hermes 才愿意在运行时上给它特殊待遇。

这点其实很值得学智能体的人仔细体会。

如果你不区分：

- 一次需要模型认真思考的工具调用
- 和一次把机械步骤包进脚本的程序化执行

那么你的 iteration budget、上下文预算和工具策略很容易都变形。

Hermes 至少已经在结构上看到了这层差异。

---

## 9. 对学习智能体的人来说，这一篇最值得提炼的是四个原则

### 9.1 不要只按“能不能执行”来分工具，要按“解决什么结构问题”来分

`terminal` 解决环境执行问题。  
`execute_code` 解决多步工具编排问题。

这是两种不同的结构性需求。

### 9.2 程序化中间层的价值，往往在于减少上下文和回合数

当任务的难点是机械循环、过滤和规约时，让模型一轮轮显式调用工具，通常并不划算。

`execute_code` 正是在处理这类问题。

### 9.3 “更强的能力”不等于“更大的权限”

`execute_code` 看起来高级，但它其实比完整 `terminal` 更受限。

Hermes 真正在增加的是程序结构，不是操作面无限放大。

### 9.4 两套执行能力并存，不是重复建设，而是对不同工作负载做正确分工

一个成熟 Agent 系统，不一定追求只有一把万能锤子。  
更成熟的做法往往是：

- 明确每种执行面的目标
- 明确各自边界
- 明确它们何时互补、何时不能混用

Hermes 在这件事上是很有代表性的。

---

## 10. 最后把执行边界收住

基于当前 hermes-agent 仓库里的这些源码和测试，我认为 Hermes 对 `terminal` 和 `execute_code` 的理解，可以概括成一句话：

它不是在维护两套重复的执行功能，而是在维护两种不同层级的执行策略，一种面向环境，一种面向编排。

这个判断，主要来自这些非常具体的源码事实：

- `tools/terminal_tool.py` 关注的是 backend、PTY、前后台、通知、watcher 和环境生命周期
- `tools/code_execution_tool.py` 关注的是 programmatic tool calling、RPC、脚本级过滤与多步编排压缩
- `SANDBOX_ALLOWED_TOOLS` 和 `_BLOCKED_TERMINAL_PARAMS` 说明 `execute_code` 明确是受限沙箱，而不是完整 terminal 替代品
- `build_execute_code_schema(...)` 明确把它定位为“3+ 工具调用、有循环/分支/规约时使用”的工具
- `tests/tools/test_code_execution.py` 把 schema/stub 对齐、环境变量过滤、输出截断、interrupt、远程 temp dir 等边界都固定了下来
- `tests/test_subprocess_home_isolation.py` 说明 `execute_code` 子进程同样受 profile 隔离保护
- `run_agent.py` 还把 `execute_code` 视为 programmatic tool calling，对迭代预算做了特殊处理

所以，如果你在学智能体，这一篇最该记住的一句话就是：

真正成熟的 Agent，不是把所有执行都塞进一个万能工具里，而是能根据任务结构，把“环境执行”和“程序化编排”拆成两种不同的运行时能力，并且为它们各自建立边界。

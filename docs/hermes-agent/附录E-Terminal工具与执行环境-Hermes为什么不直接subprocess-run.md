# 附录 E｜Terminal 工具与执行环境：Hermes 为什么不直接 `subprocess.run`

## 先把 terminal 当成运行时而不是 subprocess

很多人第一次给 Agent 加“终端能力”时，脑子里的方案都很直接：

- 收到一条命令
- 用 `subprocess.run(...)` 执行
- 把 stdout/stderr 回给模型

如果只是做一个本地玩具 Demo，这样确实最快。

但 Hermes 并没有把命令执行写成这么薄的一层。

在当前仓库里，你会看到它专门拆出了：

- `tools/terminal_tool.py`
- `tools/process_registry.py`
- `tools/environments/base.py`
- `tools/environments/local.py`
- `tools/environments/docker.py`
- `tools/environments/ssh.py`
- `tools/environments/modal.py`
- `tools/environments/daytona.py`
- `tools/environments/singularity.py`

这已经说明 Hermes 的判断很明确：

命令执行不是一个小工具，而是一层正式 runtime。

因为一旦 Agent 真的开始执行命令，立刻就会碰到一堆 Demo 里不明显、但工程里一定会爆的问题：

- 命令到底在哪个环境里跑
- 当前工作目录怎么延续
- 环境变量要不要跨回合保留
- provider API key 会不会泄漏进子进程
- 后台进程怎么追踪、轮询、结束、恢复
- 交互式 CLI 什么时候该走 PTY，什么时候反而不能走
- Agent 退出后，残留进程谁来回收

所以这一篇附录想回答的问题是：

Hermes 为什么把“终端工具”做成一整层执行环境抽象，而不是简单 `subprocess.run` 一下？

这一篇主要结合这些源码和测试文件来看：

- `tools/terminal_tool.py`
- `tools/process_registry.py`
- `tools/environments/base.py`
- `tools/environments/local.py`
- `tests/tools/test_base_environment.py`
- `tests/tools/test_terminal_tool.py`
- `tests/tools/test_terminal_tool_pty_fallback.py`
- `tests/tools/test_process_registry.py`
- `tests/tools/test_notify_on_complete.py`
- `tests/tools/test_watch_patterns.py`
- `tests/tools/test_zombie_process_cleanup.py`

---

## 1. Hermes 最先解决的，不是“怎么执行命令”，而是“命令在哪个 runtime 里执行”

先看 `tools/terminal_tool.py` 文件头。

这个文件一上来就把自己的定位写得很清楚：

- 支持 local、docker、modal、ssh、singularity、daytona 等多种 backend
- 支持 background task
- 支持 VM / container 生命周期管理

这几句话已经足够说明 Hermes 的思路。

它不是在实现一个“运行 shell 命令”的函数，而是在实现一个统一的命令执行入口。

这意味着 Agent 发起一条终端调用时，Hermes 先要回答的不是：

“这条命令是什么？”

而是：

“这条命令应该在哪个环境里、以什么方式、带着哪些状态去执行？”

这是非常典型的 Runtime 视角。

因为一旦系统支持多个 backend，命令执行这件事就不再只是 `Popen` 的事情，而会变成：

- backend 选择
- sandbox 生命周期
- cwd 持久化
- session 状态恢复
- 背景任务管理

也就是说，Hermes 在这里治理的已经不是“命令”，而是“执行语境”。

---

## 2. `BaseEnvironment` 的价值，不是抽象出公共接口，而是统一出“每次执行如何带上会话状态”

看 `tools/environments/base.py`，文件头有一句很关键的话：

- Unified spawn-per-call model
- session snapshot captured once at init and re-sourced before each command
- CWD persists via marker / temp file

这其实已经把 Hermes 的核心设计讲完了。

很多人会以为“环境抽象”只是把 local、docker、ssh 的实现统一一下。  
但 Hermes 在这里真正抽象出来的，是一套一致的执行模型：

- 每次命令调用，都是新进程
- 但 session 状态并不是完全丢失
- 之前捕获的环境变量、函数、alias、cwd 会在下一次命令前恢复

这非常值得学习。

因为做 Agent 的人经常会在两个极端之间摇摆：

- 要么每次都新开进程，结果上下文全丢
- 要么一直挂着一个 shell，结果生命周期和清理越来越难控

Hermes 给出的方案很工程化：

不是保持一个“永远活着的 shell”，而是：

每次 spawn 新进程，但把该保留的 session snapshot 明确重放进去。

这就是 `BaseEnvironment` 最有价值的地方。

### 2.1 CWD 持久化不是附带功能，而是执行契约

`tests/tools/test_base_environment.py` 里有一组很说明问题的测试，专门在测：

- `_wrap_command()` 是否会 source snapshot
- `cd` 是否会切到当前目录
- 命令结束后是否会把 `pwd -P` 写回
- marker 是否会被正确嵌入和提取

这些测试说明 Hermes 非常明确地把“当前目录延续”当成契约，而不是顺手优化。

因为对 Agent 来说，`cd` 之后的目录状态本来就是工作记忆的一部分。  
如果这件事不稳定，终端工具的可用性会立刻大幅下降。

### 2.2 snapshot 失败时也有退路

同一个测试文件还验证了：

- snapshot 初始化失败时，`_snapshot_ready` 会变成 false
- 这种情况下，后续执行要退回到 login shell 逻辑

这点很成熟。

因为它说明 Hermes 不假设“环境初始化永远成功”，而是在一开始就给执行层设计了降级路径。

---

## 3. `LocalEnvironment` 不只是本地执行器，它还在做子进程隔离和密钥防泄漏

看 `tools/environments/local.py`，一个非常容易被忽略、但特别关键的点是：

Hermes 会在这里专门构建 `_HERMES_PROVIDER_ENV_BLOCKLIST`，并通过 `_sanitize_subprocess_env(...)`、`_make_run_env(...)` 去过滤环境变量。

被拦下的内容包括：

- 各类 provider 的 API key
- base URL
- 各种 messaging token
- GitHub / Modal / Daytona 等敏感凭证

这件事特别重要。

因为一旦你允许 Agent 执行本地命令，子进程就天然有机会继承宿主进程的环境变量。  
如果这一步不处理，系统很容易在毫无感觉的情况下把自己的密钥面暴露给任意 shell 命令。

所以 Hermes 在这里做的事情，其实不是普通的“环境变量传递”，而是在做：

终端执行面的秘密隔离。

这非常值得学智能体的人认真记住。

很多初学者会把终端能力看成“会不会执行命令”的问题，  
但真正成熟的系统一定会先问：

执行时，哪些东西绝不能默认泄漏进去？

---

## 4. `terminal_tool` 对模型暴露的，不是“执行命令”，而是一套任务语义

再看 `tools/terminal_tool.py` 的 `terminal_tool(...)` 和 `TERMINAL_SCHEMA`，会发现 Hermes 做得很细。

它暴露给模型的并不是一个只有 `command` 的极简接口，而是一套更完整的执行语义：

- `background`
- `timeout`
- `workdir`
- `pty`
- `notify_on_complete`
- `watch_patterns`

这意味着 Hermes 并不希望模型把终端理解成一个一次性黑盒。

它希望模型理解的其实是几种不同的工作模式：

- 前台短命令
- 后台长命令
- 需要交互的 PTY 命令
- 完成后自动通知的异步任务
- 需要监听日志模式的后台任务

这一步非常关键。

因为一旦 Agent 真正进入“持续工作”阶段，命令执行早就不是“跑完就算了”，而会变成任务编排的一部分。

Hermes 的 schema 其实就在做一件事：

把命令执行从 shell 语法，提升成模型能理解的任务语义。

---

## 5. Hermes 不把后台任务当成“顺便开个进程”，而是把它做成正式 Process Registry

这篇里最值得重点看的文件之一，就是 `tools/process_registry.py`。

它一开头就写得很明确：

- 管理通过 `terminal(background=true)` 启动的进程
- 提供输出缓冲
- 支持状态轮询
- 支持阻塞等待与中断
- 支持 kill
- 支持 checkpoint crash recovery
- 支持 session-scoped tracking

这说明 Hermes 的理解非常清楚：

后台进程不是某个 `Popen` 句柄那么简单，它本身就是需要被管理的运行时对象。

### 5.1 背景进程有自己的 Session

在 `ProcessRegistry` 里，每个后台任务都有一份 `ProcessSession`，其中记录：

- `id`
- `command`
- `task_id`
- `session_key`
- `pid`
- `cwd`
- `output_buffer`
- `notify_on_complete`
- `watch_patterns`

这件事的意义很大。

因为它说明 Hermes 没把后台命令当作“命令执行的副产品”，而是把它提升成一个正式可追踪实体。

一旦你这样建模，后面这些能力才真正变得可做：

- poll
- read_log
- close_stdin
- kill
- checkpoint 恢复
- 完成通知

### 5.2 输出缓冲、完成通知、watch pattern 都是 Runtime 能力

`tests/tools/test_process_registry.py`、`test_notify_on_complete.py`、`test_watch_patterns.py` 这几组测试，非常能说明 Hermes 到底在守什么。

它们验证的不是“后台进程能不能启动”，而是：

- 输出缓冲是否存在、是否截断
- `notify_on_complete` 的事件是否正确入队
- 重复 finish 时是否不会重复推送
- `watch_patterns` 命中时是否会发通知
- rate limit 和 overload kill switch 是否生效
- checkpoint 写入和恢复时，这些字段会不会丢

这些测试的共同特点是：

它们都在把后台任务当成长期运行对象，而不是单次 shell 返回值。

这也是 Hermes 跟“简单 `subprocess.run` 包一层”最本质的差别之一。

---

## 6. PTY 不是越多越好，Hermes 连“什么时候不能用 PTY”都专门测了

很多人一看到交互式 CLI，就会自然地觉得：

那就给它开 PTY。

但 Hermes 在这件事上的处理很成熟。

看 `tools/terminal_tool.py`，它专门有 `_command_requires_pipe_stdin(...)` 这样的判断。  
看 `tests/tools/test_terminal_tool_pty_fallback.py`，你会发现 Hermes 连这个边界都写成了测试：

- `gh auth login --with-token` 这种命令，PTY 反而会让它卡住
- 因为它期待的是 piped stdin + EOF
- 所以后台执行时要自动禁用 PTY，并返回 `pty_note`
- 但像普通交互命令，PTY 仍然应该保留

这件事为什么值得讲？

因为它说明 Hermes 对终端交互的理解不是“有交互就 PTY”，而是：

不同 CLI 对 stdin / TTY / EOF 的假设不同，运行时必须按命令形态调整执行方式。

这种细节如果不做，用户表面上看到的就是：

- 命令卡住
- 没输出
- Agent 也不知道为什么

Hermes 用一组小测试把这个边界钉住，说明它已经把“CLI 行为差异”纳入执行层治理了。

---

## 7. 危险操作、sudo、workdir 校验，说明 Hermes 不是在做 shell wrapper，而是在做可控执行面

`tools/terminal_tool.py` 还有一个非常重要的点：

它不是把命令原样塞给 shell，而是在执行前做了很多 guard。

包括：

- 危险命令审批
- `workdir` 的字符白名单校验
- sudo 命令改写与密码注入逻辑
- 前台超时上限限制

`tests/tools/test_terminal_tool.py` 里能看到 Hermes 对 sudo 相关边界测得很细：

- 搜索字符串里的 `sudo` 不能误触发改写
- `printf 'sudo'` 不能误判
- 真正的 sudo 命令才会被改写成 `sudo -S -p ''`
- 已缓存密码、环境变量密码、显式空密码都要行为一致

这类测试特别说明问题。

因为一旦 Agent 可以执行 shell，你就不能只关注“执行成功率”，还必须关注：

- 误判率
- 审批链路
- 密码输入路径
- workdir 注入风险

也就是说，Hermes 在这里做的不是“shell helper”，而是一个带边界的执行面。

---

## 8. `zombie_process_cleanup` 这组测试说明，Hermes 把“Agent 结束后留下什么”也纳入设计了

`tests/tools/test_zombie_process_cleanup.py` 很值得看。

这组测试的重点，不在于某个命令怎么跑，而在于：

Agent 或 gateway 会话结束后，那些还活着的进程怎么办。

它验证的事情包括：

- 如果不显式 cleanup，孤儿进程确实会继续活着
- `terminate + wait` 才是真正回收
- `AIAgent.close()` 会调用 `process_registry.kill_all(...)`
- 还会继续做 VM / browser cleanup
- `close()` 可以重复调用
- 子 Agent 关闭时也要递归清理
- gateway stop 时会调用 running agents 的 `close()`

这说明 Hermes 已经把“会话生命周期结束时的资源回收”当成正式设计问题。

这点对长期运行的 Agent 特别重要。

因为系统一旦接入 gateway、后台任务、子 Agent、多环境执行，如果没有统一 cleanup，问题不会马上表现为“命令失败”，而会表现为：

- 僵尸进程越来越多
- 资源越来越脏
- 长期部署越来越不稳定

Demo 往往完全看不到这些问题。  
但 Hermes 的测试已经明确说明，它在为长期运行场景做准备。

---

## 9. 对学习智能体的人来说，这一篇最值得提炼的是四个原则

### 9.1 终端能力不是一个工具函数，而是一层执行 runtime

一旦支持多 backend、后台任务、PTy、会话状态延续，终端就不再是 `run(cmd)` 那么简单。

### 9.2 真正难的不是“把命令跑起来”，而是让执行状态可延续、可回收、可观察

Hermes 在治理的核心问题是：

- cwd 怎么延续
- snapshot 怎么恢复
- 后台进程怎么追踪
- 结束后怎么回收

这才是工程难点。

### 9.3 环境抽象的价值，不只是换后端，而是统一安全边界

local、docker、ssh、modal 看起来是不同 backend，  
但 Hermes 真正统一的是：

- 命令入口
- 状态快照
- 密钥隔离
- 生命周期

### 9.4 后台任务必须被建模成正式对象，而不是丢个 PID 就不管了

`ProcessSession`、completion queue、watch pattern、checkpoint recovery 这些能力，都是因为 Hermes 把后台进程看成了 runtime entity。

这一点非常值得抄。

---

## 10. 最后把执行环境收一下

基于当前 hermes-agent 仓库里的这些源码和测试，我认为 Hermes 对“终端工具”这件事的理解，可以概括成一句话：

它不是给模型塞了一个能跑 shell 的接口，而是在构建一层带环境抽象、状态延续、安全边界、后台进程管理和资源回收能力的执行 runtime。

这个判断，主要来自这些非常具体的源码事实：

- `tools/terminal_tool.py` 本身就把执行拆成 backend 选择、审批、PTY、前后台、通知和 watch pattern 等多个维度
- `tools/environments/base.py` 统一了 spawn-per-call + session snapshot + cwd 持久化 这套执行模型
- `tools/environments/local.py` 通过 `_sanitize_subprocess_env(...)` 和 blocklist 防止 provider 密钥默认泄漏到子进程
- `tools/process_registry.py` 把后台进程建模成 `ProcessSession`，并提供输出缓冲、轮询、kill、checkpoint 恢复与通知队列
- `tests/tools/test_base_environment.py` 固定了 snapshot、cwd marker 和降级路径这些基础契约
- `tests/tools/test_terminal_tool.py` 和 `test_terminal_tool_pty_fallback.py` 固定了 sudo、PTY 与 stdin / EOF 这些细边界
- `tests/tools/test_process_registry.py`、`test_notify_on_complete.py`、`test_watch_patterns.py` 固定了后台任务的可观察性与通知语义
- `tests/tools/test_zombie_process_cleanup.py` 说明 Hermes 连 Agent/gateway 退出后的进程回收都纳入了设计

所以，如果你在学智能体，这一篇最该记住的一句话就是：

真正成熟的 Agent，不是“会跑命令”，而是能把命令执行这件事做成一个长期可运行、可恢复、可约束、可清理的执行环境系统。

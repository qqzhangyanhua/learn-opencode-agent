# 附录 C｜测试一个 Agent Runtime：Hermes 为什么不是只靠 Demo 验证

## 先别把测试理解成补作业

很多人第一次做 Agent，验证方式都很像：

- 跑起来
- 问一句话
- 看它会不会调工具
- 再看它能不能给出一个“像样回答”

如果只是做一个小 Demo，这样当然够。

但 Hermes 这种系统，显然已经不只是一个“能跑给你看”的 Agent 了。

它有：

- 多轮核心循环
- tool calling
- session 持久化
- context compression
- prompt caching
- gateway 多入口
- 危险操作审批
- 子 Agent 委托

到了这个阶段，系统最怕的就不是“不会演示”，而是：

- 能演示，但边界不稳定
- 能工作，但异常路径一碰就碎
- 能跑通 happy path，但换个平台、换个上下文长度、换个工具组合就出问题

所以这一篇附录想回答的问题是：

为什么 Hermes 要有这么大一套测试，而不是只靠几段 Demo 验证？

如果你正在学智能体，这一篇其实是在帮你建立一个非常重要的判断：

一个真正的 Agent Runtime，不是拿几个截图证明“它会做事”，而是要用测试把它的运行时契约钉住。

这一篇主要结合这些源码与测试文件来看：

- `tests/conftest.py`
- `tests/run_agent/test_413_compression.py`
- `tests/run_agent/test_agent_loop.py`
- `tests/agent/test_prompt_builder.py`
- `tests/tools/test_approval.py`
- `tests/tools/test_delegate.py`
- `tests/gateway/test_session.py`

---

## 1. 为什么 Agent Runtime 最怕“能演示，但不可验证”

Demo 最擅长证明一件事：

系统在一条你事先准备好的路径上，确实能跑出想要的结果。

但 Agent Runtime 真正危险的地方，几乎都不在这里。

它更危险的地方通常是：

- 第 7 轮对话时上下文爆了怎么办
- 某个工具调用后会不会污染后续状态
- 危险命令检测会不会误杀正常命令
- 多平台 session 的来源信息会不会串掉
- 子 Agent 会不会无限递归委托
- prompt 注入是不是会顺着项目文件进入 system prompt

这些问题，靠“手动演示几次”基本测不出来。

因为它们都属于运行时边界问题，而不是展示问题。

Hermes 的测试目录之所以值得初学者认真看，不是因为它测试写得多，而是因为它暴露出 Hermes 的一个底层判断：

测试不是末端验收，而是运行时结构的一部分。

也就是说，Hermes 不是在问：

“这个 Agent 能不能给我表演一下？”

而是在问：

“这个 Agent 的哪些行为应该被当成稳定契约？”

---

## 2. `tests/conftest.py`：Hermes 先测的不是功能，而是测试环境本身

先看 `tests/conftest.py`。

这个文件非常有代表性，因为它一开始做的事情，不是某个业务功能，而是给整个测试套件先搭一个隔离运行环境。

最关键的几件事包括：

- 把 `HERMES_HOME` 重定向到临时目录，避免测试写入用户真实的 Hermes 数据目录（默认是 `~/.hermes`）
- 预先创建 `sessions`、`cron`、`memories`、`skills` 等目录
- 清掉 `HERMES_SESSION_PLATFORM`、`HERMES_SESSION_CHAT_ID`、`OPENROUTER_API_KEY` 之类容易污染测试的环境变量
- 给同步测试补一个默认 event loop，避免 Python 3.11+ 的 loop 行为差异把测试搞挂
- 给每个测试加 30 秒超时，防止子进程、阻塞 I/O 或异步死锁拖死整套测试

这件事为什么重要？

因为它说明 Hermes 团队很清楚：

Agent 系统不是普通纯函数程序，它天然带着大量“环境依赖”。

比如：

- 本地目录状态
- API key
- 当前平台上下文
- 异步 loop
- 持久化目录

如果这些东西不先隔离，很多测试看起来是“业务失败”，本质上其实只是环境串味。

所以 `tests/conftest.py` 做的事情，本质上是在说：

想测 Agent Runtime，第一步不是写断言，而是先把测试环境也做成一个可控 runtime。

这对初学者特别重要。

很多人做 Agent 时，会把测试理解成“最后再补几条 case”。  
但 Hermes 的写法提醒你，真正成熟的系统，会先治理测试地基。

---

## 3. 核心循环不能只测 happy path，Hermes 在测“多轮运行时怎么失控”

看 `tests/run_agent/test_agent_loop.py` 和 `tests/run_agent/test_413_compression.py`，你会明显感觉到 Hermes 测的不是“回答像不像人”，而是“多轮运行时是否守住了边界”。

### 3.1 `test_agent_loop.py` 在测循环契约，而不是测文案输出

`tests/run_agent/test_agent_loop.py` 里做了一个很有代表性的动作：

它不用真实模型服务，而是自己搭了 `MockServer`、`MockChatCompletion`、`MockToolCall` 这些对象，按顺序喂给 `HermesAgentLoop`。

这样测的重点就不再是模型内容本身，而是运行循环的结构行为：

- 纯文本回复时，循环是否自然结束
- 出现 tool call 时，是否正确进入下一轮
- reasoning 字段从不同 provider 结构里能不能稳定提取
- `turns_used`、`finished_naturally`、`messages` 这些运行时结果是否一致

这类测试非常有代表性。

因为它说明 Hermes 认为真正值得稳定下来的，不是“模型具体说了什么”，而是：

- 一轮什么时候结束
- 工具调用怎么进入下一轮
- 中间状态如何被记录
- 结果对象如何描述一次运行

这就是 Runtime 视角。

如果一个系统只拿真人对话做手测，开发者很容易被“它看起来挺聪明”误导。  
但测试循环时，你关心的是更冷冰冰的问题：

这个状态机到底有没有按预期转。

### 3.2 `test_413_compression.py` 在测异常路径，而异常路径才最像真实世界

相比 happy path，`tests/run_agent/test_413_compression.py` 更能看出 Hermes 的工程成熟度。

这个文件关注的是：

- HTTP 413 触发后，是否会走上下文压缩而不是直接失败
- 某些 provider 返回的 400 context-length 错误，是否也能识别成“该压缩”而不是普通 4xx
- 压缩发生后，session 持久化时会不会把旧的 `conversation_history` 错误带进来
- preflight compression 是否能在 API 调用前主动处理过长上下文

这类测试为什么重要？

因为现实里的 Agent 崩溃，往往就崩在这种地方：

- 上下文太长
- provider 错误格式不统一
- 中途压缩后状态同步错位
- 会话恢复时发现 session 在，但消息没了

这些问题几乎不可能靠一个漂亮 Demo 提前暴露。

Hermes 把这些 case 写成测试，实际上是在把一个非常重要的运行时能力固定下来：

不是“上下文压缩这个功能存在”，而是“当运行时真的撞上长度边界时，系统能否按可恢复的方式退化”。

这才是 Agent Runtime 的测试价值。

---

## 4. Prompt 层也必须可测，因为它本身就是执行边界

很多初学者写 Agent 时，对 prompt 的态度通常是：

- 写一段
- 试几轮
- 感觉差不多就行

但 Hermes 的 `tests/agent/test_prompt_builder.py` 说明，它不把 prompt 当“文案区”，而是当“可测试的运行时接口”。

这个文件里几类测试尤其值得看。

### 4.1 context file 不是无条件信任输入

`_scan_context_content(...)` 相关测试明确在验证这些东西会不会被拦下：

- `ignore previous instructions`
- `system prompt override`
- HTML 注释隐藏指令
- `curl ... | sh`
- `cat ~/.env`
- 不可见 Unicode 字符

这等于是在测试：

项目里的 `AGENTS.md`、规则文件、上下文文件，一旦要进入 system prompt，Hermes 有没有把它们当成潜在攻击面来处理。

这点非常关键。

因为一旦你开始自动读项目文件，prompt injection 就不再只是“网页搜索的问题”，而会变成你自己代码仓库里的输入面。

### 4.2 截断策略也在测，而不是随便裁一刀

`_truncate_content(...)` 的测试并不是只验证“内容变短了”，而是验证：

- 短内容保持不变
- 超长内容会被截断
- 截断后仍然保留 head 和 tail
- 到达边界值时不应该误截断

这背后的思路很成熟。

因为上下文文件一旦过长，问题不只是 token 太多，还包括：

你怎么裁，才不会把真正有用的信息全裁掉。

也就是说，Prompt Builder 的很多行为，其实都应该被视作运行时策略，而不是随手字符串处理。

### 4.3 skills index 与 prompt 组装逻辑也在被固定

同一个测试文件还在验证：

- skills 目录为空时，system prompt 是否返回空字符串
- 读取 `SKILL.md` 时，frontmatter 和 description 怎么解析
- 不兼容平台的 skill 是否应该被过滤
- 模块导入时是否会错误地 eager import 可选工具

你会发现，Hermes 连“系统提示里如何看待 skills”这件事，都不愿意只靠人工试一试。

原因很简单：

Prompt Builder 在 Hermes 里不是装饰层，而是运行时装配层。  
装配层只要抖一次，后面缓存、上下文、技能索引都会跟着抖。

所以它必须可测。

---

## 5. 高副作用工具不靠“操作小心”，而靠测试把边界钉死

如果说核心循环测的是状态机，那么工具层测的就是副作用边界。

这在 `tests/tools/test_approval.py` 和 `tests/tools/test_delegate.py` 里特别明显。

### 5.1 `test_approval.py` 测的不是正不正确，而是“危险检测能不能稳定工作”

`tests/tools/test_approval.py` 里一眼就能看到 Hermes 在测什么：

- `rm -rf`、`rm --recursive` 这种递归删除是否会被识别
- `bash -c`、`bash -lc`、`curl | sh`、`wget | bash` 这种 shell 注入链路是否会被识别
- `DROP TABLE`、无 `WHERE` 的 `DELETE` 是否会被标成危险
- `echo hello`、`git status`、`ls -la` 这种正常命令是否不会误报

更有意思的是，它还有一整组回归测试专门防误杀，比如：

- `rm readme.txt`
- `rm requirements.txt`
- `rm report.csv`

这些测试的价值特别大。

因为安全规则最容易出现两种失败：

- 漏报，危险命令放过去
- 误报，正常命令也被系统拦死

Demo 往往只能证明“拦住了某个危险命令”，却很难证明“它不会把正常操作也全判成危险”。

而 Hermes 明显已经把这件事当成一个需要长期稳定维护的契约。

此外，这个文件还验证了 session-scoped approval 的行为，比如审批 key 是否绑定在正确 session 上。  
这说明 Hermes 不是只在做命令识别，而是在做“带上下文的审批语义”。

### 5.2 `test_delegate.py` 说明子 Agent 不是一个花哨能力，而是另一个要被约束的运行时

很多系统一加 delegate/subagent，就会显得很炫。  
但 Hermes 在 `tests/tools/test_delegate.py` 里测的重点，不是“它能不能拆任务”，而是：

- 没有 parent agent 时是否直接报错
- 递归深度是否受 `MAX_DEPTH` 限制
- 任务数是否受并发上限控制
- 某些 blocked toolsets 会不会被从 child agent 上剥掉
- child 是否正确继承 parent 的 runtime credentials
- child 执行结束后是否从 `_active_children` 里清理

这类测试特别能体现 Hermes 的气质。

它不是把子 Agent 当一个营销亮点，而是把它当一个高风险运行时特性：

可以有，但必须有边界。

因为一旦没有这些边界，delegate 很快就会变成：

- 无限递归
- 并发失控
- 工具权限泄漏
- 父子上下文串味

所以对学习智能体的人来说，这里最值得抄的不是“怎么做子 Agent”，而是“子 Agent 加进来后，哪些约束必须先有测试”。

---

## 6. 多入口系统不能只看线上效果，session 语义必须被测试固定

再看 `tests/gateway/test_session.py`，会更清楚 Hermes 为什么已经不只是一个 CLI Demo。

Hermes 有 CLI，也有 gateway，多入口一旦成立，就一定会出现一个核心问题：

同一句用户输入，从 Telegram、Discord、Slack、CLI 进来时，系统到底怎样判断它们属于什么 session、带着什么来源语义、该如何注入提示词？

这个文件测试的就是这些事情。

例如：

- `SessionSource` 能不能稳定 roundtrip 到字典再恢复回来
- 数字型 `chat_id` 会不会被规范成字符串
- `chat_name`、`user_name`、`thread_id`、`chat_topic` 这类字段会不会在序列化过程中丢失
- `description` 对 DM、group、channel、thread 是否给出一致表达
- `build_session_context_prompt(...)` 是否会把 Telegram、Discord、Slack 的平台信息和限制写进提示里
- Discord 的 `chat_topic` 是否正确进入 session context prompt

这类测试很有代表性。

因为它测的不是“消息有没有发出去”，而是“系统如何理解一次消息来自哪里”。

这正是多入口 Agent 的核心难点之一。

如果 session 语义没有被稳定测试，系统很容易在这些地方出错：

- 同一个用户在不同线程被错误合并
- 群聊和私聊的行为边界混掉
- 平台限制没有被正确注入 prompt
- 后续主动发送结果时，投递目标判断错误

这些问题在演示阶段经常不明显，因为演示只会走一两个干净场景。  
但真正长期运行时，它们才是最容易出事故的地方。

Hermes 用 `test_session.py` 把这层语义钉住，本质上是在保护“多入口一致性”。

---

## 7. 对学习智能体的人来说，Hermes 这组测试最值得提炼的是四个原则

### 7.1 不要只测“模型答得对不对”，要测运行时状态有没有守住

Agent 最容易被误测成一个聊天机器人。

但真正重要的往往是：

- 回合有没有正确结束
- tool call 后状态有没有推进
- 出错后有没有进入可恢复路径
- 会话有没有被正确保存

这才是 Runtime 测试。

### 7.2 不要只测 happy path，要优先测退化路径和异常路径

Hermes 很多代表性测试都不是在验证“系统顺利运行时有多漂亮”，而是在验证：

- 413 怎么办
- 400 context overflow 怎么办
- 危险命令怎么判
- 子 Agent 越界怎么办

真实世界里，异常路径才是系统的成色。

### 7.3 Prompt、Session、Approval 这些“看起来不像业务”的层，反而更应该被测

初学者常把测试重点放在功能按钮上。  
但 Agent 系统真正决定稳定性的，往往是这些基础层：

- prompt 装配
- session 语义
- 工具审批
- 委托边界

Hermes 的测试布局，其实就是在告诉你：

这些不是配角，它们本身就是系统。

### 7.4 先把契约测出来，再去谈“这个 Agent 聪不聪明”

一个 Agent 聪不聪明，很大程度取决于模型。  
但一个 Agent 系统稳不稳定，取决于你的运行时契约有没有被固定。

Hermes 的测试价值就在这里：

它不是试图用测试证明“模型很强”，而是在证明：

无论模型怎么变，至少这套运行时边界不应该轻易漂移。

---

## 8. 最后把验证思路收一下

基于当前 hermes-agent 仓库里的这些测试文件，我认为 Hermes 对“测试 Agent Runtime”这件事的理解，可以概括成一句话：

它不是拿测试去补充 Demo，而是在用测试定义 Demo 之外那些真正决定系统是否可靠的运行时契约。

这个判断，主要来自这些非常具体的源码事实：

- `tests/conftest.py` 先把 `HERMES_HOME`、环境变量、event loop 和超时机制隔离好，说明 Hermes 先治理测试运行环境
- `tests/run_agent/test_agent_loop.py` 用 mock server 固定多轮循环、tool call 和 reasoning 提取这些结构行为，而不是依赖真人对话手测
- `tests/run_agent/test_413_compression.py` 把 413、400 context overflow、preflight compression、压缩后持久化这些异常路径都写成契约
- `tests/agent/test_prompt_builder.py` 证明 prompt builder、skills index、context file 扫描和截断策略本身都被当成可测试运行时
- `tests/tools/test_approval.py` 把危险命令识别、误报回归和 session 级审批语义固定下来
- `tests/tools/test_delegate.py` 把子 Agent 的深度、并发、权限和 runtime 继承边界固定下来
- `tests/gateway/test_session.py` 把多平台 session source、context prompt 和来源语义固定下来

所以，如果你是刚开始学习智能体的人，这一篇最值得记住的，不是“Hermes 测试很多”，而是：

真正成熟的 Agent，不是靠几个成功案例证明自己，而是靠一整套针对运行时边界的测试，证明自己在失败、退化、切换平台和长期运行时也还像一个系统。

这就是为什么 Hermes 看起来不像一个只会演示的 Agent，而更像一个真正的 Agent Runtime。

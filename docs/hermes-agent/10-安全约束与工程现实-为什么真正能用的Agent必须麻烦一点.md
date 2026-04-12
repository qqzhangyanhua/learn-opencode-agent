# 10｜安全约束与工程现实：为什么真正能用的 Agent 必须麻烦一点

## 先承认真正的问题

当你第一次做 Agent 时，最容易兴奋的地方通常是能力增长：

- 能执行终端命令了
- 能改文件了
- 能后台跑进程了
- 能自动发消息了

但真正把系统往“可用”方向推的时候，你会发现另一件事：

能力越大，约束越麻烦。

很多初学者会本能觉得这些约束很烦：

- 为什么危险命令还要审批
- 为什么路径还要校验
- 为什么 cron prompt 还要扫描
- 为什么后台进程还要注册表和通知治理

但 Hermes 恰恰在提醒你：

如果这些麻烦你都不做，那你的 Agent 也许会显得很自由，但很难真正可用。

这一章我们主要看：

- `tools/approval.py`
- `tools/path_security.py`
- `tools/terminal_tool.py`
- `tools/process_registry.py`

要回答的核心问题是：

为什么真正能用的 Agent 必须“麻烦一点”？这些麻烦背后到底是在解决什么现实问题？

---

## 1. 先承认一个事实：Agent 一旦碰执行面，风险就不是抽象问题了

前几章我们已经看到，Hermes 的能力面不小：

- 能执行终端命令
- 能改文件
- 能跨平台发消息
- 能跑 cron
- 能启后台进程

只要系统拥有这些能力，风险就不再是“模型说错一句话”那么简单，而开始变成真实副作用：

- 删除文件
- 改坏配置
- 写进敏感目录
- 启动失控进程
- 泄露密钥
- 对外发错消息

这时候，安全问题已经不是可选项，而是系统边界本身。

Hermes 在这方面有一个非常清晰的气质：

它并不假装模型天然可靠，而是假设模型会犯错、用户请求会危险、工具调用会产生副作用，于是必须在运行时额外加护栏。

这是一种非常成熟的工程态度。

---

## 2. `tools/approval.py` 的核心思想不是“不让你执行”，而是“把高风险动作从自动执行改成显式授权”

打开 `tools/approval.py`，文件头注释一开始就把它的定位说得很清楚：

- dangerous command detection
- per-session approval state
- CLI interactive + gateway async prompting
- smart approval
- permanent allowlist

这说明 Hermes 并没有简单粗暴地禁掉危险命令，而是把这类动作变成需要额外确认的行为。

这非常关键。

因为真实世界里，危险命令不是不能执行，而是不能被不加区分地自动执行。

继续看 `DANGEROUS_PATTERNS`，你会发现它覆盖了很多高风险场景：

- `rm -r`
- `chmod 777`
- `mkfs`
- `dd`
- SQL `DROP` / 无 `WHERE` 的 `DELETE`
- 改 `/etc`
- `systemctl stop`
- `curl | bash`
- `python -c`
- `git reset --hard`
- `git push --force`
- 甚至还包括 Hermes 自己的自杀式命令

这一组规则说明 Hermes 的危险模型很现实：

它不是只防最夸张的“删库跑路”，而是在防真实开发中经常踩中的破坏性动作。

---

## 3. Approval 这层最成熟的地方，在于它不是全局开关，而是 session 级状态机

很多项目做审批，会停留在一个很粗的层面：

- 全局允许
- 全局禁止

Hermes 在这里做得更细。

`approval.py` 里明确维护了：

- pending approvals
- per-session approved state
- yolo session
- permanent approved set

也就是说，批准不是一刀切，而是有不同层次：

- 这一次允许
- 本 session 允许
- 永久 allowlist

这非常符合真实工作流。

因为不同场景下，你需要的授权强度不一样：

- 某个单独命令，我只想放行一次
- 某类操作，在当前会话我愿意信任
- 某些已知安全命令，我可以长期白名单

这种 session 级别的授权设计，说明 Hermes 已经把“审批”理解成运行时交互，而不是简单布尔开关。

---

## 4. `terminal_tool.py` 说明安全边界不是独立模块，而是执行链路的一部分

看 `tools/terminal_tool.py` 会发现，terminal tool 不是先执行命令再看结果，而是在真正执行前就会走 guard。

其中一个明显入口就是：

- `_check_all_guards(...)`

它会调用 approval 等安全检查。

另外，`terminal_tool.py` 自己还做了工作目录校验 `_validate_workdir()`，用 allowlist 限制 workdir 只能是像路径的内容，拒绝混入 shell 元字符。

这一点非常值得注意。

因为很多安全问题不是来自主命令本身，而是来自那些看起来不起眼的参数位：

- `workdir`
- 文件路径
- shell 片段
- heredoc

Hermes 的处理方式说明一个很重要的工程判断：

安全不是工具外面的“外壳”，而是工具执行路径里的一部分。

如果 guard 不在调用链中心，而只在外围提示一下，最后往往会被绕过去。

---

## 5. `path_security.py` 这种小模块，恰恰体现了成熟工程的味道

初学者看项目时，常常会更关注那些“炫”的文件：

- run_agent.py
- delegate_tool.py
- browser_tool.py

但真正让系统可靠的，很多时候恰恰是像 `tools/path_security.py` 这样看起来很朴素的小模块。

这个文件做的事情很简单：

- `validate_within_dir(path, root)`
- `has_traversal_component(path_str)`

它把 `resolve() + relative_to()` 这一套目录约束逻辑提炼成共享 helper。

为什么这很重要？

因为路径穿越是 Agent 系统里一种特别常见、又特别容易被忽视的风险。

尤其当系统开始支持：

- skill supporting files
- cron scripts
- 文件读写
- 凭据文件

只要你允许用户或模型传路径，`../`、符号链接逃逸、绝对路径注入这些问题就都出现了。

Hermes 在这里的态度非常工程化：

不要每个工具各写各的路径校验，而是抽成共享规则。

这件事看起来小，但它直接提升了整套系统边界的一致性。

---

## 6. `process_registry.py` 证明安全不只是在“执行前拦住”，还包括“执行后管住”

很多人一说安全，会只想到输入校验和执行审批。

但 Agent 系统一旦支持后台任务和长进程，风险还包括：

- 进程跑飞
- 输出刷屏
- 监控模式失控
- 进程孤儿化
- 会话 reset 后仍残留影响

`tools/process_registry.py` 在这方面做得很完整。

文件头已经列出了几件关键事情：

- rolling output buffer
- status polling
- wait / kill
- crash recovery
- session-scoped tracking

继续看实现，还能看到：

- 最大输出长度限制
- watch pattern rate limiting
- sustained overload kill switch
- finished TTL
- max concurrent tracked processes

这些设计说明 Hermes 对后台执行的理解不是：

“放后台就好了。”

而是：

后台执行本身也是需要治理的风险面。

这点非常关键。

因为一个真正能跑命令、跑服务、跑测试的 Agent，如果没有后台治理层，迟早会把自己拖进不可观测、不可清理、不可恢复的状态。

---

## 7. Hermes 一直在做同一件事：把“模型的自由度”翻译成“系统允许的操作边界”

如果你把这几层护栏放在一起看，会发现 Hermes 其实一直在做同一类工作：

把模型的开放输出，翻译成系统可承受的边界。

例如：

- 命令执行前，先做危险命令检测与审批
- workdir 不允许带奇怪字符
- 路径必须被限制在允许目录内
- cron prompt 不能包含明显注入或窃密载荷
- script path 必须局限在 `HERMES_HOME/scripts/`，默认目录是 `~/.hermes/scripts/`
- 后台进程要被注册、限流、可终止、可恢复

这说明一个非常重要的 Agent 工程事实：

模型天然倾向于开放生成，而软件系统天然需要边界。

Agent Runtime 的一个核心任务，就是在两者之间做翻译层。

这也是为什么真正可用的 Agent，一定比 Demo 更“麻烦”。

因为你必须不断补这些翻译层。

---

## 8. 对初学者来说，这一章最值得吸收的，是“不要把安全理解成额外负担”

很多刚入门做 Agent 的人，会把这些护栏看成拖慢开发的包袱。

但如果你换个角度，就会明白它们其实是在帮你把系统从玩具往产品推进。

你可以把安全约束理解成三类能力：

### 8.1 预防误伤

例如危险命令审批、路径限制、workdir 校验。

目标不是防黑客炫技，而是防模型和正常用户请求在误操作下造成真实破坏。

### 8.2 约束副作用扩散

例如子 Agent 禁掉 `send_message`、`memory`、递归 delegation。

目的就是把副作用留在更少的边界里。

### 8.3 提高可观测与可恢复性

例如后台进程注册表、watch 限流、crash checkpoint。

这类设计不是“防攻击”，但同样属于工程安全的一部分。

因为系统失控、不可恢复，本身就是一种安全问题。

---

## 9. 如果你以后自己做 Agent，这一层最不该偷懒

很多层你都可以先做简化版。

比如：

- Gateway 可以先只做一个平台
- Skills 可以先只做最简单的读取
- Cron 可以先只支持 interval

但安全边界这一层，最不建议你完全偷掉。

原因很简单：

你前面做得越强，越需要这里兜底。

一个没有工具的聊天机器人，风险主要是说错话；
一个能执行终端、改文件、发消息、定时工作、跑后台进程的 Agent，风险就是直接动系统。

两者不是一个量级。

所以 Hermes 这层“麻烦”，其实不是负担，而是它能继续往前加能力的前提。

---

## 10. 最后把护栏这一层收一下

基于当前 hermes-agent 仓库中审批、路径校验、终端执行与后台进程治理这几块现有代码，我认为 Hermes 的安全约束层可以这样概括：

它不是在功能之外额外挂几条规则，而是在高副作用执行链上持续把“模型想做的事”翻译成“系统允许做的事”。

这个判断主要来自以下源码事实：

- `tools/approval.py` 用危险命令检测、session 级审批状态和 Gateway/CLI 双通道交互把高风险动作改造成显式授权
- `tools/terminal_tool.py` 在执行前接入统一 guard，并限制 workdir 等参数位的注入风险
- `tools/path_security.py` 把目录逃逸与路径穿越校验抽成共享规则，而不是让每个工具各写一套
- `tools/process_registry.py` 说明真正的风险控制不仅发生在执行前，也发生在执行后的可观测、限流和恢复环节

Hermes 的安全与现实约束层，最值得你学习的，不是某一条具体规则，而是整体态度：

它不假设模型可靠，而是假设模型需要边界；
它不追求无阻碍自动化，而是追求可授权、可观察、可恢复的自动化；
它不把安全当作外围插件，而是嵌进执行链和状态治理里。

所以这一章真正想告诉你的话是：

真正能用的 Agent，必须麻烦一点。

因为只有这些麻烦都补上了，你前面那些“强大能力”才不会反过来变成系统风险。

所以，如果上一章的关键词是“时间维度”，那么这一章的关键词就是：边界治理。

下一章我们收束全书，回到一个对初学者最有价值的问题：

如果你也想做一个自己的 Agent，Hermes 这么大一套系统，到底应该先抄哪几层。

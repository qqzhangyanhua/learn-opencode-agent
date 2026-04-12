# 09｜Cron、后台任务与自动化：从会聊天到会持续工作

## 先把问题摆在桌面上

如果一个 Agent 只能在你发消息时才工作，那它本质上仍然更接近一个“带工具的对话程序”。

但只要系统开始具备下面这些能力，它的性质就会发生变化：

- 到点自己醒来
- 定期执行任务
- 长任务在后台继续跑
- 跑完以后把结果送回对应渠道

这时候，Agent 才真正开始从“会聊天”走向“会持续工作”。

Hermes 在这一层的关键模块主要是：

- `cron/jobs.py`
- `cron/scheduler.py`
- `tools/cronjob_tools.py`
- `tools/process_registry.py`

所以这一章要回答的问题是：

Hermes 是怎么把自动化和后台执行纳入统一运行时的？为什么这一步对于真正可用的 Agent 非常关键？

---

## 1. 先看一个认知升级：自动化不是附加功能，而是 Agent 从助手走向工作体的分水岭

很多 Agent 项目在 Demo 时都会让你觉得很强：

- 它能写代码
- 它能查资料
- 它能调用浏览器
- 它能规划任务

但如果你问一句：

“那它能不能每天下午 6 点帮我检查一次线上错误，并把摘要发回 Telegram 线程？”

很多系统一下就露底了。

原因很简单：

从“即时对话”走向“持续工作”，需要的已经不是 prompt 技巧，而是运行时基础设施。

你至少要解决：

- 任务怎么持久化
- 调度器怎么判断到点
- 执行结果怎么存档
- 如果是消息平台触发的任务，将来该发回哪里
- 如果任务里带有技能或脚本，怎么安全加载
- 如果有后台进程，怎么跟踪、通知、恢复

Hermes 在 `cron/` 和 `process_registry` 这一层做的，正是这些事。

---

## 2. `cron/jobs.py` 说明 Hermes 并不是“定时执行一个 prompt”，而是在管理正式任务对象

打开 `cron/jobs.py`，文件头注释先把最关键的事实说出来了：

- Jobs 存在当前 `HERMES_HOME/cron/jobs.json`，默认路径是 `~/.hermes/cron/jobs.json`
- 输出存到当前 `HERMES_HOME/cron/output/{job_id}/{timestamp}.md`，默认路径是 `~/.hermes/cron/output/{job_id}/{timestamp}.md`

也就是说，Hermes 的 cron 不是一个临时 timer，而是一套正式的任务存储机制。

这点非常重要。

因为很多人对自动化的第一反应是：

“我加一个定时器，到点调一下模型。”

这样当然能跑，但很快会碰到问题：

- 任务定义放哪？
- 改 schedule 怎么办？
- 暂停、恢复、手动触发怎么办？
- 跑过的结果怎么审计？
- 下一次执行时间怎么算？

Hermes 没把这些问题含糊过去，而是明确把 job 变成了持久化对象。

继续看这个文件，你会发现它对 schedule 做了比较完整的建模，支持：

- one-shot
- interval
- cron expression

`parse_schedule()` 支持：

- `"30m"` 这种一次性延时
- `"every 2h"` 这种循环间隔
- `"0 9 * * *"` 这种 cron 表达式
- ISO timestamp 这种定点时间

这说明 Hermes 对自动化的理解，不是“支持一个简单定时”，而是开始认真处理时间语义。

---

## 3. Hermes 的 cron job 不是只有 prompt，还能带 skill、deliver、origin 等运行信息

继续看 `cronjob_tools.py` 和 `cron/jobs.py` 你会发现，一个 Hermes cron job 不只是“未来某个时间执行一句话”。

它还可能带上：

- `prompt`
- `skills`
- `deliver`
- `origin`
- `provider/model/base_url`
- `script`

这说明 Hermes 的 cron job，本质上是一个未来要启动的 Agent 运行配置。

尤其是 `origin` 和 `deliver` 很关键。

为什么？

因为只要任务是从 Gateway 场景里创建的，Hermes 就有机会记住：

- 它最初来自哪个平台
- 来自哪个 chat_id
- 是否来自 thread

`tools/cronjob_tools.py` 里的 `_origin_from_env()` 就在做这件事。

这意味着未来任务运行完后，系统可以尝试把结果送回原来的工作现场，而不是丢在一个没人看的日志文件里。

这就是自动化真正有价值的地方。

不是“定时跑了一次”，而是“定时跑完之后，结果回到了对的人和对的话题里”。

---

## 4. `cronjob_tools.py` 最值得注意的，不是 create/list/edit，而是它把风险前置到任务创建时

很多人做定时任务，会把重点放在调度器本身。

但 Hermes 很清楚，cron 最大的风险常常不在“到点有没有执行”，而在“你存进去的到底是什么东西”。

所以 `tools/cronjob_tools.py` 一上来就做了两类很重要的前置检查。

### 4.1 Cron prompt 扫描

文件里有 `_CRON_THREAT_PATTERNS` 和 `_scan_cron_prompt()`。

它会阻断一批高危模式，比如：

- 忽略之前指令
- system prompt override
- secret exfiltration
- 读取 `.env`
- 修改 `authorized_keys`
- `rm -rf /`

这非常有代表性。

因为 cron 场景的危险性比普通即时对话更高。

理由很简单：

- 它会在未来自动执行
- 用户往往不会在现场盯着
- 它可能跑在 full tool access 环境里

所以 Hermes 不等执行时再看，而是在创建 job 时就先做 prompt 注入和高危 payload 扫描。

### 4.2 Script path 验证

同一个文件里还有 `_validate_cron_script_path()`。

它要求 script 必须是相对 `HERMES_HOME/scripts/` 的路径，默认落在 `~/.hermes/scripts/`，并拒绝：

- 绝对路径
- `~` 展开
- 穿越出 scripts 目录

这说明 Hermes 不愿意让 cron 变成“未来任意执行任意脚本”的入口。

从工程视角看，这是一种非常正确的保守策略。

---

## 5. `cron/scheduler.py` 真正让 Hermes 从“存任务”变成“会按时做事”

有了 job 定义还不够，还要有人定时检查哪些 job 到点了。

这就是 `cron/scheduler.py` 的角色。

文件头注释写得很清楚：

- 提供 `tick()`
- Gateway 会每 60 秒从后台线程调用一次
- 用 `HERMES_HOME/cron/.tick.lock` 做文件锁，默认路径是 `~/.hermes/cron/.tick.lock`

这三句分别代表三件很重要的事。

### 5.1 调度是显式的后台机制

Hermes 没有把 cron 逻辑藏在某个模糊回调里，而是明确有一个 scheduler tick。

### 5.2 它依附于 Gateway 这种长期运行进程

这说明自动化不是单机脚本风格，而是和长期在线运行面结合在一起。

### 5.3 它考虑了并发与重入

文件锁的存在表明 Hermes 已经在考虑：

- 多个进程重叠 tick
- daemon / gateway / systemd timer 同时存在

这就是从 Demo 迈向真实运行环境时必须面对的问题。

如果没有这层锁，你很容易得到重复执行和状态错乱。

---

## 6. Scheduler 里最有意思的一点：自动化不是只跑，还要知道结果该怎么投递

继续看 `cron/scheduler.py`，会发现它不只是“把 due jobs 跑掉”，还处理了结果投递逻辑。

例如：

- `_resolve_origin()`
- `_resolve_delivery_target()`
- `_deliver_result()`

这说明 Hermes 对自动化的理解不是“定时生成一个文本文件”，而是“定时完成一次有终点的任务”。

`_resolve_delivery_target()` 甚至支持几种不同模式：

- `local`
- `origin`
- 指定 `platform:chat`
- 回落到某平台的 home channel

这非常关键。

因为很多自动化系统的最后一公里常常没打通：

任务确实跑了，但结果没有自然回到工作流。

Hermes 在这里做的事情，是把 cron 和 Gateway 正式接起来。

于是你得到的不是“定时跑脚本”，而是“定时在工作现场交付结果”。

这才是 Agent 自动化真正的产品价值。

---

## 7. 后台持续工作不只靠 cron，还靠 `process_registry.py` 管住长进程

定时任务是一类自动化，后台进程是另一类。

Hermes 在 `tools/process_registry.py` 里专门维护了一套后台进程注册表。

文件头注释已经把功能列得很完整：

- output buffering
- status polling
- wait
- kill
- crash recovery via checkpoint
- session-scoped tracking

这说明 Hermes 不是只会“把终端命令丢到后台”，而是在认真管理后台运行对象。

这层能力为什么重要？

因为很多真实任务都不是瞬间完成的：

- 启动一个本地服务
- 跑长时间测试
- 跑训练任务
- 持续监控日志

如果这些进程没有注册表，系统很快会出现一堆问题：

- 谁启动的？
- 现在还活着吗？
- 输出去哪看？
- 跑完怎么通知？
- 如果 Hermes 进程重启了，还能不能恢复状态？

`process_registry.py` 恰恰就是在回答这些问题。

尤其值得注意的是，它不仅有 `completion_queue`，还有 watch pattern 机制和 crash checkpoint。

这说明 Hermes 已经不把后台进程当成临时 hack，而是把它们当成运行时需要正式管理的对象。

---

## 8. 从这一层你会看明白：真正的 Agent 自动化，本质上是在补“时间维度”

前面几章你看到的，大多还是“当前回合”能力：

- 当前问题怎么回答
- 当前任务怎么调用工具
- 当前会话怎么恢复历史

而到了 cron 和后台执行这一层，Hermes 开始补上 Agent 很关键的另一维：

时间。

也就是说，系统开始不只会处理“现在”，还会处理：

- 未来某个时间该做什么
- 一段时间内持续运行什么
- 任务完成后如何通知
- 跨时间保存什么状态

这个变化非常大。

因为一旦系统能跨时间持续工作，它就不再只是一个会话程序，而越来越像一个真正的任务代理。

这也是为什么我会说，自动化不是附加能力，而是 Agent 迈向工作体的重要分水岭。

---

## 9. 对初学者来说，这一章最值得学的不是“加个 cron”，而是这三个工程判断

### 9.1 任务要先变成正式对象，再谈调度

Hermes 先有 jobs.json、output 目录、schedule 解析、origin / deliver 信息，之后才有 scheduler。

先有任务模型，后有调度。

### 9.2 自动化的真正价值在结果回流，而不只是到点执行

一个 cron 任务如果只是跑完留个文件，价值有限。

Hermes 更进一步，把 delivery target 也纳入任务设计。

### 9.3 长任务不能只靠“后台执行”，还要有可观测、可恢复、可通知的注册表

`process_registry.py` 很值得抄。

否则你的后台任务最终只会变成一堆你也说不清状态的孤儿进程。

---

## 10. 最后把自动化这一层收住

基于当前 hermes-agent 仓库中 `cron/` 与后台进程管理的现有实现，我认为 Hermes 的自动化层可以这样概括：

它并不是在定时触发一句 prompt，而是在围绕 job 建模、调度执行、结果投递和后台进程治理，补齐 Agent 的时间维度。

这个判断主要来自以下源码事实：

- `cron/jobs.py` 把任务定义、schedule、output 和 next-run 逻辑正式持久化
- `tools/cronjob_tools.py` 在 job 创建入口就处理 prompt 扫描、script path 限制和 origin/deliver 参数治理
- `cron/scheduler.py` 负责 tick、文件锁、防重入以及结果投递
- `tools/process_registry.py` 负责后台进程的状态跟踪、输出缓冲、通知与 crash recovery

Hermes 在 cron 和后台自动化这一层做的，不是简单让系统“定时说句话”，而是给 Agent 补上了持续工作的能力。

它通过：

- `cron/jobs.py` 建模正式 job
- `tools/cronjob_tools.py` 前置做安全和参数治理
- `cron/scheduler.py` 周期调度并投递结果
- `tools/process_registry.py` 管住长时间后台进程

把 Agent 从“你叫它才动”的系统，往“它会在时间线上持续替你工作”的方向推了一大步。

所以，如果上一章的关键词是“任务隔离”，那么这一章的关键词就是：时间维度。

下一章我们看另一面。

也就是所有这些能力为什么不能只追求“更强”，而必须认真处理安全约束与工程现实。

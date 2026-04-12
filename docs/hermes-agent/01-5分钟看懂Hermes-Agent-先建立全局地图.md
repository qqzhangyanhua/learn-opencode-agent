# 01｜5 分钟看懂 Hermes Agent：先建立全局地图

## 先建立一张全局地图

如果你现在直接打开 hermes-agent 这个仓库，第一感觉大概率不是“这个项目很简单”，而是“文件很多、入口很多、功能很多，不知道该先看哪里”。

这其实很正常。因为 Hermes Agent 已经不是一个只会把用户输入送进模型、再把输出打印出来的小脚本了。它已经演化成一个相对完整的 Agent Runtime：

- 有真正的主执行循环，而不是一次性问答
- 有系统提示词装配层，而不是把 prompt 写死在一个字符串里
- 有工具注册与调度体系，而不是临时 if/else 分发
- 有会话存储、跨会话检索、持久记忆
- 有上下文压缩，而不是上下文爆了再随便截断
- 有 CLI，也有 Telegram / Discord / Slack / WhatsApp 等网关接入
- 有 cron 调度、后台任务、子 Agent 委托与并行执行

所以这一章的目标，不是立刻把每一个模块讲深，而是先帮你建立一张“全局地图”：Hermes Agent 这个系统到底由哪些层构成、各层各自解决什么问题、以及为什么它已经明显超出了“LLM 套壳应用”的范畴。

换句话说，本章不是讲细节，而是先回答一句话：

Hermes Agent 到底是一个什么系统？

我的判断是：

Hermes Agent 的核心价值，不是再包一层模型 API，而是把大模型变成“可持续执行、可跨会话延续、可跨平台运行、可被约束和编排”的运行时。

这个判断，不是概念推测，而是可以从当前 hermes-agent 仓库的现有代码结构里直接看出来。

---

## 1. 先从仓库结构看：Hermes Agent 解决的不是一个点问题

从项目上下文里的 AGENTS.md，可以先看到 Hermes Agent 的主骨架：

- run_agent.py：AIAgent，核心会话循环
- model_tools.py：工具发现、schema 汇总、函数调用分发
- toolsets.py：工具集定义
- cli.py：交互式 CLI 编排
- hermes_state.py：SessionDB，会话存储与检索
- agent/：提示词、压缩、辅助模型、轨迹、显示等内部能力
- tools/：各个工具的实现与注册
- gateway/：Telegram、Discord、Slack、WhatsApp 等平台适配
- cron/：定时任务调度
- tests/：完整测试体系

这组结构本身已经说明一个问题：

Hermes Agent 不是围绕“某一个技巧”搭起来的，而是围绕“一个智能体在真实世界里长期运行时需要哪些基础设施”来设计的。

很多 Agent 项目，代码看上去也有几十个文件，但核心仍然只是：

1. 收到输入
2. 拼 prompt
3. 调一次模型
4. 如果模型说要调工具，就执行
5. 把结果返回

而 Hermes Agent 明显不止于此。它把模型、工具、记忆、会话、平台、计划、后台执行、压缩、技能，这些原本常常散落在不同脚本里的能力，收束成了一个统一 runtime。

这意味着你理解 Hermes Agent，不能只盯着某个 prompt、某个 tool 或某个前端入口，而要把它当成一个“运行系统”来看。

---

## 2. AIAgent 是系统中枢，不是聊天外壳

真正判断一个项目是不是 runtime，最直接的方法，就是看它有没有一个承担总编排职责的核心对象。

在 Hermes Agent 里，这个角色就是 run_agent.py 里的 AIAgent。

根据 AGENTS.md 给出的定义，AIAgent 提供两个核心接口：

- chat(message: str) -> str
- run_conversation(user_message: str, system_message: str = None, conversation_history: list = None, task_id: str = None) -> dict

这两个接口看似普通，但真正关键的是后者背后的执行方式。项目文档里已经直接概括了它的主循环：

- 构造 messages 与 tool schemas
- 调模型 API
- 如果模型返回 tool_calls，就逐个执行工具
- 把 tool result 作为新消息追加回去
- 再次调用模型
- 直到模型不给工具调用、直接产出最终回答

这与一次性问答最大的区别在于：

Hermes Agent 的一次用户请求，内部可能对应多轮“模型—工具—模型—工具”的闭环。

这也是 Agent 和普通聊天机器人之间最本质的分界线之一。

在 run_agent.py 中，我们还能看到更强的工程化信号。

例如在 _build_system_prompt() 中，系统提示词不是临时拼一下，而是按层装配：

1. SOUL.md 或默认身份
2. 工具相关行为约束
3. 外部 system message
4. 内置 memory / user profile
5. 外部 memory provider 的 prompt block
6. skills 索引
7. 项目上下文文件
8. 当前时间、模型、provider 信息
9. 平台提示

这说明 AIAgent 的职责不是“代替用户调一下 API”，而是负责把系统状态、用户画像、平台环境、可用能力、项目上下文统一组织成一个适合当前回合的执行面。

更重要的是，run_agent.py 并不只处理“模型输出了什么”，还负责：

- 工具调用前后的状态维护
- 记忆工具与 session_search / delegate_task 等 agent 级工具的特殊处理
- 工具结果回填消息流
- 中断、预算、上下文压力、压缩前记忆 flush
- 严格 provider 兼容层与 tool_call 格式清洗

这类职责一旦出现，就说明 AIAgent 已经不是 UI 层对象，而是系统编排器。

---

## 3. Hermes Agent 的第一层核心，不是 Prompt，而是“循环”

很多人看 Agent 项目时，天然会先找 prompt，认为系统能力强不强，首先取决于提示词写得好不好。

但从 Hermes Agent 的代码来看，真正的第一性问题不是 prompt，而是循环。

为什么？因为只有循环，模型才有机会：

- 看见外部环境反馈
- 根据工具结果修正策略
- 逐步拆解复杂任务
- 在多轮执行中把“思考”和“行动”连接起来

如果没有这个循环，再精巧的 prompt 最后也只是一次性文本生成。

AGENTS.md 对 run_conversation() 的伪代码总结得很直白：

while 还有预算:
- 调模型
- 如果有工具调用，就执行工具并追加结果
- 否则返回最终文本

看起来很简单，但正是这个简单循环，定义了 Agent Runtime 的基本范式。

而 Hermes Agent 在这个基本循环之上，还叠了大量真实世界里必须有的约束：

- max_iterations：防止无限自旋
- tool execution path：根据工具类型走不同执行分支
- messages 历史回填：确保后续轮次能看到先前动作
- budget warning：在接近上限时提醒模型尽快收束
- interrupt handling：用户打断时跳过未执行工具
- tool result persistence：必要时持久化大结果

这些东西乍看琐碎，实际上决定了一个 Agent 能不能稳定运行。

所以如果你只把 Hermes Agent 理解成“一个 prompt 很长、工具很多的聊天器”，会错过它最重要的部分。它真正的复杂度，恰恰在于如何让一次用户请求，在多轮循环里稳定推进，而不是失控、忘记状态、工具格式错乱或者上下文爆炸。

---

## 4. Prompt Builder 在 Hermes 里是装配流水线，不是文案文件

当然，Hermes Agent 也非常重视 prompt。但它重视的方式，不是“不断把 prompt 写长”，而是把 prompt 模块化。

从 agent/prompt_builder.py 可以直接看出这一点。

这个文件里至少能看到几类关键常量与函数：

常量层：
- DEFAULT_AGENT_IDENTITY
- MEMORY_GUIDANCE
- SESSION_SEARCH_GUIDANCE
- SKILLS_GUIDANCE
- TOOL_USE_ENFORCEMENT_GUIDANCE
- OPENAI_MODEL_EXECUTION_GUIDANCE
- PLATFORM_HINTS

函数层：
- build_skills_system_prompt(...)
- load_soul_md()
- build_context_files_prompt(...)

这意味着 Hermes Agent 已经把系统提示词拆成多个职责块：

- 你是谁
- 你如何使用 memory
- 你什么时候该使用 session_search
- 你如何理解和使用 skills
- 你必须怎样使用工具
- 不同模型家族需要额外补哪些执行纪律
- 不同平台应该怎样格式化回答
- 当前项目有哪些上下文文件应该注入

这和“在代码里写一个大字符串”完全不是一个阶段。

更值得注意的是，run_agent.py 的 _build_system_prompt() 不是无差别把所有块都塞进去，而是会看当前 valid_tool_names 来决定是否注入 memory、session_search、skill_manage 对应的引导；还会根据模型名是否包含 gpt / codex / gemini / gemma 等，决定是否注入更强的工具纪律与执行规范。

这说明 Hermes Agent 的 prompt 设计已经进入一个很工程化的阶段：

它不把提示词当作静态说明书，而是当作“按当前运行条件动态组装的执行环境”。

这一点非常关键。因为真正成熟的 Agent 系统，prompt 不再只是给模型“讲规则”，而是承担运行时配置层的作用。

---

## 5. 工具系统不是附加功能，而是 Hermes 的能力底盘

如果继续看 model_tools.py，你会发现 Hermes Agent 的工具体系不是临时拼上的。

这个文件一开始就把自己定义为：

一个薄编排层，覆盖工具注册表之上；每个 tools/ 下的模块通过 registry.register() 自注册 schema、handler 和 metadata；而 model_tools.py 负责触发发现、提供 tool definitions、提供 handle_function_call()。

这是一个非常鲜明的工程化信号。

它意味着 Hermes 的工具系统至少有三层：

第一层：工具实现
- 真正做事的函数在 tools/*.py

第二层：注册与元数据
- schema
- toolset
- requirements
- handler

第三层：运行时编排
- 发现工具
- 根据启用/禁用 toolsets 过滤
- 动态生成 schema
- 统一分发调用
- 处理 async/sync bridge

在 model_tools.py 里可以直接看到 _discover_tools() 会导入一组工具模块，例如：

- tools.web_tools
- tools.terminal_tool
- tools.file_tools
- tools.browser_tool
- tools.todo_tool
- tools.memory_tool
- tools.session_search_tool
- tools.code_execution_tool
- tools.delegate_tool
- tools.process_registry

然后 get_tool_definitions() 再根据 enabled_toolsets / disabled_toolsets 和 registry.check_fn 结果，构造当前 session 真实可见的工具列表。

更细一点说，这个文件里还有两处很典型的“runtime thinking”：

1. execute_code 的 schema 会根据当前真正可用的工具动态重建，避免模型看到其实不可用的 sandbox tool 名称。
2. browser_navigate 的描述会在 web_search / web_extract 不可用时去掉对它们的交叉引用，减少模型幻觉调用。

这类细节说明 Hermes Agent 的设计者已经意识到：

工具系统不只是把函数暴露给模型，而是要尽量让“模型看到的能力边界”和“系统真实可调用的能力边界”保持一致。

这正是很多 Agent 系统出问题的地方。模型会幻觉自己能调用某个工具，往往不是模型太笨，而是系统在 prompt / schema / runtime 三者之间没有对齐。

Hermes 在这一点上已经做了明显补偿。

---

## 6. 记忆、技能、检索都不是外挂，而是系统原生层

从 prompt_builder.py 和 AGENTS.md 一起看，会发现 Hermes Agent 很明显不是“聊完即忘”的设计。

它至少内建了三类长期能力：

1. memory：保存持久事实
2. session_search：检索过去会话
3. skills：把程序性经验保存成可复用操作指南

这三类能力的定位完全不同：

- memory 保存的是用户偏好、环境事实、稳定约定
- session_search 找的是过去做过什么、聊过什么
- skills 保存的是“某类任务以后应该怎么做”的过程知识

这一分层其实非常成熟。因为很多项目会把所有长期信息都混成一锅：

- 既想记用户偏好
- 又想记历史任务
- 还想记工作流
- 最后导致检索和注入都很混乱

而 Hermes Agent 已经明确区分：

- 用户相关事实进 memory
- 过去会话靠 session_search 回忆
- 可复用方法论沉淀成 skill

你甚至可以在当前系统提示里直接看到这种分工被写成约束：

- 不要把任务进度写进 memory
- 如果过去聊过相关事情，先用 session_search
- 复杂任务完成后，把方法存成 skill

这意味着“长期能力”在 Hermes 里不是某个额外插件，而是系统设计原则的一部分。

---

## 7. 上下文文件发现机制，说明它把“项目环境”当成一等输入

再看 prompt_builder.py 里的 build_context_files_prompt(...)，可以更明显地感受到 Hermes 的工程取向。

这个函数会按优先级自动寻找并注入项目上下文文件：

1. .hermes.md / HERMES.md
2. AGENTS.md / agents.md
3. CLAUDE.md / claude.md
4. .cursorrules / .cursor/rules/*.mdc

而且是“first found wins”，只加载一种主项目上下文来源。

这件事看似普通，其实很重要。因为它说明 Hermes Agent 并不把自己看成一个孤立聊天机器人，而是一个进入具体项目环境后，需要读取“本地治理规则”的执行者。

这也解释了为什么它能兼容不同 agent 生态：

- Hermes 自己的 .hermes.md
- 通用开发协作里的 AGENTS.md
- Claude 系生态里的 CLAUDE.md
- Cursor 生态里的 .cursorrules

更进一步，load_soul_md() 还会从 HERMES_HOME 下读取 SOUL.md，作为系统身份层，而 build_context_files_prompt(..., skip_soul=True) 则避免重复注入。

这说明 Hermes 对上下文来源已经有明确层级区分：

- SOUL.md 负责“你是谁”
- 项目上下文文件负责“你在这个仓库里应该遵守什么”

这种分层极其重要。因为在实际工程里，Agent 的失败往往不是模型不会写代码，而是搞不清系统身份、用户长期偏好、项目局部规则这三者谁优先。

Hermes 至少已经在结构上把这几层分开了。

---

## 8. 平台感知能力，意味着 Hermes 不是只为 CLI 设计

另一个能迅速判断系统成熟度的指标，是它是否天然支持多平台，而不是“先做 CLI，再额外糊一个机器人接口”。

从仓库结构和 _build_system_prompt() 的实现来看，Hermes 明显属于前者。

run_agent.py 在构造系统提示时，会根据 self.platform 注入 PLATFORM_HINTS。当前 prompt_builder.py 中已经内置了多平台提示逻辑；而项目结构里又有单独的 gateway/ 目录和各平台 adapter。

这说明平台信息不是外围包装，而是会直接影响模型行为。

举例来说：

- 在 Telegram / WhatsApp / Discord 这类平台，输出格式、媒体回传方式、命令可见性都不同
- 某些平台支持 slash commands，某些平台支持线程，某些平台需要特殊 mention 机制
- 调度任务的 deliver 目标也可能是 origin、local 或具体 platform:chat_id

一旦这些信息进入系统提示，模型就不再是在一个抽象真空里回答，而是在“知道自己此刻处于什么通信媒介”的前提下行动。

这类能力，往往是一个 Agent 从 demo 走向产品化时最先暴露的断层。CLI 能跑，不代表 Telegram 能跑；Telegram 能跑，不代表多线程频道、群组、topic、home channel 回投都能跑。

Hermes 把这些东西放进架构核心，而不是留到最后再补，说明它从一开始就是按“多入口统一运行时”来设计的。

---

## 9. 真正把系统拉开差距的，是它开始处理“长期运行的麻烦事”

到这里你会发现，Hermes Agent 和很多入门项目最大的差别，不在某个耀眼能力，而在它开始认真处理长期运行时才会出现的问题。

这些问题包括：

- 长对话的上下文压缩
- 工具调用格式兼容不同 provider
- 记忆在压缩或退出前的 flush
- 工具结果过大时的持久化
- 预算快耗尽时如何提示模型收束
- 子任务如何委托给 subagent
- 定时任务如何脱离当前会话继续执行
- 会话如何被检索、回忆、复用

换句话说，Hermes 的重点不是“做出一个会调工具的 AI”，而是“让这个 AI 在复杂环境下还能持续工作”。

这就是 runtime 的意义。

一个只演示工具调用的项目，核心问题是“能不能做成”。

而一个真正的 runtime，核心问题会变成：

- 能不能持续跑
- 能不能跨回合跑
- 能不能跨平台跑
- 能不能在上下文受限时继续跑
- 能不能在未来某个时间点继续跑
- 能不能把做过的事沉淀下来，下次别从头来

Hermes 现在已经明显站在第二个阶段了。

---

## 10. 为什么这张全局地图很重要

如果你后面准备继续深入读 Hermes Agent 的源码，这一章最想帮你建立的，不是“每个文件是做什么的”这么简单，而是一种阅读顺序。

我建议你把 Hermes Agent 理解为下面这几层：

第一层：执行内核
- run_agent.py
- 关注点：主循环、消息流、工具结果回填、预算与中断

第二层：能力暴露层
- model_tools.py
- tools/
- toolsets.py
- 关注点：工具发现、schema 过滤、调用分发、真实能力边界对齐

第三层：认知装配层
- agent/prompt_builder.py
- 关注点：身份、技能、平台、上下文文件、工具纪律如何被装入 system prompt

第四层：长期状态层
- memory
- session_search
- session store / SessionDB
- 关注点：跨会话连续性与长期信息分层

第五层：多入口运行层
- cli.py
- gateway/
- 关注点：同一 runtime 如何服务不同交互界面

第六层：长期任务层
- cron/
- delegate_task
- process registry
- 关注点：任务如何脱离单轮对话，变成持续执行能力

当你这样分层后，再去看 Hermes，就不会陷入“这个项目为什么文件这么多”的混乱，而会知道：

这些文件并不是随意堆出来的，它们是在围绕一个目标逐步外延——把大模型包装成一个可操作、可维护、可延续的智能体系统。

---

## 把全局地图先收一下

基于当前 hermes-agent 仓库的现有代码，我认为 Hermes Agent 的第一印象应该被这样概括：

它不是一个“会调用工具的聊天机器人”，而是一个已经具备运行时雏形甚至相当多 runtime 特征的 Agent 系统。

这个结论主要来自以下源码事实：

- run_agent.py 里的 AIAgent 明确承担多轮执行编排职责
- _build_system_prompt() 说明系统提示词已经被拆成动态装配流水线
- model_tools.py 说明工具暴露、过滤、分发和能力边界对齐已经成为独立层
- prompt_builder.py 说明身份、技能、记忆、平台、项目规则都被系统化注入
- 仓库结构显示它天然面向 CLI、Gateway、定时任务、会话持久化与测试体系

所以，从源码阅读策略上说，Hermes Agent 最值得学的第一件事，不是某个 prompt 片段，也不是某个炫酷工具，而是：

如何把“模型 + 工具”做成一个长期可运行的系统。

这也是后续章节真正要展开的主线。

下一章，我们就不再停留在全局地图，而是进入最核心的 run_agent.py：看一个 Agent 到底是怎样从用户一句话开始，进入“模型—工具—模型”的执行闭环，并最终产出结果的。

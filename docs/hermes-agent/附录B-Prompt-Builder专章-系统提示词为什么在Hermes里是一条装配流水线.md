# 附录 B｜Prompt Builder 专章：系统提示词为什么在 Hermes 里是一条装配流水线

## 先问 Prompt 到底是不是一段字符串

很多人刚学 Agent 时，会把 system prompt 想成“身份设定 + 几条规则”的大字符串。做 Demo 时这没问题；但系统一复杂，你很快就会遇到一串工程问题：身份、memory、skills、context files、平台提示、工具可见性、缓存稳定性到底各放哪一层。

Hermes 的价值就在这里。它没有把 system prompt 当成静态文案，而是把它做成了一条真正的装配流水线。

这一篇附录就专门基于当前 hermes-agent 仓库里的相关源码，拆这条流水线。

核心文件主要是：

- `run_agent.py`
- `agent/prompt_builder.py`
- `agent/skill_commands.py`

---

## 1. Hermes 最重要的判断：system prompt 不是文案，而是运行时前缀

如果你只从“写提示词”的角度理解 Agent，很容易把 system prompt 看成一段静态人格说明。

但看 `run_agent.py` 里的 `_build_system_prompt()` 注释就会发现，Hermes 的理解完全不一样。

这个函数的注释明确写了三件事：

- 它负责 assemble full system prompt
- 它会缓存到 `self._cached_system_prompt`
- 正常只在 session 开始时构建一次，只有 context compression 之后才重建

这几句话已经足够说明问题：

Hermes 眼里的 system prompt，不是随手拼的一段说明文字，而是一段尽量稳定、承载当前运行环境的执行前缀。

为什么这点重要？

因为只要你开始做长期多轮 Agent，system prompt 的职责就会迅速扩张。

它不再只是告诉模型“你是谁”，还要告诉模型：

- 你处在什么平台里
- 你有哪些工具
- 哪些行为纪律此刻生效
- 哪些长期记忆应被注入
- 当前项目有哪些 context files

换句话说，system prompt 已经从“角色设定”升级成了“运行时配置前缀”。

Hermes 正是在按这个思路设计它。

---

## 2. `agent/prompt_builder.py` 的价值，不是多写了几个常量，而是把 system prompt 拆成可组合部件

打开 `agent/prompt_builder.py`，文件头就直接说了它的定位：

- System prompt assembly
- identity
- platform hints
- skills index
- context files

并且强调：

- All functions are stateless
- `AIAgent._build_system_prompt()` 调这些函数去组装 pieces

这说明 Hermes 明确不想把 system prompt 写死在 `run_agent.py` 一个大字符串里。

它的做法是先拆部件，再由 AIAgent 统一装配。

这是非常值得学的一个点。

因为在真实系统里，system prompt 的问题不是“写不写得出来”，而是：

当需求越来越多时，你还能不能知道每一块是干什么的。

Hermes 通过这种拆法，把几个最容易混在一起的东西分开了：

- 默认身份
- memory guidance
- session_search guidance
- skills guidance
- tool-use enforcement
- OpenAI / Google 等模型族专属行为提示
- platform hints
- context files

这一步的意义很简单：system prompt 不再是一坨文本，而是一组职责明确的片段。

---

## 3. `_build_system_prompt()` 最像流水线的地方，是它先定义“层次顺序”，再决定“哪些层此刻该生效”

看 `run_agent.py` 里 `_build_system_prompt()` 的注释，Hermes 其实已经把装配顺序写成了一张小架构图：

1. Agent identity
2. User / gateway system prompt
3. Persistent memory
4. Skills guidance
5. Context files
6. Current date & time
7. Platform-specific formatting hint

这个顺序非常关键。来源一多，难点就不再是“都放进去”，而是顺序稳不稳、语义清不清、不同层会不会互相覆盖。Hermes 在这件事上至少做对了两点。

### 3.1 先放 identity，再放其他所有约束

这意味着系统最先确定的是“你是谁”，而不是“你先做什么”。

### 3.2 平台 hint 放得很后

这说明平台格式要求是附加环境，而不是身份核心。

也就是说，Hermes 在结构上就区分了：

- 核心人格 / 执行纪律
- 当前运行环境

这比把所有东西揉在一起写一个大 prompt 清晰得多。

---

## 4. Hermes 不是无差别注入 guidance，而是按“当前工具是否真的可见”来决定

这是这条流水线里最有工程味的地方之一。

在 `_build_system_prompt()` 里，Hermes 会先看当前 `valid_tool_names`，再决定要不要加这些 guidance：

- `MEMORY_GUIDANCE`
- `SESSION_SEARCH_GUIDANCE`
- `SKILLS_GUIDANCE`

也就是说：

- 没有 `memory` 工具，就不注 memory guidance
- 没有 `session_search`，就不注那部分 guidance
- 没有 `skill_manage`，就不谈 skill 的维护与沉淀

这件事最值得记住的地方是：Prompt 里写的能力，尽量要和 runtime 里真的可用能力对齐。否则模型很容易一边被无效规则干扰，一边对自己并不存在的能力产生幻觉。

这一步其实就是 Prompt Builder 和 tool layer 的对齐。

也是它之所以像流水线而不是文案文件的原因之一。

---

## 5. 这条流水线还会按模型家族追加不同的“操作纪律”

继续看 `_build_system_prompt()`，你会发现 Hermes 不只按工具注入，还会按模型名称动态注入额外 guidance。

例如：

- 命中 `TOOL_USE_ENFORCEMENT_MODELS` 时，会加入 `TOOL_USE_ENFORCEMENT_GUIDANCE`
- 如果模型名里带 `gemini` 或 `gemma`，会追加 `GOOGLE_MODEL_OPERATIONAL_GUIDANCE`
- 如果模型名里带 `gpt` 或 `codex`，会追加 `OPENAI_MODEL_EXECUTION_GUIDANCE`

这说明 Hermes 还有一个非常现实的判断：

不是所有模型都需要同样的操作纪律。

这件事特别值得补充说明。

很多人会默认“同一份 prompt，换个模型只是效果差一点”。Hermes 的做法恰好说明工程上不是这样：不同模型族有不同强项和失误模式，所以 Prompt Builder 不只是负责“拼起来”，还负责按模型家族做运行时适配。

---

## 6. `SOUL.md`、`AGENTS.md`、`.cursorrules` 这些 context files，不是顺手读一读，而是系统化发现和筛选

很多 Agent 项目现在都会自动加载项目上下文文件。

但 Hermes 在这一层做得相对成熟的地方是，它不是简单 `cat` 一下，而是把 context file injection 做成了一条独立链路。

看 `agent/prompt_builder.py`，你会看到：

- `load_soul_md()`
- `build_context_files_prompt(...)`
- `_find_hermes_md(...)`
- `_find_git_root(...)`

以及一整套 context injection threat scanning：

- `_scan_context_content(...)`
- `_CONTEXT_THREAT_PATTERNS`
- `_CONTEXT_INVISIBLE_CHARS`

这说明 Hermes 把 context files 当成：

- 很有价值的 prompt 来源
- 同时也可能带来 prompt injection 风险的输入面

所以它不是简单信任这些文件，而是：

1. 先发现
2. 再筛查
3. 再截断
4. 最后以结构化 section 形式注入

这一步非常有教学意义。

因为它说明：

一旦某种东西要进入 system prompt，它就不再只是“文档”，而是“执行前缀的一部分”。

进入这条流水线的东西，就应该被认真治理。

---

## 7. `SOUL.md` 在 Hermes 里不是普通 context file，而是 identity slot

这点很容易被忽略，但其实非常关键。

看 `load_soul_md()` 和 `_build_system_prompt()` 的配合逻辑，Hermes 对 `SOUL.md` 的定位不是一般项目规则，而是：

优先作为 Agent identity 的第一层。

也就是说，`SOUL.md` 不是和 `AGENTS.md`、`.cursorrules` 完全平级的。

它更接近：

“如果存在，就拿来当第一身份块”

只有在 context files 部分，才通过 `skip_soul` 防止重复注入。

这说明 Hermes 明确在区分两种东西：

- identity source
- project context source

这一步很成熟。

因为很多项目会把人格、项目规范、工作目录提示全揉在一起。

而 Hermes 至少在结构上已经把“我是谁”和“我当前处在哪个项目规则里”拆开了。

这正是 Prompt Builder 应该做的工作。

---

## 8. Skills 在 Prompt Builder 里不是全文注入，而是“技能索引注入”

前面的 Skills 章节已经讲过，Hermes 不喜欢把所有 skill 正文全塞进上下文。

在 Prompt Builder 这里，这个思路进一步体现出来。

`run_agent.py` 并不是直接把 skill 内容全扔进 system prompt，而是调用：

- `build_skills_system_prompt(...)`

也就是说，这里注入的是一份 compact skill index，而不是所有 skill 的全文。

这一步很重要。

因为它说明 Hermes 对 system prompt 的定位一直很克制：

system prompt 用来提供“能力地图”和“使用纪律”，不是直接变成一个无限膨胀的知识库。

这种做法的好处非常明显：

- 避免 token 爆炸
- 避免所有 skill 永久污染上下文
- 给 skill 系统保留按需展开空间

从工程角度看，这又一次证明：

Prompt Builder 的任务不是“把能想到的东西全塞进去”，而是“把该常驻的那部分编排进去”。

---

## 9. Hermes 还专门保护了一类经常被忽略的东西：ephemeral system prompt

看 `_build_system_prompt()` 中间那段注释，有一句很关键：

- `ephemeral_system_prompt` 不放在这里
- 它只在 API call time 注入
- 这样它不会进入 cached / stored system prompt

这一步非常值得讲。

因为很多系统会把短期临时提示直接拼进主 system prompt，结果带来两个问题：

- prompt cache 前缀被破坏
- session 级 system prompt 快照变得不稳定

Hermes 在这里的判断很清楚：

system prompt 是 Hermes 的稳定前缀领地；
临时性提示如果必须加，也要走 API-call time 注入，而不是污染主缓存块。

你会发现，Hermes 在 Prompt Builder 这一层一直在守一条线：

哪些东西属于 session 级稳定配置，哪些东西只是某次调用的临时附加信息。

这条边界一旦守不住，system prompt 很快就会失去“稳定前缀”的意义。

---

## 10. Prompt Builder 之所以像流水线，还因为它必须和 SessionDB、压缩、缓存一起工作

如果你把前面几个附录和正文拼起来看，会更容易理解 Hermes 为什么不把 Prompt Builder 写成一个大模板文件。

因为它不是独立存在的，它必须同时和下面这些层协作：

- SessionDB：要把某个时刻的 system prompt snapshot 存下来
- Context compression：压缩之后要 invalidate 并重建
- Prompt caching：system prompt 不能乱抖，否则 cache prefix 失效
- Tool visibility：不同工具面影响不同 guidance 是否注入

这意味着 Prompt Builder 其实是多个运行时约束的交汇点。

它一旦写得太随意，就会连锁影响：

- 成本
- 稳定性
- 能力对齐
- 会话可追溯性

所以 Hermes 把 system prompt 做成“流水线”，不是出于代码洁癖，而是因为它必须承受这些交叉约束。

---

## 11. 对学习智能体的人来说，这一篇最值得提炼的是这四个原则

### 11.1 system prompt 要被当成运行时结构，而不是创作文案

一旦系统进入多轮、带工具、带状态的阶段，system prompt 的职责就不再只是“写得像不像”。

它更像一段可复用执行前缀。

### 11.2 Prompt Builder 要先拆层，再装配

身份、记忆、技能、项目规则、平台提示、模型纪律，这些最好都有明确层次。

否则 prompt 很快会变成一团无法维护的混合物。

### 11.3 注入内容要尽量和 runtime 真实能力对齐

Hermes 只在工具真的可见时，才注对应 guidance。

这非常值得抄。

### 11.4 稳定性比“每轮都很灵活”更重要

session 级缓存、system prompt snapshot、prompt cache 命中，都依赖前缀稳定。

Prompt Builder 不是越活越好，而是越稳越值钱。

## 12. 最后把装配线收住

基于当前 hermes-agent 仓库里的相关源码，Hermes 的 Prompt Builder 可以概括成一句话：

它不是在维护一段越来越长的 system prompt 文案，而是在维护一条围绕身份、工具纪律、记忆、技能索引、项目上下文、模型家族差异和平台环境分层装配的执行前缀流水线。

支撑这个判断的关键源码事实是：

- `run_agent.py` 的 `_build_system_prompt()` 明确把 system prompt 当成 session 级稳定前缀，并只在压缩后重建
- `agent/prompt_builder.py` 把 identity、guidance、skills index、context files、platform hints 拆成独立可组合部件
- memory / session_search / skills guidance 都会按当前 `valid_tool_names` 条件注入，而不是无差别写死
- OpenAI / Google 等不同模型家族还会拿到不同的执行纪律提示
- `SOUL.md` 被当成 identity slot，而不是普通 context file
- `build_context_files_prompt(...)` 会做发现、筛查、截断和结构化注入，而不是直接把项目文件原样塞进 prompt
- ephemeral system prompt 被刻意留在 API-call time 注入，避免污染 cached/stored system prompt

这一篇最该带走的一句话是：

真正成熟的 system prompt，不是写出来的，而是装配出来的。一个 Agent 一旦开始长期运行、跨平台接入、带工具工作，Prompt Builder 就不再只是“提示词工程”，而会变成运行时工程本身。

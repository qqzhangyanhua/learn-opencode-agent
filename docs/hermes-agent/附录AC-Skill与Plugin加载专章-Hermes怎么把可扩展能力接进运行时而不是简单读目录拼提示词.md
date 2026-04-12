# 附录 AC｜Skill 与 Plugin 加载专章：Hermes 怎么把可扩展能力接进运行时，而不是简单读目录拼提示词

## 先把扩展边界摆清楚

很多初学者第一次给 Agent 做扩展能力时，脑子里通常只有一个很粗的模型：

- 读某个目录
- 找到一堆 markdown 或 python 文件
- 拼进 prompt
- 或 import 一下就算“插件系统”了

这套想法做 Demo 没问题，
但一旦系统开始变复杂，很快就会失控：

- Skill 到底是提示词，还是命令？
- Plugin 到底是工具、hook，还是运行时入口？
- 为什么有的扩展进 system prompt，有的只在当前回合注入？
- 为什么 Memory Provider 和 Context Engine 又像是另一套插件体系？

Hermes 对这个问题的处理很有代表性：

- 它没有把所有“可扩展能力”揉成一种机制
- 而是按能力性质拆成了几条不同装配流水线

如果你想真正看懂 Hermes 的扩展体系，
你不能只问：

- “它支持 skill 和插件吗？”

你得继续追问：

- Skill 是怎么被发现的？
- Skill 是怎么变成 slash command 的？
- Plugin 是怎么被扫描、加载、执行 `register(ctx)` 的？
- 为什么 Memory Provider / Context Engine 又不完全走通用 PluginManager？
- 最终这些扩展能力是怎么被接进一次真实 API 调用里的？

这一章就专门回答这个问题。

这一篇主要结合这些源码来看：

- `tools/skills_tool.py`
- `agent/skill_utils.py`
- `agent/skill_commands.py`
- `hermes_cli/plugins.py`
- `plugins/memory/__init__.py`
- `plugins/context_engine/__init__.py`
- `run_agent.py`
- `cli.py`
- `gateway/run.py`

---

## 1. Hermes 最核心的判断：Skill、Plugin、Memory Provider、Context Engine 不是同一种东西

先把最容易混淆的地方拆开。

很多项目会把所有“扩展能力”都叫 plugin，
结果最后系统里只剩下一套很模糊的机制：

- 什么都能扩
- 但什么边界都不清楚

Hermes 没这么做。

从源码结构看，它至少把可扩展能力拆成了四层：

### 1.1 Skill

本质更像：

- 一段可按需加载的操作说明 / 工作方法 / prompt 资产

它主要解决的是：

- 怎么把“做某类任务的方法”作为可复用资产装入对话

### 1.2 通用 Plugin

本质更像：

- 一段可以注册工具、hook、CLI 命令、上下文引擎的代码扩展

它主要解决的是：

- 怎么把新的运行时行为接进 Hermes 内核

### 1.3 Memory Provider

本质更像：

- 一个被配置选中的外部记忆后端

它不是任意 hook 插件，
而是一个有明确接口、一次只激活一个的专用扩展位。

### 1.4 Context Engine

本质更像：

- 替换或增强内置 context compressor 的专用扩展位

它也不是随便一个普通 plugin，
而是一个要参与上下文管理和上下文工具导出的核心组件。

这层分类非常重要。

因为它意味着 Hermes 不是在问：

- “怎么做一个万能插件系统？”

而是在问：

- “不同类型的可扩展能力，应该接在哪一层？”

这正是它的扩展体系比很多 Demo 更稳的根本原因。

---

## 2. Skill 的发现路径：不是 import python，而是扫描当前 `HERMES_HOME/skills/` 里的资产目录

先看 Skill。

`tools/skills_tool.py` 里把 Skill 的单一事实来源定义得很清楚：

- `SKILLS_DIR = get_hermes_home() / "skills"`

注释也写得非常直接：

- 所有 skills 都住在当前 profile 的 `HERMES_HOME/skills/`，默认显示路径是 `~/.hermes/skills/`
- 这里是 single source of truth
- agent edits、hub installs、bundled skills 都共存在这里

也就是说，在 Hermes 眼里，Skill 首先不是 Python 模块，
而是：

- 以目录组织的一组文档资产

每个 Skill 至少包含：

- `SKILL.md`

还可以带：

- `references/`
- `templates/`
- `scripts/`
- `assets/`

这一点和通用 Plugin 很不一样。

Skill 的核心不是：

- import 后执行 register()

而是：

- 按需读取和装配内容

### 2.1 Skill 不只扫描本地目录，还支持 external dirs

`agent/skill_utils.py` 里还有：

- `get_external_skills_dirs()`
- `get_all_skills_dirs()`

它会从 `config.yaml` 的：

- `skills.external_dirs`

里读取额外目录，展开 `~` 和环境变量，去重后加入扫描结果。

这说明 Hermes 在 Skill 这层的扩展思路是：

- Skill 更像“可挂载的知识/方法资产目录”

而不是：

- 强绑定在当前仓库里的内建代码

---

## 3. Skill 怎么从目录变成可调用命令：`scan_skill_commands()` 负责发现、过滤、标准化

真正把 Skill 接进 CLI 和 Gateway 的关键入口，在：

- `agent/skill_commands.py`

核心函数是：

- `scan_skill_commands()`

这个函数做的事情非常值得仔细看，因为它几乎就是一条完整的 Skill discovery 流水线。

### 3.1 扫描哪些目录

它会先收集：

- 本地 `SKILLS_DIR`
- `get_external_skills_dirs()` 返回的外部目录

说明 Hermes 允许 Skill 资产来自多个来源。

### 3.2 跳过哪些目录

它会主动跳过：

- `.git`
- `.github`
- `.hub`

也就是说，不是只要目录里有 `SKILL.md` 就会被当作可用 Skill。

Hermes 先把管理目录和实际 Skill 目录做了隔离。

### 3.3 前置过滤：平台兼容与禁用配置

在扫描时，它会解析 frontmatter，
然后调用：

- `skill_matches_platform(frontmatter)`

以及：

- `_get_disabled_skill_names()`

这说明 Skill 在被发现时就已经经过两轮过滤：

- 当前 OS 是否兼容
- 用户是否在配置里禁用了这个 Skill

后面 `agent/skill_utils.py` 还支持：

- 全局 `skills.disabled`
- `skills.platform_disabled.<platform>`

所以 Hermes 不是“先全部扫描出来，再到运行时碰运气”，
而是尽量把筛选前置。

### 3.4 命令名标准化

最后它还会把 Skill 名称转成 slash command slug：

- 小写
- 空格和下划线转 `-`
- 去掉非法字符
- 合并重复连字符

这一步是为了让 Skill 命令能安全落到：

- CLI slash command
- Telegram/Discord/Slack 这类平台命令菜单

也就是说，Skill discovery 的产物不是原始文件名，
而是：

- 一个能跨终端和消息平台稳定使用的命令键

---

## 4. Skill 的真正加载不是“塞进 system prompt”，而是构造成一条特殊的用户消息

这是理解 Hermes Skill 机制最关键的一步。

`agent/skill_commands.py` 里的：

- `build_skill_invocation_message(...)`

会把某个 Skill 真正装配成一条消息内容。

它做了几件重要的事：

- `_load_skill_payload(...)` 读取 Skill
- 生成 activation note
- 调 `_build_skill_message(...)` 拼出完整载荷

activation note 的语义非常明确：

- 用户已经显式调用了这个 Skill
- 你应该遵循它的说明
- Skill 的完整内容已在下方加载

这一步说明：

- Skill 不是静态长期前缀
- 而是一条由用户触发、进入当前会话历史的特殊消息

这和“把 Skill 默认塞进 system prompt”是两套完全不同的设计。

### 4.1 `_build_skill_message(...)` 并不只是拼 `SKILL.md`

这个函数还会继续做几层装配：

- 注入 Skill 正文
- 解析 frontmatter 里的 `metadata.hermes.config`
- 把当前 `config.yaml` 中对应值解析后附成 `[Skill config ...]`
- 附上 setup note / gateway setup hint
- 罗列 supporting files，并告诉模型如何用 `skill_view` 继续查看
- 把用户调用 Skill 时追加的 instruction 也拼进去
- 可选再带一个 `runtime_note`

这说明 Hermes 加载 Skill 不是“读取 markdown 然后原样贴进去”，
而是一条小型装配流水线。

它把 Skill 视为：

- 主说明
- 配置解析
- 支撑文件入口
- 当前调用上下文

四层组合出来的运行时资产。

### 4.2 `/plan` 是最典型的证据

看 `cli.py` 里的 `_handle_plan_command()`，
它会：

- 调 `build_plan_path(...)` 生成工作区相对路径
- 然后调 `build_skill_invocation_message("/plan", ..., runtime_note=...)`

这个 `runtime_note` 会明确告诉模型：

- 把 markdown plan 保存到哪个精确路径

这说明 Hermes 的 Skill 并不是“固定模板”，
而是支持：

- Skill 本体 + 当前调用时的动态运行时说明

这比单纯的 prompt snippet 要成熟得多。

---

## 5. Skill 是怎么进入 CLI / Gateway 的：不是直接执行，而是“改写下一条输入”

再看 `cli.py` 和 `gateway/run.py`。

你会发现 Hermes 对 Skill 的接法也很一致：

- Skill 命令不是自己跑一套独立执行器
- 而是先被转成一条普通会话输入，再落回主 Agent Runtime

### 5.1 CLI 里：放进 `_pending_input`

在 `cli.py` 的 `process_command()` 里，
当命中某个 Skill slash command 时，会：

- `build_skill_invocation_message(...)`
- 打印 `Loading skill: ...`
- 把消息放进 `self._pending_input`

这说明 CLI Skill 的本质不是：

- 在命令处理器里直接执行 Skill

而是：

- 把 Skill 载荷排入下一轮 Agent 对话输入

### 5.2 Gateway 里：直接改写 `event.text` 再走正常消息处理

在 `gateway/run.py` 里也一样。

当某个 `/skill-name` 命中后，会：

- `build_skill_invocation_message(...)`
- `event.text = msg`
- 然后 fall through 到正常 message processing

这里最值得注意的是：

- Skill 命令没有绕开主会话系统
- 没有绕开 transcript
- 没有绕开 Agent Loop

它仍然是通过同一套会话入口进入 Runtime。

这就是为什么 Hermes 的 Skill 更像：

- 一种“特殊输入装配器”

而不是：

- 一套平行于对话系统之外的插件执行框架

### 5.3 自动绑定 Skill 也只在新会话注入一次

`gateway/run.py` 还有一段 topic/channel 绑定 Skill 的逻辑。

当是新 session 且 `event.auto_skill` 存在时，
Hermes 会：

- `_load_skill_payload(...)`
- `_build_skill_message(...)`
- 把 Skill 内容拼到用户原始文本前面

而且注释明确说：

- 只在 NEW sessions 注入
- ongoing conversation 不再重复注入

这说明 Hermes 连自动 Skill 绑定也不是“每轮重塞一遍”，
而是尊重会话历史已经保存下来的第一次注入结果。

---

## 6. Skill 也不是完全脱离 system prompt：Hermes 只把“如何使用 Skill 工具”的元指导放进 system prompt

这里非常容易误解。

前面说 Skill 本体不是默认塞进 system prompt，
并不等于 system prompt 和 Skill 完全无关。

看 `run_agent.py` 里的 `_build_system_prompt(...)`，
其中一层明确写着：

- `Skills guidance (if skills tools are loaded)`

实际逻辑是：

- 只有 `skills_list` / `skill_view` / `skill_manage` 这些工具可用时
- 才调用 `build_skills_system_prompt(...)`
- 把“系统如何认识 Skill 机制”的元指导加进 system prompt

这说明 Hermes 做了一个很聪明的分层：

### 6.1 进 system prompt 的是

- Skill 机制说明
- Skill 工具使用方式
- 模型应该如何看待 Skills

### 6.2 不默认进 system prompt 的是

- 某个具体 Skill 的正文内容

这套边界刚好把两种需求分开了：

- 让模型知道系统支持 Skill
- 但不把所有 Skill 资产都长期占满前缀

这也是 Hermes 在 Skill 这层保持 prompt 稳定和按需加载的关键。

---

## 7. 通用 Plugin 的发现路径完全不同：它扫描的是 `plugin.yaml + register(ctx)`

再看通用 Plugin。

`hermes_cli/plugins.py` 的开头就把设计写得很清楚：

- 用户插件：`HERMES_HOME/plugins/<name>/`，默认显示路径是 `~/.hermes/plugins/<name>/`
- 项目插件：`./.hermes/plugins/<name>/`，而且要显式开启 `HERMES_ENABLE_PROJECT_PLUGINS`
- pip 插件：暴露 `hermes_agent.plugins` entry-point group

这里已经和 Skill 形成了根本区别。

Skill 关心的是：

- `SKILL.md`
- supporting files
- frontmatter 元数据

通用 Plugin 关心的则是：

- `plugin.yaml`
- `__init__.py`
- `register(ctx)` 函数

也就是说，在 Hermes 里：

- Skill 是内容资产
- Plugin 是代码扩展

### 7.1 `discover_and_load()` 做的事情

`PluginManager.discover_and_load()` 会：

1. 扫 user plugins
2. 可选扫 project plugins
3. 扫 pip entry points
4. 读取 `plugins.disabled`
5. 对未禁用插件执行 `_load_plugin(manifest)`

这说明 Hermes 的通用插件装配是标准的代码插件思路：

- 先发现 manifest
- 再判定是否禁用
- 再真正 import 与 register

### 7.2 `register(ctx)` 是通用 Plugin 的核心契约

在 `_load_plugin()` 里，Hermes 会：

- import module
- 找 `register`
- 构造 `PluginContext`
- 调 `register(ctx)`

如果没有 `register()`，插件会被标记为：

- `no register() function`

这说明 Hermes 的通用插件机制并不是“只要 import 成功就算接入”，
而是要求插件显式声明：

- 我要向系统注册什么能力

这和 Skill 的“读出来就能用”是完全不同的扩展哲学。

---

## 8. `PluginContext` 暴露的不是 prompt 拼接，而是运行时挂载点

`hermes_cli/plugins.py` 里的 `PluginContext` 非常值得看。

它给插件暴露的能力包括：

- `register_tool(...)`
- `register_hook(...)`
- `register_cli_command(...)`
- `register_context_engine(...)`
- `inject_message(...)`

这已经很能说明问题了。

Hermes 的通用 Plugin 首先不是拿来“改 system prompt”的，
而是拿来：

- 注册工具
- 注册生命周期钩子
- 注册 CLI 子命令
- 注册上下文引擎
- 在需要时向会话注入消息

换句话说，Plugin 接入的是：

- 运行时结构

而不是：

- 单纯的提示词文本

### 8.1 `register_tool(...)` 最直接

`PluginContext.register_tool()` 最终会委托给：

- `tools.registry.register()`

所以插件工具在 Hermes 看来和内建工具处于同一注册体系里。

这意味着 Plugin 并不是旁路工具系统，
而是挂到了 Hermes 现有工具注册总线上。

### 8.2 `register_hook(...)` 让插件接入生命周期

插件还可以注册：

- `pre_tool_call`
- `post_tool_call`
- `pre_llm_call`
- `post_llm_call`
- `pre_api_request`
- `post_api_request`
- `on_session_start`
- `on_session_end`
- `on_session_finalize`
- `on_session_reset`

这说明通用 Plugin 真正切入的是：

- Agent Runtime 的生命周期节点

而不是某个孤立功能点。

---

## 9. Plugin 真正怎样影响一次会话：靠 `invoke_hook(...)`，而不是偷偷改主 Prompt

继续往下追 `run_agent.py`，
你会发现 Hermes 在几个关键时刻都会：

- `from hermes_cli.plugins import invoke_hook as _invoke_hook`

比如：

- brand-new session 时触发 `on_session_start`
- 每轮开始前触发 `pre_llm_call`
- 收尾阶段触发别的生命周期 hook

其中最有代表性的，是 `pre_llm_call` 这段。

源码注释写得非常清楚：

- 插件可以返回 `context`
- 这些 context 会被拼到当前 turn 的 user message
- 永远不会写进 system prompt
- 这样可以保住 prompt cache prefix
- 而且这些注入都是 ephemeral，不会持久化进 session DB

这一步特别能体现 Hermes 的扩展观。

它允许 Plugin 影响一次真实 API 调用，
但同时又把边界守得很清楚：

- 插件可以影响当前回合上下文
- 但不能随意改 Hermes 的长期 system prefix

这就是为什么前面关于 plugin hook 注入边界、ephemeral prompt 边界那些设计，最后都会回到这里。

Hermes 不是不让插件扩展，
而是让它们沿着明确的运行时挂载点扩展。

---

## 10. Memory Provider 和 Context Engine 为什么又像“另一套插件系统”

如果你只看 `hermes_cli/plugins.py`，会以为 Hermes 的插件体系已经讲完了。

但 `run_agent.py` 很快就告诉你：

- 还没完

因为 Memory Provider 和 Context Engine 又是两条专用加载路径。

### 10.1 Memory Provider：配置选中、一次激活一个

在 `run_agent.py` 初始化阶段，Hermes 会读取：

- `memory.provider`

如果配置了某个 provider，就会：

- `from plugins.memory import load_memory_provider`
- 创建 `MemoryManager`
- 把 provider 加进去
- 然后 `initialize_all(...)`

后面还会把 provider 导出的 tool schemas 直接注入当前 tool surface。

这说明 Memory Provider 的角色不是“随便挂几个 hook”，
而是：

- 成为记忆系统的一部分
- 参与 system prompt 构建
- 参与 API-call-time prefetch
- 参与额外工具导出

这就是为什么 `plugins/memory/__init__.py` 明确写着：

- 这套机制和 general plugin system 是 separate 的
- 插件常驻仓库
- 一次只激活一个

### 10.2 Context Engine：替换上下文管理内核

Context Engine 也类似。

`run_agent.py` 会读取：

- `context.engine`

然后按顺序尝试：

1. `plugins/context_engine/<name>/`
2. general plugin system 注册的 context engine
3. 否则回退到内置 compressor

如果成功加载，还会：

- 替换 `self.context_compressor`
- 注入它导出的 tool schemas
- 调 `on_session_start(...)`

这说明 Context Engine 的位置比普通 Plugin 更深。

它不是围着 Runtime 转的一个 hook，
而是直接参与：

- 上下文管理
- 会话开始生命周期
- 相关工具导出

所以 Hermes 才把它单独留成了一条专用装配通道。

---

## 11. 为什么 Hermes 要故意保留这几条不同的加载路径

把这些源码连起来看，你会发现 Hermes 在扩展体系上坚持的不是“统一接口越少越好”，
而是“按能力本质分层接入”。

### 11.1 Skill 适合做成内容资产流水线

因为它主要解决的是：

- 让模型按某种方法工作

所以它更适合：

- frontmatter + 正文 + supporting files
- 通过 slash command 或预加载转成会话输入

### 11.2 通用 Plugin 适合做成代码挂载点

因为它主要解决的是：

- 新工具
- 新 hook
- 新 CLI 命令
- 新运行时行为

所以它更适合：

- `plugin.yaml + register(ctx)`

### 11.3 Memory Provider / Context Engine 适合做成专用接口位

因为它们不是“普通扩展”，
而是直接长进：

- 记忆系统
- 上下文系统

这种位置如果还强行塞进一个万能 PluginManager，
最后通常只会把接口搞得非常模糊。

Hermes 的选择更像是：

- 通用的归通用
- 核心位的归核心位

这也是为什么它的扩展体系虽然看起来分岔很多，
但整体反而比“一个万能插件接口”更清楚。

---

## 12. 读完这一篇留下 5 个抓手

### 12.1 不要把所有扩展能力都叫“插件”

Skill、hook、tool、memory backend、context engine，
它们解决的问题根本不一样。

如果你从命名上就把它们揉成一团，
后面边界一定会越来越乱。

### 12.2 先定义扩展接入层，再定义发现方式

Hermes 先想清楚某种能力该接到哪一层：

- 会话输入层
- 工具注册层
- 生命周期层
- 记忆层
- 上下文层

然后才决定：

- 扫描目录
- 读 frontmatter
- import module
- 调 `register(ctx)`

### 12.3 Skill 更适合按需装配，不适合默认常驻前缀

Hermes 只把 Skill 机制说明放进 system prompt，
而把具体 Skill 内容做成按需注入的消息载荷。

这能同时保住：

- prompt cache 稳定
- Skill 的灵活加载

### 12.4 Plugin 最好影响运行时结构，而不是偷改长期 Prompt

Hermes 允许 Plugin 通过 hook 影响当前回合，
但不鼓励它们直接污染长期 system prompt。

这是让系统可控的关键。

### 12.5 核心子系统最好给专用扩展位

记忆、上下文这类核心位，
往往值得单独设计接口，而不是强塞进一个万能 hook 体系里。

Hermes 的 Memory Provider 和 Context Engine 就是很典型的例子。

---

## 最后把扩展层收一下

Hermes 的 Skill 与 Plugin 体系，看起来像有很多入口，
但顺着源码拆开后其实非常清楚：

- Skill 是以 `SKILL.md` 为核心的内容资产，通过 `scan_skill_commands()` 变成 slash command，再被装配成一条特殊用户消息进入主会话
- 通用 Plugin 是以 `plugin.yaml + register(ctx)` 为核心的代码扩展，通过 `PluginManager.discover_and_load()` 扫描、加载，再通过 tool/hook/CLI command/context engine 等挂载点接入 Runtime
- Memory Provider 和 Context Engine 则是两条更靠近内核的专用装配通道，它们不是随便挂几段逻辑，而是直接参与记忆系统与上下文系统本身

所以这章最值得你带走的不是“Hermes 支持好多扩展方式”，
而是这条更底层的工程原则：

真正成熟的 Agent 系统，不会只做一个笼统的“插件目录”，
而是会按能力的本质，把不同扩展接到不同层级的运行时边界上。

Hermes 的 Skill / Plugin 加载体系，本质上就是这条原则在源码里的分层落地。

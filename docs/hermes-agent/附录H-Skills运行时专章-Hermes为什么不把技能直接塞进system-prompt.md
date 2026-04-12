# 附录 H｜Skills 运行时专章：Hermes 为什么不把技能直接塞进 system prompt

## 先问为什么技能不直接塞进 system prompt

很多人第一次给 Agent 加“技能”时，最自然的做法通常是：

- 写一段方法说明
- 把它拼进 system prompt
- 让模型每轮都看到

如果技能数量很少，这种做法确实能跑。

但只要系统开始变大，你马上会遇到几个现实问题：

- skill 一多，system prompt 会越来越肥
- 很多 skill 其实当前轮根本用不上，却一直占上下文
- 不同平台、不同工具面下，某些 skill 根本不该出现
- skill 可能还有 `references/`、`templates/`、`scripts/` 这类配套文件，不可能全塞进 prompt
- skill 还会经历搜索、安装、禁用、升级、隔离、信任判断这些工程动作

这时候你就会发现：

skill 本质上不是一段“提示词附录”，而是一类运行时能力对象。

Hermes 在这件事上的做法非常值得学习智能体的人认真看。

因为它没有把 skills 当成一堆长期常驻的提示词块，而是拆成了三层：

- system prompt 里放的是 skills 索引
- 真正调用时才把具体 skill 装配成一条消息
- supporting files、安装来源、trust level、size limit 这些问题交给独立运行时设施处理

这一篇主要结合这些源码和测试文件来看：

- `agent/prompt_builder.py`
- `agent/skill_commands.py`
- `hermes_cli/skills_hub.py`
- `tests/agent/test_prompt_builder.py`
- `tests/tools/test_skills_tool.py`
- `tests/tools/test_skill_size_limits.py`
- `tests/tools/test_skills_hub.py`

---

## 1. Hermes 最重要的判断：skills 不是常驻正文，而是“先索引，后加载”

先看 `agent/prompt_builder.py` 里的 `build_skills_system_prompt(...)`。

这个函数的注释写得很明确：

- 它要 build a compact skill index
- 它有两层 cache
- 它会扫描本地 skills 和 external dirs

注意这里的关键词不是 skill content，而是 skill index。

这件事非常关键。

因为它说明 Hermes 从一开始就在避免一个很常见的错误：

把所有 skill 正文长期塞进 system prompt。

Hermes 的做法不是：

- “模型先把所有技能全文都背下来”

而是：

- “模型先知道现在有哪些技能可用”
- “如果某个 skill 明显匹配任务，再用 `skill_view(name)` 去加载它”

你看 `build_skills_system_prompt(...)` 最后生成的内容就会发现，它明确告诉模型：

- 先 scan the skills below
- 如果匹配，就 `skill_view(name)`
- 如果 skill 有问题，再 `skill_manage(action='patch')`
- 如果没有匹配项，就正常继续

也就是说，Hermes 给模型的不是一堆已经展开的技能正文，  
而是一张可导航的技能地图。

对于初学 Agent 的人，这里最值得学的不是“怎么列目录”，而是这背后的工程判断：

真正稳定的 Agent，不应该让 system prompt 永远背着全部能力细节，  
而应该让 system prompt 只承担“能力发现入口”的职责。

---

## 2. `build_skills_system_prompt(...)` 的核心价值，是把 skill 变成一份可筛选、可缓存、可治理的索引

继续看 `agent/prompt_builder.py`，你会发现这份 skills 索引不是随便扫一下目录就结束了。

它背后至少做了四层工程处理。

### 2.1 先做 cache，不让每次都重扫

Hermes 为 skills prompt 做了两层缓存：

- 进程内 LRU cache：`_SKILLS_PROMPT_CACHE`
- 磁盘 snapshot：`.skills_prompt_snapshot.json`

而且 snapshot 不是盲信，它还会用 `_build_skills_manifest(...)` 校验：

- `SKILL.md`
- `DESCRIPTION.md`
- mtime
- size

这说明 Hermes 已经把“技能索引”当成 system prompt 基础设施，而不是一个便宜的字符串拼接动作。

为什么这点重要？

因为一旦你的 Agent 进入真实运行，system prompt 的稳定性和装配成本都很敏感。

Hermes 在这里的判断很成熟：

- skill 索引需要稳定
- 但又不能一直读旧数据
- 所以需要 manifest + snapshot 这种折中机制

这已经不是“提示词写作”范畴，而是典型的 runtime engineering。

### 2.2 不是所有 skill 都该出现

`build_skills_system_prompt(...)` 还会做多种过滤：

- 平台过滤：`skill_matches_platform(...)`
- 用户禁用过滤：`get_disabled_skill_names()`
- 条件显示过滤：`_skill_should_show(...)`

其中 `_skill_should_show(...)` 这一层特别值得看。

它支持的不是简单 on/off，而是：

- `fallback_for_toolsets`
- `fallback_for_tools`
- `requires_toolsets`
- `requires_tools`

这代表 Hermes 在认真回答一个高级但真实的问题：

某个 skill 是否应该在此刻对模型可见，不只取决于它是否存在，  
还取决于当前 runtime 有没有更原生的工具可用。

举个最直观的例子：

- 如果 `web` toolset 已经可用，那某个“DuckDuckGo 兜底 skill”就应该隐藏
- 如果某个 skill 明确要求 `terminal` toolset，而当前运行面没有 terminal，它也不该出现在索引里

`tests/agent/test_prompt_builder.py` 里就专门把这些规则一条条钉死了：

- fallback skill 在主工具存在时必须隐藏
- requires skill 在工具缺失时必须隐藏
- 无条件 skill 始终可见
- 不传过滤参数时，为了兼容旧逻辑，仍然展示全部

这说明 skills index 不是静态目录，而是会跟着 runtime 条件变化的动态可见面。

### 2.3 skill 不是只有本地目录

`build_skills_system_prompt(...)` 还会扫描：

- 本地 `skills_dir`
- external skill directories

而且本地 skill 优先级更高，外部目录同名时会被跳过。

这件事说明 Hermes 对 skill 的理解已经不是“项目里附带几篇说明文档”，而是：

一套允许本地、自定义、外部来源共同参与的能力层。

### 2.4 category 也是正式结构，不是随便分文件夹

Hermes 还会读取分类级别的 `DESCRIPTION.md`，把 category description 一起放进 skills index。

于是模型看到的不是一串平铺名字，而是：

- category
- category description
- skill name
- skill description

这会直接提升模型做“先判断有没有可复用 skill”这一步时的命中率。

所以这一层的重点不是美观，而是检索效率。

---

## 3. Hermes 真正激活 skill 的方式，不是扩写 system prompt，而是注入一条运行时消息

如果 `prompt_builder.py` 解决的是“先给模型看见 skill 地图”，  
那 `agent/skill_commands.py` 解决的就是：

当用户或系统真的要用一个 skill 时，Hermes 怎么把它装到当前回合里。

这里最值得看的函数有两个：

- `_load_skill_payload(...)`
- `_build_skill_message(...)`

### 3.1 `_load_skill_payload(...)` 说明 skill 首先是可加载对象

这个函数会做几件事：

- 接受 skill 名称或路径
- 归一化成 skill identifier
- 调 `tools.skills_tool` 里的 `skill_view(...)`
- 返回 `loaded_payload`、`skill_dir`、`display_name`

这说明 Hermes 调用 skill 的第一步，不是把某段 prompt 模板直接拼进去，  
而是先把 skill 当成一个可解析、可读取、可返回元数据的对象来处理。

也就是说，skill 在 Hermes 里先是“资源”，后才是“提示内容”。

### 3.2 `_build_skill_message(...)` 说明 skill 被注入成消息，而不是 system prompt 的永久部分

这个函数会把 skill 组装成一段完整的消息载荷，里面包括：

- activation note
- skill 正文内容
- 解析出来的 config 值
- setup note
- supporting files 提示
- 用户在这次 skill 调用里附带的 instruction
- runtime note

这一步非常重要。

因为它直接说明 Hermes 的技能注入策略是：

- skill 只在需要的时候进入上下文
- 进入上下文的形态是一条明确的运行时消息
- 它服务的是当前任务，不是永久污染 system prompt

这和附录 B 里那条 Prompt Builder 流水线刚好接上。

也就是说：

- system prompt 负责长期稳定的能力索引
- skill message 负责当前回合的按需展开

这个边界感特别值得学。

很多初学者做 Agent 时，容易把“全局设定”和“局部任务提示”揉成一层。  
Hermes 则把它们拆得很清楚。

---

## 4. Supporting files 的设计，说明 Hermes 从一开始就没打算把 skill 全文一次性灌进上下文

继续看 `_build_skill_message(...)`，你会发现一个很关键的细节：

如果 skill 目录里有这些内容：

- `references/`
- `templates/`
- `scripts/`
- `assets/`

Hermes 不会把它们全文一股脑注进去。

它做的是：

- 把 supporting files 列出来
- 明确提示模型可以用 `skill_view(name, file_path=...)` 按需查看

这一步其实就是在告诉我们：

Hermes 把 skill 视为一个小型知识包，而不是一段单文件 prompt。

为什么这很重要？

因为真实世界里的高质量 skill，往往不只有“怎么做”的描述，还会有：

- 参考文档
- 模板片段
- 辅助脚本
- 静态资源

如果你把这些都常驻塞进上下文：

- token 浪费会非常严重
- 大量无关材料会稀释当前任务
- 真正重要的信息反而不容易被模型抓到

Hermes 的做法明显更像一个成熟 runtime：

- 先把主技能正文加载进来
- 再把配套资源作为可延迟读取对象暴露出来

`tests/tools/test_skills_tool.py` 也在守这个行为：

- `skill_view("my-skill")` 能正常返回正文
- `skill_view("my-skill", file_path="references/api.md")` 能读取指定引用文件
- `linked_files` 会在查看 skill 时被显式返回
- disabled skill 不允许被查看

这些测试说明 supporting files 不是“目录里碰巧有点别的文件”，  
而是 skill runtime 的正式组成部分。

---

## 5. `hermes_cli/skills_hub.py` 说明 skills 还是一个供应链问题，而不只是提示词问题

如果只看 `prompt_builder.py` 和 `skill_commands.py`，你可能会觉得：

skills 主要是“运行时怎么发现、怎么加载”的问题。

但 `hermes_cli/skills_hub.py` 会把视角再往外推一层。

这个文件里能看到的动作包括：

- `search`
- `browse`
- `inspect`
- `install`

而且每个 skill 还会带上：

- source
- identifier
- trust level
- install metadata
- security audits

这说明 Hermes 已经明确把 skill 当成一个“能力分发与治理对象”来对待。

这一步非常像现代软件包管理，而不像“多存几段 prompt 文案”。

比如在 `do_search(...)`、`do_browse(...)` 这些函数里，Hermes 会展示：

- skill 名称
- 来源站点
- trust level
- identifier

在 `_resolve_short_name(...)` 里，如果同名 skill 有多个来源，它不会替你草率决定，  
而是要求你用完整 identifier 指定。

这件事非常工程化。

因为一旦 skill 开始来自：

- official
- skills.sh
- GitHub
- community source

那问题就不再只是“有没有这篇 skill”，而会变成：

- 从哪里来
- 信不信它
- 装的是不是同一个
- 以后怎么升级或隔离

`tests/tools/test_skills_hub.py` 也在验证这些供应链能力：

- skills.sh 搜索结果会映射成带前缀的 identifier
- inspect/fetch 会代理到底层 source，再重新标记来源
- trust level 会区分 trusted 和 community
- 搜索结果需要去重和排序

所以从 Hermes 的实现看，skills 绝不是 prompt 的附属品，  
而更像 Agent 世界里的“能力包管理系统”。

---

## 6. size limit、disabled、platform filter 这些约束，进一步说明 skills 是运行时资产

很多人做 Agent 时，对 skill 的理解还停留在“多一篇 Markdown 而已”。  
但 Hermes 的测试已经说明，它根本不是这么看的。

### 6.1 平台过滤说明 skill 有环境适用性

`tests/agent/test_prompt_builder.py` 里专门测试了：

- `platforms: [macos]` 的 skill 在 Linux 上不该出现
- 在 macOS 上则应该出现

这说明 Hermes 认为 skill 不是抽象知识，而是和运行环境强相关的能力说明。

### 6.2 disabled skill 说明能力面可以被治理

无论在 `build_skills_system_prompt(...)` 还是 `skill_view(...)`，  
Hermes 都会尊重 disabled skills 配置。

这代表 skills 不是“只要放进目录，模型就一定看得到”，  
而是一个可以被用户主动裁剪的能力面。

### 6.3 size limit 说明 Hermes 区分“创作入口”和“运行时读取入口”

`tests/tools/test_skill_size_limits.py` 特别值得一看。

它验证了两件表面矛盾、实际上很成熟的事：

- agent 通过 `skill_manage(create/edit/patch/write_file)` 写 skill 时，要受大小限制
- 但人工放进去或 hub 安装进来的超大 skill，`skill_view(...)` 仍然可以读取

这背后其实是 Hermes 很清楚地区分了两种路径：

- 生成路径要限流，防止 Agent 自己写出失控的大文件
- 运行时读取路径不能假定所有现有 skill 都很小

这是一种非常典型的工程判断。

如果不这样分，你就会在两个极端之间摇摆：

- 要么放任 Agent 不断生成巨型技能包
- 要么让 runtime 因为“大 skill 不合规范”而读不出来

Hermes 选择的是：

- 对写入做约束
- 对读取做兼容

这说明它把 skill 当成真实运行资产，而不是理想化模板。

---

## 7. 对学习智能体的人来说，这套设计最值得记住的四个原则

看完这一整套实现，你会发现 Hermes 在 skills 这件事上其实反复守着几个原则。

### 7.1 全局层放索引，局部层放正文

system prompt 适合放稳定、轻量、长期有效的能力地图。  
具体 skill 正文应该在命中任务时按需展开。

### 7.2 能力暴露必须跟 runtime 条件对齐

某个 skill 是否出现，不只看它在不在磁盘里，  
还要看平台、工具面、用户配置、禁用状态。

### 7.3 supporting files 应该按需读取，而不是默认常驻

高质量 skill 往往是一个包，不是一段纯文本。  
所以读取策略必须分层，而不是一次性灌入上下文。

### 7.4 skill 终究是供应链对象

只要 skill 可以搜索、安装、共享、升级、禁用，它就不是 prompt 附件，  
而是 Agent 生态里的能力包。

---

## 最后把技能运行时收住

如果把这一篇压缩成一句话，那就是：

Hermes 没把 skill 当成“system prompt 的补丁包”，  
而是把它做成了“可发现、可筛选、可按需加载、可治理的运行时能力对象”。

所以在 Hermes 里，skills 这件事其实被拆成了三段：

- `agent/prompt_builder.py` 负责给模型一张稳定的能力地图
- `agent/skill_commands.py` 负责把命中的 skill 装配成当前任务可用的消息载荷
- `hermes_cli/skills_hub.py` 负责 skill 的搜索、安装、来源和信任治理

这也是为什么 Hermes 的 skills 体系看起来不像“多加了几篇 Markdown”，  
而更像一个真正会生长、会治理、会适配运行环境的 Agent 能力层。

对于正在学习智能体的人，这一层非常值得抄。

因为它提醒我们：

当你的 Agent 开始变复杂时，skill 的本质就不再是提示词技巧，  
而是运行时架构设计。

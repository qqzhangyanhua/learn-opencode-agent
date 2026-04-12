# 附录 AE｜Skills Prompt 生成专章：Hermes 为什么系统提示词里的技能索引要跟着当前可用 tools 和 toolsets 动态变化

## 先盯住真正会漂移的地方

很多人第一次给 Agent 做 Skills 能力时，最容易写出一种静态做法：

- 启动时把所有 Skill 名称扫一遍
- 拼成一段固定提示词
- 每轮都原样塞进 system prompt

这套做法看起来很省事，
但一旦系统进入真实工程，很快就会冒出几个问题：

- 某些 Skill 明明依赖某个 toolset，但当前会话根本没开这个 toolset
- 某些 Skill 只是某类工具缺失时的 fallback，但你却在工具可用时还继续推荐它
- Gateway、CLI、不同 profile、不同 platform 下可用工具并不完全一致
- Skill 目录更新后，提示词缓存和磁盘快照又怎么保持一致

如果这些问题处理不好，你就会得到一种很糟糕的体验：

- system prompt 里列着一堆“理论上存在”的 Skill
- 但模型加载后发现当前环境根本用不上

Hermes 显然不接受这种“静态清单式技能提示词”。

它在 `agent/prompt_builder.py` 里做的，是一条更细的流水线：

- 先扫描 Skill 元数据
- 再结合当前真实可用的 `available_tools` / `available_toolsets`
- 动态裁剪哪些 Skill 应该出现在 system prompt 里
- 同时还做进程内缓存和磁盘快照缓存

这一章就专门回答这个问题：

Hermes 为什么坚持让 Skills Prompt 跟着当前可用 tools / toolsets 动态变化，而不是做成一段固定的“技能目录介绍”？

这一篇主要结合这些源码和测试来看：

- `agent/prompt_builder.py`
- `run_agent.py`
- `tests/agent/test_prompt_builder.py`
- `tests/run_agent/test_run_agent.py`

---

## 1. Hermes 最核心的判断：Skill 索引不是文档目录，而是运行时能力地图

先把问题想透。

如果 Skill 只是拿来给人看的静态目录，
那你完全可以把它做成：

- README
- 帮助菜单
- 或一段永远不变的系统提示词

但 Hermes 不是这么看 Skill 的。

在这个项目里，Skill 索引真正服务的是：

- 帮模型判断当前这轮要不要加载某个 Skill

这意味着它不是单纯回答：

- 系统里存在哪些 Skill

而是在回答：

- 在当前这颗 Agent 的当前能力边界下，哪些 Skill 现在值得被模型看到

这就是为什么 Hermes 会把 Skill Prompt 做成：

- 运行时能力地图

而不是：

- 静态知识目录

这两者的差别非常大。

静态目录追求的是：

- 尽可能完整

而运行时能力地图追求的是：

- 尽可能相关

Hermes 选择的是后者。

---

## 2. `run_agent.py` 先做了一次关键判断：不是有 Skill 目录就生成 Skills Prompt，而是先看 Skill 工具是否真的可用

看 `run_agent.py` 里 `_build_system_prompt()` 的那段逻辑。

Hermes 并不是无条件生成 Skills Prompt，
而是先做了这个判断：

- 当前 `valid_tool_names` 里是否有
  - `skills_list`
  - `skill_view`
  - `skill_manage`

只有这几个 Skill 工具存在时，才会继续：

- 计算 `avail_toolsets`
- 调 `build_skills_system_prompt(...)`

否则：

- `skills_prompt = ""`

这一步非常重要。

因为它说明 Hermes 的第一原则是：

- 模型只有在“真的有能力使用 Skill 机制”时，才值得看到 Skills Prompt

如果当前连 `skill_view` 都没有，
那再给模型看一段“先扫描 skills，命中后加载”的提示词，
只会制造幻觉。

这和前面 Tool Registry 那章是直接呼应的。

Hermes 不会只因为某个能力“逻辑上存在”，
就把它写进 prompt。

它要先看：

- 当前这一轮真实可用工具面上有没有这项能力

---

## 3. `available_toolsets` 不是重查 requirements，而是从当前真实加载的工具反推出来的

`run_agent.py` 里还有个特别值得注意的细节。

当 Hermes 要生成 Skills Prompt 时，
它不是重新去全局配置里推测 toolset 状态，
而是直接从当前 `valid_tool_names` 反推：

- 每个 tool 属于哪个 toolset
- 当前实际可用的 toolset 集合是什么

代码里就是：

- 对 `self.valid_tool_names` 调 `get_toolset_for_tool(...)`
- 再构成 `avail_toolsets`

这个细节非常能体现 Hermes 的工程品味。

因为它说明 Hermes 在这里信任的不是：

- 某个理论上的 toolset 配置

而是：

- 当前这颗 Agent 手上最终真的有什么工具

### 3.1 测试也明确钉了这点

`tests/run_agent/test_run_agent.py` 里的：

- `test_skills_prompt_derives_available_toolsets_from_loaded_tools`

直接验证了：

- `build_skills_system_prompt(...)` 收到的 `available_tools`
- 应该是当前真实加载的工具集合
- `available_toolsets`
- 应该是从这些工具反推出的 `{web, skills}`

而且测试里还故意让：

- `check_toolset_requirements`

一旦被调用就报错，
来证明这里不该再额外重算一遍 requirements。

这说明 Hermes 在这里坚持的是：

- 用“当前真实加载结果”驱动 prompt

而不是：

- 用“全局理论配置”驱动 prompt

---

## 4. `build_skills_system_prompt(...)` 的真正目标：生成一个“当前可用”的紧凑技能索引

`agent/prompt_builder.py` 里，
`build_skills_system_prompt(...)` 的 docstring 已经把自己的定位写得很清楚：

- build a compact skill index for the system prompt

注意这里的关键词不是：

- complete

而是：

- compact

也不是：

- static

而是：

- system prompt

这意味着它的目标从一开始就不是：

- 全量展示 Skills 仓库

而是：

- 为当前 system prompt 提供一份紧凑且相关的索引

这就是为什么它会接受两个关键参数：

- `available_tools`
- `available_toolsets`

这两个参数本质上就是在问：

- 当前系统边界允许哪些 Skill 被视为“可行动的建议”

---

## 5. `_skill_should_show(...)`：Hermes 用一套显式规则决定某个 Skill 该不该进当前 Prompt

这篇里最值得看的函数之一是：

- `_skill_should_show(...)`

它把 Skill 的显示逻辑写得非常清楚，而且完全不是模糊 heuristics。

### 5.1 `fallback_for_*`：主能力存在时，fallback Skill 应该隐藏

如果某个 Skill frontmatter 里声明：

- `fallback_for_toolsets`
- `fallback_for_tools`

那么只要对应 toolset / tool 现在可用，
这个 Skill 就应该：

- 不显示

这背后的逻辑很简单：

- fallback Skill 的意义，本来就是主能力缺失时的替代方案

主能力都在了，你还继续推荐 fallback，
只会让系统显得啰嗦且误导。

### 5.2 `requires_*`：依赖能力不存在时，这个 Skill 应该隐藏

相反，如果某个 Skill 声明：

- `requires_toolsets`
- `requires_tools`

那只要这些依赖当前不存在，
这个 Skill 也不应该显示。

因为它即使被模型看到，
当前环境也没法真的执行。

这两组规则合起来，其实就是 Hermes 对 Skills Prompt 的核心哲学：

- 不是“有什么 Skill 就全告诉模型”
- 而是“只告诉模型当前真的有操作意义的 Skill”

---

## 6. 测试把这套条件显示规则几乎全钉死了

`tests/agent/test_prompt_builder.py` 里专门有一大组条件显示测试，
特别适合初学者理解 Hermes 到底在做什么。

### 6.1 fallback 类规则

比如：

- `test_fallback_hidden_when_toolset_available`
- `test_fallback_shown_when_toolset_unavailable`
- `test_fallback_for_tools_hidden_when_tool_available`
- `test_fallback_for_tools_shown_when_tool_missing`

这些测试共同证明：

- fallback 的本意就是“缺什么补什么”
- 主能力一旦存在，就不该继续在 Skills Prompt 里刷存在感

### 6.2 requires 类规则

还有：

- `test_requires_shown_when_toolset_available`
- `test_requires_hidden_when_toolset_missing`
- `test_requires_tools_hidden_when_tool_missing`
- `test_requires_tools_shown_when_tool_available`

这些测试说明 Hermes 不是只看 Skill 是否存在于磁盘，
而是看：

- 现在有没有满足它的运行时前提

这一点特别重要。

因为它把 Skills Prompt 从“仓库清单”变成了“能力条件清单”。

---

## 7. Skills Prompt 不是每次都重扫整个目录：Hermes 做了两层缓存

如果每次构造 system prompt 都全量扫描一遍 Skills 目录，
在 Skill 多起来后成本会越来越高。

Hermes 在 `agent/prompt_builder.py` 里显式做了两层缓存。

### 7.1 第一层：进程内 LRU cache

代码里有：

- `_SKILLS_PROMPT_CACHE`
- `_SKILLS_PROMPT_CACHE_MAX = 8`

cache key 由这些东西组成：

- 本地 skills dir
- external dirs
- `available_tools`
- `available_toolsets`
- 当前 platform hint

这个 key 很有代表性。

因为它说明 Hermes 很清楚 Skills Prompt 不是只由“目录内容”决定，
还由：

- 当前工具面
- 当前平台

共同决定。

换句话说，哪怕 Skill 文件没变，
只要这轮的 `available_tools` 不同，
也应该生成不同的 Skills Prompt 结果。

### 7.2 第二层：磁盘 snapshot

Hermes 还会把 Skill 元数据缓存到：

- `.skills_prompt_snapshot.json`

它不是盲目读缓存，
而是会对照：

- 版本号
- `SKILL.md` / `DESCRIPTION.md` 的 mtime + size manifest

只有 manifest 仍然匹配时，
才复用 snapshot。

这说明 Hermes 在这里追求的不是“能缓存就缓存”，
而是：

- 冷启动快
- 目录变化时又能自动失效

这才是一个成熟缓存该有的边界。

---

## 8. 为什么 external skill dirs 只做直扫，不进 snapshot

`build_skills_system_prompt(...)` 里还有个很细的设计：

- 本地 profile 的 `HERMES_HOME/skills/` 用 snapshot，默认显示路径是 `~/.hermes/skills/`
- external dirs 直接扫描，不走 snapshot 缓存

注释解释得很清楚：

- external dirs 通常是 read-only
- 规模也往往较小

同时 Hermes 还用：

- `seen_skill_names`

保证本地 Skill 名称优先，
外部目录同名 Skill 会被跳过。

这背后的设计很有意思：

- 本地 profile 技能库是主战场，所以值得做更重的缓存
- 外挂目录更像补充资产，所以保持实现简单、优先级靠后

这也是一种非常典型的工程取舍：

- 不是什么地方都值得上同样复杂度的缓存机制

---

## 9. Skills Prompt 里到底写了什么：不是正文加载，而是“先扫一眼，再命中后加载”

当所有过滤完成后，
`build_skills_system_prompt(...)` 最终生成的是一个结构很明确的块：

- `## Skills (mandatory)`
- 一段规则说明
- `<available_skills>` 列表
- 最后一句 `If none match, proceed normally without loading a skill.`

这段结构传递出来的运行时策略非常清楚：

### 9.1 先扫索引

模型要先快速浏览当前可用 Skill 列表。

### 9.2 再按需加载

只有当某个 Skill 明显匹配当前任务时，
才去：

- `skill_view(name)`

### 9.3 没命中就正常继续

如果没有 Skill 匹配，就别硬套。

这就意味着 Hermes 并没有把 Skill 本体直接塞进 system prompt。

它给模型的是：

- 一份当前可用的技能索引 + 加载协议

而不是：

- 所有 Skill 正文的全集

这点和前面你让我补的 Skill/Plugin 加载专章正好呼应。

Hermes 对 Skill 的态度始终是：

- 默认索引化
- 按需正文加载

---

## 10. `build_skills_system_prompt()` 为什么要对脏 frontmatter 保持宽容

测试里还有一组很容易被忽略，但非常工程化的用例：

- `test_null_metadata_does_not_crash`
- `test_null_hermes_under_metadata_does_not_crash`

这说明 Hermes 在解析 Skill frontmatter 时，
默认态度不是：

- 稍微有点 YAML 异常就把整个 Skills Prompt 构建炸掉

而是：

- 尽量降级、尽量保留 Skill 可见性

这个选择很重要。

因为 Skill 库是用户可维护资产，
不是全都由内核作者严格控制的代码。

一旦你对 frontmatter 过于脆弱，
系统就会出现这种非常差的体验：

- 只是某个 Skill 元数据写得不规范
- 结果整段 Skills Prompt 都没了

Hermes 显然不想让这种事情发生。

所以它在这层选择的是：

- 容错优先
- 保守展示

这比“格式完美主义”更适合真实系统。

---

## 11. 为什么 Hermes 要把 Skills Prompt 放在 system prompt，而 Skill 正文放在按需消息里

这其实是前面几篇附录的一个汇合点。

Hermes 在 Skill 这件事上，做了一个非常清楚的二分：

### 11.1 常驻 system prompt 的

- Skill 机制说明
- 当前可用 Skill 索引
- “先扫一眼，再按需 `skill_view`” 的协议

### 11.2 不常驻 system prompt 的

- 某个具体 Skill 的正文

这样做的好处非常明显：

- system prompt 还能保持紧凑
- prompt cache 前缀更稳定
- 模型每轮都知道“技能世界里现在有什么”
- 但不会被迫背着所有 Skill 正文前行

如果你把所有 Skill 正文都塞进 system prompt，
那会立刻伤到三件事：

- token 成本
- 前缀稳定
- 相关性

Hermes 正是为了同时保住这三件事，
才把 Skills Prompt 做成：

- 动态索引

而不是：

- 全量正文拼接

---

## 12. 读完这一篇记住 5 条

### 12.1 提示词里的“能力目录”不应该是静态清单

真正有工程边界的系统，
应该尽量让目录反映：

- 当前真实可用能力

而不是仓库里理论存在的全部东西。

### 12.2 fallback 与 requires 这类条件最好显式进元数据

Hermes 用 frontmatter 里的：

- `fallback_for_toolsets`
- `requires_toolsets`
- `fallback_for_tools`
- `requires_tools`

把“这个 Skill 什么时候该显示”写成了可机器判断的规则。

这比把判断逻辑散在代码里健壮得多。

### 12.3 先给模型索引，再让模型按需加载正文

这是一种非常适合 Skills 体系的两阶段策略：

- 常驻的是索引
- 临时加载的是正文

### 12.4 运行时提示词应该信任“最终真实加载结果”，而不是全局理论配置

Hermes 从 `valid_tool_names` 反推 `available_toolsets`，
就是在坚持这一点。

### 12.5 做缓存时，要把“影响结果的维度”都纳入 key

Skills Prompt 在 Hermes 里不仅受 Skill 文件影响，
还受：

- available tools
- available toolsets
- platform

影响。

如果这些维度不进缓存 key，
缓存命中就会变成错误命中。

---

## 把这一篇收紧

Hermes 的 Skills Prompt 之所以值得专门写一章，
不是因为它只是“把技能列进 system prompt”。

真正值得学的是它背后的运行时判断：

- Skills Prompt 不是静态目录，而是当前能力地图
- `run_agent.py` 先根据当前真实加载的工具，决定要不要生成 Skills Prompt
- `build_skills_system_prompt(...)` 再根据 `available_tools` 和 `available_toolsets` 动态裁剪 Skill 可见性
- frontmatter 里的 fallback / requires 条件把这种裁剪规则显式数据化
- 进程内 LRU 和磁盘 snapshot 则保证这套索引生成既快又能正确失效

所以这章最值得你带走的一句话是：

在一个成熟的 Agent 系统里，系统提示词里的“技能世界观”也应该是运行时动态生成的，而不是仓库静态清单的直接投影。

Hermes 的 Skills Prompt，正是这种动态能力映射在源码里的落地版本。

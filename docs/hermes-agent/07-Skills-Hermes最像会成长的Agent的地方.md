# 07｜Skills：Hermes 最像会成长的 Agent 的地方

## 先看 Skills 到底解决什么

如果你已经看过不少 Agent 项目，会发现大多数系统的“能力增长”方式都比较粗暴：

- 要么改 system prompt
- 要么再加几个工具
- 要么写更多 hardcode 规则

这几种方式都能让系统变强一点，但它们有一个共同问题：

增长成本很高，而且很容易把核心提示词和核心代码越改越乱。

Hermes 在这件事上给出的答案，是单独做了一层 Skills 系统。

从代码结构看，这层能力至少涉及：

- `tools/skills_tool.py`
- `agent/skill_commands.py`
- `tools/skill_manager_tool.py`
- `hermes_cli/skills_hub.py`

所以这一章要回答的问题是：

Hermes 为什么不满足于“写更长的系统提示词”，而要专门做一套 Skills 机制？这套机制为什么会让它比普通 Agent 更像一个“会成长”的系统？

---

## 1. Skills 解决的不是“模型不会”，而是“能力组织越来越乱”

很多初学者一开始做 Agent，新增能力的第一反应通常是：

往 prompt 里再加一段说明。

比如：

- 遇到调试问题应该怎么做
- 遇到前端任务应该注意什么
- 遇到写作任务应该按什么格式输出

短期看，这很有效。

但只要系统开始增长，你很快会遇到一个结构性问题：

所有经验、流程、风格、操作纪律都会被塞进一块巨大的 system prompt 里。

接着就会出现几个后果：

- 提示词越来越长
- 规则越来越互相打架
- 某些能力只在少数场景需要，却要全程注入
- 改一个能力时，容易影响整个系统行为

Skills 的本质，就是把这类“可复用的专项操作知识”从核心 prompt 里拆出来，变成按需加载的能力单元。

这一步非常关键。

因为它让系统增长的方式从“堆更多全局规则”，转向“组织更多局部能力”。

这就是为什么我会说，Skills 是 Hermes 最像“会成长”的地方。

它不是让模型突然有了新脑子，而是让系统学会了更可持续地积累经验。

---

## 2. `tools/skills_tool.py` 先做的，不是执行技能，而是把技能当成结构化资产管理

打开 `tools/skills_tool.py`，文件头注释写得很清楚：

Skills 不是一段字符串，而是一套目录化资产：

- 每个 skill 都有 `SKILL.md`
- 还可以有 `references/`
- `templates/`
- `assets/`

并且它明确采用的是 progressive disclosure 设计：

- `skills_list` 只列 metadata
- `skill_view` 再按需加载完整内容

这一步非常重要。

因为它说明 Hermes 对 skill 的理解，不是“把一段大 prompt 塞给模型”，而是：

把 skill 当作可发现、可索引、可按需展开的知识对象。

这和很多项目里的“prompt snippets”有本质差别。

后者通常只是文本片段；
而 Hermes 的 skill 更接近一种轻量知识包。

从注释里的目录结构也能看出它的设计意图：

- 主说明放在 `SKILL.md`
- 支撑文档可以独立放在 `references`
- 模板可以独立放在 `templates`
- 资源文件可以放在 `assets`

这让一个 skill 不再只是“告诉模型几句怎么做”，而是可以承载一整套操作规范。

---

## 3. Skills 的关键价值，不是更多内容，而是“按需注入”

为什么 progressive disclosure 很关键？

因为 Agent 系统最怕的不是没信息，而是无差别地把所有信息都塞进上下文。

如果你把所有技能内容都默认注入：

- token 会快速膨胀
- 相关性会下降
- 模型注意力会被稀释
- prefix cache 稳定性也更难维护

Hermes 的 skill 机制本质上在解决这个问题：

先让系统知道“有哪些技能”，再在需要时只加载某一个 skill 的正文或 supporting files。

这是一种非常典型的运行时设计思路：

不是把能力全量背在身上，而是做成索引 + 按需展开。

这和前面几章你看到的工程取向是一致的：

- memory 是 curated 的，不是什么都记
- session_search 是检索式的，不是什么都常驻
- toolsets 是裁剪式的，不是什么都暴露
- skills 也是按需注入式的，不是什么都放进 system prompt

你会发现 Hermes 一直在做同一类事情：

把“可能很多”的东西，收束成“当前必要”的东西。

这是一套成熟 Agent Runtime 才会越来越重视的能力。

---

## 4. `agent/skill_commands.py` 说明 Hermes 不只是“存技能”，而是把技能变成正式调用面

一个系统即使有技能目录，如果用户和模型都很难调用，它也很难形成真实工作流。

Hermes 在这件事上走得更远了一步。

`agent/skill_commands.py` 的文件头直接说明：

- 这是 CLI 和 Gateway 共用的 slash command helper
- 技能可以通过 `/skill-name` 形式触发
- 连 `/plan` 这种 prompt-style built-in mode 也统一走这层

这说明 skill 不是“后台知识库”，而是正式交互面的一部分。

继续看 `scan_skill_commands()`，你会发现它会扫描技能目录里的 `SKILL.md`，提取：

- `name`
- `description`
- 平台兼容信息
- 是否被用户禁用

然后自动把它们转成可调用的 `/命令`。

这一步很妙。

因为它意味着：

技能的新增，不必强依赖改核心代码分发入口。

只要技能目录里多了一个合法 skill，它就可能被系统发现、列出、调用。

这就是“成长”的感觉从哪里来。

不是模型自己变聪明了，而是系统获得了一种较低成本扩展行为策略的机制。

---

## 5. Hermes 的 Skill 不是死文档，它会携带环境、配置和 supporting files 一起进入上下文

很多人第一次看到 skill，会以为无非就是一段 markdown。

但 `agent/skill_commands.py` 往下看会发现，Hermes 做得比这更细。

例如 `_inject_skill_config()` 会读取 skill frontmatter 里声明的 config 变量，并把当前配置值注入给模型。

这代表什么？

代表 skill 不只是静态说明，它还能感知当前运行配置。

再比如 `_build_skill_message()` 会：

- 注入 skill 正文
- 注入 setup note
- 列出 supporting files
- 告诉模型可以用 `skill_view(...)` 再去看引用文件

这一步很关键。

因为它把 skill 从“单段提示词”提升成了“一个可逐步展开的操作包”。

换句话说，Hermes 的 skill 更像一个带目录结构、带元数据、带环境依赖、带扩展材料的运行时知识单元。

这比一般意义上的 prompt template 强很多。

---

## 6. Skills 之所以像“成长”，还因为它让经验沉淀有了一个相对独立的落点

一个 Agent 系统会越来越强，往往不是因为模型参数天天变，而是因为你不断积累了经验：

- 哪类问题该怎么拆
- 哪类 bug 应该先做什么检查
- 哪类写作任务应该遵循什么结构
- 哪类平台操作有哪些坑

如果这些经验没有独立落点，它们通常只有三种归宿：

- 被写进大 system prompt
- 被写进 if/else 代码
- 被留在人的脑子里

这三种都不理想。

而 skill 给了 Hermes 第四种归宿：

把经验变成可以独立管理、独立查看、独立更新、独立禁用的技能资产。

这件事的工程价值很高。

因为它意味着：

- 核心运行时不必随着每次经验沉淀一起膨胀
- 某个专项能力可以单独演化
- 失败经验可以被写回成新 skill
- 用户或团队可以按平台、按场景开关 skill

这就使得 Hermes 的增长方式更像“积累手册”，而不是“越写越长的系统咒语”。

---

## 7. 这套设计也解释了一个事实：Hermes 的可成长性不只来自模型，还来自“外置程序化经验”

初学 Agent 时，一个非常重要的认知转折是：

不要把所有智能都归因给模型。

在 Hermes 这种系统里，很多“看起来像变聪明了”的现象，其实是三部分一起作用：

- 模型的基础推理能力
- 运行时把相关信息在正确时机给到模型
- Skills 这类外置经验包把专项流程沉淀了下来

这非常像真实团队里的能力增长。

一个新人越来越会做事，不只是因为脑子更强，还因为：

- 有了更好的 SOP
- 知道该翻哪些手册
- 在特定问题上有前人留下的流程

Hermes 的 Skills，本质上就是在给 Agent 建这种“手册层”。

所以你会感觉它不像一个每次都从头想起的系统，而更像一个开始具备方法积累能力的系统。

---

## 8. 对初学者来说，这一章最值得抄的不是“做个 skills 菜单”，而是这三个原则

如果你以后自己做 Agent，这一层最值得借鉴的不是表面的 `/skills` 命令，而是下面三个原则。

### 8.1 把专项经验从核心 prompt 里拆出来

核心 prompt 负责定义身份、边界、全局纪律。

专项任务流程、领域方法、写作风格、调试 SOP，更适合放进独立 skill。

### 8.2 技能要支持按需展开，而不是默认全量注入

否则 skills 很快就会变成另一个 prompt 膨胀源。

Hermes 的 `skills_list` / `skill_view` 就是在守这条边界。

### 8.3 技能最好是结构化资产，而不是一坨文本

如果一个 skill 能带：

- frontmatter
- supporting references
- templates
- setup hints
- config injection

那它就从“提示词碎片”变成了真正的能力模块。

这一步，会显著提高你的系统后续演化空间。

---

## 9. 最后把 Skills 这一层收住

基于当前 hermes-agent 仓库的现有 skills 相关源码，我认为 Hermes 的 Skills 系统可以这样概括：

它不是一组散落的 prompt 片段，而是一套可发现、可按需展开、可携带 supporting files 与配置上下文的外置经验层。

这个判断主要来自以下源码事实：

- `tools/skills_tool.py` 把 skill 定义成 `SKILL.md + references/templates/assets` 的结构化目录资产
- `skills_list` 与 `skill_view` 体现了 progressive disclosure，而不是全量注入
- `agent/skill_commands.py` 会自动扫描 skill、生成 slash command，并把 skill 变成正式调用面
- skill frontmatter 可以声明环境与配置需求，运行时还能把相关值注入给模型

Skills 在 Hermes 里最重要的意义，不是“又多了一个功能”，而是它改变了系统积累能力的方式。

它让 Hermes 不必每成长一次，就去污染一次核心 prompt 或核心代码。

它把经验沉淀从：

- 全局 prompt 膨胀
- 零散规则硬编码

转成了：

- 可发现
- 可按需加载
- 可独立演化
- 可带 supporting materials 的技能资产

所以如果你问我，Hermes 哪里最像一个“会成长”的 Agent，我的答案就是 Skills。

所以，如果上一章的关键词是“多入口统一”，那么这一章的关键词就是：经验外置化。

下一章我们继续往下走，看另一个很能体现 Agent 工程味的能力：

子 Agent 与并行执行。也就是 Hermes 怎么把复杂任务拆开做，而不是永远让一个大循环硬扛到底。

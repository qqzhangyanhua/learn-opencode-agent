# 《深入 Claude Code 插件架构：从原理到实现》

> 基于 claude-code 官方仓库的实战学习电子书大纲
> 每一节均标注对应的项目文件路径，可对照源码学习

---

## 2026-03-31 Agent 学习版重组方案（归档）

> 目标：不按源码浏览顺序写书，而按 Agent 学习的认知路径重组内容。
> 方法：以 `/Users/zhangyanhua/AI/opencode/docs/book` 理论篇为理论来源，以当前 `claude-code` 仓库为现实落点。

### 重组原则

1. 先讲定义，再讲运行闭环，再讲能力边界。
2. 把 `Session / Memory / Planning / Context` 拆开，不混写。
3. 把 `Tool / Permission` 拆开，不把“能做事”和“不能乱做事”写成一章。
4. 把 `多 Agent 动机` 和 `多 Agent 落地` 拆开。
5. 每章都绑定一个真实系统现象，避免写成空理论。

### 20 章目录（正式版）

#### 第一部分：先把 Agent 这件事想明白

1. **Agent 到底是什么，不是什么**  
   定义 Agent 与 Chatbot、Workflow、Copilot 的边界，建立最小概念框架。
2. **Agent 的最小组成单元**  
   解释模型、工具、记忆、规划、执行循环五个基本部件各自解决什么问题。
3. **从一次请求看懂 Agent 的闭环**  
   从输入、决策、调用工具、结果回流到终止条件，搭建最小执行模型。

#### 第二部分：把运行时主链路拆开

4. **模型在 Agent 里到底负责什么**  
   讲清模型的真实职责、能力边界，以及哪些问题本质上不该甩给模型硬扛。
5. **工具不是外挂，而是 Agent 的手和脚**  
   讲清工具层为什么是行动接口层，以及工具描述、返回结构和边界设计为何决定动作质量。
6. **记忆、状态与上下文，不是一个东西**  
   把三个最容易混写的运行时概念拆清，明确它们在系统里各自承担什么责任。
7. **上下文为什么总会失控**  
   讨论上下文膨胀、压缩、裁剪与保真，说明为什么上下文治理是长链路任务的核心问题。
8. **规划不是写给人看的漂亮计划**  
   解释规划为什么不是装饰文档，而是组织动作、插入验证点和支持回退的持续决策机制。
9. **什么时候该停，什么时候该问人**  
   讲清停机条件、失败边界与 human-in-the-loop 为什么是成熟 Agent 的必要部分。

#### 第三部分：从单 Agent 走向更复杂系统

10. **什么时候真的需要多 Agent**  
    讨论多 Agent 真正解决什么问题、什么时候值得上、什么时候只是徒增复杂度。
11. **为什么 Agent 需要一层协议来接外部世界**  
    说明 MCP 这类协议层为何在外部能力接入、标准化与治理上变得重要。
12. **配置不是参数堆，而是运行时控制面**  
    讨论配置如何控制能力边界、风险边界、策略边界和环境边界。
13. **为什么 Agent 一旦产品化，迟早会走向服务化**  
    说明多入口、长任务与远程接入如何把 Agent 从本地工具推向服务端系统。
14. **持久化不是顺手存一下，而是让 Agent 真正拥有长期状态**  
    讨论会话、事件、执行状态、产物与副作用为什么必须被认真落盘。
15. **交互承载层不是界面皮肤，而是 Agent 的协作表面**  
    讲清 TUI、Web、Desktop 这些界面真正承载的是任务状态、流式反馈和人类介入点。

#### 第四部分：从应用走向平台

16. **什么时候一个 Agent 应用开始平台化**  
    解释平台化真正发生的分水岭：稳定扩展点、独立扩展和生态责任。
17. **扩展点不是一堆名词，而是平台的能力接口**  
    把命令、Hook、Agent、Skill、MCP 这些扩展点拆开，讲清它们各自解决的是什么问题。
18. **多 Agent 一旦落地，真正难的是编排而不是数量**  
    再讲落地：主 Agent、子 Agent、Hook 与工具扩展如何被组织成一条可收敛的执行链。

#### 第五部分：工程化闭环与全书收束

19. **一个 Agent 系统怎样才算真的能长期活着**  
    从“能演示”收束到“能部署、能测试、能评估、能观测、能维护”。
20. **把整本书收束成一个判断框架**  
    不再引入新概念，而是把全书压缩成一套可以用来判断真实 Agent 系统的工程框架。

### 各章摘要（写作约束版）

#### 第 1 章：Agent 到底是什么，不是什么
先清理概念污染。重点不是吹嘘 Agent，而是建立判断标准：什么是围绕目标持续感知、决策、行动并接收反馈的系统，什么只是对话或脚本套壳。

#### 第 2 章：Agent 的最小组成单元
把 Agent 拆成模型、工具、记忆、规划、执行循环五个部件，说明它们不是装饰，而是在解决不同层次的问题。

#### 第 3 章：从一次请求看懂 Agent 的闭环
展示输入进入系统后，如何经历决策、工具调用、结果回流与终止判断，突出 Agent 的本质是闭环而不是单轮生成。

#### 第 4 章：模型在 Agent 里到底负责什么
把模型从神话里拉下来，讲清它负责理解、判断、生成和压缩，但不该替系统结构问题背锅。

#### 第 5 章：工具不是外挂，而是 Agent 的手和脚
说明工具层是行动接口层，重点突出工具描述、参数设计、返回结构和风险边界为何直接决定动作质量。

#### 第 6 章：记忆、状态与上下文，不是一个东西
把三个常被混淆的概念拆开，说明上下文负责当前判断，状态负责运行位置，记忆负责长期保留。

#### 第 7 章：上下文为什么总会失控
解释上下文膨胀、重点漂移、重复劳动与约束淹没，并引出压缩、裁剪和保真这些治理手段。

#### 第 8 章：规划不是写给人看的漂亮计划
讲规划如何组织多步目标、依赖关系与验证点，以及为什么回退能力是成熟规划的硬指标。

#### 第 9 章：什么时候该停，什么时候该问人
强调成功停机、失败停机、授权停机和信息停机都是闭环的一部分，human-in-the-loop 不是降级而是成熟设计。

#### 第 10 章：什么时候真的需要多 Agent
讨论多 Agent 真正解决的是任务分解、并行探索和能力边界切分，而不是“看起来像团队”。

#### 第 11 章：为什么 Agent 需要一层协议来接外部世界
强调协议层的价值：统一接入、能力暴露、错误处理和治理抓手，避免系统掉进胶水层地狱。

#### 第 12 章：配置不是参数堆，而是运行时控制面
把配置看成系统控制面，而不是参数仓库；重点讨论默认值、分层规则、冲突处理和生效可见性。

#### 第 13 章：为什么 Agent 一旦产品化，迟早会走向服务化
说明多入口、长任务和远程触发如何把 Agent 从本地工具推向服务端系统。

#### 第 14 章：持久化不是顺手存一下，而是让 Agent 真正拥有长期状态
讨论会话、事件、执行状态、产物与副作用如何落盘，以及一致性与恢复性为何重要。

#### 第 15 章：交互承载层不是界面皮肤，而是 Agent 的协作表面
说明 Agent 界面的核心不是组件，而是任务状态、流式反馈、人类介入点和可见产物。

#### 第 16 章：什么时候一个 Agent 应用开始平台化
解释平台化不是功能变多，而是系统开始长出稳定扩展点，让新能力能独立于核心实现接入。

#### 第 17 章：扩展点不是一堆名词，而是平台的能力接口
把命令、Hook、Agent、Skill、MCP 视为不同层级的能力接口，而不是零散功能入口。

#### 第 18 章：多 Agent 一旦落地，真正难的是编排而不是数量
讲清主 Agent、子 Agent、Hook 与工具扩展如何围绕分发、汇总、状态推进和边界控制形成收敛链路。

#### 第 19 章：一个 Agent 系统怎样才算真的能长期活着
把整本书从“能演示”收束到“能上线、能维护、能评估、能观测”，补上测试、评估、观测与工程纪律。

#### 第 20 章：把整本书收束成一个判断框架
不再引入新概念，而是把全书压缩成一套判断真实 Agent 系统的工程框架。


### 理论来源与现实落点

- **理论来源**：`/Users/zhangyanhua/AI/opencode/docs/book/docs`
- **现实落点**：当前仓库 `plugins/README.md`、`.claude/commands/CLAUDE.md`、`.github/workflows/CLAUDE.md`、`index.md`、`.vitepress/config.ts`

### 写作警戒线

后续写正文时，必须避免把下面几组概念重新混写：

- Session vs Memory
- Planning vs Orchestration
- Tool System vs Permission System
- 多 Agent 动机 vs 多 Agent 落地
- 持久化 vs 记忆系统

---

### 第 1–5 章正文写作提纲（2026-03-31 归档）

#### 第 1 章：Agent 到底是什么，不是什么

**本章写作目标**  
先清理概念污染。读者读完这一章后，必须能区分 Agent、Chatbot、Copilot、Workflow、Script Automation。如果这一步做不好，后面所有章节都会被误读。

**建议结构**

1. **为什么“Agent”这个词被用滥了**  
   核心论点：市面上很多“Agent”其实只是带工具调用的问答程序，或者把固定工作流重新包装了一遍。必须先定义边界，否则后续架构判断都会错位。
2. **一个可工作的 Agent 定义应该包含什么**  
   核心论点：一个可操作的工程定义至少应包含目标、环境、动作、反馈与循环。重点不是哲学完美，而是可判断、可落地。
3. **Agent、Chatbot、Copilot、Workflow 的边界**  
   核心论点：Chatbot 重在对话，Copilot 重在辅助，Workflow 重在预定义流程，Agent 重在围绕目标持续决策和行动。
4. **Agent 的真正分水岭：行动闭环**  
   核心论点：真正让 Agent 和普通模型分开的，不是“更智能”，而是能形成感知—决策—行动—反馈的闭环。

**现实落点**  
- `plugins/README.md:4`
- `index.md:41`

**写作注意**  
不要一上来谈多 Agent、MCP、LSP。本章唯一任务是定义清楚。

#### 第 2 章：Agent 的最小组成单元

**本章写作目标**  
把 Agent 从抽象名词拆成可理解的系统部件，让读者知道 Agent 不是一个大脑，而是一组协作结构。

**建议结构**

1. **模型：决策核心，但不是系统本身**  
   核心论点：模型是决策引擎，不是完整 Agent。只有大模型，不等于有系统。
2. **工具：把语言变成行动**  
   核心论点：工具让模型从“会说”变成“会做”，是能力外化接口。
3. **记忆：让系统不至于每轮失忆**  
   核心论点：没有记忆，复杂任务无法持续推进；但这里先讲职责，不展开实现。
4. **规划：从大目标到下一步**  
   核心论点：规划负责把复杂目标拆成可执行步骤，是复杂任务必要层。
5. **执行循环：把部件变成系统**  
   核心论点：没有执行循环，模型、工具、记忆、规划只是散件。

**现实落点**  
- `plugins/README.md:46`
- `index.md:207`

**写作注意**  
这是“拆机器”章节，不抢后续实现细节。

#### 第 3 章：从一次请求看懂 Agent 的闭环

**本章写作目标**  
让读者第一次真正看见 Agent 是怎么跑起来的，脑中形成执行流程图。

**建议结构**

1. **输入进入系统：任务是如何被表达的**  
   核心论点：Agent 处理的不是一句自然语言，而是一个可推进的任务上下文。
2. **第一次决策：回答、行动，还是继续分析**  
   核心论点：系统第一步通常不是直接动手，而是判断当前最合适的推进策略。
3. **调用工具：系统如何触达外部世界**  
   核心论点：工具调用是闭环的行动阶段，也是外部副作用开始发生的地方。
4. **结果回流：反馈如何进入下一轮决策**  
   核心论点：没有反馈回流，就没有真正闭环。
5. **终止条件：什么时候该停**  
   核心论点：系统必须知道何时成功收尾、何时请求确认、何时停止继续推进。

**现实落点**  
- `index.md:85`
- 可用 `/commit-push-pr`、`/code-review` 作为闭环例子

**写作注意**  
反复强调“闭环”，不要提前展开工具系统细节。

#### 第 4 章：消息流、状态与 Session

**本章写作目标**  
把读者从 prompt 思维拉到运行时状态思维。

**建议结构**

1. **为什么 prompt 视角不够**  
   核心论点：单条 prompt 无法解释真实 Agent 系统，持续任务依赖的是消息流和状态容器。
2. **消息对象：系统到底在流动什么**  
   核心论点：用户消息、模型输出、工具结果共同构成任务推进中的结构化消息流。
3. **Session：聊天记录，还是任务容器**  
   核心论点：Session 的本质是任务运行容器，而不是聊天历史拼接器。
4. **状态归属：哪些信息该进 Session**  
   核心论点：状态不是越多越好，错误归属会让系统越来越脏。
5. **多轮任务中的连续性与一致性**  
   核心论点：Session 的真正价值，在于多轮推进后系统仍保持任务连续性。

**写作注意**  
不要把 Session 写成 Memory，也不要提前讲数据库持久化。

#### 第 5 章：记忆系统——Agent 如何保留和取回过去

**本章写作目标**  
让读者彻底分清 Session、Context、Memory、Persistence 四者的边界。

**建议结构**

1. **为什么 Session 不等于 Memory**  
   核心论点：Session 解决当前任务连续性，Memory 解决跨轮、跨任务、跨时间的信息保留。
2. **短期记忆：服务当前任务**  
   核心论点：短期记忆是当前工作集，不是长期知识库。
3. **长期记忆：跨任务保留稳定事实**  
   核心论点：长期记忆适合保留稳定偏好、长期约束和可重复利用知识。
4. **检索式记忆：按需召回，而不是全量携带**  
   核心论点：好的记忆系统不是全带上，而是按需提取相关信息。
5. **记忆污染：错误的过去如何拖垮未来**  
   核心论点：错误、过时、无关的记忆会不断污染系统判断，因此记忆系统必须支持修正和遗忘。

**写作注意**  
反复强调：Session 是运行容器，Memory 是可召回知识，Persistence 是存储机制。

### 第 6–10 章正文写作提纲（2026-03-31 归档）

#### 第 6 章：规划与任务分解——Agent 如何处理复杂目标

**本章写作目标**  
说明复杂任务为什么不能靠一次推理硬吃掉，规划为何是复杂目标的降维手段。

**建议结构**

1. **为什么复杂目标必须拆解**  
   核心论点：复杂任务之所以复杂，不是因为工具多，而是目标无法一步到位。
2. **显式规划 vs 隐式规划**  
   核心论点：有些系统把规划写出来，有些把规划藏在提示词或模型决策里，但两者都在解决同一个问题。
3. **规划粒度：拆太细和拆太粗都很蠢**  
   核心论点：规划的价值不是把任务拆成更多步骤，而是拆成足够支撑执行的步骤。
4. **反思与修正：计划不是圣旨**  
   核心论点：规划必须能随着执行结果修正，否则只是在形式主义地维持错误路径。
5. **规划成本：不是什么任务都值得先计划**  
   核心论点：简单任务强行计划只会制造噪音，复杂任务才值得显式规划。

**现实落点**  
- 任务规划工具与工作流命令的设计思路
- `plugins/feature-dev/README` 一类多阶段流程可作类比

**写作注意**  
不要把 Planning 写成 Orchestration；规划是单个任务的分解层，编排是多角色系统装配层。

#### 第 7 章：上下文为什么会失控

**本章写作目标**  
解释长任务、多轮交互和复杂工作流下，上下文为何会不断膨胀并拖垮系统质量。

**建议结构**

1. **上下文膨胀：为什么越长不一定越好**  
   核心论点：上下文越长，不等于相关信息越多；噪音和过时内容也会一起累积。
2. **任务漂移：Agent 为什么会忘记目标**  
   核心论点：长链路中目标会逐渐被中间步骤稀释，系统开始围绕局部问题打转。
3. **死循环：反复调用与无效修复**  
   核心论点：如果系统无法有效判断失败模式，就会反复执行无效动作。
4. **摘要、压缩与裁剪：保什么，丢什么**  
   核心论点：上下文管理的本质不是保存全部，而是保留后续决策真正需要的信息。
5. **上下文预算：令牌不是无限资源**  
   核心论点：上下文窗口是预算，必须管理，不管理就会反过来吞掉系统质量。

**现实落点**  
- Claude Code 的上下文压缩、任务边界、工具结果回流控制都可作现实映射

**写作注意**  
这章是退化问题章节，别写成“更多上下文更强”的宣传文。

#### 第 8 章：工具系统——Agent 为什么能做事

**本章写作目标**  
解释工具系统如何把语言能力转成行动能力，并说明接口设计为何比单纯执行函数更关键。

**建议结构**

1. **工具调用协议的基本结构**  
   核心论点：工具系统本质上是给模型定义一门“行动语言”。
2. **工具注册与发现机制**  
   核心论点：模型能调用什么，不只取决于系统实现，还取决于系统如何暴露能力边界。
3. **参数设计：让模型少犯蠢**  
   核心论点：糟糕的参数结构会直接提高误调用率。
4. **执行结果如何反馈给模型**  
   核心论点：只有执行结果结构清晰，后续推理才可靠。
5. **Tool Description 为什么比很多实现代码还重要**  
   核心论点：模型不是读你心里想的接口，而是读它看见的描述。
6. **工具系统的典型失败模式**  
   核心论点：调用错工具、传错参数、误解结果，都是接口设计问题的表现。

**现实落点**  
- `.claude/commands/CLAUDE.md:38`
- `.claude/commands/CLAUDE.md:81`
- `.claude/commands/CLAUDE.md:146`

**写作注意**  
本章讲“能做事”，不要把权限、安全、确认提前混进来。

#### 第 9 章：权限、确认与安全边界

**本章写作目标**  
说明为什么 Agent 不能无限制执行，并建立最小权限与风险分级的设计意识。

**建议结构**

1. **为什么工具系统必须有权限模型**  
   核心论点：一旦系统能读写文件、执行命令、访问外部世界，就必须有边界。
2. **风险分级：读、写、执行、联网、外部副作用**  
   核心论点：不同动作的风险不同，不能用一套确认策略处理一切。
3. **用户确认：什么时候必须问**  
   核心论点：确认不是烦人的阻碍，而是控制系统行为的关键节点。
4. **白名单与作用域限制**  
   核心论点：好系统不是给全部能力，而是只给当前任务所需能力。
5. **自动化系统中的权限设计**  
   核心论点：到了工作流和 CI 环境，权限问题会从本地风险升级为共享系统风险。
6. **安全边界与用户体验的取舍**  
   核心论点：系统必须在可控和高效之间找到平衡，而不是单边极端化。

**现实落点**  
- `.claude/commands/CLAUDE.md:42`
- `deploy-docs.yml:7`
- `.github/workflows/CLAUDE.md` 中权限矩阵与 allowed-tools 思路

**写作注意**  
不要写成安全 checklist；重点是解释设计哲学。

#### 第 10 章：代码 Agent 的特殊能力——语义理解与自修复

**本章写作目标**  
说明为什么 Coding Agent 不能只靠字符串搜索和文本生成，而必须依赖语义级反馈闭环。

**建议结构**

1. **文本理解和语义理解的差别**  
   核心论点：代码不是普通文本，定义、引用、类型、作用域都会影响正确性。
2. **LSP 给 Agent 带来的能力增量**  
   核心论点：跳转定义、找引用、诊断错误，让系统第一次真正“看懂”代码关系。
3. **诊断信息为什么重要**  
   核心论点：类型错误、语法错误、编译错误是最直接的纠偏信号。
4. **编辑—检查—修复闭环**  
   核心论点：真正的代码 Agent 不只是改文件，而是能基于反馈不断修正直到收敛。
5. **代码 Agent 的典型误判**  
   核心论点：改动看起来对，不代表系统层面真的对；语义级验证是必要的。
6. **如何提高“改对”而不是“改动”的概率**  
   核心论点：更好的反馈链路比更长的生成内容更值钱。

**现实落点**  
- 本仓库不必强绑单一文件，更适合做 Coding Agent 设计原则对照

**写作注意**  
本章讲的是语义工具链，不是泛泛而谈“AI 会写代码”。

---

### 第 11–15 章正文写作提纲（2026-03-31 归档）

#### 第 11 章：Provider 抽象——同一系统如何接不同模型

**本章写作目标**  
说明模型切换不是换个 API，而是运行时能力矩阵变化带来的系统设计问题，让读者意识到 Provider 层是在隔离“系统逻辑”和“模型接入差异”。

**建议结构**

1. **为什么需要 Provider 层**  
   核心论点：如果把模型能力直接写死在业务逻辑里，系统一旦切换模型就会全面污染。
2. **模型能力差异：不只是上下文长度不同**  
   核心论点：工具调用、流式输出、视觉、多模态、推理模式等能力差异都会影响运行时设计。
3. **统一抽象与真实差异的冲突**  
   核心论点：Provider 的价值是隔离差异，但不能假装所有模型完全一样。
4. **模型选择与路由策略**  
   核心论点：不同任务适合不同模型，系统应该按能力和成本做选择，而不是“一把梭”。
5. **Provider 设计的典型陷阱**  
   核心论点：过度抽象会掩盖真实能力边界，导致系统设计建立在错误前提上。

**现实落点**  
- 当前仓库中多模型、多子 Agent、按任务选择能力的思路可作映射
- `.github/workflows/CLAUDE.md` 中不同模型用于不同任务的现实案例

**写作注意**  
不要把 Provider 写成单纯 SDK 封装；重点是能力抽象，而不是客户端封装技巧。

#### 第 12 章：MCP——标准化接入外部工具与资源

**本章写作目标**  
说明 MCP 的价值不在于“多一个协议名词”，而在于把外部能力接入从临时拼接提升为可扩展、可发现、可复用的生态接口。

**建议结构**

1. **为什么临时拼接工具不够用**  
   核心论点：工具一多、系统一复杂，手写接入会迅速失控。
2. **MCP 解决的到底是什么问题**  
   核心论点：MCP 解决的是标准化接入、能力发现和资源访问，不只是“远程工具调用”。
3. **工具、资源、提示三类对象的统一接口**  
   核心论点：协议价值在于统一能力类型，让系统能按一致方式发现和使用外部世界。
4. **本地工具、远程服务与 MCP Server 的分工**  
   核心论点：MCP 不是替代所有本地工具，而是给跨系统扩展提供稳定接口。
5. **协议层的收益与成本**  
   核心论点：协议能带来生态，但也必然带来抽象成本、适配成本和调试成本。

**现实落点**  
- 当前仓库的 MCP 工具接入实践可作对照
- 插件系统与 MCP 并存，正好可以说明“平台内扩展点”和“平台外标准协议”的分工

**写作注意**  
不要把 MCP 写成万能总线；要说清适用场景和复杂度代价。

#### 第 13 章：配置系统——运行时行为的控制面

**本章写作目标**  
把配置从“参数表”提升为“运行时行为控制面”，让读者理解一个复杂 Agent 系统如何通过配置管理模型、工具、Hook、权限和执行策略。

**建议结构**

1. **配置不是边角料，而是控制面**  
   核心论点：复杂系统中的很多行为并不应该写死，而应通过配置进行外部控制。
2. **哪些行为应该配置化，哪些不该**  
   核心论点：模型选择、权限策略、工具开关、Hook 行为可以配置，但核心逻辑不该被配置淹没。
3. **配置分层：用户级、项目级、运行时级**  
   核心论点：不同配置作用域解决的是不同问题，混在一起只会制造冲突。
4. **默认值、覆盖与冲突处理**  
   核心论点：好配置系统不是字段多，而是默认值合理、覆盖规则可预测。
5. **配置爆炸与系统失控**  
   核心论点：一旦什么都能配，系统就没人敢改，配置会反过来吞掉可维护性。

**现实落点**  
- `package.json:4`
- `.vitepress/config.ts:2`
- 当前项目中 commands / hooks / settings 的多层控制关系

**写作注意**  
本章重点是控制面设计，不是教人罗列配置项。

#### 第 14 章：服务化——把 Agent 从 CLI 变成 HTTP 系统

**本章写作目标**  
说明为什么 Agent 一旦走向产品化，就会从本地 CLI 工具演化为可远程接入、可流式交互、可承载多人协作的服务系统。

**建议结构**

1. **为什么 Agent 最终会服务化**  
   核心论点：CLI 适合个人工作流，但多人协作、远程接入和产品化都要求服务化。
2. **请求模型：一次请求如何进入 Agent 服务**  
   核心论点：服务化之后，Agent 不再只是本地命令，而是一个有明确请求生命周期的系统节点。
3. **流式输出与 SSE**  
   核心论点：Agent 系统天生适合流式反馈，因为任务推进和中间状态比最终结果更重要。
4. **中间件链与上下文注入**  
   核心论点：服务端系统需要中间件来注入身份、工作区、权限和追踪信息。
5. **服务化后的新问题**  
   核心论点：一旦进入服务形态，系统必须处理并发、状态边界、鉴权与多用户隔离。

**现实落点**  
- `deploy-docs.yml:17` 可作为“产物服务化”的现实切入点
- `.github/workflows/CLAUDE.md` 可作事件驱动系统的补充映射

**写作注意**  
不要写成单纯 Web 开发教程；这章讲的是 Agent 从本地工具走向系统节点的转变。

#### 第 15 章：持久化——让 Agent 拥有长期状态

**本章写作目标**  
说明 Agent 为什么必须把会话、消息、中间产物和副作用记录下来，以及持久化为什么是恢复性、可审计性和长期任务能力的基础。

**建议结构**

1. **为什么 Agent 需要持久化**  
   核心论点：没有持久化，系统每次中断都像失忆，复杂任务无法稳定延续。
2. **哪些对象值得落盘**  
   核心论点：会话、消息、产物、副作用不是一回事，必须分清谁该保存、保存多久。
3. **历史记录 vs 业务状态**  
   核心论点：不是所有保存下来的信息都属于同一层，历史轨迹和当前业务事实必须分层。
4. **一致性、事务与恢复性**  
   核心论点：一旦 Agent 具备外部副作用能力，系统就必须考虑如何回放、恢复和避免不一致。
5. **持久化设计的常见错误**  
   核心论点：把所有东西混写进一个状态存储，最后会让系统不可维护、不可恢复、不可审计。

**现实落点**  
- 当前项目的任务输出、工作流状态、文档产物可作为现实类比
- `deploy-docs.yml` 的构建产物也可作为“系统状态外化”的轻量例子

**写作注意**  
一定要和第 5 章 Memory 区分：Memory 是知识保留策略，Persistence 是存储和恢复机制。

---

### 第 16–20 章正文写作提纲（2026-03-31 归档）

#### 第 16 章：交互承载层——TUI、Web 与 Desktop

**本章写作目标**  
说明 Agent 的交互界面不是普通 CRUD 界面，而是围绕任务推进、状态变化、流式反馈和用户干预设计的协作层。

**建议结构**

1. **为什么 Agent UI 和传统应用 UI 不一样**  
   核心论点：普通界面围绕表单和结果，Agent 界面围绕过程、状态和中间反馈。
2. **TUI 为什么特别适合 Agent**  
   核心论点：TUI 天然适合持续输出、快速刷新、过程可见的协作模式。
3. **Web 与 Desktop 的承载差异**  
   核心论点：不同界面形态不是谁更高级，而是谁更适合不同使用场景。
4. **多平台共享的应该是什么**  
   核心论点：真正应共享的是状态模型、事件接口和运行时语义，而不是盲目共享所有 UI 组件。
5. **Human-in-the-loop 如何落到界面上**  
   核心论点：用户不是结果旁观者，而是在关键节点确认、纠偏、接管和审查的系统角色。

**现实落点**  
- `index.md:3`
- `.vitepress/config.ts:15`
- 当前项目的文档站与 CLI 体验可作为“不同交互承载”的现实映射

**写作注意**  
不要写成前端框架比较文；这章讲的是 Agent 协作界面，而不是 UI 技术选型。

#### 第 17 章：插件系统——什么时候应用开始平台化

**本章写作目标**  
说明一个 Agent 应用为什么会走向平台化，以及插件系统如何把零散能力变成稳定扩展点。

**建议结构**

1. **为什么会走到插件系统这一步**  
   核心论点：当功能越来越多、团队越来越大、需求越来越杂时，硬编码扩展会迅速失控。
2. **扩展点分类：命令、Agent、Hook、Skill、MCP**  
   核心论点：不同扩展点解决的是不同层次的问题，不能混成“一个入口包打天下”。
3. **标准结构与自动发现**  
   核心论点：平台化的关键不是文件多，而是接口稳定、发现机制清楚。
4. **接口稳定性与向后兼容**  
   核心论点：插件系统一旦对外开放，兼容性就从“好习惯”变成“硬约束”。
5. **扩展系统的治理问题**  
   核心论点：没有治理的扩展系统，最后会变成一堆冲突入口和不可预测行为。
6. **什么时候不该做插件系统**  
   核心论点：如果系统还没稳定、扩展需求也不明确，插件化只会提前把复杂度引进来。

**现实落点**  
- `plugins/README.md:46`
- `plugins/README.md:10`
- 当前仓库本身就是“插件化平台”的现实案例

**写作注意**  
不要把“平台化”写成理所当然。必须强调：插件系统只有在扩展点稳定时才值得做。

#### 第 18 章：多 Agent 的动机——为什么一个模型不够

**本章写作目标**  
先解释多 Agent 为什么出现，而不是一上来堆实现。让读者看到单 Agent 的结构性瓶颈和多 Agent 试图解决的真实问题。

**建议结构**

1. **单 Agent 的结构性瓶颈**  
   核心论点：上下文过载、角色混杂、权限边界模糊，是单 Agent 的天然极限。
2. **角色分工：分析、规划、执行、审查**  
   核心论点：多 Agent 的核心价值不是“更多模型”，而是角色明确后的任务分工。
3. **上下文隔离与任务专注**  
   核心论点：不同子任务分给不同 Agent，可以避免一个上下文把所有噪音都吞进来。
4. **权限隔离与风险控制**  
   核心论点：多 Agent 不只是认知分工，也可以是权限和责任边界的隔离。
5. **多 Agent 的代价与适用边界**  
   核心论点：更多 Agent 意味着更多协调、状态同步和复杂度成本，不是任务一复杂就该上。

**现实落点**  
- `plugins/README.md:16`
- `plugins/README.md:19`
- `plugins/README.md:24`
- 当前仓库中 reviewer / architect / analyzer 等角色拆分可直接作为案例

**写作注意**  
这章只讲“为什么”。不要把 Hook、委托机制、AgentFactory 这些实现细节提前讲掉。

#### 第 19 章：多 Agent 编排——角色、委托、Hook 与工具扩展

**本章写作目标**  
说明多 Agent 系统真正难的地方不是“开多个模型”，而是如何让角色、委托、Hook、工具扩展、并发和恢复机制协同工作而不失控。

**建议结构**

1. **AgentFactory 与角色工厂**  
   核心论点：多 Agent 系统首先要解决“如何稳定地产生合适角色”，而不是临时拼角色。
2. **委托机制：主 Agent 与子 Agent 如何协作**  
   核心论点：委托不是甩锅，而是把子任务交给更合适的角色，并保持边界清晰。
3. **并发与后台执行**  
   核心论点：多 Agent 的收益往往来自并行推进，但并行也会引入协调和回收难题。
4. **Hook 在编排系统中的控制作用**  
   核心论点：Hook 不是附属功能，它是多层系统里非常关键的行为拦截与控制点。
5. **工具扩展与能力注入**  
   核心论点：编排系统的“手脚”必须通过统一能力接口接入，否则角色系统很快会碎。
6. **消息和任务如何穿过整张编排图**  
   核心论点：真正的重点不是组件多，而是任务如何在多个层级之间流动而不丢状态。
7. **恢复性与可观测性**  
   核心论点：没有恢复和追踪机制，多 Agent 系统只会比单 Agent 更难调试。

**现实落点**  
- 当前仓库中多 Agent 工作流、Hook、命令组合方式可作现实映射
- `plugins/code-review/`、`plugins/pr-review-toolkit/`、`plugins/feature-dev/` 是天然案例池

**写作注意**  
这是全书最容易炸的章节。不要堆术语，要始终围绕“一条任务怎么流动”来写。

#### 第 20 章：部署、测试、评估与最佳实践——Agent 系统如何长期活着

**本章写作目标**  
把全书从“能演示”收束到“能上线、能维护、能评估、能观测”，让读者看到 Agent 本质上仍然是一种必须遵守工程纪律的复杂软件系统。

**建议结构**

1. **部署形态：本地、自托管、云端**  
   核心论点：不同部署形态决定了系统的权限边界、成本结构和运维复杂度。
2. **测试分层：单元、集成、E2E、回归**  
   核心论点：Agent 测试比普通应用更难，因为它同时涉及模型行为、工具行为和系统链路。
3. **评估：成功率、正确率、成本、延迟**  
   核心论点：没有评估指标，所谓“好用”只是主观幻觉。
4. **观测性：日志、轨迹、失败归因**  
   核心论点：Agent 系统要可运维，必须能看见任务在系统里怎么失败。
5. **安全边界与恢复策略**  
   核心论点：复杂系统迟早失败，关键不在于不失败，而在于失败时不把系统拖死。
6. **最佳实践与反模式**  
   核心论点：最有价值的经验不是“成功案例故事”，而是那些可以迁移的工程判断。

**现实落点**  
- `deploy-docs.yml:17`
- `.github/workflows/CLAUDE.md`
- 当前项目中 GitHub Actions、权限矩阵、构建产物、自动化流程都可作为现实案例

**写作注意**  
这章不是总结感想，也不是鸡汤。必须把“工程纪律”落成可操作判断。

---

## 第一篇：全景认知

### 第 1 章：Claude Code 是什么

#### 1.1 从终端到 AI 编程助手
- Claude Code 的定位：终端中的 agentic coding tool
- 核心能力：自然语言 -> 代码操作
- 与 IDE 插件/Copilot 的区别
- 📁 `README.md`（安装方式、核心描述）

#### 1.2 仓库全景地图
- 202 个文件、17 个模块的整体结构
- 模块分类：13 个插件 + 脚本 + 工作流 + 命令 + 容器
- Mermaid 结构图解读
- 📁 `CLAUDE.md`（模块结构图、模块索引表）
- 📁 `.claude/index.json`（机器可读的模块元数据）

#### 1.3 技术栈解析
- Markdown 即定义（命令/Agent/技能全部是 .md 文件）
- Python 做 Hook（规则引擎、安全检测）
- Shell 做胶水（状态管理、脚本编排）
- TypeScript 做自动化（GitHub API、Issue 管理）
- 零编译哲学：没有 build 步骤，没有 node_modules
- 📁 `CLAUDE.md`（技术栈章节）

---

## 第二篇：插件架构

### 第 2 章：插件系统设计哲学

#### 2.1 约定优于配置：目录即接口
- 标准目录结构：commands/ agents/ skills/ hooks/
- 自动发现机制：Claude Code 如何扫描并加载组件
- `${CLAUDE_PLUGIN_ROOT}` 路径变量的作用
- 📁 `plugins/plugin-dev/skills/plugin-structure/SKILL.md`
- 📁 `plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md`

#### 2.2 plugin.json —— 最小化 Manifest
- 字段规范：name（kebab-case）、description、version、author
- 与 npm package.json 的对比：极简主义
- 为什么不需要 dependencies 字段
- 📁 `plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md`
- 📁 `plugins/hookify/.claude-plugin/plugin.json`（实际示例）

#### 2.3 Marketplace 注册与分发
- marketplace.json 结构：12 个插件的元数据注册
- 4 种分类：development(7) / productivity(3) / learning(2) / security(1)
- 版本管理与发布流程
- 📁 `.claude-plugin/marketplace.json`

#### 2.4 三种插件范式对比
- **纯命令型**：commit-commands（3 个 Slash 命令，零 Hook）
- **纯 Hook 型**：security-guidance（1 个 Python Hook，零命令）
- **全能型**：hookify（4 个命令 + 4 个 Hook + 1 个 Agent + 1 个技能 + 规则引擎）
- 📁 `plugins/commit-commands/`、`plugins/security-guidance/`、`plugins/hookify/`

### 第 3 章：三种最小插件实战

#### 3.1 实战一：最小命令插件（5 个文件）
- 以 commit-commands 为蓝本
- 从零搭建 plugin.json + commands/*.md
- YAML frontmatter 的 description、allowed-tools、argument-hint
- 📁 `plugins/commit-commands/commands/commit.md`
- 📁 `plugins/commit-commands/commands/commit-push-pr.md`

#### 3.2 实战二：最小 Hook 插件（4 个文件）
- 以 explanatory-output-style 为蓝本
- hooks.json 配置 + session-start.sh 实现
- Hook 输出的 JSON 结构：hookSpecificOutput + additionalContext
- 📁 `plugins/explanatory-output-style/hooks/hooks.json`
- 📁 `plugins/explanatory-output-style/hooks-handlers/session-start.sh`

#### 3.3 实战三：最小技能插件（3 个文件）
- 以 frontend-design 为蓝本
- SKILL.md 的 YAML frontmatter：name、description（触发短语）、version
- 渐进式披露的入门级实现
- 📁 `plugins/frontend-design/skills/frontend-design/SKILL.md`

---

## 第三篇：命令系统

### 第 4 章：Slash 命令的定义与执行

#### 4.1 命令的本质：一个 Markdown 文件就是一个指令
- 命令文件就是 prompt —— Claude 执行的是 Markdown 正文
- YAML frontmatter 是配置，正文是指令
- 命令与普通 prompt 的区别：可复用、可分发、可约束工具
- 📁 `plugins/plugin-dev/skills/command-development/SKILL.md`

#### 4.2 Frontmatter 完整字段解析
- `description`：命令描述（/help 中显示）
- `allowed-tools`：工具白名单（安全边界）
- `argument-hint`：参数提示
- `model`：指定模型（sonnet/opus/haiku）
- 工具白名单的模式匹配语法：`Bash(git push:*)`
- 📁 `plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md`

#### 4.3 动态参数与文件引用
- `$ARGUMENTS` 变量：接收用户输入
- `@file` 引用：将文件内容注入命令
- 命名空间：`/plugin-name:command-name` 防止冲突
- 📁 `plugins/plugin-dev/skills/command-development/references/interactive-commands.md`

#### 4.4 案例深度解析：commit-push-pr 命令
- 20 行 Markdown 如何实现「提交 + 推送 + 创建 PR」
- allowed-tools 精确控制：只允许 6 个 git/gh 命令
- 单次执行约束：必须在一个响应中完成所有步骤
- 📁 `.claude/commands/commit-push-pr.md`

#### 4.5 案例深度解析：triage-issue 命令
- 71 行实现完整的 Issue 分类系统
- 上下文参数传递：`$ARGUMENTS = "REPO: xxx ISSUE_NUMBER: xxx EVENT: xxx"`
- 新 Issue vs 评论事件的分支处理
- 5 种生命周期标签的智能判断逻辑
- 📁 `.claude/commands/triage-issue.md`

---

## 第四篇：Agent 系统 —— 子 Agent 与 Agent 团队

### 第 5 章：Agent 定义与触发机制

#### 5.1 Agent 的本质：一个自治子进程
- Agent vs 命令：自治 vs 用户发起
- Agent 文件结构：YAML frontmatter + 系统提示词
- frontmatter 关键字段：name、description（触发条件）、tools、model、color
- 📁 `plugins/plugin-dev/skills/agent-development/SKILL.md`

#### 5.2 触发条件设计：description 就是匹配器
- description 中的 `<example>` 标签：上下文匹配
- 好的触发条件 vs 坏的触发条件
- 如何避免 Agent 被误触发
- 📁 `plugins/plugin-dev/skills/agent-development/references/triggering-examples.md`

#### 5.3 系统提示词设计
- 角色定义：「你是一个高级软件架构师...」
- 输出格式约束：结构化的审查结果
- 工具约束：Agent 可以使用的工具子集
- 📁 `plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md`
- 📁 `plugins/feature-dev/agents/code-architect.md`（完整示例）

#### 5.4 模型选择策略
- haiku：快速预检查（code-review 步骤 1-2）
- sonnet：常规审查（CLAUDE.md 合规性）
- opus：深度推理（Bug 检测、Issue 分类）
- 📁 `plugins/code-review/commands/code-review.md`（多模型混用示例）
- 📁 `.github/workflows/claude-issue-triage.yml`（opus 用于分类）

### 第 6 章：多 Agent 协作模式

#### 6.1 模式一：并行探索（Feature-Dev）
- 阶段 2：2-3 个 code-explorer Agent 并行探索代码库
- 每个 Agent 从不同角度分析（类似功能、架构模式、现有实现）
- Agent 返回后必须读取所有识别的关键文件
- 阶段 4：2-3 个 code-architect Agent 并行设计方案
- 三种方案范式：最小变更 / 清洁架构 / 实用平衡
- 📁 `plugins/feature-dev/commands/feature-dev.md`
- 📁 `plugins/feature-dev/agents/code-explorer.md`
- 📁 `plugins/feature-dev/agents/code-architect.md`

#### 6.2 模式二：流水线验证（Code-Review 9 步流程）
- 步骤 1-2（haiku）：前置检查 + CLAUDE.md 收集
- 步骤 3（sonnet）：PR 摘要
- 步骤 4（4 个并行 Agent）：2 Sonnet(合规) + 2 Opus(Bug)
- 步骤 5（并行验证子 Agent）：每个问题独立验证
- 步骤 6：过滤未验证问题
- 步骤 7-9：输出 + 可选 GitHub 内联评论
- 高信号标准：只标记确定的错误，拒绝主观建议
- 📁 `plugins/code-review/commands/code-review.md`（110 行完整流程）

#### 6.3 模式三：多维度专家组（PR-Review-Toolkit）
- 6 个专业 Agent 各司其职：
  - comment-analyzer：评论质量分析
  - pr-test-analyzer：测试覆盖度评审
  - silent-failure-hunter：静默失败检测
  - type-design-analyzer：类型设计分析
  - code-reviewer：代码规范审查（置信度 >= 80）
  - code-simplifier：代码简化建议
- 置信度评分机制：只输出 >= 80 分的问题，过滤噪音
- 📁 `plugins/pr-review-toolkit/agents/*.md`（6 个 Agent 定义）
- 📁 `plugins/pr-review-toolkit/commands/review-pr.md`

#### 6.4 模式四：并行搜索 + 漏斗过滤（Dedupe）
- 步骤 1：预检查 Agent（排除不需要去重的 Issue）
- 步骤 2：摘要 Agent（提取关键信息）
- 步骤 3：5 个并行搜索 Agent（不同关键词策略）
- 步骤 4：过滤 Agent（分析相似度，过滤假阳性）
- 步骤 5：调用 Shell 脚本发布评论
- 📁 `.claude/commands/dedupe.md`（28 行实现）
- 📁 `scripts/comment-on-duplicates.sh`

#### 6.5 Agent 团队设计原则总结
- 并行 vs 串行：独立任务并行，依赖任务串行
- 模型分配：按任务复杂度选模型（haiku < sonnet < opus）
- 验证层：发现问题后必须有独立验证
- 高信号过滤：宁可漏报不可误报
- Agent 假设：「所有工具都能正常工作，不需要测试调用」

---

## 第五篇：技能系统 —— 知识的渐进式披露

### 第 7 章：技能的三层架构

#### 7.1 为什么需要渐进式披露
- 上下文窗口的稀缺性
- 一次性加载所有知识 vs 按需加载
- 技能的三层结构：元数据 -> SKILL.md -> references/examples
- 📁 `plugins/plugin-dev/skills/skill-development/SKILL.md`

#### 7.2 第一层：元数据（始终加载）
- YAML frontmatter 中的 name 和 description
- description 中的触发短语设计
- 版本管理：version 字段
- 📁 各技能的 SKILL.md 头部 frontmatter

#### 7.3 第二层：SKILL.md 核心文档（触发时加载）
- 控制在 ~1,500-2,000 字
- API 参考级别的精确度
- 关键概念 + 核心用法 + 常见模式
- 📁 `plugins/plugin-dev/skills/hook-development/SKILL.md`（Hook 开发技能）
- 📁 `plugins/plugin-dev/skills/mcp-integration/SKILL.md`（MCP 集成技能）

#### 7.4 第三层：参考文档与示例（按需加载）
- references/*.md：深度指南、完整规范、迁移文档
- examples/*.md|*.json|*.sh：可运行的代码示例
- scripts/*.sh：验证和测试脚本
- 📁 `plugins/plugin-dev/skills/command-development/references/`（7 个参考文档）
- 📁 `plugins/plugin-dev/skills/hook-development/examples/`（3 个 Shell 示例）
- 📁 `plugins/plugin-dev/skills/mcp-integration/examples/`（3 个 JSON 配置示例）

#### 7.5 案例：plugin-dev 的 7 个技能体系
- 7 个技能覆盖插件开发全生命周期
- 总计 53 个子文件：7 SKILL.md + 22 参考 + 15 示例 + 9 脚本/README
- ~21,000 字参考文档 + ~11,065 字核心文档
- 如何从零复刻这样的技能体系
- 📁 `plugins/plugin-dev/CLAUDE.md`（完整技能体系文档）

---

## 第六篇：Hook 事件系统 —— 拦截一切

### 第 8 章：9 种 Hook 事件全解析

#### 8.1 Hook 的本质：事件驱动的拦截器
- Hook 是什么：在特定事件发生时执行的脚本
- 两种 Hook 类型：command（脚本）vs prompt（LLM 驱动）
- hooks.json 配置格式
- matcher 字段：工具名匹配（如 `Write|Edit`）
- 📁 `plugins/plugin-dev/skills/hook-development/SKILL.md`

#### 8.2 PreToolUse：工具执行前拦截
- 输入格式：hook_event_name + tool_name + tool_input（JSON）
- 输出格式：permissionDecision: "deny" 阻止执行
- stdin 读取 -> 处理 -> stdout 输出 JSON
- 实现模式：Python（hookify）vs Shell
- 📁 `plugins/hookify/hooks/pretooluse.py`（75 行完整实现）
- 📁 `plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh`

#### 8.3 PostToolUse：工具执行后处理
- 与 PreToolUse 的区别：tool_output 字段
- 用途：结果日志、后处理、触发后续操作
- 📁 `plugins/hookify/hooks/posttooluse.py`

#### 8.4 Stop / SubagentStop：会话退出拦截
- Stop Hook 的核心能力：阻止退出并重新喂入提示词
- decision: "block" + reason 字段实现循环
- SubagentStop：控制子 Agent 的退出行为
- 📁 `plugins/ralph-wiggum/hooks/stop-hook.sh`（178 行完整实现）
  - YAML frontmatter 解析
  - 迭代计数器管理
  - 完成承诺检测（Perl 正则提取 `<promise>` 标签）
  - Transcript JSONL 格式解析
  - 原子化状态文件更新

#### 8.5 SessionStart / SessionEnd：会话生命周期
- SessionStart：注入上下文到默认系统提示词
- additionalContext 字段：教育性指令注入
- SessionStart vs CLAUDE.md：添加 vs 替换
- SessionEnd：清理状态、释放资源
- 📁 `plugins/explanatory-output-style/hooks-handlers/session-start.sh`（16 行实现）
- 📁 `plugins/learning-output-style/hooks-handlers/session-start.sh`

#### 8.6 UserPromptSubmit / PreCompact / Notification
- UserPromptSubmit：用户提交提示前预处理
- PreCompact：上下文压缩前保留关键信息
- Notification：外部通知处理
- 📁 `plugins/hookify/hooks/userpromptsubmit.py`

#### 8.7 Hook 的安全哲学
- 铁律：Hook 错误永远不阻止用户操作
- 所有异常捕获并记录，返回空 JSON（允许操作）
- exit 0：无论成功失败都返回 0
- 📁 `plugins/hookify/hooks/pretooluse.py`（第 60-70 行 try/except/finally 模式）

---

## 第七篇：规则引擎 —— Hookify 深度剖析

### 第 9 章：声明式规则系统

#### 9.1 从代码到配置：Hookify 的设计思路
- 问题：每个 Hook 都要写 Python 代码？
- 解决方案：用 Markdown frontmatter 声明规则
- 规则文件命名约定：`.claude/hookify.*.local.md`
- 📁 `plugins/hookify/CLAUDE.md`（完整架构文档）

#### 9.2 规则文件格式详解
- YAML frontmatter：name / enabled / event / action / conditions
- Markdown body：规则触发时显示的消息
- 简单模式（legacy）：pattern 字段
- 复杂模式（新版）：conditions 数组
- 📁 `plugins/hookify/examples/dangerous-rm.local.md`（最简示例）
- 📁 `plugins/hookify/examples/sensitive-files-warning.local.md`（多条件示例）

#### 9.3 条件系统：field + operator + pattern
- field 类型：command / new_text / old_text / file_path / reason / transcript / user_prompt
- operator 类型：regex_match / contains / equals / not_contains / starts_with / ends_with
- 字段提取逻辑：根据 tool_name 自动推断（Bash -> command, Edit -> new_string）
- 📁 `plugins/hookify/core/rule_engine.py`（`_extract_field` 方法，第 182-254 行）
- 📁 `plugins/hookify/core/config_loader.py`（Condition dataclass，第 16-29 行）

#### 9.4 规则引擎核心实现
- `RuleEngine.evaluate_rules()`：遍历所有规则，分类为 blocking/warning
- `_rule_matches()`：工具匹配 + 全条件 AND 逻辑
- `_matches_tool()`：支持 `*` 通配和 `|` 分隔的 OR 匹配
- 优先级：block > warn
- 消息组合：多个匹配规则的消息用 `\n\n` 连接
- 📁 `plugins/hookify/core/rule_engine.py`（完整 314 行）

#### 9.5 YAML 解析器：不依赖 PyYAML 的轻量实现
- 为什么不用 PyYAML：零外部依赖原则
- 手写 YAML 解析：支持 frontmatter + list + dict
- 边界情况处理：内联字典、多行字典项、嵌套缩进
- 📁 `plugins/hookify/core/config_loader.py`（`extract_frontmatter` 函数，第 87-195 行）

#### 9.6 正则缓存优化
- `@lru_cache(maxsize=128)` 缓存编译后的正则
- 为什么 128：常见规则数量上限
- re.IGNORECASE 默认大小写不敏感
- 📁 `plugins/hookify/core/rule_engine.py`（第 14-24 行）

#### 9.7 实战：4 种常见规则模板
- 危险命令拦截：`rm -rf` 检测
- Console.log 警告：开发环境代码检查
- 测试要求：Stop Hook 强制运行测试
- 敏感文件保护：防止修改关键配置
- 📁 `plugins/hookify/examples/`（4 个 .local.md 文件）

---

## 第八篇：会话与上下文管理

### 第 10 章：上下文注入与状态持久化

#### 10.1 SessionStart Hook：会话启动时的上下文注入
- 注入 additionalContext 到系统提示词
- 两种风格对比：
  - explanatory-output-style：提供教育性见解（`★ Insight` 格式）
  - learning-output-style：交互式学习（5-10 行代码贡献请求）
- 📁 `plugins/explanatory-output-style/hooks-handlers/session-start.sh`
- 📁 `plugins/learning-output-style/hooks-handlers/session-start.sh`

#### 10.2 CLAUDE.md 分层指令系统
- 根级 CLAUDE.md：项目全局指令（所有会话可见）
- 模块级 CLAUDE.md：模块特定指令（进入目录时可见）
- 面包屑导航：`[根目录](../../CLAUDE.md) > [plugins](../) > **hookify**`
- Claude Code 如何查找和加载 CLAUDE.md 链
- 📁 `CLAUDE.md`（根级）
- 📁 `plugins/hookify/CLAUDE.md`（模块级，含面包屑）

#### 10.3 状态持久化：.local.md 文件模式
- 约定：`.claude/plugin-name.local.md`
- YAML frontmatter 存结构化状态，Markdown body 存自由文本
- hookify 的规则存储：`.claude/hookify.*.local.md`
- ralph-wiggum 的循环状态：`.claude/ralph-loop.local.md`
  - iteration / max_iterations / completion_promise + 原始提示词
- .gitignore 排除：状态文件不应提交
- 📁 `plugins/plugin-dev/skills/plugin-settings/SKILL.md`
- 📁 `plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md`

#### 10.4 Transcript 与会话历史
- Transcript 文件格式：JSONL（每行一个 JSON）
- 消息结构：role + content（type: text + text 字段）
- ralph-wiggum 如何读取 Transcript 提取 Agent 最后输出
- `jq` 解析：`map(select(.type == "text")) | map(.text) | join("\n")`
- 📁 `plugins/ralph-wiggum/hooks/stop-hook.sh`（第 80-95 行 Transcript 解析）

#### 10.5 自引用循环：Ralph Wiggum 技术
- 核心思想：相同提示词反复喂入，利用文件和 Git 历史中的先前工作
- Stop Hook 阻止退出 + reason 字段注入提示词
- 迭代计数器 + 完成承诺机制
- Perl 正则提取 `<promise>` 标签
- 原子化状态更新：临时文件 + mv
- 📁 `plugins/ralph-wiggum/hooks/stop-hook.sh`（完整 178 行）
- 📁 `plugins/ralph-wiggum/scripts/setup-ralph-loop.sh`

#### 10.6 PreCompact Hook：上下文压缩前的信息保留
- 什么时候触发：上下文接近窗口上限时
- 用途：标记不应被压缩丢弃的关键信息
- 设计建议：保留架构决策、关键约束、进行中的任务状态
- 📁 `plugins/plugin-dev/skills/hook-development/SKILL.md`（Hook 事件表）

---

## 第九篇：安全机制

### 第 11 章：多层安全防护体系

#### 11.1 工具白名单机制
- allowed-tools 字段：精确控制命令可使用的工具
- 模式匹配语法：`Bash(git push:*)`、`Bash(./scripts/gh.sh:*)`
- 为什么 dedupe 只允许 `./scripts/gh.sh` 而不是原生 `gh`
- 📁 `.claude/commands/commit-push-pr.md`（6 个精确工具）
- 📁 `.claude/commands/dedupe.md`（只允许 2 个脚本）

#### 11.2 Security Guidance：9 种安全模式检测
- 检测模式列表：
  1. github_actions_workflow
  2. child_process_exec
  3. new_function_injection
  4. eval_injection
  5. react_dangerously_set_html
  6. document_write_xss
  7. innerHTML_xss
  8. pickle_deserialization
  9. os_system_injection
- 会话隔离状态：每个模式只提醒一次
- 30 天自动清理机制
- 📁 `plugins/security-guidance/hooks/security_reminder_hook.py`
- 📁 `plugins/security-guidance/CLAUDE.md`

#### 11.3 三档安全配置
- `settings-lax.json`：最少限制（禁用 bypass + 屏蔽市场）
- `settings-strict.json`：最严限制（仅受管 Hook + 仅受管权限 + 禁止 Web）
- `settings-bash-sandbox.json`：强制 Bash 沙箱模式
- 📁 `examples/settings/settings-lax.json`
- 📁 `examples/settings/settings-strict.json`
- 📁 `examples/settings/settings-bash-sandbox.json`

#### 11.4 Hook 安全哲学
- 优雅降级：Hook 失败不阻止用户操作
- 错误隔离：try/except 捕获所有异常
- 权限最小化：`CLAUDE_PLUGIN_ROOT` 限制文件访问
- 日志输出到 stderr，结果输出到 stdout
- 📁 `plugins/hookify/hooks/pretooluse.py`（第 36-74 行安全模式）

#### 11.5 DevContainer 沙箱
- Docker/Podman 双后端支持
- init-firewall.sh：网络隔离
- VS Code DevContainer 集成
- 📁 `.devcontainer/devcontainer.json`
- 📁 `.devcontainer/init-firewall.sh`
- 📁 `Script/run_devcontainer_claude_code.ps1`

---

## 第十篇：GitHub 自动化工作流

### 第 12 章：事件驱动的 Issue 管理

#### 12.1 完整事件流：从 Issue 打开到锁定
```
Issue 打开 → 去重 → 分类 → 生命周期标签 → 超时关闭 → 锁定
```
- 12 个工作流的协作关系
- 并发控制：`concurrency` 组防止竞态
- 📁 `.github/workflows/`（12 个 YAML 文件）
- 📁 `.github/workflows/CLAUDE.md`（完整架构文档）

#### 12.2 Issue 去重自动化
- 触发：issue-opened-dispatch.yml -> claude-dedupe-issues.yml
- Claude 模型：sonnet（速度优先）
- /dedupe 命令的 5 个并行搜索 Agent
- 作者反馈检测：检查 thumbs_down 反应
- 高赞保护：跳过 >= 10 thumbs_up 的 Issue
- 3 天等待期 -> auto-close-duplicates.yml 自动关闭
- 📁 `.github/workflows/claude-dedupe-issues.yml`
- 📁 `scripts/auto-close-duplicates.ts`

#### 12.3 Issue 分类自动化
- 触发：issue-opened-dispatch.yml -> claude-issue-triage.yml
- Claude 模型：opus（推理能力优先）
- /triage-issue 命令的分类逻辑
- 5 种生命周期标签的超时配置
- 📁 `.github/workflows/claude-issue-triage.yml`
- 📁 `.claude/commands/triage-issue.md`

#### 12.4 TypeScript 脚本：类型安全的 GitHub API
- Bun 运行时：TypeScript 直接执行，无需编译
- 接口定义：GitHub API 响应的 TypeScript 类型
- fetch 封装：统一的请求/响应处理
- 重复检测算法：正则提取 Issue 编号
- 📁 `scripts/auto-close-duplicates.ts`
- 📁 `scripts/issue-lifecycle.ts`
- 📁 `scripts/sweep.ts`
- 📁 `scripts/CLAUDE.md`

#### 12.5 Shell 脚本：安全的 CLI 封装
- gh.sh：为什么要封装 `gh` 命令
- comment-on-duplicates.sh：评论格式化
- edit-issue-labels.sh：标签操作封装
- 📁 `scripts/gh.sh`
- 📁 `scripts/comment-on-duplicates.sh`
- 📁 `scripts/edit-issue-labels.sh`

#### 12.6 Issue 模板系统
- 5 种结构化模板：bug / feature / documentation / model_behavior / config
- config.yml：禁止空白 Issue + 外部链接引导
- 标签自动关联
- 📁 `.github/ISSUE_TEMPLATE/bug_report.yml`
- 📁 `.github/ISSUE_TEMPLATE/config.yml`

---

## 第十一篇：MCP 集成

### 第 13 章：Model Context Protocol 服务器集成

#### 13.1 MCP 的角色：连接外部服务
- 什么是 MCP：让 Claude 使用外部工具的标准协议
- 4 种服务器类型：stdio / SSE / HTTP / WebSocket
- .mcp.json 配置方式
- 📁 `plugins/plugin-dev/skills/mcp-integration/SKILL.md`

#### 13.2 stdio 类型：本地进程通信
- 适用场景：本地 CLI 工具、NPM 包
- 配置示例：command + args + env
- `${CLAUDE_PLUGIN_ROOT}` 路径引用
- 📁 `plugins/plugin-dev/skills/mcp-integration/examples/stdio-server.json`
- 📁 `plugins/plugin-dev/skills/mcp-integration/references/server-types.md`

#### 13.3 SSE / HTTP 类型：远程服务连接
- SSE：HTTP 事件流 + OAuth 认证
- HTTP：REST API 集成
- 认证模式：API Key / OAuth / 环境变量
- 📁 `plugins/plugin-dev/skills/mcp-integration/examples/sse-server.json`
- 📁 `plugins/plugin-dev/skills/mcp-integration/examples/http-server.json`
- 📁 `plugins/plugin-dev/skills/mcp-integration/references/authentication.md`

---

## 第十二篇：实战篇

### 第 14 章：从零构建一个完整插件

#### 14.1 需求分析：选定一个真实场景
- 用 feature-dev 的 7 阶段方法论分析需求
- 阶段 3 的关键性：不跳过任何歧义
- 📁 `plugins/feature-dev/commands/feature-dev.md`

#### 14.2 使用 plugin-dev 的 8 阶段工作流
- Discovery -> Component Planning -> Design -> Structure -> Implementation -> Validation -> Testing -> Documentation
- 每阶段的输入/输出/确认点
- 📁 `plugins/plugin-dev/commands/create-plugin.md`

#### 14.3 实现组件
- 命令：YAML frontmatter + Markdown 正文
- Agent：角色定义 + 触发条件 + 工具列表
- Hook：hooks.json + Python/Shell 脚本
- 技能：SKILL.md + references/ + examples/

#### 14.4 验证与测试
- plugin-validator Agent 自动验证
- validate-agent.sh / validate-hook-schema.sh / test-hook.sh
- 📁 `plugins/plugin-dev/skills/hook-development/scripts/`

#### 14.5 发布准备
- README.md 编写规范
- marketplace.json 注册
- 版本号管理
- 📁 `plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md`

### 第 15 章：设计模式与最佳实践总结

#### 15.1 架构模式
- 插件即文档：Markdown 定义一切
- 约定优于配置：目录结构即接口
- 声明式规则：用配置替代代码
- 渐进式披露：按需加载知识

#### 15.2 Agent 设计模式
- 并行探索模式：多角度同时分析
- 流水线验证模式：发现 -> 验证 -> 过滤
- 专家组模式：每个 Agent 一个维度
- 漏斗搜索模式：广搜 -> 精筛

#### 15.3 安全模式
- 工具白名单：精确控制可用工具
- 优雅降级：Hook 失败不阻止操作
- 会话隔离：状态不跨会话泄露
- 最小权限：只暴露必要的命令和文件

#### 15.4 状态管理模式
- .local.md 模式：YAML frontmatter + Markdown body
- 原子更新：临时文件 + mv
- 自动清理：超时机制 + SessionEnd Hook

#### 15.5 错误处理模式
- 捕获一切：try/except 包裹全部逻辑
- stderr 日志：错误信息输出到 stderr
- stdout 结果：空 JSON = 允许操作
- exit 0：无条件成功退出

---

## 附录

### 附录 A：项目文件完整索引
- 202 个文件按模块分类列表
- 每个文件的一句话描述和行数

### 附录 B：YAML Frontmatter 字段速查
- 命令 frontmatter 字段表
- Agent frontmatter 字段表
- 技能 frontmatter 字段表
- 规则 frontmatter 字段表

### 附录 C：Hook 事件速查表
- 9 种事件的输入/输出/用途对照表

### 附录 D：Agent 模型选择决策树
- haiku / sonnet / opus 的适用场景
- 成本 vs 能力的权衡

### 附录 E：安全配置速查
- 三档安全配置的完整字段对比

---

## 统计

- 预计章节数：15 章
- 预计小节数：80+ 节
- 涉及项目文件：120+ 个（覆盖 60% 的项目文件）
- 代码示例来源：全部来自项目真实文件，零虚构

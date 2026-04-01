# 01 CLI 启动与入口分流

本章是 Part 1「主业务流」的第一章：我们从真正的 CLI 入口 `restored-src/src/entrypoints/cli.tsx` 出发，回答一个很现实的问题：

> 同一个 `claude` 命令，为什么既能“秒出版本号”，又能启动交互式会话、跑后台 session 管理、甚至进入 remote-control/bridge 和 daemon 这样的长期运行模式？

核心结论先写在前面：**`cli.tsx` 本质是一个“轻量 bootstrap + 入口分流器”**。它用大量 fast-path 和动态 import，把“重初始化”推迟到必须发生时才发生，从而同时满足启动性能、模式多样性与可治理边界。

## 1. 本章要解决什么问题

如果你把 Claude Code 想象成“一个终端聊天程序”，那么一个直觉问题就是：CLI 入口不就是 `main()` 然后开始渲染 UI 吗？

但真实工程会遇到一组矛盾需求：

- **启动必须快。** `--version` 这类命令不能为了打印一行字就加载一整套 UI、配置、遥测、插件系统。
- **入口必须承载多运行形态。** 同一个二进制要兼容交互式、后台会话管理、远程控制桥接、daemon supervisor 等不同模式。
- **初始化必须可分层、可按需。** 有些模式需要 `enableConfigs()`、sinks、鉴权或策略限制，有些模式必须尽量“瘦”。

所以本章聚焦：**`cli.tsx` 如何把“一个 CLI 入口”拆成三类路径，并把昂贵初始化压到最晚。**

## 2. 先看业务流程图

下面这张图是本章的总览图。读图时只抓三件事：

1. 哪些是 `fast-path`（尽早 return，最少加载模块）。
2. 哪些是“特殊子命令路径”（仍是 fast-path，但会加载特定子系统）。
3. 哪条是“常规交互路径”（最终进入完整 CLI：解析参数、初始化、启动 UI/主循环）。

范围说明：

- 这张图画的是**本章聚焦的主业务主线**（用来建立“三类入口”的心智模型）。
- `cli.tsx` 真实源码还包含若干未展开的 fast-path、辅助路径、内部/实验性路径，以及少量“中途改写参数”的逻辑；本章刻意省略它们，是为了突出入口分流的主干，而不是声称 `cli.tsx` 只有这些分支。

```mermaid
flowchart TB
  %% Chapter 01: CLI 启动与入口分流（以 cli.tsx 为准）

  A["node entry: restored-src/src/entrypoints/cli.tsx\nmain() 读取 process.argv"] --> B["args = argv.slice(2)"]

  subgraph FP["fast-path（尽早退出 / 尽量少模块评估）"]
    direction TB
    V["--version / -v / -V\n零额外 import，直接 console.log 版本后退出"]
    DSP["--dump-system-prompt\n渲染 system prompt，输出后退出"]
  end

  subgraph SP["特殊子命令路径（仍是 fast-path，但切到特定运行形态）"]
    direction TB
    BR["remote-control / rc / bridge / remote / sync\n进入 bridge 模式（含鉴权与组织策略校验）"]
    DMN["daemon [subcommand]\n进入 daemon supervisor（长运行；另含更内部的 worker fast-path）"]
    BG["ps / logs / attach / kill / --bg / --background\n后台会话 registry 管理"]
  end

  subgraph NP["常规交互路径（完整 CLI）"]
    direction TB
    EI["startCapturingEarlyInput()\n提前捕获输入，避免导入主模块时丢输入"]
    M["动态 import ../main.js\n(源码对应 restored-src/src/main.tsx)"]
    R["cliMain(): commander 解析参数\npreAction 中调用 init()"]
    I["init(): restored-src/src/entrypoints/init.ts\n配置 + 安全 env + TLS/代理等基础设施"]
    UI["进入交互会话 / 非交互输出\n(后续章节展开)"]
  end

  B -->|args 仅匹配| V
  B -->|args[0] 匹配| DSP

  B -->|args[0] 命中| BR
  B -->|args[0] == 'daemon'| DMN
  B -->|args[0] in ps/logs/attach/kill 或包含 --bg| BG

  B -->|均未命中| EI --> M --> R --> I --> UI
```

图注：本图只保留本章要展开的主干路径；例如 `--daemon-worker <kind>` 这类更内部的 worker 入口、以及其它未在正文展开的分支，均被刻意省略。

> 提示：图里把 `bridge`、`daemon`、`BG sessions` 单独列出，是因为它们都是“产品级运行形态”，而不是某个小功能开关。

## 3. 源码入口

本章只锚定两个真实入口文件：

- `restored-src/src/entrypoints/cli.tsx`：轻量 bootstrap + 入口分流（本章主角）。
- `restored-src/src/entrypoints/init.ts`：昂贵的“全局初始化边界”（本章只解释它为何被推迟，不展开初始化细节）。

阅读建议（按本章目标最省力的顺序）：

1. 先通读 `cli.tsx` 的 `main()`：看它按什么顺序做 fast-path 判断、何时 `enableConfigs()`、何时动态 import。
2. 再把“常规交互路径”接到 `init.ts` 的 `init()`：理解为什么它属于“不能在每条路径都发生”的昂贵阶段。

## 4. 主调用链拆解

这一节不做“分支列表”，而是把入口当作一个调度器，按“为什么要这样分层”拆开看。

### 4.1 入口先做几件“必须早做的副作用”

`cli.tsx` 在 `main()` 之前就有少量 top-level side effects（环境变量/特性门控），典型理由是：

- 有些变量必须在**模块评估期间**就生效，否则下游模块在 import 时就把它们“固化”为常量或行为分支，`init()` 再改就来不及了。
- 这些副作用被刻意放在 `cli.tsx` 而不是 `init.ts`，就是为了保证 fast-path 仍然快，同时确保“必须早生效”的设置不会错过时机。

你在源码里能看到这种明确的工程注释动机：**“init() runs too late”** 的直白提醒。

### 4.2 先识别最极致的 fast-path：`--version`

`--version/-v/-V` 的路径在 `cli.tsx` 里被写成“零额外 import”：

- 业务目标：打印版本号后退出。
- 工程目标：不引入 startup profiler、不引入配置系统、不引入 UI 或 commander。

这类 fast-path 体现了 CLI 入口的第一原则：**把“昂贵模块评估”当作成本，按需支付。**

### 4.3 其次是“仍然快，但要加载少量能力”的 fast-path：`--dump-system-prompt`

`--dump-system-prompt` 是一个很“工程化”的入口：

- 它的业务用途不是给普通用户交互，而是为了评测/敏感性测试在某个 commit 上**提取已渲染的 system prompt**。
- 它要做的事比 `--version` 多：需要 `enableConfigs()`，需要确定模型（`--model` 或默认模型），再去渲染 `getSystemPrompt()`，最后输出并退出。

这里的关键不是“多了一个开关”，而是它体现了第二原则：

> fast-path 不是“不初始化”，而是“只初始化这条路径真正需要的最小集合”。

### 4.4 产品级运行形态 1：remote-control / bridge

当 args 命中 `remote-control`/`rc`/`bridge`（以及一些历史别名）时，`cli.tsx` 进入 bridge 路径。你可以把它理解为：

- **把本机当作可被远程调度的执行环境**（“serve local machine as bridge environment”）。
- 所以它必须先处理一组“治理前置条件”：鉴权是否具备、bridge 是否被 GrowthBook/版本要求禁用、组织策略是否允许 remote control 等。

这条路径的设计意图很清晰：**远程控制不是普通功能开关，它必须在入口就完成关键的策略裁决与失败退出。**

### 4.5 产品级运行形态 2：daemon（含 worker fast-path）

`daemon` 路径代表“长期运行的 supervisor”。除此之外，入口还支持一个更“内部”的 fast-path：

- `--daemon-worker <kind>`：由 supervisor 派生出的 per-worker 进程入口。
- 这条路径刻意保持精简：不做 `enableConfigs()`、不做 sinks 初始化，让 worker 尽可能“瘦”，需要配置/鉴权的 worker 由自身再决定何时加载。

这里体现的是第三原则：

> 当系统有 supervisor/worker 架构时，worker 入口必须更敏感地控制初始化成本，否则后台模式会被“启动开销”拖垮。

### 4.6 产品级运行形态 3：后台会话管理（ps / logs / attach / kill / --bg）

`ps|logs|attach|kill` 以及 `--bg/--background` 走同一类入口：针对本地会话 registry（如 `~/.claude/sessions/`）做会话管理。

它和“常规交互”最大的不同是：

- 你不需要 UI 主循环；
- 但你需要最基本的配置可用（所以会 `enableConfigs()`）；
- 然后把工作交给 `../cli/bg.js` 的 handler（按子命令分派）。

换句话说：**这是“管理面”入口**，它的用户心智类似 `docker ps` / `kubectl logs`，而不是“开始一次对话”。

### 4.7 所有特殊路径都没命中：进入常规交互路径

当 `cli.tsx` 认为“没有特殊 flags detected”时，才会做两件关键动作：

1. `startCapturingEarlyInput()`：先把可能的输入（含键入）尽早捕获，避免后续动态 import 带来的时间窗丢输入。
2. 动态 import `../main.js` 并执行 `cliMain()`：进入完整 CLI。

在完整 CLI（源码对应 `restored-src/src/main.tsx`）里，一个很关键的入口设计是：

- `commander` 的 `preAction` hook 里才会调用 `init()`（来自 `restored-src/src/entrypoints/init.ts`）。
- 这样可以做到：**展示 help 时不触发昂贵初始化；真正执行命令时才初始化。**

你可以把 `init.ts` 当作本章的边界：从这里开始就是“初始化/配置/环境/遥测”章节要展开的内容了。

## 5. 关键设计意图

把 `cli.tsx` 的分流设计抽象成几条“可复用的架构意图”，会更利于复刻和迁移：

1. **把入口当作成本控制器。** 动态 import + fast-path 的组合，本质是在控制模块评估成本，把“重”推迟到必须发生时。
2. **按运行形态拆分初始化预算。** bridge/daemon/bg sessions 都是产品级模式，它们各自需要的配置、鉴权、sinks、策略裁决不同，所以入口层必须把初始化做成“可选组合”。
3. **把治理前置放在入口。** 远程控制这类能力，一旦进入主链路再失败，代价更大且更难解释；入口提前校验能让失败更早、更确定。
4. **利用 feature gate 做可裁剪构建。** `feature('...')` 的 inline gate 让某些路径在构建期就被 DCE 掉，外部构建不背内部能力的成本与暴露面。
5. **把“必须早生效”的设置留在 bootstrap。** 某些 env/开关必须在 import 时就生效，放进 `init()` 会错过时机，所以 `cli.tsx` 允许少量 top-level side effects。

## 6. 从复刻视角看

如果你要复刻一个类似的 agent CLI（同一入口支持交互、后台、远程、守护），建议把入口拆成两层：

- `bootstrap.ts`（对应 `cli.tsx`）：只做参数粗分流 + 必要的 fast-path；重依赖全部动态 import；把“必须早生效”的 env/开关放这里。
- `main.ts`（对应 `main.tsx`）：完整 CLI（参数体系、命令树、UI/非 UI 输出、会话生命周期），并把“昂贵初始化”绑定到“确实要执行命令”的时刻。

一个可操作的最小骨架（伪代码）是：

```text
bootstrap(args):
  if args == ["--version"]: printVersion(); return
  if args[0] == "--dump-system-prompt": minimalInitForPrompt(); printPrompt(); return
  if args[0] in ["remote-control", "bridge"]: ensureAuthAndPolicy(); runBridge(); return
  if args[0] == "daemon": runDaemon(); return
  if args matches bg-session ops: runBgHandlers(); return

  startCapturingEarlyInput()
  import main
  main.run()
```

复刻时最容易踩的坑是把所有事情都塞进 `main()`：

- 结果是 `--version` 也要加载一堆模块，启动变慢；
- 远程/后台模式会被 UI 初始化绑架；
- “help 不该初始化”这类细节会被忽略，导致一堆难以解释的副作用。

## 7. 本章小练习

建议你做一个“入口分流最小复刻”，目标不是功能完整，而是把本章的分层意图落到可运行的骨架上：

1. 写一个 `bootstrap` 文件：实现 `--version` 的零依赖 fast-path（不要 import 你的 main 模块）。
2. 再加一个“需要最小配置”的 fast-path：例如 `--dump-config`，只加载你的配置系统并输出后退出。
3. 加一个“产品级模式”入口：例如 `daemon`，要求它不触发交互 UI 初始化。
4. 为上述三条路径画一张 Mermaid flowchart，强制你清楚区分 fast-path、特殊子命令路径、常规交互路径。

## 8. 本章小结

`restored-src/src/entrypoints/cli.tsx` 不是“main 的别名”，而是一个非常刻意的入口调度器：

- 它用 fast-path 把“秒级响应”的 CLI 体验保住；
- 用动态 import 把昂贵模块评估成本推迟到常规交互路径；
- 用 bridge/daemon/bg sessions 等分支显式承载多运行形态，并在入口就完成关键治理前置；
- 把 `restored-src/src/entrypoints/init.ts` 作为昂贵初始化边界：只有当你真的要执行完整命令时才进入它。

下一章我们会沿着这条边界继续下沉：专门讲 `init.ts` 这一层为什么这么“重”，以及它如何把配置、环境与遥测打成可复用的基础设施。

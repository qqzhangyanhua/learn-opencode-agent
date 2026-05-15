# 动画实验室设计说明

**日期：** 2026-05-15  
**状态：** 已确认设计，待进入实现规划  
**适用范围：** VitePress 书站新增独立模块  
**试点目标：** 建立一套以“系统运动感”为核心的动画实验框架，先用 Agent 运行闭环作为旗舰实验

## 1. 核心判断

这个模块值得做，但第一版必须克制。

原因：

1. 现有站点已经有章节动画，但风格偏章节内辅助说明，不适合作为长期视觉模块的标准
2. 用户明确希望新增单独模块，并要求动画更高级，不参考当前项目动画风格
3. 如果第一版只做单页硬编码，后续增加上下文、记忆、多 Agent、工具权限等实验时会重复造页面

第一版采用“框架先行”策略：先定义播放器、实验数据、Trace 面板和第一个 Agent 闭环实验，但不提前做复杂平台能力。

## 2. 设计目标

动画实验室不是普通文章页，也不是纯视觉演示页。它的定位是：

> 用可观察的系统运动，把抽象 Agent 概念变成可分步理解的运行过程。

第一版目标：

1. 新增独立入口 `/animation-lab/`
2. 建立系统运动感视觉语言
3. 实现一个旗舰实验：Agent 运行闭环
4. 提供可复用的分步播放器和 Trace 面板
5. 为后续实验保留清晰数据接口

非目标：

1. 不把现有动画批量迁移到实验室
2. 不做复杂 3D、物理引擎或编辑器能力
3. 不做多实验管理后台
4. 不在第一版引入额外动画库

## 3. 用户体验原则

动画实验室遵循四个原则：

1. 运动必须表达因果关系，不做纯装饰
2. 每次点击只推进一个关键阶段
3. 视觉负责展示系统关系，Trace 负责解释运行状态
4. 默认清晰可学，必要时允许沉浸观看

核心体验形态：

- 主区域是深色系统画布
- 右侧是默认展开的 Trace 面板
- Trace 面板可收缩
- 用户点击“下一步”推进阶段
- 当前步骤会同步改变画布节点、路径、数据包和 Trace 高亮
- 收缩 Trace 后，主画布自动扩大，并保留窄状态条提示当前阶段

## 4. 模块边界

### 4.1 页面入口

新增 `docs/animation-lab/index.md`。

页面职责：

- 介绍动画实验室定位
- 展示首个旗舰实验
- 预留后续实验列表区域
- 提供返回首页、实践篇、中级篇等入口

### 4.2 核心组件

建议组件边界：

- `AnimationLabIndex`：实验室首页内容组件
- `SystemMotionPlayer`：通用分步播放器
- `TracePanel`：右侧可收缩 Trace 面板
- `AgentLoopExperiment`：Agent 运行闭环实验画布

`SystemMotionPlayer` 只负责通用状态：

- 当前步骤索引
- 上一步
- 下一步
- 重置
- Trace 面板展开与收缩
- reduced motion 状态下的基础切换

`AgentLoopExperiment` 只负责实验专属画布：

- 节点布局
- 激活节点
- 激活路径
- 数据包运动
- 当前步骤对应的视觉状态

`TracePanel` 只负责 Trace 信息展示：

- 当前阶段
- 当前状态
- 事件列表
- 输入输出摘要
- 工具调用或观察结果

## 5. 数据结构

类型放在 `.vitepress/theme/components/animation-lab/type.ts`。

核心类型：

```ts
export interface Experiment {
  id: string
  title: string
  summary: string
  steps: ExperimentStep[]
}

export interface ExperimentStep {
  id: string
  title: string
  description: string
  activeNodes: string[]
  activePaths: string[]
  packet?: MotionPacket
  traceEvents: TraceEvent[]
}

export interface MotionPacket {
  from: string
  to: string
  label: string
}

export interface TraceEvent {
  id: string
  type: 'input' | 'thinking' | 'tool-call' | 'observation' | 'repair' | 'output'
  title: string
  detail: string
  status: 'pending' | 'active' | 'done'
}
```

实验数据放在 `.vitepress/theme/data/animation-lab-experiments.ts`。

第一版只包含一个实验：

- `agent-loop`

后续新增实验时，优先新增数据和少量实验画布，不修改播放器主结构。

## 6. Agent 运行闭环实验

第一期实验名称：`Agent 运行闭环`。

实验目标：让用户看见一个 Agent 如何从用户输入进入系统，经过计划、工具调用、观察、修正，最终生成稳定输出。

建议 6 个步骤：

1. `User Input`：任务进入系统
2. `Plan`：模型生成初始计划
3. `Tool Call`：触发工具调用
4. `Observation`：工具结果回填
5. `Repair / Refine`：根据观察修正下一步
6. `Final Answer`：输出稳定结果

画布节点：

- User
- Planner
- LLM
- Tool
- Observation
- Memory / Context
- Final Answer

每一步至少包含：

- 一个当前激活节点
- 一条当前激活路径
- 一个 Trace 高亮事件
- 一句短说明

## 7. 视觉设计

视觉方向：高级系统调试器。

关键词：

- 深色运行时画布
- 精准线条
- 数据包运动
- 节点激活
- Trace 同步高亮
- 克制的色彩层级

色彩建议：

- 背景：接近黑蓝的深色运行时画布
- 主动状态：青绿色或青蓝色
- 工具调用：琥珀色
- 观察结果：绿色
- 异常或修正：低饱和橙色
- 文本：遵循 VitePress 主题变量，避免和站点整体割裂

避免：

- 大面积紫蓝渐变
- 普通圆角卡片堆叠
- 纯装饰光斑
- 无意义数字和图标堆砌
- 只为炫技的连续动画

## 8. 交互设计

默认交互：

- 打开页面停在第 1 步
- 点击下一步推进
- 点击上一步回看
- 点击重置回到第 1 步
- Trace 面板默认展开
- Trace 面板可收缩

Trace 收缩后的行为：

- 画布扩大
- 右侧保留窄状态条
- 状态条展示当前 step 序号和阶段名
- 用户可再次展开 Trace

移动端行为：

- 主画布在上
- Trace 面板在下
- Trace 收缩后变为一行状态条
- 控制按钮固定在实验组件内部，不固定到全局页面

可访问性：

- 控制按钮必须有清晰文本或 `aria-label`
- 当前步骤变化不能只依赖颜色表达
- 支持键盘点击按钮推进
- 支持 `prefers-reduced-motion`

## 9. 文件结构

建议新增文件：

```text
docs/animation-lab/index.md
.vitepress/theme/components/animation-lab/AnimationLabIndex.vue
.vitepress/theme/components/animation-lab/SystemMotionPlayer.vue
.vitepress/theme/components/animation-lab/TracePanel.vue
.vitepress/theme/components/animation-lab/AgentLoopExperiment.vue
.vitepress/theme/components/animation-lab/type.ts
.vitepress/theme/data/animation-lab-experiments.ts
```

需要修改文件：

```text
.vitepress/config.mts
.vitepress/theme/index.ts
docs/index.md
```

是否修改校验脚本，取决于实现时入口校验是否要求新增模块进入固定检查项。第一版应优先保持最小修改。

## 10. 验收标准

功能验收：

1. `/animation-lab/` 可以访问
2. 首页或导航能进入动画实验室
3. Agent 运行闭环可按 6 步推进
4. Trace 面板能展开和收缩
5. Trace 状态与画布状态同步
6. 重置后回到初始状态

视觉验收：

1. 不复用当前普通章节动画风格
2. 画布具备高级系统调试器气质
3. 动画表达真实因果关系
4. Trace 收缩后布局不乱
5. 桌面和移动端文本不重叠

工程验收：

1. 不使用 `any`
2. 类型定义清晰，并放在 `type.ts`
3. 单文件不超过 500 行
4. 不引入未请求功能
5. 不破坏已有章节、实践篇、中级篇入口

验证命令：

```bash
bun run typecheck
bun run build:strict
```

浏览器验证：

- 桌面宽度下检查默认双栏布局
- 桌面宽度下检查 Trace 收缩布局
- 移动宽度下检查上下布局
- reduced motion 下检查状态仍可理解

## 11. 风险与控制

### 风险 1：框架先行导致过度设计

控制方式：

- 第一版只抽象播放器、Trace、实验数据
- 不做实验编辑器
- 不做复杂注册系统
- 不做动态路由生成

### 风险 2：高级动效影响阅读性能

控制方式：

- 使用 CSS transform 和 opacity
- 避免大量 DOM 节点同时动画
- 动画只围绕当前 step 发生
- 支持 reduced motion

### 风险 3：视觉和 VitePress 站点割裂

控制方式：

- 页面结构仍遵循 VitePress
- 文本颜色、间距和响应式规则参考现有站点
- 只在实验组件内部建立独立视觉语言

### 风险 4：Trace 信息过多

控制方式：

- 每一步只高亮一个核心事件
- Trace detail 保持短句
- 长解释仍交给正文或实验说明

## 12. 后续扩展

当 Agent 运行闭环稳定后，可以新增以下实验：

1. 上下文与记忆流
2. 多 Agent 调度
3. 工具调用与权限门
4. 错误重试与回滚
5. 长上下文压缩与召回

新增实验原则：

- 优先复用 `SystemMotionPlayer`
- 优先复用 `TracePanel`
- 只在必要时新增专属画布组件
- 不提前扩展框架能力

## 13. 实施顺序建议

1. 新增类型和实验数据
2. 实现 `TracePanel`
3. 实现 `SystemMotionPlayer`
4. 实现 `AgentLoopExperiment`
5. 新增 `/animation-lab/` 页面
6. 注册组件和导航入口
7. 运行类型检查和严格构建
8. 浏览器验证桌面、收缩、移动和 reduced motion

## 14. 当前决策记录

已确认决策：

- 模块类型：独立动画实验室
- 入口定位：旗舰展示页，但采用框架先行
- 动画风格：系统运动感
- 第一实验：Agent 运行闭环
- 控制方式：分步点击推进
- 信息密度：动画加 Trace 面板
- 布局方向：调试器双栏
- Trace 面板：默认展开，可收缩


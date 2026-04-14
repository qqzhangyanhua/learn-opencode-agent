# 第13章 云端分层职责演示设计稿

## 背景

第 13 章当前已经有一个 `<LocalCloudTopologyDemo />`，它适合帮助读者先建立“本地产品面 / 共享核心 / 云端产品面 / 基础设施”的总图。

但用户当前更明确的需求不是继续看一张总拓扑图，而是：

- 快速记住 `function / console / infra / containers` 四层各自负责什么
- 不再把 `function` 和 `console` 混成“同一类后端”
- 用同一条能力链路反复强化层与层之间的边界
- 降低纯文字阅读疲劳，让“负责什么 / 不负责什么 / 证据文件在哪”形成固定记忆框架

因此第 13 章最重要的第一记忆，不该只是“系统分了几层”，而应该是：

```text
账号 / 订阅 / 模型配置
  -> function 接入公共 API
  -> console 承接业务域
  -> infra 编排资源
  -> containers / CI 负责交付
```

并且让读者持续记住一句主判断：

```text
function 负责公共 API，console 负责账号与商业化域，两者不是一回事。
```

## 目标

为第 13 章新增章节级教学组件，让读者通过点击同一条能力链，稳定区分：

- `function` 在系统里负责什么
- `console` 为什么是独立产品层
- `infra` 为什么只负责编排资源
- `containers / CI` 为什么只是交付层

成功标准：

- 组件围绕同一能力例子：`账号 / 订阅 / 模型配置`
- 中间是一条固定主链，不做炫技动画
- 右侧固定记忆面板始终保持相同结构
- 每一层都明确展示：
  - `负责什么`
  - `不负责什么`
  - `典型文件`
- 用户点完一遍后，能清楚说出：
  - `function` 不是 `console`
  - `infra` 不是业务层
  - `containers / CI` 不参与业务决策

## 范围

本次只改：

- `.vitepress/theme/components/CloudLayerResponsibilityDemo.vue`
- `.vitepress/theme/index.ts`
- `docs/13-deployment-infrastructure/index.md`
- `scripts/check-chapter-experience.mjs`

不包含：

- 不移除现有 `<LocalCloudTopologyDemo />`
- 不重写整章基础设施正文
- 不做自动播放时间轴
- 不把组件扩展成完整部署模拟器

## 方案选择

### 方案 A：纯线性主链

只展示一条从左到右的能力链，让用户依次看四层经过关系。

优点：

- 最直接
- 流程感强

缺点：

- 用户容易只记住顺序
- 很难稳定记住“这一层不负责什么”

### 方案 B：主链 + 固定记忆面板

中间展示同一能力穿过各层，右侧固定显示：

- 这一层负责什么
- 这一层不负责什么
- 典型文件在哪里

并持续强化一句主记忆：

`function 负责公共 API，console 负责账号与商业化域，两者不是一回事。`

优点：

- 既保留流程感，又能形成固定判断框架
- 最符合“降低视觉疲劳、加深记忆”的目标
- 适合第 13 章这种“层次边界辨认”内容

缺点：

- 组件结构比单链稍复杂

### 方案 C：强对照模式

以 `function vs console`、`infra vs containers` 为主，不强调能力经过顺序。

优点：

- 去混淆效果强

缺点：

- 会削弱“同一能力链如何穿过各层”的整体认识

### 推荐方案

采用方案 B。

## 交互结构

### 顶部主记忆句

始终固定展示：

`function 负责公共 API，console 负责账号与商业化域，两者不是一回事。`

### 中间主链

固定五个节点：

- 需求出现
- function
- console
- infra
- containers / CI

主链默认停留在第一步，不自动轮播。

### 切换方式

- 用户点击节点切换当前状态
- 当前节点高亮
- 已知其余节点保持可见但弱化
- 不增加“学习进度按钮组”

### 右侧固定记忆面板

结构始终不变，只更新内容：

- 负责什么
- 不负责什么
- 典型文件

### 底部易混淆提醒

每个状态底部补一条短句，强化最容易搞混的边界。

## 五个状态设计

### 状态 1：需求出现

标题：

`用户要管账号、订阅、模型配置`

说明：

这是一个云端产品域问题，不是本地 Agent runtime 自己解决的能力。

记忆面板：

- 负责什么：识别这是账号与商业化相关需求
- 不负责什么：不直接等于部署资源，不直接变成本地 CLI 逻辑
- 典型文件：引用本章对 `packages/console` 职责的章节说明

易混淆提醒：

`先分清这是不是控制台业务域问题，再决定看哪一层。`

### 状态 2：经过 function

标题：

`function 提供公共 API 接口`

说明：

`function` 负责把请求接进云端产品面，处理分享、同步、集成等公共 API，但不承接账号订阅等业务域核心。

记忆面板：

- 负责什么：公共 API、同步、分享、外部集成入口
- 不负责什么：账户域模型、订阅计费、控制台业务规则
- 典型文件：`packages/function/src/api.ts`

易混淆提醒：

`function 不是 console 的轻量版后端。`

### 状态 3：进入 console

标题：

`console 才是账号与商业化业务域`

说明：

账号、订阅、模型配置真正落在 `packages/console`，它是一条独立产品线，不是普通 API 的附属层。

记忆面板：

- 负责什么：账号、工作区、订阅、计费、模型配置
- 不负责什么：不替代本地 Agent runtime，不负责统一资源编排
- 典型文件：
  - `packages/console/app`
  - `packages/console/core`
  - `packages/console/function`

易混淆提醒：

`console 是产品层，不是给本地 Agent 打杂的云函数集合。`

### 状态 4：落到 infra

标题：

`infra 编排资源，不定义业务规则`

说明：

当 `function` 和 `console` 的职责已经确定后，`infra` 才负责把它们部署成 Worker、站点、数据库、认证资源和 stage 隔离。

记忆面板：

- 负责什么：stage、资源编排、部署拓扑、云资源连接
- 不负责什么：不定义账号订阅规则，不承接业务语义
- 典型文件：
  - `sst.config.ts`
  - `infra/app.ts`
  - `infra/console.ts`

易混淆提醒：

`infra 负责把业务层部署出来，但它自己不是业务层。`

### 状态 5：最终交付

标题：

`containers / CI 负责稳定交付`

说明：

最后一层只负责构建、打包、发布和交付，不参与 API 边界划分，也不负责账号订阅业务。

记忆面板：

- 负责什么：构建环境、镜像、发布链路、持续交付
- 不负责什么：不决定产品职责，不定义资源拓扑
- 典型文件：`packages/containers`

易混淆提醒：

`containers / CI 解决的是怎么交付，不是系统该怎么分层。`

## 文案原则

- 所有说明尽量短句化
- 每个状态中央只强调一句主判断
- 固定使用“负责什么 / 不负责什么 / 典型文件”三段结构
- 重点反复强化：
  - `function` 和 `console` 不是一回事
  - `infra` 不等于业务层
  - `containers / CI` 不等于基础设施编排

## 接入位置

建议新增组件放在 `14.3 packages/function 与 packages/console 的云端架构` 开头，位于现有总拓扑认识之后。

原因：

- 这一节是全章最容易混淆的位置
- 前文已有 `<LocalCloudTopologyDemo />` 提供总图，这里更适合接职责辨认组件
- 后续继续阅读 `infra/console.ts`、`packages/containers/` 时，读者已经具备分层边界意识

## 校验与回归

`scripts/check-chapter-experience.mjs` 至少新增：

- 存在 `.vitepress/theme/components/CloudLayerResponsibilityDemo.vue`
- 组件源码包含：
  - `function 负责公共 API，console 负责账号与商业化域，两者不是一回事。`
  - `负责什么`
  - `不负责什么`
  - `典型文件`
  - `需求出现`
  - `containers / CI`
- 第 13 章文档接入 `<CloudLayerResponsibilityDemo />`

## 验证方式

至少运行：

- `bun run check:chapter-experience`
- `bun run typecheck`
- `bun run build`

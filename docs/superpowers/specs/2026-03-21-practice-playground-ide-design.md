# Practice Playground IDE Redesign Spec

**Date:** 2026-03-21  
**Status:** Reviewed Draft  
**Scope:** 在线运行模块第二阶段改版

---

## 1. 背景

当前实践篇已经有一个独立的 `/practice/playground/` 页面，支持 `P1 / P2 / P3 / P10 / P18` 五个章节在浏览器中填写 `API Key / baseURL / model` 后直接运行。

当前版本的问题不是“不能跑”，而是“不像工作台”：

- 页面仍是文档式卡片串联，不像独立在线运行页
- 配置面板常驻页面，操作重心不集中
- 左侧是章节列表，而不是可编辑请求区
- 用户只能跑预置示例，不能直接修改请求模板

本轮目标是把它升级成一个轻量 IDE 风格的章节工作台，但仍保持“教学型 Playground”边界，不扩成任意脚本执行器。

---

## 2. 目标

1. 在线运行入口默认以新标签页方式打开工作台页面
2. header 提供章节切换、设置、重置、运行
3. 左侧提供“请求模板编辑器”，而不是源码编辑器
4. 左侧支持双视图：
   - 结构化分段编辑
   - 原始 JSON 编辑
5. 右侧改为上下双面板：
   - 上半区运行输出
   - 下半区调试信息
6. `API Key / baseURL / model` 通过弹框管理，继续保存到 `localStorage`
7. 保留既有五个章节 runner 能力，通过模板适配器接入

---

## 3. 非目标

- 不做完整在线 IDE
- 不支持浏览器里执行任意 JS/TS 脚本
- 不开放本地工具实现编辑
- 不引入服务端代理
- 不把在线运行逻辑塞回 `RunCommand.vue`
- 第一版不引入 Monaco / CodeMirror

---

## 4. 页面与入口设计

### 4.1 章节入口

各实践章节中的“在线运行”入口统一改成：

- `href="/practice/playground/?chapter=<id>"`
- `target="_blank"`
- `rel="noopener noreferrer"`

这条规则直接用于 Markdown/HTML 链接，不走主题层统一劫持。

原因：

- 入口数量有限，仅 `P1 / P2 / P3 / P10 / P18`
- 需求是“默认新开标签页”，不需要额外 JS
- 保留普通链接跳转能力，禁用脚本时仍可用

### 4.2 页面结构

工作台页面采用轻量 IDE 布局：

- 顶部：`Workspace Header`
- 主体左侧：`Request Editor`
- 主体右侧：`Result Panel`

桌面端推荐比例：

- 左侧 `minmax(0, 1.6fr)`
- 右侧 `minmax(320px, 1fr)`

移动端：

- 纵向堆叠
- header 保留
- 编辑区在上，结果区在下

第一版不支持可拖拽分栏，也不记忆分栏宽度。

### 4.3 Header

Header 包含：

- 章节下拉选择器
- 当前章节标题
- 轻量状态信息：当前 model、配置是否完整
- 设置按钮
- 重置按钮
- 运行按钮

Header 不再承载长说明文案，不保留左侧章节列表。

---

## 5. 设置弹框

设置项仍只有三项：

- `API Key`
- `baseURL`
- `model`

交互要求：

- `API Key` 默认隐藏
- 可点按钮切换显示/隐藏
- 支持“保存到本地”
- 支持“清空配置”
- 弹框底部保留安全提示

安全要求：

- 文案明确“仅保存在当前浏览器本地存储”
- 不在输出区、调试区或请求摘要里回显完整 API Key
- 只展示 `hasApiKey: true/false`

持久化：

- 继续使用当前 `practice-playground-config` 存储键
- 不新增服务端存储

---

## 6. 请求模板模型

### 6.1 命名统一

本轮统一使用以下字段名：

- `system`
- `messages`
- `tools`
- `requestOptions`
- `meta`

不再混用 `systemPrompt` / `request extras` 等别名。

### 6.2 TypeScript 接口

```ts
export type PracticeTemplateRole = 'system' | 'user' | 'assistant' | 'tool'

export interface PracticeTemplateMessage {
  id: string
  role: PracticeTemplateRole
  content: string
  toolCallId?: string
}

export interface PracticeTemplateTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
  locked?: {
    name?: boolean
    parameters?: boolean
  }
}

export interface PracticeTemplateRequestOptions {
  stream?: boolean
  temperature?: number
  maxTokens?: number
  toolChoice?: 'auto' | 'none' | string
}

export interface PracticeTemplateMeta {
  chapterId: PracticePlaygroundChapterId
  templateVersion: 1
  runner: PracticePlaygroundRunnerType
  title: string
  description: string
}

export interface PracticePlaygroundTemplate {
  system: string
  messages: PracticeTemplateMessage[]
  tools: PracticeTemplateTool[]
  requestOptions: PracticeTemplateRequestOptions
  meta: PracticeTemplateMeta
}
```

### 6.3 默认值

```ts
{
  system: '',
  messages: [],
  tools: [],
  requestOptions: {},
  meta: {
    chapterId: 'p01-minimal-agent',
    templateVersion: 1,
    runner: 'tool-call',
    title: 'P1 最小 Agent',
    description: '最小工具调用闭环'
  }
}
```

### 6.4 最小可运行 JSON 示例

```json
{
  "system": "你是一名简洁的助手。",
  "messages": [
    {
      "id": "msg-user-1",
      "role": "user",
      "content": "北京今天天气怎么样？适合出去跑步吗？"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "查询指定城市的当前天气",
        "parameters": {
          "type": "object",
          "properties": {
            "city": { "type": "string" }
          },
          "required": ["city"]
        }
      },
      "locked": {
        "name": true
      }
    }
  ],
  "requestOptions": {
    "toolChoice": "auto"
  },
  "meta": {
    "chapterId": "p01-minimal-agent",
    "templateVersion": 1,
    "runner": "tool-call",
    "title": "P1 最小 Agent",
    "description": "最小工具调用闭环"
  }
}
```

---

## 7. 双视图编辑器规则

### 7.1 视图

左侧编辑器提供两种视图：

- `structured`
- `json`

两种视图共享同一份“最后成功解析的模板对象”，但 JSON 视图需要额外维护原始文本。

### 7.2 状态源

编辑器状态拆成两层：

```ts
interface PracticeTemplateEditorState {
  template: PracticePlaygroundTemplate
  jsonText: string
  jsonError: string
  isDirty: boolean
  lastSyncedFromTemplateAt: number
}
```

规则：

- `template` 是结构化视图和运行逻辑的权威对象
- `jsonText` 是 JSON 视图当前原始文本
- `jsonError` 非空时表示当前 JSON 文本未成功解析

### 7.3 同步规则

从结构化视图切到 JSON 视图：

- 用当前 `template` 重新序列化覆盖 `jsonText`
- 清空 `jsonError`

在 JSON 视图编辑时：

- 若 JSON 解析成功：
  - 更新 `template`
  - 更新 `jsonText`
  - 清空 `jsonError`
- 若 JSON 解析失败：
  - 只更新 `jsonText`
  - 写入 `jsonError`
  - 不改动 `template`

从 JSON 视图切回结构化视图：

- 如果 `jsonError` 为空，展示最新 `template`
- 如果 `jsonError` 非空，仍展示“最后一次成功解析的 `template`”
- 同时在顶部显示“JSON 当前有错误，结构化视图展示的是上一次有效版本”

### 7.4 JSON 视图最低体验

第一版无需代码编辑器，但必须提供：

- 等宽字体 `textarea`
- JSON 格式化按钮
- 非法 JSON 错误提示
- 错误尽量带行列号；若拿不到，至少提示解析错误原文

---

## 8. 模板到 runner 的契约

### 8.1 标准 runner 输入

新增统一输入结构：

```ts
export interface PracticePlaygroundRunnerInput {
  requestBody: {
    model: string
    messages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool'
      content: string
      tool_call_id?: string
    }>
    tools?: Array<{
      type: 'function'
      function: {
        name: string
        description: string
        parameters: Record<string, unknown>
      }
    }>
    stream?: boolean
    temperature?: number
    max_tokens?: number
    tool_choice?: 'auto' | 'none' | string
  }
  templateSnapshot: PracticePlaygroundTemplate
}
```

### 8.2 字段映射

- `template.system`
  - 若非空，转换成第一条 `role: 'system'`
- `template.messages`
  - 顺序追加到 `requestBody.messages`
- `template.tools`
  - 去掉 `locked` UI 字段后写入 `requestBody.tools`
- `template.requestOptions.stream`
  - 映射到 `requestBody.stream`
- `template.requestOptions.temperature`
  - 映射到 `requestBody.temperature`
- `template.requestOptions.maxTokens`
  - 映射到 `requestBody.max_tokens`
- `template.requestOptions.toolChoice`
  - 映射到 `requestBody.tool_choice`

### 8.3 runner 强制覆盖项

章节 runner 可以在适配后再强制写入某些字段，但必须显式记录：

- `P3` 强制 `stream = true`
- `P10` 强制注入教学型 ReAct system 约束
- `P18` 强制注入路由说明系统提示

规则：

- 用户编辑值优先
- 但教学链路必须存在的系统约束可以由 runner 追加，不允许被删除
- 这类注入要写到 debug 区，便于可观测

---

## 9. 五个章节的默认模板与边界

### 9.1 P1 最小 Agent

默认模板：

- `system`: 空
- `messages`: 1 条 user 问题
- `tools`: `get_weather`
- `requestOptions.toolChoice = 'auto'`

可编辑：

- user 问题
- tool description
- tool parameters 描述文本

限制：

- `get_weather` 的 `function.name` 锁定，不允许改
- 不允许删除唯一必需工具

### 9.2 P2 多轮对话

默认模板：

- `system`: 简洁编程助手
- `messages`: 预置多轮历史
- `tools`: 空

可编辑：

- system
- 全部 messages

### 9.3 P3 流式输出

默认模板：

- `system`: 分三段短文回答
- `messages`: 1 条 user 问题
- `requestOptions.stream = true`

限制：

- `stream` 在 UI 可展示，但不能真正被关掉；若用户改为 `false`，运行前适配器纠正并提示

### 9.4 P10 ReAct

默认模板：

- `system`: 教学型 ReAct 格式说明
- `messages`: 1 条 user 问题
- `tools`: `get_weather`、`search_web`、`calculate`

可编辑：

- user 问题
- 部分工具说明文本

限制：

- 三个工具的 `name` 锁定
- 不允许删除全部工具
- system 区可编辑，但 runner 会在最终请求前补齐最低教学约束

### 9.5 P18 模型路由

默认模板：

- `system`: 成本感知助手
- `messages`: 1 条 user 问题
- `tools`: 空

可编辑：

- user 问题
- 基础 request options

限制：

- 启发式路由逻辑不开放编辑

---

## 10. tools 可编辑规则

为避免“schema 可改，但本地实现固定”造成错配，第一版只允许有限编辑：

- 可改：
  - `description`
  - `parameters.properties.<field>.description`
- 不可改：
  - `function.name`
  - 顶层 `type`
  - 删除 locked 工具

UI 规则：

- locked 字段显示为只读
- 用户在 JSON 视图改坏 locked 字段时：
  - 阻止运行
  - 报错“该章节的本地工具实现固定，不能修改工具名或删除锁定工具”

---

## 11. 状态设计与生命周期

页面级状态：

```ts
interface PracticePlaygroundWorkspaceState {
  selectedChapterId: PracticePlaygroundChapterId
  config: PracticePlaygroundConfig
  settingsModalOpen: boolean
  editor: PracticeTemplateEditorState
  runState: PracticePlaygroundRunState
  lastAppliedTemplate: PracticePlaygroundTemplate | null
}
```

生命周期：

- 首屏：
  - 读取 URL `chapter`
  - 读取配置存储
  - 加载默认模板
- 切章节：
  - 中断当前运行
  - 重置 `runState`
  - 替换 `editor`
- 点击重置：
  - 只恢复当前章节默认模板
  - 不改 config
- 点击运行：
  - 若 `jsonError` 非空，禁止运行
  - 成功运行后写入 `lastAppliedTemplate`

第一版模板不持久化到 `localStorage`。

原因：

- 先把工作台链路稳定下来
- 避免章节模板版本升级后的迁移复杂度

替代 UX：

- 在编辑器顶部显示“改动仅在当前标签页有效”
- 切章节和刷新页面时会丢失模板改动

---

## 12. 运行中行为

### 12.1 按钮策略

运行中：

- `运行` 按钮禁用并显示“运行中...”
- `重置` 按钮可点击，但点击后会先中断当前请求
- 章节下拉可切换，但切换时会先中断当前请求

### 12.2 中断规则

以下行为都会触发中断：

- 点击重置
- 切换章节
- 页面卸载
- 再次点击运行前已有未完成请求

中断后：

- `runState.status` 回到 `idle`
- `debugLines` 追加“请求已取消”
- 若已有部分输出，保留已输出文本

### 12.3 流式章节

`P3` 中断时：

- 保留当前已收到文本
- 调试区写入“流式输出被中断”

### 12.4 循环章节

`P10` 中断时：

- 保留已记录的 `Thought / Action / Observation`
- 调试区追加“ReAct 链路被中断”

---

## 13. 结果区设计

右侧上下双面板：

- 上：输出
- 下：调试

### 13.1 输出区

- 使用等宽字体 `pre-wrap`
- 纯文本展示，不做 markdown 渲染
- 提供“复制输出”按钮
- 流式章节自动滚动到底部

### 13.2 调试区

- 逐条日志展示
- 保留时间顺序
- `P10` 的 `Thought / Action / Observation` 用结构化前缀保留
- 顶部可附带轻量请求摘要：
  - `model`
  - `baseURL`
  - `hasApiKey`
  - `durationMs`

---

## 14. 组件拆分与迁移路径

### 14.1 新组件

- `PracticePlaygroundHeader.vue`
- `PracticePlaygroundSettingsModal.vue`
- `PracticePlaygroundEditor.vue`
- `PracticePlaygroundStructuredEditor.vue`
- `PracticePlaygroundJsonEditor.vue`
- `PracticePlaygroundResultPanel.vue`
- `practicePlaygroundTemplates.ts`
- `practicePlaygroundTemplateAdapters.ts`

### 14.2 旧组件迁移

- `PracticePlaygroundShell.vue`
  - 保留，改为新的页面编排器
- `PracticePlaygroundRunner.vue`
  - 去掉当前“预置示例卡片”视觉职责
  - 保留或下沉执行协调逻辑
- `PracticePlaygroundOutput.vue`
  - 迁移到 `ResultPanel`，最终删除或只保留内部子块
- `PracticePlaygroundConfigPanel.vue`
  - 字段逻辑迁移到 `SettingsModal`，最终删除
- `PracticePlaygroundSidebar.vue`
  - 该版本不再使用，删除

### 14.3 分阶段替换

1. 先加新 header、modal、editor、result panel
2. 再迁移 runner 逻辑
3. 最后删旧 sidebar / config panel / output 卡片布局

避免中途出现“新旧布局同时工作但状态重复”的中间态。

---

## 15. 验证要求

### 15.1 静态校验

- `bun run typecheck`
- `bun run build`
- `bun run build:strict`

### 15.2 页面交互

至少验证：

- 章节页在线运行入口默认新开标签页，且带 `rel="noopener noreferrer"`
- `/practice/playground/` 默认落到 `P1`
- `?chapter=p10-react-loop` 自动装载 P10 模板
- 设置弹框保存/清空配置正常
- 结构化视图改动后可运行
- JSON 视图能看到同一份模板
- JSON 非法时：
  - 禁止运行
  - 切回结构化视图仍显示最后有效模板
- 运行中切章节会中断当前请求并重置状态
- 运行中点击重置会中断当前请求并恢复默认模板
- P3 输出区逐步增长
- P10 调试区保留 `Thought / Action / Observation`
- 浏览器后退/前进时，章节与 URL 保持一致

---

## 16. 结论

本轮采用“轻量 IDE 风格的章节工作台”方案：

- 新标签页打开
- header 控制章节与操作
- 左侧编辑请求模板，不编辑源码
- 双视图编辑器以“最后成功解析模板 + JSON 原始文本”双层状态实现
- 右侧输出/调试双面板
- 通过章节模板工厂与章节适配器衔接既有 runner

这条路线能满足新的交互目标，同时控制范围，不把当前 Playground 推向一套失控的通用在线 IDE。

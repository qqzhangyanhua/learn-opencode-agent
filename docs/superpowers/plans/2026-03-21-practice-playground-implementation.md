# Practice Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为实践篇新增一个独立的在线 Playground 页面，支持 `P1 / P2 / P3 / P10 / P18` 五个章节在浏览器中填写 `API Key / baseURL / model` 后一键运行预置示例，并从章节页自动跳转并选中对应章节。

**Architecture:** 保留现有文档页与 `RunCommand` 的职责不变，新增 `/practice/playground/` 独立实验台页面。页面由左侧章节列表和右侧运行主区组成，右侧通过共享配置面板、本地存储工具和按章节类型分发的 runner 实现浏览器直连请求；章节页仅追加“在线运行”入口按钮，正文仍保留本地命令行主线。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、浏览器 `fetch` / `ReadableStream`、`localStorage`

---

## 文件结构

### 新建文件

- `docs/practice/playground/index.md`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundShell.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundSidebar.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundConfigPanel.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundRunner.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundOutput.vue`
- `.vitepress/theme/components/practice-playground/practicePlaygroundCatalog.ts`
- `.vitepress/theme/components/practice-playground/practicePlaygroundStorage.ts`
- `.vitepress/theme/components/practice-playground/practicePlaygroundRunners.ts`
- `.vitepress/theme/components/practice-playground/practicePlaygroundTypes.ts`

### 修改文件

- `docs/practice/p01-minimal-agent/index.md`
- `docs/practice/p02-multi-turn/index.md`
- `docs/practice/p03-streaming/index.md`
- `docs/practice/p10-react-loop/index.md`
- `docs/practice/p18-model-routing/index.md`

### 参考文件

- `docs/superpowers/specs/2026-03-21-practice-playground-design.md`
- `.vitepress/theme/index.ts`
- `.vitepress/theme/components/types.ts`
- `.vitepress/theme/components/RunCommand.vue`

### 实现约束

- 不要修改现有 `practice/*.ts` 命令行脚本
- 不要把在线运行逻辑塞进 `RunCommand.vue`
- 第一版不做完整代码编辑器、不做服务端代理、不做原始 JSON 面板
- 配置只保存到浏览器 `localStorage`，运行结果只保存在内存态

## Task 1: 搭建 Playground 页面骨架与章节目录

**Files:**
- Create: `docs/practice/playground/index.md`
- Create: `.vitepress/theme/components/practice-playground/PracticePlaygroundShell.vue`
- Create: `.vitepress/theme/components/practice-playground/PracticePlaygroundSidebar.vue`
- Create: `.vitepress/theme/components/practice-playground/practicePlaygroundCatalog.ts`
- Create: `.vitepress/theme/components/practice-playground/practicePlaygroundTypes.ts`

- [ ] **Step 1: 定义 Playground 类型和章节目录数据**

在 `practicePlaygroundTypes.ts` 中定义：

```ts
export type PracticePlaygroundChapterId =
  | 'p01-minimal-agent'
  | 'p02-multi-turn'
  | 'p03-streaming'
  | 'p10-react-loop'
  | 'p18-model-routing'

export interface PracticePlaygroundChapter {
  id: PracticePlaygroundChapterId
  number: string
  title: string
  summary: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  articleHref: string
  runner: 'tool-call' | 'multi-turn' | 'streaming' | 'react-lite' | 'model-routing'
}
```

在 `practicePlaygroundCatalog.ts` 中导出 5 个章节的静态配置数组和按 `id` 查找的工具函数。

- [ ] **Step 2: 创建独立 Playground 页面**

在 `docs/practice/playground/index.md` 中导入 `PracticePlaygroundShell`：

```md
---
title: Practice Playground
description: 在浏览器中直接运行实践篇预置示例
---

<script setup>
import PracticePlaygroundShell from '../../../.vitepress/theme/components/practice-playground/PracticePlaygroundShell.vue'
</script>

<PracticePlaygroundShell />
```

页面正文不要混入额外解释段落，避免与右侧主区重复。

- [ ] **Step 3: 实现页面 Shell 与左侧章节列表**

`PracticePlaygroundShell.vue` 负责：

- 读取 URL 查询参数 `chapter`
- 参数无效时回退到 `p01-minimal-agent`
- 维护 `selectedChapterId`
- 把当前章节配置传给侧栏和右侧占位主区

`PracticePlaygroundSidebar.vue` 负责：

- 渲染 5 个章节列表
- 高亮当前章节
- 点击时更新 URL 查询参数

Shell 第一版先用右侧占位块替代真实配置区和运行区，确保路由和布局先成立。

- [ ] **Step 4: 让右侧顶部先具备基础上下文**

在 `PracticePlaygroundShell.vue` 的右侧占位区先显示：

- 当前章节标题
- 当前章节一句话摘要
- `返回原文章` 链接
- `查看实践环境准备` 链接

这一步先不接运行逻辑，只把独立页的信息架构跑通。

- [ ] **Step 5: 运行类型校验**

Run: `bun run typecheck`
Expected: exit code `0`

## Task 2: 实现配置面板与本地存储

**Files:**
- Create: `.vitepress/theme/components/practice-playground/PracticePlaygroundConfigPanel.vue`
- Create: `.vitepress/theme/components/practice-playground/practicePlaygroundStorage.ts`
- Modify: `.vitepress/theme/components/practice-playground/PracticePlaygroundShell.vue`
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundTypes.ts`

- [ ] **Step 1: 扩展配置类型**

在 `practicePlaygroundTypes.ts` 中新增：

```ts
export interface PracticePlaygroundConfig {
  apiKey: string
  baseURL: string
  model: string
  updatedAt: number
}
```

以及默认配置生成函数：

```ts
export function createDefaultPracticePlaygroundConfig(): PracticePlaygroundConfig {
  return {
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    updatedAt: Date.now(),
  }
}
```

- [ ] **Step 2: 实现 localStorage 读写工具**

在 `practicePlaygroundStorage.ts` 中封装：

- `PRACTICE_PLAYGROUND_STORAGE_KEY`
- `loadPracticePlaygroundConfig()`
- `savePracticePlaygroundConfig(config)`
- `clearPracticePlaygroundConfig()`

要求：

- 浏览器环境判断要防御 `window` 不存在
- 存储解析失败时回退默认配置
- 不在工具层处理 UI 文案

- [ ] **Step 3: 实现配置面板组件**

`PracticePlaygroundConfigPanel.vue` 负责：

- `API Key` 输入框
- `baseURL` 输入框
- `model` 输入框
- 显示/隐藏 Key
- 保存到本地按钮
- 清空配置按钮
- 安全提示文案

按钮事件只通过 `emit` 返回给父组件，不在组件内直接操作章节状态。

- [ ] **Step 4: 将配置状态接入 Shell**

`PracticePlaygroundShell.vue` 负责：

- 首屏从 `localStorage` 读取配置
- 用户保存时调用存储工具
- 用户清空时重置为默认配置并清理本地存储
- 将配置透传给后续 runner 区域

右侧主区此时应形成：

- 章节头部
- 配置面板
- 运行区占位
- 输出区占位

- [ ] **Step 5: 运行构建验证**

Run: `bun run build`
Expected: `build complete`

## Task 3: 打通 runner 基础设施与 P1 最小链路

**Files:**
- Create: `.vitepress/theme/components/practice-playground/PracticePlaygroundRunner.vue`
- Create: `.vitepress/theme/components/practice-playground/PracticePlaygroundOutput.vue`
- Create: `.vitepress/theme/components/practice-playground/practicePlaygroundRunners.ts`
- Modify: `.vitepress/theme/components/practice-playground/PracticePlaygroundShell.vue`
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundCatalog.ts`
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundTypes.ts`

- [ ] **Step 1: 定义运行状态与输出类型**

在 `practicePlaygroundTypes.ts` 中新增：

```ts
export interface PracticePlaygroundRunState {
  status: 'idle' | 'running' | 'success' | 'error'
  startedAt: number | null
  finishedAt: number | null
  durationMs: number | null
  outputText: string
  debugLines: string[]
  errorMessage: string
}
```

以及 runner 输入上下文：

```ts
export interface PracticePlaygroundRunnerContext {
  chapter: PracticePlaygroundChapter
  config: PracticePlaygroundConfig
  onDebug: (line: string) => void
  onOutput: (text: string) => void
}
```

- [ ] **Step 2: 实现输出组件和运行容器**

`PracticePlaygroundOutput.vue` 渲染：

- 请求配置摘要
- 运行输出
- 调试信息

`PracticePlaygroundRunner.vue` 负责：

- 根据当前章节显示预置示例说明
- 提供“一键运行”按钮
- 维护当前 `runState`
- 调用对应 runner

- [ ] **Step 3: 在 runner 工具文件中封装基础请求函数**

在 `practicePlaygroundRunners.ts` 中先实现通用函数：

```ts
async function createChatCompletion(
  config: PracticePlaygroundConfig,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${config.baseURL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  })
}
```

基础函数还需封装：

- 空配置校验
- 非 2xx 响应错误展开
- `baseURL` 末尾 `/` 规范化

- [ ] **Step 4: 先实现 P1 runner**

P1 采用最小教学链路：

1. 发送带 `tools` 的请求
2. 若模型返回 `tool_calls`，在浏览器内执行本地 `get_weather`
3. 发送第二次请求整合工具结果
4. 输出最终回答

本地工具实现使用固定天气映射，不依赖外部服务。

- [ ] **Step 5: 将 P1 runner 接到 Playground 页**

要求：

- 选择 `P1` 时能点击“一键运行”
- 输出区能显示最终回答
- 调试区至少能看到“请求开始 / 工具执行 / 请求完成”

- [ ] **Step 6: 运行校验**

Run: `bun run typecheck`
Expected: exit code `0`

## Task 4: 完成 P2 / P3 / P10 / P18 四类 runner

**Files:**
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundCatalog.ts`
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundRunners.ts`
- Modify: `.vitepress/theme/components/practice-playground/PracticePlaygroundRunner.vue`
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundTypes.ts`

- [ ] **Step 1: 实现 P2 多轮对话 runner**

P2 不需要复杂工具链，直接内置一组消息历史：

```ts
messages = [
  { role: 'system', content: '你是一名简洁的编程助手。' },
  { role: 'user', content: '帮我写一个排序函数。' },
  { role: 'assistant', content: '这里是一个升序排序函数...' },
  { role: 'user', content: '改成支持降序排列。' },
]
```

运行后只展示最终回答，强调“多轮上下文已携带”。

- [ ] **Step 2: 实现 P3 流式 runner**

P3 通过 `stream: true` 发起请求，并解析 SSE：

```ts
const reader = response.body?.getReader()
const decoder = new TextDecoder()
```

实现要求：

- 按 `data:` 行解析 chunk
- 每拿到文本 delta 就调用 `onOutput`
- 正常结束时标记成功
- 中断或格式错误时保留已输出内容并记录 debug 信息

- [ ] **Step 3: 实现 P10 简化版 ReAct runner**

P10 不做完整命令行脚本搬运，采用“教学型简化链路”：

- 用 system prompt 约束 `Thought / Action / Action Input / Final Answer`
- 在浏览器内维护本地工具注册表：
  - `get_weather`
  - `search_web`
  - `calculate`
- 最多循环 3 次，防止页面陷入无限推理
- 每一步把 `Thought` 和 `Observation` 记录到 debug 区

- [ ] **Step 4: 实现 P18 模型路由 runner**

P18 先在浏览器内做启发式路由：

- 读取预置任务说明
- 根据长度或任务类型选择 `mini / standard / large`
- 将路由决策显示到 debug 区
- 使用用户配置里的 `model` 作为默认主模型；如果要演示 tier，可在 catalog 中为 `P18` 额外配置 `modelCandidates`

要求：第一版重点展示“为什么这样选”，不是完整成本平台。

- [ ] **Step 5: 统一错误处理和运行锁**

所有 runner 共用这些行为：

- 运行中禁用再次点击
- 缺少 `API Key` 时立即阻止运行
- 网络错误、模型错误、SSE 中断统一落到 `errorMessage`
- 调试区保留步骤日志

- [ ] **Step 6: 运行构建验证**

Run: `bun run build`
Expected: `build complete`

## Task 5: 把 Playground 入口接到五个章节页

**Files:**
- Modify: `docs/practice/p01-minimal-agent/index.md`
- Modify: `docs/practice/p02-multi-turn/index.md`
- Modify: `docs/practice/p03-streaming/index.md`
- Modify: `docs/practice/p10-react-loop/index.md`
- Modify: `docs/practice/p18-model-routing/index.md`

- [ ] **Step 1: 统一入口链接格式**

在五个章节页新增“在线运行”入口，链接格式固定为：

```md
/practice/playground/?chapter=<chapter-id>
```

对应映射：

- `P1` -> `p01-minimal-agent`
- `P2` -> `p02-multi-turn`
- `P3` -> `p03-streaming`
- `P10` -> `p10-react-loop`
- `P18` -> `p18-model-routing`

- [ ] **Step 2: 保持正文主线不被改写**

入口文案需明确：

- 在线运行是补充入口
- 本地 `bun run` 仍是标准学习路径

不要删掉现有 `RunCommand` 或命令行指引。

- [ ] **Step 3: 对齐 P1 已有在线运行提示**

`P1` 已经补过“在线运行模式”引导。新增 Playground 入口时，需要避免两段提示互相重复，统一成：

- 读 setup 看整体模式
- 点按钮进入当前章节 Playground

- [ ] **Step 4: 运行类型校验**

Run: `bun run typecheck`
Expected: exit code `0`

## Task 6: 手工验证与收尾

**Files:**
- Modify: `.vitepress/theme/components/practice-playground/*`
- Modify: `docs/practice/playground/index.md`
- Modify: `docs/practice/p01-minimal-agent/index.md`
- Modify: `docs/practice/p02-multi-turn/index.md`
- Modify: `docs/practice/p03-streaming/index.md`
- Modify: `docs/practice/p10-react-loop/index.md`
- Modify: `docs/practice/p18-model-routing/index.md`

- [ ] **Step 1: 跑完整构建**

Run: `bun run build`
Expected: `build complete`

- [ ] **Step 2: 启动本地预览做手工检查**

Run: `bun run dev`
Expected: 输出本地 VitePress 访问地址

手工检查清单：

- `/practice/playground/` 默认落在 `P1`
- `/practice/playground/?chapter=p10-react-loop` 会自动选中 `P10`
- 配置保存后刷新页面仍保留
- 清空配置后 `localStorage` 被移除或重置
- 五个章节入口都能跳到正确章节
- `P3` 输出区能逐步增长，不是最后一次性出现
- `P10` debug 区能看到简化推理链步骤

- [ ] **Step 3: 记录已知限制**

在实现完成后，把以下限制明确留在代码注释或组件说明里：

- 浏览器会直接持有 `API Key`
- 不建议在公共设备上保存
- 第一版只覆盖 5 章
- `P10` 是教学型简化链路，不等价于命令行脚本的完整实现

- [ ] **Step 4: 最终提交**

Run:

```bash
git add docs/practice/playground/index.md \
  .vitepress/theme/components/practice-playground \
  docs/practice/p01-minimal-agent/index.md \
  docs/practice/p02-multi-turn/index.md \
  docs/practice/p03-streaming/index.md \
  docs/practice/p10-react-loop/index.md \
  docs/practice/p18-model-routing/index.md
git commit -m "feat: add practice playground"
```

Expected: commit created successfully

## 备注

- 当前仓库没有现成的前端组件测试框架，本计划默认用 `bun run typecheck`、`bun run build` 和手工浏览器验证作为第一版验收手段。
- 如果实现过程中发现浏览器直连某些兼容接口的 CORS 限制普遍存在，应停止继续扩功能，先回到设计层重新评估“是否需要代理层”。
- 计划依据的设计文档是 `docs/superpowers/specs/2026-03-21-practice-playground-design.md`。

# Practice Playground IDE Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 practice playground 升级为轻量 IDE 风格工作台：header 控制章节与操作、左侧双视图请求模板编辑器、右侧输出/调试双面板、设置弹框管理配置，并继续复用现有五个章节 runner。

**Architecture:** 保留 `/practice/playground/` 独立页和现有章节 runner，但在 UI 与 runner 之间新增“请求模板工厂 + 模板适配器 + 双视图编辑状态”这一层。页面由新的 workspace shell 驱动，旧 sidebar/config/output 卡片式组件逐步被 header/modal/editor/result panel 替换，避免中间态重复状态。

**Tech Stack:** VitePress、Vue 3 `<script setup>`、TypeScript、浏览器 `fetch` / `ReadableStream`、`localStorage`

---

## 文件结构

### 新建文件

- `.vitepress/theme/components/practice-playground/PracticePlaygroundHeader.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundSettingsModal.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundEditor.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundStructuredEditor.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundJsonEditor.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundResultPanel.vue`
- `.vitepress/theme/components/practice-playground/practicePlaygroundTemplates.ts`
- `.vitepress/theme/components/practice-playground/practicePlaygroundTemplateAdapters.ts`

### 修改文件

- `.vitepress/theme/components/practice-playground/PracticePlaygroundShell.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundRunner.vue`
- `.vitepress/theme/components/practice-playground/practicePlaygroundTypes.ts`
- `.vitepress/theme/components/practice-playground/practicePlaygroundCatalog.ts`
- `.vitepress/theme/components/practice-playground/practicePlaygroundStorage.ts`
- `.vitepress/theme/components/practice-playground/practicePlaygroundRunners.ts`
- `docs/practice/p01-minimal-agent/index.md`
- `docs/practice/p02-multi-turn/index.md`
- `docs/practice/p03-streaming/index.md`
- `docs/practice/p10-react-loop/index.md`
- `docs/practice/p18-model-routing/index.md`

### 删除文件

- `.vitepress/theme/components/practice-playground/PracticePlaygroundSidebar.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundConfigPanel.vue`
- `.vitepress/theme/components/practice-playground/PracticePlaygroundOutput.vue`

### 参考文件

- `docs/superpowers/specs/2026-03-21-practice-playground-ide-design.md`
- `docs/superpowers/specs/2026-03-21-practice-playground-design.md`
- `docs/superpowers/plans/2026-03-21-practice-playground-implementation.md`

---

## Task 1: 重建 playground 类型系统与模板契约

**Files:**
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundTypes.ts`
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundCatalog.ts`
- Create: `.vitepress/theme/components/practice-playground/practicePlaygroundTemplates.ts`
- Create: `.vitepress/theme/components/practice-playground/practicePlaygroundTemplateAdapters.ts`

- [ ] **Step 1: 扩展类型定义，落地 spec 中的模板与编辑器接口**

在 `practicePlaygroundTypes.ts` 中新增：

- `PracticeTemplateRole`
- `PracticeTemplateMessage`
- `PracticeTemplateTool`
- `PracticeTemplateRequestOptions`
- `PracticeTemplateMeta`
- `PracticePlaygroundTemplate`
- `PracticeTemplateEditorState`
- `PracticePlaygroundRunnerInput`
- `PracticePlaygroundTemplateViewMode`

保留并兼容现有：

- `PracticePlaygroundConfig`
- `PracticePlaygroundRunState`
- `PracticePlaygroundChapter`

同时新增工具函数：

- `createEmptyPracticePlaygroundTemplate()`
- `createPracticeTemplateEditorState(template)`

- [ ] **Step 2: 在章节目录数据中补齐 IDE 页面需要的元信息**

在 `practicePlaygroundCatalog.ts` 中确保每个章节都具备：

- `id`
- `runner`
- `playground.title`
- `playground.description`

如果当前目录字段不足，按最小必要补充，但不要让 catalog 与模板工厂重复存大量请求体。

- [ ] **Step 3: 创建章节默认模板工厂**

在 `practicePlaygroundTemplates.ts` 中导出：

- `createPracticePlaygroundTemplate(chapter)`

为 `P1 / P2 / P3 / P10 / P18` 分别返回默认模板：

- P1: 单条 user message + 锁定 `get_weather`
- P2: 多轮 messages 历史
- P3: 强制 `stream: true`
- P10: 锁定三种教学工具
- P18: 成本感知 prompt

要求：

- `meta.chapterId`、`meta.runner` 与目录一致
- 每个模板都能序列化成稳定 JSON
- 每个模板都必须是“最小可运行模板”，不要只给概念占位：
  - P1: 1 条 user message
  - P2: 至少 5 条以上多轮历史
  - P3: 1 条 user message + `stream: true`
  - P10: 1 条 user message + 3 个锁定工具
  - P18: 1 条 user message + 成本感知 system

- [ ] **Step 4: 创建模板适配器接口与首版实现**

在 `practicePlaygroundTemplateAdapters.ts` 中导出：

- `adaptPracticeTemplateToRunnerInput(chapter, template, config)`

映射规则必须与 spec 一致：

- `template.system` 非空时，先插入第一条 `role: 'system'`
- 然后按顺序追加 `template.messages`
- `template.tools` 去掉 `locked` UI 字段后再写入 `requestBody.tools`
- `requestOptions.stream -> requestBody.stream`
- `requestOptions.temperature -> requestBody.temperature`
- `requestOptions.maxTokens -> requestBody.max_tokens`
- `requestOptions.toolChoice -> requestBody.tool_choice`

并对章节注入规则做显式处理：

- P3 强制 `stream=true`
- P10 补齐最低教学 ReAct 约束
- P18 注入路由说明 system 提示

同时把注入合并策略写成代码级约束：

- P10 / P18 的教学约束不覆盖用户填写的 `system`
- 统一以“追加一条内部 system message”的方式注入，避免改写用户文本
- 追加前做幂等检查，避免重复注入
- 每次注入都必须写入 debug，如：
  - `系统注入：已追加 ReAct 教学约束`
  - `系统注入：已追加模型路由说明`

- [ ] **Step 5: 基础静态验证**

Run: `bun run build:strict`  
Expected: `check:content` / `check:practice` / `build` 全部通过

---

## Task 2: 搭建新的 workspace shell、header 与设置弹框

**Files:**
- Modify: `.vitepress/theme/components/practice-playground/PracticePlaygroundShell.vue`
- Create: `.vitepress/theme/components/practice-playground/PracticePlaygroundHeader.vue`
- Create: `.vitepress/theme/components/practice-playground/PracticePlaygroundSettingsModal.vue`
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundStorage.ts`
- Delete: `.vitepress/theme/components/practice-playground/PracticePlaygroundSidebar.vue`
- Delete: `.vitepress/theme/components/practice-playground/PracticePlaygroundConfigPanel.vue`

- [ ] **Step 1: 重构 shell 顶层状态**

在 `PracticePlaygroundShell.vue` 中引入并维护：

- `selectedChapterId`
- `playgroundConfig`
- `settingsModalOpen`
- `editorState`
- `runState`
- `lastAppliedTemplate`

要求：

- 首屏从 URL 读取 `chapter`
- 首屏读取 `localStorage` 配置
- 章节切换时装载默认模板
- URL 同步方案在本任务内一起完成，不要推迟到验收阶段：
  - `resolveChapterIdFromLocation()` 负责从 `window.location.search` 读取 `chapter`
  - `replaceChapterQuery(id)` 负责首屏归一化无效 query
  - `pushChapterQuery(id)` 负责用户主动切换章节
  - `popstate` 监听负责浏览器后退 / 前进回放
  - `selectedChapterId` 作为页面唯一章节状态源，URL 仅做同步表示

- [ ] **Step 2: 实现 header 组件**

`PracticePlaygroundHeader.vue` 负责：

- 章节下拉切换
- 当前章节标题
- 轻量配置状态显示
- `设置` / `重置` / `运行` 按钮

事件只通过 `emit` 回传：

- `select-chapter`
- `open-settings`
- `reset-template`
- `run`

运行态按钮职责要在这一任务里定清楚：

- `run` 按钮的禁用状态由 shell 传入
- 运行中按钮文案显示 `运行中...`
- `重置` 和章节切换在运行中仍允许触发，但 shell 会先中断请求再执行后续动作

- [ ] **Step 3: 实现设置弹框组件**

`PracticePlaygroundSettingsModal.vue` 负责：

- `API Key`
- `baseURL`
- `model`
- 显示/隐藏 key
- 保存
- 清空
- 关闭弹框

要求：

- 默认隐藏 API Key
- 不直接触达章节状态
- 保留安全提示文案
- 不允许在任何 UI 中回显完整 API Key

- [ ] **Step 4: 保留现有 localStorage 接口，补齐弹框所需辅助能力**

若 `practicePlaygroundStorage.ts` 现有接口已足够，保持稳定；若不够，只补最小必要：

- `loadPracticePlaygroundConfig`
- `savePracticePlaygroundConfig`
- `clearPracticePlaygroundConfig`

不要引入模板持久化。

- [ ] **Step 5: 删除旧 sidebar / config panel 依赖并让 shell 编译通过**

在 shell 中移除：

- `PracticePlaygroundSidebar`
- `PracticePlaygroundConfigPanel`

确保页面改为：

- header
- 主体双栏
- settings modal

- [ ] **Step 6: 构建验证**

Run: `bun run build:strict`  
Expected: `check:content` / `check:practice` / `build` 全部通过

---

## Task 3: 实现左侧双视图请求模板编辑器

**Files:**
- Create: `.vitepress/theme/components/practice-playground/PracticePlaygroundEditor.vue`
- Create: `.vitepress/theme/components/practice-playground/PracticePlaygroundStructuredEditor.vue`
- Create: `.vitepress/theme/components/practice-playground/PracticePlaygroundJsonEditor.vue`
- Modify: `.vitepress/theme/components/practice-playground/PracticePlaygroundShell.vue`
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundTypes.ts`

- [ ] **Step 1: 实现 editor 容器组件**

`PracticePlaygroundEditor.vue` 负责：

- 视图切换：`structured | json`
- 顶部 dirty 提示
- 顶部“不持久化提示”：`改动仅在当前标签页有效`
- JSON 错误提示
- 统一把更新后的 `editorState` 回传给 shell

- [ ] **Step 2: 实现结构化编辑视图**

`PracticePlaygroundStructuredEditor.vue` 至少支持编辑：

- `system`
- `messages`
- `tools`（仅允许可编辑字段）
- `requestOptions`

要求：

- `messages` 支持新增/删除/修改
- locked 工具字段以只读方式展示
- 对 P1 / P10 的锁定工具名不可编辑

- [ ] **Step 3: 实现 JSON 视图**

`PracticePlaygroundJsonEditor.vue` 负责：

- 展示 `jsonText`
- 编辑原始 JSON
- 提供格式化按钮
- 展示解析错误

同步规则必须严格按 spec：

- JSON 成功解析才更新 `template`
- JSON 非法时保留原文本，不覆盖 `template`

- [ ] **Step 4: 在 shell 中落地双视图状态同步**

需要实现：

- 从结构化视图切到 JSON 视图时，用 `template` 重新序列化
- JSON 非法时，切回结构化视图仍展示最后有效模板
- 重置时同时重置 `template` 与 `jsonText`

- [ ] **Step 5: 针对锁定工具与非法 JSON 增加可运行前校验**

在 shell 或 editor 层实现运行前校验：

- `jsonError` 非空时禁止运行
- locked 工具校验不能依赖用户编辑后的 `locked` 字段，而要以“章节默认模板中的锁定规则”作为权威基准
- 至少覆盖以下非法情况：
  - 修改 locked 工具的 `function.name`
  - 修改 locked 工具的顶层 `type`
  - 删除 locked 工具
  - 在 JSON 视图中移除 `locked` 标记并试图绕过限制
- 推荐算法：
  - 从 `createPracticePlaygroundTemplate(chapter)` 取得默认模板
  - 提取默认模板中所有 locked 工具签名 `(name, type)`
  - 对当前 `template.tools` 做 diff
  - 任一 locked 签名缺失或变更则禁止运行
- 提示文案必须明确指出：本章本地工具实现固定，不能改工具名、类型或删除锁定工具

- [ ] **Step 6: 类型验证**

Run: `bun run build:strict`  
Expected: `check:content` / `check:practice` / `build` 全部通过

---

## Task 4: 重构 runner 协调层并接入模板适配器

**Files:**
- Modify: `.vitepress/theme/components/practice-playground/PracticePlaygroundRunner.vue`
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundRunners.ts`
- Modify: `.vitepress/theme/components/practice-playground/PracticePlaygroundShell.vue`
- Modify: `.vitepress/theme/components/practice-playground/practicePlaygroundTypes.ts`

- [ ] **Step 1: 让 runner 组件从“预置示例卡片”转为纯执行协调层**

删除 `PracticePlaygroundRunner.vue` 中当前的视觉示例卡片职责，保留：

- 运行态创建
- request token 串线保护
- `AbortController`
- `emit('update:runState')`

可以将该组件变成无模板组件，或保留极薄包装；关键是视觉布局从 runner 中剥离。

- [ ] **Step 2: runner 执行入口改为接收标准 runner input**

将 `runPracticePlaygroundChapter(...)` 的输入改造成支持：

- `chapter`
- `config`
- `runnerInput`
- `signal`
- `onDebug`
- `onOutput`

并在内部使用 `runnerInput.requestBody` 代替固定预置 prompt。

- [ ] **Step 3: 逐章接入模板驱动**

确保：

- P1 使用模板中的 messages / tools
- P2 使用模板中的多轮 messages
- P3 使用模板生成流式 request body
- P10 保留教学型 debug 输出，同时接受模板中的 user 问题与工具说明文本
- P18 保留路由 debug，同时接受模板中的用户 prompt

- [ ] **Step 4: 明确运行中中断行为**

在 shell 与 runner 协同实现：

- 再次运行前中断旧请求
- 切章节时中断请求并重置状态
- 重置时中断请求并恢复默认模板
- 页面卸载时中断请求

调试区要写入明确中断文案。

同时明确职责：

- shell 负责：
  - 章节切换 / 重置 / 运行事件编排
  - 更新 header 所需按钮状态
  - 触发中断旧请求
- runner 协调层负责：
  - 真正执行请求
  - 维护 `requestToken` / `AbortController`
  - 追加中断和失败 debug 文案

- [ ] **Step 5: 复用并保留既有关键边界能力**

不能回退当前已有能力：

- `requestToken` 防串线
- `AbortController`
- P3 SSE event block 解析
- P10 `Action Input` 容错解析

- [ ] **Step 6: 构建验证**

Run: `bun run build:strict`  
Expected: content / practice checks pass，最终 `build complete`

---

## Task 5: 实现右侧结果双面板并移除旧输出卡片

**Files:**
- Create: `.vitepress/theme/components/practice-playground/PracticePlaygroundResultPanel.vue`
- Modify: `.vitepress/theme/components/practice-playground/PracticePlaygroundShell.vue`
- Delete: `.vitepress/theme/components/practice-playground/PracticePlaygroundOutput.vue`

- [ ] **Step 1: 实现结果面板组件**

`PracticePlaygroundResultPanel.vue` 负责：

- 上半区输出
- 下半区调试
- 顶部轻量请求摘要
- 输出复制按钮

请求摘要字段固定为：

- `model`
- `baseURL`
- `hasApiKey`
- `durationMs`

安全要求：

- 不能显示完整 API Key
- 只能显示 `hasApiKey` 布尔状态

- [ ] **Step 2: 定义输出与调试的展示规则**

输出区：

- 使用等宽字体
- `white-space: pre-wrap`
- 流式输出自动滚动到底部

调试区：

- 顺序保留
- 显示 `Thought / Action / Observation`
- 错误时高亮 `errorMessage`
- P10 / P18 的系统注入说明也必须显示在调试区

- [ ] **Step 3: 在 shell 中用结果面板替换旧输出组件**

移除 `PracticePlaygroundOutput` 的引用，接入 `PracticePlaygroundResultPanel`。

- [ ] **Step 4: 构建验证**

Run: `bun run build:strict`  
Expected: `check:content` / `check:practice` / `build` 全部通过

---

## Task 6: 更新章节入口与文档说明

**Files:**
- Modify: `docs/practice/p01-minimal-agent/index.md`
- Modify: `docs/practice/p02-multi-turn/index.md`
- Modify: `docs/practice/p03-streaming/index.md`
- Modify: `docs/practice/p10-react-loop/index.md`
- Modify: `docs/practice/p18-model-routing/index.md`

- [ ] **Step 1: 将五个章节入口改为默认新开标签页**

入口统一具备：

- `href="/practice/playground/?chapter=<id>"`
- `target="_blank"`
- `rel="noopener noreferrer"`

不要删除现有本地命令行主线。

- [ ] **Step 2: 调整文案，明确这是 IDE 风格在线工作台**

文案从“在线 Playground”可适度调整为：

- 在线运行工作台
- 浏览器工作台

但不要改变用户已熟悉的主要导航语义。

- [ ] **Step 3: 运行内容检查**

Run: `bun run build:strict`  
Expected: `check:content` / `check:practice` / `build` 全部通过

---

## Task 7: 整体验证与人工验收

**Files:**
- Reference: `docs/superpowers/specs/2026-03-21-practice-playground-ide-design.md`
- Reference: `.vitepress/theme/components/practice-playground/*`
- Reference: `docs/practice/p0*.md`

- [ ] **Step 1: 运行完整静态校验**

Run: `bun run typecheck`  
Expected: exit code `0`

Run: `bun run build:strict`  
Expected: `check:content` / `check:practice` / `build` 全部通过

- [ ] **Step 2: 启动本地预览**

Run: `bun run preview -- --host 127.0.0.1 --port 4173`  
Expected: 本地预览启动

- [ ] **Step 3: 人工验证核心路径**

重点验证：

- `/practice/playground/` 默认打开 P1
- `?chapter=p10-react-loop` 自动装载 P10 模板
- header 下拉切章节后 URL 同步更新
- 章节入口默认新开标签页
- 设置弹框保存 / 清空本地配置正常
- 编辑器顶部明确显示“改动仅在当前标签页有效”
- 左侧结构化编辑改动后可以运行
- 切到 JSON 视图能看到同一份模板
- JSON 非法时禁止运行
- JSON 非法时切回结构化视图仍显示最后有效模板
- JSON 视图格式化按钮可用，错误提示尽量包含行列号
- 运行中切章节会中断
- 运行中点击重置会中断并恢复默认模板
- P3 输出区逐步增长
- P10 调试区保留 `Thought / Action / Observation`
- 请求摘要只显示 `model / baseURL / hasApiKey / durationMs`，不泄露 API Key
- 浏览器后退 / 前进时章节同步正确

- [ ] **Step 4: 提交实现**

Run:

```bash
git add .vitepress/theme/components/practice-playground \
  docs/practice/p01-minimal-agent/index.md \
  docs/practice/p02-multi-turn/index.md \
  docs/practice/p03-streaming/index.md \
  docs/practice/p10-react-loop/index.md \
  docs/practice/p18-model-routing/index.md \
  docs/superpowers/plans/2026-03-21-practice-playground-ide-implementation.md
git commit -m "feat: redesign practice playground ide"
```

Expected: commit created

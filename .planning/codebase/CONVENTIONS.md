# Coding Conventions

**Analysis Date:** 2026-03-21

## Naming Patterns

**Files:**
- Markdown 章节使用 `index.md` 作为目录入口，目录名承担路由语义，例如 `docs/08-http-api-server/index.md`
- Vue 组件使用 `PascalCase.vue`，例如 `RunCommand.vue`、`PlanningTreeDemo.vue`
- composable 使用 `useXxx.ts`
- 实践脚本使用 `pNN-topic.ts`，按教程顺序编号

**Functions:**
- TypeScript/Vue 内部函数统一 `camelCase`
- 事件处理/交互函数偏好动词命名，如 `copy()`、`play()`、`restart()`
- 异步函数不额外加 `async` 前缀，例如 `runAgent`

**Variables:**
- 普通变量与常量多数使用 `camelCase`
- 真正常量会使用 `UPPER_SNAKE_CASE`，例如实践脚本中配置类常量
- 组件 props 常命名为 `props`，响应式状态常用 `ref(...)`

**Types:**
- TypeScript interface/type 采用 `PascalCase`
- Props 类型集中到 `.vitepress/theme/components/types.ts`
- 不使用 `IUser` 这类 `I` 前缀接口命名

## Code Style

**Formatting:**
- 全仓库 TypeScript/Vue 普遍使用单引号、无分号、2 空格缩进
- 对象/数组/参数尾逗号常见于多行结构
- 代码风格更接近 Prettier 默认输出，但仓库中未发现显式 `.prettierrc`

**Linting:**
- 未发现 ESLint 配置文件
- 现有质量门槛主要依赖 `tsc` 和自定义内容检查脚本
- 构建前严格检查入口是 `package.json` 中的 `build:strict`

## Import Organization

**Order:**
1. 外部依赖
2. 类型导入或 Vue API
3. 相对路径内部模块

**Grouping:**
- 通常按逻辑分组，但没有强制的排序工具痕迹
- `import type` 被实际使用，例如 `.vitepress/theme/index.ts`

**Path Aliases:**
- 未发现自定义路径别名
- 主要使用相对路径，如 `./components/RunCommand.vue`、`../components/types`

## Error Handling

**Patterns:**
- CLI/脚本层以 fail-fast 为主，错误通过 `console.error` 输出并设置退出码
- 交互组件对非关键失败做静默降级，例如复制失败时仅忽略
- 实践脚本常在最外层 `.catch(...)` 中统一处理异常

**Error Types:**
- 未发现自定义 Error 类体系
- 大部分代码直接抛出原生异常或依赖 Promise rejection
- 校验脚本在检测失败时直接 `process.exit(1)`

## Logging

**Framework:**
- 仓库级日志工具不存在
- 主要使用 `console.log` / `console.error`

**Patterns:**
- 构建与校验脚本输出中文、面向作者可读的诊断信息
- 实践脚本输出教学型日志，例如 `Tool call:`、`Tool result:`
- 文档站组件很少做运行时日志打印

## Comments

**When to Comment:**
- 组件和脚本里会写“为什么要这样做”的注释
- 注释语言以中文为主，偶尔有英文技术说明
- 明显逻辑通常不写冗余注释

**JSDoc/TSDoc:**
- 未形成统一的 JSDoc 体系
- 类型定义更多依赖 TypeScript interface 直接表达

**TODO Comments:**
- 仓库通过 `scripts/check-content.mjs` 明确阻止 `TODO` / `FIXME` / `TBD` 残留进入文档
- 这说明项目对“未收口内容”有硬性约束

## Function Design

**Size:**
- 组件与 composable 倾向中小函数，复杂页面逻辑拆为多个独立组件
- 实践脚本允许出现较长教学型函数，但仍以“单文件可读”为目标

**Parameters:**
- 参数较少时直接列出；结构复杂时使用对象与类型注解
- 组件 props 用 `defineProps` + `withDefaults`

**Return Values:**
- 常用早返回降低嵌套深度
- composable 以对象形式返回状态和方法，例如 `useDemoPlayer`

## Module Design

**Exports:**
- Vue 组件多为默认导出
- TypeScript 工具和 composable 更偏好命名导出
- 类型定义集中导出，供多个组件共享

**Barrel Files:**
- 未见大规模 barrel file 体系
- 主题层通过 `.vitepress/theme/index.ts` 做集中注册，而不是目录级 re-export

---
*Convention analysis: 2026-03-21*
*Update when patterns change*

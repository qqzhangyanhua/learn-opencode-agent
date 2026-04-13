# 编码约定

**分析日期：** 2026-04-13

## 命名模式

**文件：**
- Markdown 章节目录使用编号 + kebab-case，例如 `docs/14-testing-quality/index.md`
- 实践代码使用 `pNN-topic.ts`，例如 `practice/p10-react-loop.ts`
- Vue 组件使用 PascalCase，例如 `.vitepress/theme/components/PracticeProjectGuide.vue`
- 校验脚本统一使用 `check-*.mjs`

**函数：**
- 普通函数使用 camelCase，例如 `parseFrontmatter()`、`buildSearchPrelude()`
- 带“构建/解析/规范化”语义的函数前缀比较稳定，如 `build*`、`parse*`、`normalize*`、`resolve*`
- 组件内事件/辅助函数一般也是 camelCase，例如 `difficultyLabel()`

**变量与常量：**
- 局部变量使用 camelCase
- 常量与枚举样式集合常用 UPPER_SNAKE_CASE，例如 `CONTENT_TYPES`、`SECTION_ORDER`
- 配置对象常用全大写常量名 + `satisfies` 约束

**类型：**
- 类型别名、接口统一 PascalCase，例如 `LearningContentFrontmatter`、`PracticeProjectDefinition`
- 不使用 `I` 前缀接口命名

## 代码风格

**格式：**
- 2 空格缩进
- 单引号
- 省略分号
- 对象/数组/链式调用格式较紧凑，延续 Vite/Vue 社区常见风格

**类型风格：**
- 广泛使用 TypeScript 字面量联合、`as const`、`satisfies`
- 主题数据模块倾向先声明类型，再声明数据常量

## 导入组织

**顺序习惯：**
1. 外部包
2. 类型导入或框架导入
3. 本地相对路径导入
4. 样式导入通常放在组件导入之后

**路径策略：**
- 当前主要使用相对路径
- 未看到统一别名如 `@/`

## 错误处理

**脚本层：**
- 校验脚本倾向“收集问题后统一失败”
- 常见模式：累积 `issues`，最后 `console.error(...)` 并 `process.exit(1)`

**主题数据层：**
- 对不应发生的缺失值直接抛错，例如 `discovery-content.ts` 中未找到内容时 `throw new Error`

**实践示例：**
- 命名上已把错误处理作为独立主题，例如 `practice/p04-error-handling.ts`
- 说明仓库鼓励把错误恢复机制作为教学内容显式呈现

## 日志与输出

**脚本：**
- 使用 `console.log` 报成功
- 使用 `console.error` 报失败明细

**站点层：**
- 未见统一日志库
- 交互组件更偏展示型，不依赖后端日志体系

## 注释

**总体习惯：**
- 注释相对克制，更多依赖命名表达意图
- 需要时更偏解释“为什么”，例如 `.vitepress/config.mts` 中对 `lottie-web` 的 `eval` 告警做解释性注释

**文档注释：**
- 面向读者的中文说明非常充分
- 代码文件中中文注释并不泛滥，但仓库整体中文语境很强

## 函数与模块设计

**函数设计：**
- 倾向小函数拆分，便于在脚本中顺序组合
- 纯函数较多，尤其出现在 frontmatter 解析、数据转换与标签构建场景

**模块设计：**
- 数据模块负责声明式配置与派生逻辑
- 组件模块主要负责表现层
- 校验脚本模块直接面向任务，无额外服务层抽象

## 导出约定

- 数据模块多使用具名导出，同时保留 `default` 导出供 VitePress data loader 消费
- 主题入口文件使用默认导出 `Theme`
- Vue 组件由 `.vitepress/theme/index.ts` 统一全局注册

## 风格锚点文件

- `.vitepress/config.mts`
- `.vitepress/theme/index.ts`
- `.vitepress/theme/data/content-meta.ts`
- `scripts/check-content.mjs`
- `.vitepress/theme/components/PracticeProjectGuide.vue`

---
*约定分析：2026-04-13*
*新增 lint/format 工具或切换代码风格后应更新*

# 面试专区折叠区轻样式设计稿

## 背景

面试专区的 7 个分类页已经完成第一步阅读减负：

- `深答版` 改为默认折叠
- `题目`
- `面试官想听什么`
- `短答版`
- `追问方向`

继续保持直接可见

当前结构已经达成主要目标，但折叠区还处在“功能可用、视觉较素”的状态。接下来只做一层非常轻的样式整理，让读者更容易识别折叠入口，不把页面做成组件化卡片。

## 目标

在不改变现有文档气质的前提下，让 `深答版` 折叠入口更顺手、更稳定：

- `summary` 更容易被识别成可展开入口
- 折叠区和上下内容之间的间距更自然
- 展开后的内容边界更清楚，但不形成卡片感

## 核心判断

这是一个值得做的小修边，但只能做“收边”，不能做“重设计”。

不值得做的方向：

- 给折叠区加整块背景卡片
- 做明显的 hover 动画
- 引入新的组件或专属容器
- 扩展到全站所有 `<details>`

原因：

- 用户已经明确不接受复杂视觉
- 当前问题不是缺少视觉系统，而是折叠入口略微生硬
- 一旦把 `details` 做得太像组件，会破坏面试页作为文档页的连续阅读感

## 方案对比

### 方案 A：更克制

只调整：

- `summary` 的字重
- `summary` 上下留白
- `summary` 的可点击提示
- 展开区与正文的弱间距

优点：

- 风险最低
- 最贴近当前文档气质
- 不容易过度设计

缺点：

- 层级提升有限

### 推荐方案

采用方案 A。

## 设计细则

### 作用范围

样式只作用在面试专区页面中的折叠区，不影响全站其他文档页的 `details`。

本次所说的 interview 页面，仅指以下 7 个分类页：

- `docs/interview/fundamentals/index.md`
- `docs/interview/tools/index.md`
- `docs/interview/memory/index.md`
- `docs/interview/planning/index.md`
- `docs/interview/rag/index.md`
- `docs/interview/multi-agent/index.md`
- `docs/interview/engineering/index.md`

作用域必须基于稳定、可验证的 interview 页面级锚点收敛。

本次实现的唯一允许作用域锚点是：

- 为上述 7 个页面统一补一个 frontmatter `pageClass`

固定值为：

- `interview-details-page`

不得依赖构建后可能变化的匿名类名或模糊子串匹配作为唯一作用域依据。

禁止使用会命中全站 Markdown 文档区的通用选择器，例如：

- `.VPDoc .vp-doc details`
- `.VPDoc .vp-doc summary`

### 允许调整的项目

只允许以下 CSS 属性级调整：

- `summary`: `font-weight: 600`
- `summary`: `padding-block: 0.125rem`
- `summary`: `cursor: pointer`
- `details`: `margin-block: 0.25rem`
- `details[open] > summary + *`: `margin-top: 0.25rem`

除以上属性外，不得修改：

- `color`
- `font-size`
- `line-height`
- `border`
- `background`
- `border-radius`
- `transition`
- `transform`
- `opacity`

### 禁止调整的项目

禁止以下样式：

- 自定义或替换原生 marker
- 隐藏默认 disclosure affordance
- 新增背景面板
- 圆角卡片
- `box-shadow`
- 粗边框
- 装饰性左边线
- 伪元素图标
- 动画驱动的展开反馈
- 与正文风格明显割裂的组件外观
- 全局 markdown `details` / `summary` 覆盖

## 技术方向

在 `.vitepress/theme/custom.css` 内追加一小段 interview 专属样式。

实现原则：

- 选择器范围尽量窄
- 样式量尽量少
- 使用 frontmatter `pageClass: interview-details-page` 作为唯一作用域锚点
- 不回头改 Markdown 结构
- 保留原生 `<details><summary>` 行为和默认 disclosure 语义

## 验收标准

完成后应满足：

- interview 页面中的 `summary` 明确设置了 `font-weight: 600`
- interview 页面中的 `summary` 明确设置了 `padding-block: 0.125rem` 和 `cursor: pointer`
- interview 页面中的 `details` 明确设置了 `margin-block: 0.25rem`
- interview 页面中的 `details[open] > summary + *` 明确设置了 `margin-top: 0.25rem`
- 展开区仍然保持原生文档样式，不新增背景面板、边框、阴影或装饰线
- 抽查以下 2 个非 interview 文档页中已有 `details`，确认样式无变化：
  - `docs/intermediate/25-rag-failure-patterns/index.md`
  - `docs/intermediate/26-multi-agent-collaboration/index.md`
- 最终 CSS 选择器不会命中全站通用文档页的 `details` / `summary`
- 最终改动仅限 `.vitepress/theme/custom.css`，以及为收敛作用域所需的最小 page-level 标识；不改 Markdown 结构、不加新组件
- 最终 CSS 只包含 interview 页作用域下的 `details` / `summary` 规则，不新增全局 `details`、`summary` 选择器

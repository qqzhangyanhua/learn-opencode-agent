# Phase 1: 学习路径与元数据基础 - Research

**Researched:** 2026-03-21
**Domain:** VitePress 内容建模、构建期数据聚合、学习路径信息架构
**Confidence:** MEDIUM

## Summary

当前仓库已经有足够多的内容资产，但“学习路径、内容分类、前置关系、推荐顺序、理论/实践/中级篇定位”主要散落在 `docs/reading-map.md`、`docs/practice/index.md`、首页组件和 `.vitepress/config.mts` 的手写结构里，而不是来自统一数据源。`docs/index.md` 依赖 `LearningPath.vue` 和 `PracticePreview.vue` 手写展示双轨学习体系，`docs/reading-map.md` 又重复维护路线 A-E 与理论/实践/中级映射，`docs/practice/index.md` 则单独维护实践分期、章节矩阵和运行索引；这些信息已经开始重复且存在未来漂移风险。

VitePress 官方已经提供适合本 phase 的标准能力：页面 frontmatter、`useData()` 运行时读取、以及 build-time data loader / `createContentLoader()` 构建期聚合。对这个仓库来说，正确方向不是引入数据库或新框架，而是把 `docs/**/index.md` 作为内容真源，把学习结构相关字段写入 frontmatter，在构建期生成统一的内容索引、路径索引和导航输入，再让 Vue 组件只负责展示。

Phase 1 的成败不在于“先做出一张漂亮的路径页”，而在于是否建立一套后续 Phase 2-5 都能复用的数据骨架。如果这一步继续沿用手写数组、Markdown 表格和组件 props，首页改版、实践篇重构、搜索类型识别和章节模板标准化都会重复返工。

**Primary recommendation:** 以 `docs/**/index.md + frontmatter` 为内容真源，在 `.vitepress/theme/data/*.data.ts` 中建立统一 loader 聚合层，并让首页/路径页/实践入口组件全部改为消费同一份聚合数据。

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IA-02 | 用户可以按学习目标选择路线，而不是只能按目录顺序阅读全部内容 | 需要建立 `learningPath` / `audience` / `goal` / `order` / `recommendedStart` 等结构化字段，并在 build-time 生成路径页和入口卡片数据。 |
| IA-03 | 用户可以明确区分理论篇、实践篇和中级篇各自的定位与推荐进入方式 | 需要统一 `contentType`、`series`、`entryMode`、`roleDescription` 字段，并在首页、路径页、板块首页中复用同一套定义。 |
| DISC-02 | 用户可以访问按目标组织的学习路径页，并获得清晰的推荐阅读顺序 | 需要单独的路径模型与路径页数据 loader，按目标输出有序章节/实践/专题序列，而不是只依赖 sidebar 顺序。 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| VitePress | 1.6.4 latest, repo currently `^1.5.0` | 静态站点、frontmatter、custom theme、data loader | 官方直接支持 build-time data loader、`createContentLoader()`、frontmatter 和自定义主题，正好覆盖本 phase 需求。 |
| Vue 3 via VitePress theme runtime | bundled with VitePress | 组件展示层 | 组件已广泛存在于 `.vitepress/theme/components/*`，适合消费聚合后的只读数据。 |
| TypeScript | repo currently `^5.8.2` | 元数据类型定义、loader 转换逻辑 | 当前主题层和脚本层已使用 TypeScript，适合先把信息模型类型固定下来。 |
| Markdown frontmatter | built-in | 内容级元数据真源 | 最接近章节内容本身，适合承载稳定、页面专属、人工维护的语义字段。 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `createContentLoader()` | VitePress built-in | 扫描 `docs/**/index.md` 并聚合 frontmatter | 需要列表页、路径页、推荐模块、跨板块映射时使用。 |
| `useData()` | VitePress runtime API | 在 Vue 组件中读取当前页 `frontmatter` / `page` / `theme` | 章节模板、路径卡片、页面局部推荐模块需要读当前页元信息时使用。 |
| `transformPageData()` | VitePress config hook | 补充页面级派生字段、SEO 元信息 | 适合统一注入 head 或轻量派生字段，不适合承载全站内容图谱。 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `frontmatter + createContentLoader()` | 单独维护 `JSON/YAML` 内容注册表 | 会引入第二真源，brownfield 迁移时最容易与实际 Markdown 漂移。 |
| build-time 聚合 | 在 Vue 组件里手写数组 / props | 当前仓库已经证明这会导致首页、阅读地图、实践页三处重复维护。 |
| 构建期统一索引 | 继续把课程结构写在 `.vitepress/config.mts` sidebar | sidebar 只适合导航输出，不适合作为学习图谱真源。 |

**Installation:**
```bash
# Phase 1 不需要新增依赖
# 可继续使用仓库现有 vitepress / typescript / vue 组合
```

**Version verification:** 官方 npm registry 当前 `vitepress` 最新稳定版是 `1.6.4`；仓库仍锁定在 `^1.5.0`。Phase 1 不依赖 2.0 alpha 特性，因此无需为本 phase 升级，只要按 1.x 官方 loader/runtime API 设计即可。

## Architecture Patterns

### Recommended Project Structure
```text
.vitepress/
├── config.mts                     # 仅保留站点配置与轻量 page transform
└── theme/
    ├── data/
    │   ├── content-index.data.ts  # 全站内容聚合
    │   ├── learning-paths.data.ts # 学习路径聚合
    │   └── content-meta.ts        # 元数据类型与常量
    ├── components/
    │   ├── LearningPath.vue
    │   ├── PracticePhaseGrid.vue
    │   └── ...                    # 只消费聚合数据，不再内置课程数组
    └── index.ts
docs/
├── index.md                       # 首页，消费聚合后的入口数据
├── learning-paths/
│   ├── index.md                   # 路径总览页
│   └── beginner-engineer.md       # 可选：具体路径页，后续 phase 可扩展
├── practice/index.md              # 消费实践聚合数据
├── intermediate/index.md          # 消费中级篇聚合数据
└── **/index.md                    # 每章 frontmatter 成为唯一内容真源
```

### Pattern 1: 章节 / 实践 / 路径三层模型
**What:** 把“内容实体”和“学习路径”分开建模。章节、实践、专题是可复用内容节点；学习路径是由节点组成的有序序列。

**When to use:** 需要同时支持“按目录浏览”和“按目标走路径”时。

**Recommended metadata split:**

| Layer | Entity | Recommended stable fields |
|------|--------|---------------------------|
| Content Node | theory / practice / intermediate / support | `contentType`, `series`, `slug`, `title`, `shortTitle`, `summary`, `status`, `difficulty`, `estimatedTime`, `prerequisites`, `learningGoals`, `practiceLinks`, `relatedTopics`, `searchTags`, `navigationLabel`, `pathOrder` |
| Relationship | content-to-content | `recommendedNext`, `recommendedPrev`, `bridgesTo`, `requires`, `complements` |
| Learning Path | goal-oriented path | `pathId`, `title`, `audience`, `goal`, `whyThisPath`, `entryCriteria`, `steps[]`, `outcomes`, `cta` |

**Canonical rule:** 章节 frontmatter 只描述“本页是什么”；学习路径文件或路径 loader 负责描述“为什么按这个顺序串起来”。

**Example:**
```ts
// Source: VitePress official data loading + runtime API
type ContentType = 'theory' | 'practice' | 'intermediate' | 'support'

interface ChapterFrontmatter {
  contentType: ContentType
  series: 'book' | 'practice' | 'intermediate'
  shortTitle: string
  summary: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
  learningGoals: string[]
  prerequisites: string[]
  recommendedNext?: string[]
  practiceLinks?: string[]
  searchTags?: string[]
  navigationLabel?: string
  pathOrder?: number
}

interface LearningPathStep {
  id: string
  contentRef: string
  reason: string
}

interface LearningPath {
  pathId: string
  title: string
  audience: string[]
  goal: string
  entryCriteria: string[]
  steps: LearningPathStep[]
}
```

### Pattern 2: frontmatter 只放稳定、页面专属、可人工维护的语义字段
**What:** 将 frontmatter 视为“页面元信息合同”，不把全站统计、跨页面聚合结果和 UI 表现细节直接塞进去。

**When to use:** 每个 `docs/**/index.md` 页面都需要被后续路径页、搜索、推荐模块统一消费时。

**Should live in frontmatter:**
- 页面身份：`contentType`、`series`、`slug`、`shortTitle`
- 学习语义：`summary`、`learningGoals`、`prerequisites`、`difficulty`、`estimatedTime`
- 轻量关系：`recommendedNext`、`practiceLinks`、`relatedTopics`
- 展示标签：`searchTags`、`navigationLabel`

**Should NOT live in frontmatter:**
- 全站计数，如“共有 23 个项目”
- 自动生成的板块列表、章节矩阵、阶段小计
- 同一信息的冗余副本，如路径页里已经定义的顺序又在每页重复写整条路径
- 明显的 UI 文案碎片，如卡片颜色、图标名、按钮排列

### Pattern 3: build-time loader 负责统一聚合、校验和派生
**What:** 使用 `.data.ts` 文件把 frontmatter 扫描成 `contentIndex`、`practicePhaseIndex`、`learningPathIndex`、`crossLinkIndex` 等只读数据。

**When to use:** 需要全站列表、推荐顺序、按目标组织的路径页、跨板块映射、未来搜索增强时。

**Recommended derived outputs:**
- `contentIndex`: 所有内容节点的标准化索引
- `pathIndex`: 所有学习路径及其有序步骤
- `sectionIndex`: 理论 / 实践 / 中级篇板块级入口信息
- `dependencyGraph`: 前置关系与“下一步推荐”图
- `searchMeta`: 内容类型标签、别名、主题词

**Example:**
```ts
// Source: https://vitepress.dev/guide/data-loading
import { createContentLoader } from 'vitepress'

export default createContentLoader(['**/index.md', '!index.md'], {
  transform(rawPages) {
    const contentNodes = rawPages
      .map(normalizeFrontmatter)
      .filter(isCoreLearningContent)

    return {
      contentNodes,
      byType: groupByContentType(contentNodes),
      bySeries: groupBySeries(contentNodes),
      dependencyGraph: buildDependencyGraph(contentNodes)
    }
  }
})
```

### Pattern 4: Vue 组件只负责展示，不再持有课程真数据
**What:** 把 `LearningPath.vue`、`PracticePhaseGrid.vue` 这类组件改造成“接收 props 或 import loader data 的纯展示组件”。

**When to use:** 组件被首页、路径页、板块首页重复使用时。

**Local evidence:** 当前 `LearningPath.vue` 直接内嵌完整路径数组，`PracticePhaseGrid.vue` 则依赖调用方手写 phases props；这种混合模式会让 Phase 2 首页和 Phase 4 实践篇继续重复维护。

### Anti-Patterns to Avoid
- **把 sidebar 当成学习路径真源：** `.vitepress/config.mts` 的 `sidebar` 适合导航，不适合表达目标导向路径、前置关系和跨板块映射。
- **在 Markdown 正文中埋结构化语义：** 如 `docs/00-what-is-ai-agent/index.md` 里“学习目标 / 前置知识 / 阅读时间”仍是正文 blockquote，不是可聚合数据。
- **组件内硬编码课程数组：** 当前 `LearningPath.vue` 的阶段数组就是典型重复源。
- **把实践矩阵仅保存在单个 landing page：** `docs/practice/index.md` 的章节矩阵、分期、依赖表若不外提，后续 practice 页与搜索无法复用。

## Content Modeling Recommendation

### 1. 章节 / 实践 / 路径元数据该如何建模

**推荐原则：**
1. “内容节点”和“路径节点”分离。
2. 每个 `index.md` 只负责自己的稳定元数据。
3. 跨页面顺序、映射、聚合都在 loader 中完成。

**推荐最小字段集：**

| Field | Applies to | Why needed |
|------|------------|------------|
| `contentType` | all core pages | 支撑 IA-03、DISC-03，区分理论 / 实践 / 中级 / 辅助页 |
| `series` | all core pages | 解决板块归属，如 `book` / `practice` / `intermediate` |
| `shortTitle` | all core pages | 用于导航、卡片、搜索结果，避免长标题过重 |
| `summary` | all core pages | 用于路径卡片、板块入口、搜索摘要 |
| `difficulty` | theory/practice/intermediate | 首页路径卡和实践矩阵都需要统一难度层级 |
| `estimatedTime` | theory/practice | 支撑后续章节模板标准化 |
| `learningGoals` | theory/practice/intermediate | 支撑 CHAP-01 与路径解释 |
| `prerequisites` | theory/practice/intermediate | 支撑 CHAP-02 与路径依赖图 |
| `recommendedNext` | theory/practice/intermediate | 支撑 CHAP-03 与路径串联 |
| `practiceLinks` | theory pages | 支撑 PRAC-03 看完就练 |
| `theoryLinks` | practice pages | 支撑理论回链 |
| `searchTags` | all core pages | 支撑后续搜索类型化与别名 |
| `phase` / `pathOrder` | practice / optional theory | 支撑稳定排序，避免仅按文件名推断 |

**路径模型不要挂在每章 frontmatter 里整条复制**，而应单独维护为：
- `learning-paths.data.ts` 中的静态路径定义
- 或 `docs/learning-paths/*.md` 的 frontmatter + loader 混合模型

对于本仓库，**推荐先用单独路径定义文件**，因为路径是产品层编排，不完全等同于内容本身。

### 2. 哪些能力最适合放在 frontmatter / data loader / Vue 组件

| Layer | 适合放什么 | 当前仓库中的典型目标 |
|------|------------|----------------------|
| frontmatter | 页面真源、稳定语义、单页关系 | `docs/00-what-is-ai-agent/index.md` 的学习目标、前置、阅读时间；`docs/practice/p01-minimal-agent/index.md` 的难度、时长、前置、标签 |
| build-time data loader | 全站索引、排序、聚合、跨板块映射、校验 | 首页双轨入口、阅读地图路线、实践分期矩阵、理论-实践-中级映射、后续搜索类型元数据 |
| Vue 组件 | 纯展示、交互、过滤器、当前页 contextual UI | `LearningPath.vue`、`PracticePhaseGrid.vue`、未来的 PathHero、ChapterMetaCard、NextStepCard |

**明确边界：**
- frontmatter 不做统计。
- loader 不做视觉。
- 组件不保存课程真数据。

### 3. Phase 1 应优先碰哪些文件与目录

**优先级 1：定义元数据合同和 loader 基础设施**
- `.vitepress/theme/components/types.ts`
- 新增 `.vitepress/theme/data/content-meta.ts`
- 新增 `.vitepress/theme/data/content-index.data.ts`
- 新增 `.vitepress/theme/data/learning-paths.data.ts`

**优先级 2：把核心页面从硬编码改为消费聚合数据**
- `docs/index.md`
- `.vitepress/theme/components/LearningPath.vue`
- `.vitepress/theme/components/PracticePreview.vue`
- `docs/practice/index.md`
- `.vitepress/theme/components/PracticePhaseGrid.vue`
- `docs/intermediate/index.md`

**优先级 3：先接入少量高代表性内容页，验证模型**
- `docs/00-what-is-ai-agent/index.md`
- `docs/01-agent-basics/index.md`
- `docs/03-tool-system/index.md`
- `docs/04-session-management/index.md`
- `docs/practice/p01-minimal-agent/index.md`
- `docs/practice/p10-react-loop/index.md`
- `docs/intermediate/27-planning-mechanism/index.md`

**优先级 4：最后收敛导航配置**
- `.vitepress/config.mts`

原因很直接：如果先改 `.vitepress/config.mts` 的 nav/sidebar，而元数据层还没建立，后续仍然要二次返工。

### 4. 先避开的结构性错误

#### Pitfall 1: 把“文件树顺序”误当“学习顺序”
**What goes wrong:** 章节顺序被文件命名和 sidebar 顺序绑死，无法支持目标导向路径。
**Why it happens:** 当前理论篇和实践篇都大量依赖路径名与手写导航顺序。
**How to avoid:** 引入显式 `pathOrder` / `phase` / `recommendedNext`，路径顺序由 loader 决定。
**Warning signs:** 路径页内容一改，sidebar、首页卡片、阅读地图要同步手改三处以上。

#### Pitfall 2: 在多个页面重复维护同一映射关系
**What goes wrong:** 理论-实践-中级映射分别存在于 `docs/index.md`、`docs/reading-map.md`、`docs/practice/index.md`、`docs/intermediate/index.md`。
**Why it happens:** 当前没有聚合层，所有入口页都自带一份局部事实。
**How to avoid:** 让 loader 生成统一 `crossLinkIndex`，入口页只渲染。
**Warning signs:** 修改一个章节名称或入口链接后，至少 3 个页面需要人工同步。

#### Pitfall 3: 把结构化学习信息写在正文 blockquote / 表格中
**What goes wrong:** 章节模板能显示，但首页、路径页、搜索和推荐模块无法复用。
**Why it happens:** 当前 `docs/00-what-is-ai-agent/index.md` 的“学习目标 / 前置知识 / 阅读时间”仍是正文文字。
**How to avoid:** 先把这些字段 frontmatter 化，再由组件消费。
**Warning signs:** 需要用正则从 Markdown 正文反向解析学习信息。

#### Pitfall 4: 组件持有业务数据，页面再传另一份数据
**What goes wrong:** 组件内建静态数组，页面外又写 props，数据边界混乱。
**Why it happens:** 当前 `LearningPath.vue` 内嵌数组，而 `PracticePhaseGrid.vue` 依赖页面传数组。
**How to avoid:** 统一为“loader -> 页面/容器 -> 展示组件”或“loader -> 组件”，二选一并保持一致。
**Warning signs:** 同类组件有的硬编码、有的传参，难以抽象。

#### Pitfall 5: 过早追求“全量 metadata 一步到位”
**What goes wrong:** 一开始试图给所有章节补齐几十个字段，实施成本过高。
**Why it happens:** brownfield 仓库内容多，字段设计容易膨胀。
**How to avoid:** Phase 1 只要求最小可复用字段集，先覆盖能支撑 IA-02 / IA-03 / DISC-02 的核心字段。
**Warning signs:** 计划还没开始就需要批量修改 40+ 页面。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown 内容扫描 | 自写目录遍历 + frontmatter 解析器 | `createContentLoader()` | 官方已支持 Markdown 扫描、缓存和构建期导出。 |
| 当前页元数据读取 | 自定义全局状态层 | `useData()` / `$frontmatter` | 当前页数据是 VitePress runtime 原生能力。 |
| 站内内容索引 | 把课程结构继续写成组件常量 | `.data.ts` loader | 更适合全站复用与后续搜索增强。 |
| 学习路径排序 | 依赖文件名排序和 sidebar 顺序 | 显式路径模型 + loader transform | 学习路径是产品编排，不是文件系统副产物。 |

**Key insight:** 本 phase 的复杂度不在解析 Markdown，而在于稳定定义“什么是内容节点、什么是路径节点、哪些关系必须显式化”。官方能力足够，真正不该手搓的是内容扫描与运行时状态层。

## Code Examples

Verified patterns from official sources:

### 构建期聚合内容索引
```ts
// Source: https://vitepress.dev/guide/data-loading
import { createContentLoader } from 'vitepress'

export default createContentLoader('**/index.md', {
  transform(rawPages) {
    return rawPages
      .map((page) => ({
        url: page.url,
        ...page.frontmatter
      }))
      .filter((page) => page.contentType && page.series)
  }
})
```

### 在组件中读取当前页 frontmatter
```vue
<!-- Source: https://vitepress.dev/reference/runtime-api -->
<script setup lang="ts">
import { useData } from 'vitepress'

const { page, frontmatter } = useData()
</script>

<template>
  <header>
    <h1>{{ page.title }}</h1>
    <p>{{ frontmatter.summary }}</p>
  </header>
</template>
```

### 用 transformPageData 做轻量页面派生
```ts
// Source: VitePress config hook documentation pattern
export default {
  transformPageData(pageData) {
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push([
      'meta',
      { property: 'og:title', content: pageData.title }
    ])
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 纯手写导航/索引页 | `frontmatter + createContentLoader()` | VitePress 1.x 官方稳定提供 | 内容型站点可以在不引入后端的前提下建立统一元数据层。 |
| 页面只依赖正文文本 | 当前页 `frontmatter` + `useData()` | VitePress runtime API | 章节模板和页面组件可以直接消费结构化字段。 |

**Deprecated/outdated:**
- 继续把课程结构全部硬编码在 `.vitepress/config.mts` 或 Vue 组件里：对本仓库的后续五个 phase 都是不稳定基础。

## Open Questions

1. **学习路径定义放在单独路径文件还是纯代码常量更合适？**
   - What we know: 章节级元数据必须留在 frontmatter；路径本身是产品编排层。
   - What's unclear: 是否希望后续用 Markdown 页面直接编辑路径文案。
   - Recommendation: Phase 1 先用 `learning-paths.data.ts` 的 typed constant 定义路径，等路径页稳定后再决定是否上升为 `docs/learning-paths/*.md` 内容页。

2. **是否在 Phase 1 就重构 sidebar 生成逻辑？**
   - What we know: 当前 `.vitepress/config.mts` sidebar 是最大重复源之一。
   - What's unclear: 是否希望本 phase 就把理论 / 实践 / 中级篇导航完全数据化。
   - Recommendation: Phase 1 先让首页、路径页、实践首页吃新数据；sidebar 只做低风险对齐，完整导航重构留给 Phase 2。

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | none for automated unit/integration tests |
| Config file | none — current repo only has content and practice validation scripts |
| Quick run command | `bun run typecheck` |
| Full suite command | `bun run build:strict` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IA-02 | 路径页按学习目标输出有序内容，不只按目录顺序 | smoke + content validation | `bun run build:strict` | ✅ existing scripts, ❌ dedicated metadata checks |
| IA-03 | 理论 / 实践 / 中级篇定位与进入方式可以统一识别 | smoke + manual visual verification | `bun run build:strict` | ❌ Wave 0 |
| DISC-02 | 存在按目标组织的学习路径页并能正确渲染顺序 | smoke + manual route verification | `bun run build:strict` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run typecheck`
- **Per wave merge:** `bun run build:strict`
- **Phase gate:** `bun run build:strict` + 手工验证首页 / 路径页 / 实践首页的结构一致性

### Wave 0 Gaps
- [ ] `scripts/check-learning-metadata.mjs` — 校验核心 frontmatter 字段完整性与枚举合法性
- [ ] `scripts/check-learning-paths.mjs` — 校验路径步骤引用存在、顺序合法、无循环依赖
- [ ] `tests/` or equivalent automated rendering checks — 当前仓库没有页面级自动化测试基础设施
- [ ] 对 `contentType` / `series` / `recommendedNext` / `practiceLinks` 建立 schema-like 校验，否则 build 只能发现页面缺失，不能发现元数据错误

## Sources

### Primary (HIGH confidence)
- `/vuejs/vitepress` - queried for build-time data loading, `createContentLoader`, `useData`, custom theme runtime behavior
- https://vitepress.dev/guide/data-loading - checked loader naming, `watch`, `createContentLoader`, `transform`, `includeSrc`, `render`, `excerpt`
- https://vitepress.dev/reference/runtime-api - checked `useData()`, `PageData`, `$frontmatter`, runtime page metadata access
- https://registry.npmjs.org/vitepress/latest - checked latest stable version `1.6.4`

### Secondary (MEDIUM confidence)
- Local repository inspection:
  - `.vitepress/config.mts`
  - `docs/index.md`
  - `docs/reading-map.md`
  - `docs/practice/index.md`
  - `docs/intermediate/index.md`
  - `.vitepress/theme/components/LearningPath.vue`
  - `.vitepress/theme/components/PracticePhaseGrid.vue`
  - `docs/00-what-is-ai-agent/index.md`
  - `docs/practice/p01-minimal-agent/index.md`
  - `.vitepress/theme/components/types.ts`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 基于 VitePress 官方文档和 npm registry 直接核验
- Architecture: MEDIUM - 官方能力明确，但具体内容模型是结合当前仓库结构做的设计推断
- Pitfalls: HIGH - 可由本地重复源和当前 hardcode 结构直接观察

**Research date:** 2026-03-21
**Valid until:** 2026-04-20

## Planning Implications

1. **Plan 01-01 应只做“信息模型 + 校验基础设施”，不要同时改首页。**
   - 输出物应包括统一 TypeScript 类型、frontmatter 字段清单、最小 schema 校验脚本、以及少量代表性页面的元数据接入。

2. **Plan 01-02 应只做“loader 聚合层 + 路径页基础页”，不要立刻重构所有导航。**
   - 输出物应包括 `content-index.data.ts`、`learning-paths.data.ts`、路径总览页，以及能从聚合数据渲染的基础组件。

3. **Plan 01-03 应聚焦“把现有核心内容接入新体系”，优先覆盖代表性板块。**
   - 至少覆盖理论篇起始章节、实践篇起始章节、中级篇导读与首页/实践首页，让 IA-02、IA-03、DISC-02 可以闭环验证。

4. **不要把 sidebar 全量数据化放进本 phase 主路径。**
   - 这会把 Phase 1 变成半个 Phase 2。当前更重要的是统一数据源，而不是一次性重写所有导航体验。

5. **验证标准必须新增“元数据正确性”维度。**
   - 仅靠现有 `check:content` 和 `check:practice` 不足以保障后续首页 / 搜索 / 实践重构；planner 应明确安排 metadata 校验脚本作为 Wave 0 或第一批任务。

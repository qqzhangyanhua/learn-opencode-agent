# Phase 3: 章节学习体验标准化 - Research

**Researched:** 2026-03-22  
**Domain:** 章节页学习结构、frontmatter 复用、理论 / 实践 / 中级统一阅读体验  
**Confidence:** MEDIUM

## Summary

现有代码库已经具备 Phase 3 所需的核心数据条件：

- 理论、实践和中级篇的关键页面 frontmatter 已经包含 `learningGoals`、`prerequisites`、`recommendedNext`、`practiceLinks`、`estimatedTime`、`entryMode`
- `content-index.data.ts` 已经可以把页面聚合成统一索引
- Phase 2 已把首页、导航和关键入口页做成产品化分流入口

但章节页本身仍然存在明显缺口：

- 学习目标、前置知识、预计投入时间大多只是零散 blockquote 或根本没有统一渲染
- 理论 / 实践 / 中级三类章节写法不一致
- `recommendedNext` 和 `practiceLinks` 还停留在 frontmatter，没有真正形成底部推荐关系
- “读完这一章要做什么”没有稳定的练习闭环

因此 Phase 3 的最佳方向不是再改导航或内容数据模型，而是：

1. 新增少量章节组件
2. 统一读取 frontmatter 和内容索引
3. 在首批高价值章节里验证模板化结构

**Primary recommendation:** 保持现有 markdown 正文结构不动，仅在页首插入 `ChapterLearningGuide.vue`、在页尾插入 `ChapterActionPanel.vue` 一类组件，让章节页具备统一学习摘要和行动闭环。

## Requirements Mapping

| Requirement | Research support |
|-------------|------------------|
| CHAP-01 | 章节页顶部需要稳定显示学习目标、适合人群、预计投入时间 |
| CHAP-02 | 章节页顶部需要稳定显示前置知识或推荐先读内容 |
| CHAP-03 | 章节页底部需要把 `recommendedNext` 变成真正可点击的下一步推荐 |
| CHAP-04 | 章节页底部需要出现明确练习、任务或实践入口，不再只停在“继续阅读” |

## Existing Assets To Reuse

- `.vitepress/theme/data/content-meta.ts`
- `.vitepress/theme/data/content-index.data.ts`
- `.vitepress/theme/components/ProjectCard.vue`
- `.vitepress/theme/components/EntryContextBanner.vue`
- `docs/00-what-is-ai-agent/index.md`
- `docs/01-agent-basics/index.md`
- `docs/03-tool-system/index.md`
- `docs/04-session-management/index.md`
- `docs/practice/p01-minimal-agent/index.md`
- `docs/practice/p10-react-loop/index.md`
- `docs/intermediate/27-planning-mechanism/index.md`

## Product Gaps Observed

### Chapter Header

- frontmatter 有结构化字段，但正文层没有统一消费
- 理论篇常用 blockquote，实践篇常用 `ProjectCard`，中级篇则是手写说明段
- 用户进入章节后，无法稳定看到“这章为什么现在读”

### Chapter Footer

- `recommendedNext` 和 `practiceLinks` 没有被真正渲染成行动区
- 章节之间缺少明确跨板块跳转
- “练习 / 行动任务”多数停留在隐式建议，而不是明确卡片

### Scope Control

- 当前只需要 7 个样板章节，不应一次修改整本书
- 不应重开全局 metadata 合同，否则会扩大 Phase 3 风险

## Recommended Phase 3 Architecture

### New / strengthened UI units

- `ChapterLearningGuide.vue`：章节顶部学习摘要卡
- `ChapterActionPanel.vue`：章节底部下一步与练习闭环卡
- `chapter-experience.ts` 或等价 helper：把 frontmatter 和内容索引转换成章节 UI 所需结构

### Pages to update

- `docs/00-what-is-ai-agent/index.md`
- `docs/01-agent-basics/index.md`
- `docs/03-tool-system/index.md`
- `docs/04-session-management/index.md`
- `docs/practice/p01-minimal-agent/index.md`
- `docs/practice/p10-react-loop/index.md`
- `docs/intermediate/27-planning-mechanism/index.md`

### Design rule

Phase 3 只改“章节学习结构”，不重写章节正文，不提前进入 Phase 4 的实践页课程平台改造。

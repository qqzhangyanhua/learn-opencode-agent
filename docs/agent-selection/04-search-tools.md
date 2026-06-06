---
title: 搜索工具选型
description: 判断 Tavily、Exa、Brave Search API、SerpAPI、Perplexity、Firecrawl、Jina Reader、Provider Web Search、MCP 搜索和自建搜索的适用边界。
contentType: support
series: support
contentId: agent-selection-search-tools
shortTitle: 搜索工具选型
summary: 搜索工具解决实时外部信息获取，但不自动解决可信度、引用、冲突和成本问题。
difficulty: intermediate
estimatedTime: 25 分钟
learningGoals:
  - 区分搜索、抓取、网页读取和答案生成
  - 判断不同搜索工具适合的 Agent 场景
  - 理解搜索结果的来源过滤、冲突处理和引用输出
prerequisites:
  - 了解 Agent 工具调用
  - 了解 RAG 与搜索的区别
  - 了解基本 Web Search 场景
recommendedNext:
  - /agent-selection/05-composition-patterns
  - /agent-selection/06-selection-checklist
  - /practice/p14-mcp/
practiceLinks:
  - /practice/p14-mcp/
  - /practice/p18-model-routing/
  - /practice/p20-observability/
searchTags:
  - 搜索工具
  - Tavily
  - Exa
  - Brave Search API
  - Firecrawl
navigationLabel: 搜索工具选型
entryMode: bridge
roleDescription: 适合需要给 Agent 接入实时网页、官方文档、外部资料或搜索 API 时阅读。
---

<ChapterLearningGuide />

## 搜索解决什么

搜索工具解决的是动态外部信息，不是私有知识治理。

适合搜索的场景：

- 最新官方文档；
- 新版本发布说明；
- 新闻、论坛、博客；
- 开放网页事实；
- 需要多来源交叉验证的问题；
- 用户明确要求“当前”“最新”“最近”。

搜索结果不是答案。搜索只给候选来源，后面还要做来源过滤、正文读取、去重、冲突检测、摘要和引用。

## 搜索链路

```text
查询改写
  -> 搜索候选
  -> 来源过滤
  -> 网页读取
  -> 去重和时间过滤
  -> 可信度评分
  -> 冲突检测
  -> 摘要和引用输出
```

## 工具对比

| 方案 | 适合 | 优点 | 风险 |
| --- | --- | --- | --- |
| 自建搜索 | 企业内网、私域资料、权限系统 | 权限、排序、日志、合规可控 | 抓取、索引、反垃圾、更新成本高 |
| Tavily | Agent 联网搜索、研究型问答 | 面向 AI Agent，结果和内容更易消费 | 排序和来源策略不可完全控 |
| Exa | 语义搜索、相似页面、研究发现 | 适合语义发现和内容检索 | 不等于传统 SERP |
| Brave Search API | 通用网页搜索、独立索引 | 独立 web index，可控性较好 | 摘要、重排、引用要自己做 |
| SerpAPI | Google、Bing、地图、购物等 SERP | 垂类覆盖广，结构化结果丰富 | 搜索引擎依赖和成本明显 |
| Perplexity / Sonar | 搜索 + 答案一体化 | 快速问答体验好 | 可控性弱于裸搜索 API |
| Firecrawl | scrape、crawl、map、extract | 适合把网页转成 LLM 可读文档 | 不是传统搜索引擎 |
| Jina Reader | URL 转 Markdown、轻量网页读取 | 简单，适合作为 reader | 需要配搜索源 |
| Provider Web Search | Claude、OpenAI 等平台内置搜索 | 集成快，引用和工具链统一 | provider 锁定 |
| MCP 搜索工具 | 已采用 MCP 的 Agent 系统 | 协议统一，方便接多个服务 | server 质量、认证、权限要审计 |

## 怎么选

| 场景 | 推荐方向 |
| --- | --- |
| 企业内部资料 | 自建搜索 + 权限过滤 |
| 快速联网 Agent | Tavily / Brave Search API |
| 研究型语义发现 | Exa |
| 传统 SERP 或 Google 垂类 | SerpAPI |
| 搜索答案一体化 | Perplexity / Sonar |
| 站点抓取和文档抽取 | Firecrawl + Jina Reader |
| Claude / OpenAI 平台内产品 | Provider Web Search / server tools |
| MCP-first Agent | MCP 搜索工具 |

## 搜索和 RAG 的边界

| 问题 | RAG | Search |
| --- | --- | --- |
| 数据是否私有 | 是 | 通常不是 |
| 是否需要权限过滤 | 强依赖 | 视场景而定 |
| 是否实时变化 | 不适合高频变化 | 适合 |
| 是否可治理 | 高 | 低到中 |
| 是否需要引用 | 必须 | 必须 |
| 是否适合离线评估 | 适合 | 较难，因为结果变化 |

## 搜索工具的生产要求

不要只看“能不能搜到”。生产系统要看：

- 是否能限制来源域名；
- 是否能拿到网页正文；
- 是否能输出稳定引用；
- 是否能控制时间范围；
- 是否能缓存结果；
- 是否有失败降级；
- 是否记录 query、来源、摘要和最终答案；
- 是否能处理来源冲突。

搜索解决实时性，但不自动解决可信度。可信度是系统设计问题，不是搜索 API 的赠品。

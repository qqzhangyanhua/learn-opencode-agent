---
title: 搜索 API、Reader、Crawler、Browser 工具怎么选
description: 对比 Tavily、Exa、SerpAPI、Brave Search、Bing、Jina Reader、Firecrawl、Crawl4AI、Scrapy、Apify、Playwright、Puppeteer、Selenium、BeautifulSoup、Cheerio、Scrapling 等工具的适用场景。
contentType: support
series: support
contentId: agent-selection-search-reader-crawler-browser-tools
shortTitle: 搜索抓取工具选型
summary: Search、Reader、Crawler、Browser 和 Scraper 是不同层级；能用官方 API 就不要抓网页，能用 Search + Reader 就不要开浏览器。
difficulty: intermediate
estimatedTime: 30 分钟
learningGoals:
  - 区分 Search API、Reader、Crawler、Browser Automation 和 Scraper 的边界
  - 判断研究型 Agent、实时问答、站点索引、网页抽取和登录交互场景该用什么工具
  - 避免用浏览器自动化解决本该由 API、搜索或静态解析解决的问题
prerequisites:
  - 已了解搜索工具选型
  - 已了解研究型 Agent 的基本链路
recommendedNext:
  - /agent-selection/04-search-tools
  - /agent-selection/12-research-agent-selection
  - /agent-selection/24-browser-crawl-search
practiceLinks:
  - /practice/p09-hybrid-retrieval/
searchTags:
  - Search API
  - Web Reader
  - Crawler
  - Browser Automation
  - Scraper
navigationLabel: 搜索抓取工具选型
entryMode: bridge
roleDescription: 适合为研究型 Agent、实时信息问答、网页资料库和浏览器自动化工具链做选型时阅读。
---

<ChapterLearningGuide />

> 说明：本文是截至 2026-06 的选型图谱，不是实时排名。产品能力、价格、配额、托管区域、开源协议和集成方式会变化，采购或上线前请以官方文档、价格页、版本说明和业务样本评测为准。

## 阅读定位

这篇是网页信息获取工具图谱，重点比较 Tavily、Exa、SerpAPI、Jina Reader、Firecrawl、Crawl4AI、Scrapy、Playwright 等具体工具。如果你还没设计搜索链路、来源过滤和冲突处理，先看 [搜索工具选型](/agent-selection/04-search-tools)。如果你还没分清 Search、Reader、Crawler、Browser 在系统里怎么分工，先看 [浏览器自动化、网页抓取、搜索 API 怎么分工](/agent-selection/24-browser-crawl-search)。

## 这个类别解决什么

网页信息获取不是一个工具能解决的事。至少有五层：

```text
Search API
  -> 找到候选 URL

Reader / Fetch
  -> 读取单个网页正文

Crawler
  -> 批量遍历站点并抽取页面

Browser Automation
  -> 打开浏览器执行登录、点击、表单、截图

Scraper / Parser
  -> 从 HTML 或 DOM 中抽取结构化字段
```

选错层级，系统会又慢又贵，还更难维护。

## 主流选择有哪些

| 类别 | 方案 | 本质 | 强项 | 代价 | 适合场景 | 不适合场景 |
| --- | --- | --- | --- | --- | --- | --- |
| Search API | Tavily | 面向 AI 应用的搜索/抽取 API | 接入快，适合 Agent 搜索链路 | 依赖外部服务，结果质量要评测 | 研究型 Agent、实时问答 | 强自建搜索、数据不能外发 |
| Search API | Exa | 神经搜索 / Web 搜索 API | 语义搜索、找相似网页 | 成本和覆盖要评测 | 研究、资料发现、相似来源查找 | 需要传统搜索完全覆盖 |
| Search API | SerpAPI | 搜索结果页 API | 能取搜索引擎结果结构 | 成本、合规和依赖搜索引擎 | SERP 分析、搜索结果聚合 | 深度网页正文读取 |
| Search API | Brave Search API | 独立搜索 API | 通用网页搜索，接入直接 | 覆盖和排序要实测 | 通用实时信息搜索 | 需要网页正文抽取 |
| Search API | Bing / Google Custom Search | 搜索引擎 API | 覆盖广，生态成熟 | 配额、成本、结果控制有限 | 通用搜索、企业已有云生态 | 精细化内容抽取 |
| Reader | Jina Reader | URL 转可读文本 | 快速读取网页正文 | 动态页面和复杂结构有限 | 单页读取、摘要、引用 | 登录态、复杂交互 |
| Reader / Crawler | Firecrawl | 抓取、读取、站点 crawl | 面向 AI 的网页抽取和爬取 | 外部服务、成本和限制要评估 | 文档站抓取、网页资料库 | 强内网、强自建要求 |
| Reader | Tavily Extract | 搜索后网页抽取 | 和搜索链路组合方便 | 覆盖和抽取质量要测 | 搜索 + 阅读一体化 | 大规模自建 crawler |
| Crawler | Crawl4AI | 面向 LLM 的开源 crawler | 自托管、适合 AI 内容抽取 | 需要运维和反爬处理 | 文档站、站点资料库 | 简单单页读取 |
| Crawler | Scrapy | 通用爬虫框架 | 稳定、可扩展、工程成熟 | 开发和维护成本高 | 大规模结构化爬取 | 快速 Agent 原型 |
| Crawler / Platform | Apify | 爬虫和自动化平台 | actor 生态、托管执行 | 成本和平台绑定 | 批量采集、现成 actor | 强自建、敏感数据 |
| Browser | Playwright | 浏览器自动化 | 现代、稳定、支持多浏览器 | 慢、资源重、维护复杂 | 登录、点击、截图、动态页面 | 静态网页读取 |
| Browser | Puppeteer | Chrome 自动化 | Chrome 生态成熟 | 浏览器资源成本 | Chrome 页面自动化 | 多浏览器要求 |
| Browser | Selenium | 老牌浏览器自动化 | 跨浏览器、企业测试生态 | API 和维护成本较高 | 企业测试体系、遗留系统 | 轻量网页读取 |
| Scraper | BeautifulSoup | Python HTML 解析 | 简单、稳定 | 不执行 JS | 静态 HTML 抽取 | 动态页面 |
| Scraper | Cheerio | Node.js HTML 解析 | 类 jQuery，轻量 | 不执行 JS | Node 静态网页解析 | 登录和复杂交互 |
| Scraper | Scrapling | 抓取和解析工具 | 面向复杂抓取场景 | 需要按目标站点验证 | 结构化抽取、反爬复杂场景 | 普通搜索问答 |

## 先按任务选层级

| 任务 | 优先工具 | 不要先做什么 |
| --- | --- | --- |
| 找最新资料或候选来源 | Search API | 不要直接 crawler 全网 |
| 读取一个公开网页正文 | Reader / Web Fetch | 不要开浏览器 |
| 把一个文档站建成资料库 | Crawler | 不要每次问答实时抓全站 |
| 抽取商品价格、列表、表格 | Scraper / Crawler | 不要让 LLM 直接猜字段 |
| 需要登录、点击、表单、截图 | Browser Automation | 不要用静态 fetch 硬抓 |
| 有官方 API | 官方 API | 不要抓网页 |

## Search API 什么时候用

Search API 负责找候选来源，不负责保证网页正文可读。

适合：

- 最新信息；
- 官方文档发现；
- 新闻、版本、公告；
- 研究型 Agent 的第一步；
- 需要多个来源交叉验证。

不适合：

- 已知 URL 的正文读取；
- 批量站点索引；
- 登录后页面；
- 结构化字段抽取。

Search API 的输出要保留 URL、标题、摘要、时间和来源。没有来源的搜索结果不能进入研究型 Agent 的结论。

## Reader 什么时候用

Reader 负责把一个 URL 转成模型可读的正文。

适合：

- 已有候选 URL；
- 读取官方文档页面；
- 搜索后深读；
- 生成摘要和引用；
- 公开静态网页。

不适合：

- 需要登录；
- 页面靠复杂 JS 渲染；
- 需要点击才能出现内容；
- 需要批量遍历站点；
- 需要精确结构化字段。

## Crawler 什么时候用

Crawler 适合批量构建资料库，不适合每次问答临时跑。

适合：

- 文档站索引；
- 企业公开资料库；
- 帮助中心和 FAQ；
- 需要定期同步；
- 需要去重、版本和增量更新。

不适合：

- 用户只问一个实时问题；
- 来源范围不明确；
- 没有 robots、频率和合规策略；
- 不准备做数据治理。

Crawler 输出应该进入 RAG 数据治理流程，而不是直接塞给 LLM。

## Browser Automation 什么时候用

浏览器自动化是最重的方案。只有需要真实交互时才用。

适合：

- 登录后页面；
- 点击、筛选、分页；
- 表单填写；
- 截图验证；
- 前端 UI 测试；
- 动态页面必须执行 JS 才有内容。

不适合：

- 普通网页读取；
- 搜索候选 URL；
- 静态 HTML 解析；
- 高频低成本任务；
- 能用官方 API 的场景。

一句话：能不用浏览器，就别用浏览器。

## Scraper 什么时候用

Scraper 适合结构化抽取，不是研究总结工具。

适合：

- 商品列表；
- 价格；
- 表格；
- 排名；
- 评论字段；
- 固定 HTML 结构。

不适合：

- 开放研究；
- 不稳定页面；
- 需要复杂判断的资料综合；
- 来源质量未知的事实问答。

## 怎么选

```text
有官方 API？
  -> 官方 API 优先

要找来源？
  -> Search API

已有 URL，要读正文？
  -> Reader / Web Fetch

要建站点资料库？
  -> Crawler

要抽结构化字段？
  -> Scraper

要登录、点击、截图？
  -> Browser Automation

要研究型 Agent？
  -> Search API + Reader + 引用检查

要长期知识库？
  -> Crawler + Parser + RAG 数据治理
```

## 典型误判

| 误判 | 问题 |
| --- | --- |
| Browser 最强，所以默认用 Browser | 慢、贵、脆弱，维护成本高 |
| Search API 返回摘要就能回答 | 摘要不是完整来源，关键事实要 Reader 深读 |
| Crawler 抓完就能问答 | 还需要 parser、chunk、metadata、版本和权限 |
| 官方 API 和网页抓取等价 | API 更稳定、更合规、更结构化 |
| 让 LLM 从 HTML 里猜字段 | 结构化抽取应该用 parser / scraper 明确规则 |
| 每次问答都实时抓全站 | 延迟和成本会失控 |

## 工具候选评测表

```text
工具名称：
工具层级：Search / Reader / Crawler / Browser / Scraper
目标场景：
输入和输出：
是否保留来源 URL：
是否支持时间过滤和域名限制：
是否支持正文抽取和批量 crawl：
是否需要登录态：
部署方式和成本：
主要失败模式：
合规限制：
是否进入生产候选：是 / 否 / 仅 POC
```

工具进候选表前，先证明它解决的是正确层级的问题。

## 最小推荐

| 场景 | 推荐 |
| --- | --- |
| 实时问答 | Search API + Reader |
| 研究型 Agent | Search API + Reader + 多来源引用 |
| 文档站知识库 | Crawler + Parser + RAG pipeline |
| 商品/列表抽取 | Scraper / Crawler |
| 登录后操作 | Playwright / Puppeteer |
| 企业已有 API | 官方 API + Tool Calling |
| 强自建爬虫 | Scrapy / Crawl4AI / Playwright 组合 |

## 最终判断

```text
找来源：Search API
读正文：Reader
批量建库：Crawler
抽字段：Scraper
要交互：Browser
有 API：别抓网页
```

工具越重，越应该晚引入。先用最轻的工具解决真实问题。

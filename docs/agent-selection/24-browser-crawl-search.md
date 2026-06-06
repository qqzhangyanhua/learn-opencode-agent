---
title: 浏览器自动化、网页抓取、搜索 API 怎么分工
description: 判断搜索 API、网页 Reader、Crawler、Browser Automation 和站点地图在 Agent 中各自适合什么任务。
contentType: support
series: support
contentId: agent-selection-browser-crawl-search
shortTitle: 浏览器、抓取、搜索
summary: 搜索找来源，Reader 读正文，Crawler 批量抓站点，浏览器自动化处理交互页面。
difficulty: intermediate
estimatedTime: 25 分钟
learningGoals:
  - 区分 Search API、Reader、Crawler 和 Browser Automation
  - 判断动态网页、登录页面和批量采集的技术路径
  - 识别抓取合规、成本和稳定性风险
prerequisites:
  - 已了解搜索工具选型
  - 已了解研究型 Agent 选型
recommendedNext:
  - /agent-selection/12-research-agent-selection
  - /agent-selection/23-mcp-tool-selection
  - /practice/p14-mcp/
practiceLinks:
  - /practice/p14-mcp/
  - /practice/p20-observability/
searchTags:
  - 浏览器自动化
  - 网页抓取
  - Search API
  - Reader
  - Crawler
navigationLabel: 浏览器、抓取、搜索
entryMode: bridge
roleDescription: 适合给 Agent 接入网页搜索、网页读取、站点抓取和浏览器操作时阅读。
---

<ChapterLearningGuide />

## 四类能力

| 能力 | 作用 | 不适合 |
| --- | --- | --- |
| Search API | 找候选网页 | 读取完整正文 |
| Reader | 单页转文本 | 发现网页 |
| Crawler | 批量抓站点 | 处理复杂交互 |
| Browser Automation | 登录、点击、表单、截图 | 大规模搜索 |

不要用浏览器自动化替代搜索 API。浏览器最重，应该留给必须交互的页面。

## 重量级从低到高

```text
Search API
  -> URL Reader
  -> Site Crawler
  -> Browser Automation
```

每升级一层，成本、延迟和不稳定性都会上升。选型时应该从最轻能力开始。

## 推荐链路

```text
Search
  -> Source Filter
  -> Reader
  -> Optional Browser
  -> Summary + Citation
```

只有当 Reader 读不到正文、页面依赖交互、或需要截图验证时，才升级到浏览器自动化。

## 典型任务怎么拆

同一个“联网查询”需求，背后可能是不同任务：

| 任务 | 正确拆法 |
| --- | --- |
| 查某个政策是否有更新 | Search 找来源，Reader 读官方页面 |
| 总结某家公司公开资料 | Search 多来源，Reader 读取，按来源汇总 |
| 同步一个文档站 | Sitemap 或 Crawler 批量抓取 |
| 检查后台某个订单状态 | 优先官方 API，没有 API 再用 Browser |
| 验证页面按钮是否存在 | Browser screenshot 或 DOM 检查 |

如果需求没有先拆清楚，很容易把所有问题都交给浏览器自动化，最后得到一个慢、不稳定、难维护的系统。

## 技术边界

| 问题 | 不要用 | 应该用 |
| --- | --- | --- |
| 找相关网页 | Browser | Search API |
| 读公开文章正文 | Browser | Reader |
| 批量同步文档站 | Search | Crawler |
| 登录后台查数据 | Search | 官方 API；没有稳定 API 再用 Browser |
| 验证页面视觉状态 | Reader | Browser screenshot |

浏览器自动化更像最后手段，不是通用联网能力。

## 什么时候必须用浏览器

先确认是否有官方 API。只有 API 不存在、不覆盖目标行为，或页面行为本身是任务对象时，浏览器才是合理选择：

- 登录后页面没有稳定 API；
- 内容必须通过点击、滚动或筛选才能出现；
- 需要上传文件或填写表单；
- 需要验证页面视觉状态；
- 需要复现用户操作路径；
- 需要处理前端渲染后的最终 DOM。

即便如此，也要限制浏览器动作范围。浏览器 Agent 不应该自由浏览整个互联网，而应该拿到明确 URL、允许操作列表、超时、截图和审计记录。

## 怎么选

| 场景 | 推荐 |
| --- | --- |
| 查最新资料 | Search API |
| 读取一个 URL | Reader |
| 批量导入官方文档 | Crawler |
| 登录后台查询 | 官方 API；没有稳定 API 再用 Browser Automation |
| 填表执行操作 | Browser Automation + 人工确认 |
| 结构化网页抽取 | Crawler / Extractor |

如果目标系统有官方 API，优先 API。浏览器自动化是兼容手段，不是首选系统集成方式。

## 抓取合规和更新策略

Crawler 不是把网页全部抓下来就结束。生产系统至少要定义：

- 抓取范围；
- 更新频率；
- robots 和服务条款；
- 去重规则；
- 正文抽取规则；
- 失败重试；
- 过期内容清理；
- 来源时间戳。

研究型 Agent 可以临时读取网页；知识库型 Agent 需要可重复的抓取和索引流程。两者不要混在一起，否则答案可能引用到过期页面，也无法解释资料什么时候进入系统。

## 风险

- 反爬和访问限制；
- 登录态泄露；
- 页面结构变化；
- 成本和延迟高；
- 动态内容读取失败；
- 抓取合规问题；
- 来源时间不稳定。

这些风险要进入 trace。否则搜索类 Agent 出错时很难复盘。

## 上线检查

上线前检查：

- 是否优先使用官方 API；
- Search、Reader、Crawler、Browser 是否分层；
- 是否限制浏览器可访问域名；
- 是否保存来源 URL 和读取时间；
- 是否标注缓存时间；
- 是否处理 Reader 失败和正文缺失；
- 是否记录截图或关键 DOM；
- 是否有抓取合规评估。

网页能力最容易在 demo 中显得强大，也最容易在生产中因为页面变化、登录态和合规问题失效。

## 最终判断

```text
找来源：Search
读正文：Reader
批量站点：Crawler
交互页面：Browser
业务系统：优先官方 API
```

网页能力要按重量逐级升级，不要一开始就让 Agent 控浏览器跑全流程。

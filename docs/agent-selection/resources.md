---
title: 官方资源速查
description: 汇总智能体选型常见框架、RAG 平台、向量数据库、向量库管理工具、搜索抓取、Embedding、Reranker 和评估观测工具的官方入口。
contentType: support
series: support
contentId: agent-selection-resources
shortTitle: 官方资源速查
summary: 按工程链路汇总 LangChain、RAGFlow、Dify、Qdrant、Milvus、Attu、pgvector、Unstructured、Cohere Rerank、Ragas、LangSmith 等智能体选型常见工具的官方入口。
difficulty: beginner
estimatedTime: 20 分钟
learningGoals:
  - 快速找到智能体选型常见工具的官方入口
  - 区分框架、RAG 平台、向量数据库、管理控制台、搜索抓取、Embedding、Reranker 和评估观测工具
  - 在进入官网前先明确工具所属类别和适用场景
prerequisites:
  - 了解 Agent、RAG、向量数据库和搜索 API 的基本概念
recommendedNext:
  - /agent-selection/
  - /agent-selection/01-agent-frameworks
  - /agent-selection/05-rag-platforms
  - /agent-selection/14-embedding-models
  - /agent-selection/15-vector-database-selection
  - /agent-selection/16-retrieval-patterns
  - /agent-selection/17-reranker-models
  - /agent-selection/21-observability-trace-replay-eval
practiceLinks:
  - /agent-selection/
  - /agent-selection/01-agent-frameworks
searchTags:
  - 官方资源
  - LangChain
  - RAGFlow
  - Dify
  - Qdrant
  - Milvus
  - Attu
  - pgvector
  - Reranker
  - RAG 评估
navigationLabel: 官方资源速查
entryMode: bridge
roleDescription: 在进入官网前按工程链路快速定位框架、RAG、向量库与评估工具的官方入口。
---

这些链接只作为官方入口速查，不替代工程选型判断。先按问题类型阅读对应文章，再进入官网确认版本、价格、部署、API 细节和商业条款。

## Agent 与工作流框架

| 工具 | 官方入口 | 适合什么时候点开 |
| --- | --- | --- |
| LangChain | [https://www.langchain.com/langchain](https://www.langchain.com/langchain) | 比较模型、工具、chain、retriever 生态和集成能力 |
| LangGraph | [https://www.langchain.com/langgraph](https://www.langchain.com/langgraph) | 需要状态图、可恢复 workflow、人机确认和长期运行任务 |
| LlamaIndex | [https://www.llamaindex.ai/](https://www.llamaindex.ai/) | 需要搭建 RAG pipeline、数据连接器和索引流程 |
| AutoGen | [https://microsoft.github.io/autogen/stable/](https://microsoft.github.io/autogen/stable/) | 需要比较多 Agent 协作和研究型原型能力 |
| CrewAI | [https://crewai.com/](https://crewai.com/) | 需要角色化多 Agent 编排和任务分工原型 |

## RAG 平台与低代码应用构建

| 工具 | 官方入口 | 适合什么时候点开 |
| --- | --- | --- |
| RAGFlow | [https://ragflow.io/](https://ragflow.io/) | 文档复杂、PDF 多、表格多、需要开箱即用知识库管理 |
| Dify | [https://dify.ai/](https://dify.ai/) | 需要低代码搭建 RAG、Agent、Workflow 和内部应用 |
| Flowise | [https://flowiseai.com/](https://flowiseai.com/) | 需要可视化编排 LangChain / Agent 流程 |
| Langflow | [https://www.langflow.org/](https://www.langflow.org/) | 需要低代码构建 Agent、RAG 应用和组件化 flow |
| Haystack | [https://haystack.deepset.ai/](https://haystack.deepset.ai/) | 需要偏工程化的开源 RAG、Agent 和检索 pipeline |
| Microsoft GraphRAG | [https://microsoft.github.io/graphrag/](https://microsoft.github.io/graphrag/) | 需要评估实体关系、社区摘要和跨文档全局检索 |

## 向量数据库与检索基础设施

| 工具 | 官方入口 | 适合什么时候点开 |
| --- | --- | --- |
| Qdrant | [https://qdrant.tech/](https://qdrant.tech/) | 关注 payload filter、自托管向量库和企业 RAG 检索 |
| Milvus | [https://milvus.io/](https://milvus.io/) | 关注大规模向量检索、集群和云原生部署 |
| Weaviate | [https://weaviate.io/](https://weaviate.io/) | 关注向量数据库、schema、hybrid search 和托管能力 |
| Pinecone | [https://www.pinecone.io/](https://www.pinecone.io/) | 关注托管向量数据库和快速上线 |
| Chroma | [https://www.trychroma.com/](https://www.trychroma.com/) | 关注本地原型、轻量向量存储和快速验证 |
| pgvector | [https://github.com/pgvector/pgvector](https://github.com/pgvector/pgvector) | 已有 PostgreSQL，希望少引入一个系统时评估 |
| LanceDB | [https://www.lancedb.com/](https://www.lancedb.com/) | 关注本地、多模态、lakehouse 和嵌入式向量存储 |

## 向量检索与搜索引擎

| 工具 | 官方入口 | 适合什么时候点开 |
| --- | --- | --- |
| Redis Vector Search | [https://redis.io/solutions/vector-search/](https://redis.io/solutions/vector-search/) | 需要低延迟、缓存友好或 session 级向量检索 |
| Elasticsearch Vector Search | [https://www.elastic.co/docs/solutions/search/vector](https://www.elastic.co/docs/solutions/search/vector) | 已有 Elasticsearch，希望做 BM25 + vector hybrid |
| OpenSearch Vector Search | [https://docs.opensearch.org/latest/vector-search/](https://docs.opensearch.org/latest/vector-search/) | 已有 OpenSearch，希望做开源搜索体系里的向量检索 |
| Vespa | [https://vespa.ai/](https://vespa.ai/) | 需要大规模搜索、推荐、向量和文本混合检索 |
| Marqo | [https://marqo.ai/](https://marqo.ai/) | 关注 AI search、多模态和电商搜索场景 |
| Faiss | [https://github.com/facebookresearch/faiss](https://github.com/facebookresearch/faiss) | 做算法实验、离线索引或自研检索服务 |

## 向量库管理与托管控制台

| 工具 | 官方入口 | 适合什么时候点开 |
| --- | --- | --- |
| Attu | [https://github.com/zilliztech/attu](https://github.com/zilliztech/attu) | 需要 Milvus 的 GUI 管理、查询和集群状态查看 |
| Qdrant Web UI | [https://qdrant.tech/documentation/web-ui/](https://qdrant.tech/documentation/web-ui/) | 需要查看 Qdrant collection、payload、filter 和查询结果 |
| Qdrant Cloud | [https://qdrant.tech/cloud/](https://qdrant.tech/cloud/) | 想用托管 Qdrant，降低运维成本 |
| Zilliz Cloud | [https://zilliz.com/](https://zilliz.com/) | 想用托管 Milvus 或评估企业级向量服务 |
| Weaviate Cloud | [https://docs.weaviate.io/cloud](https://docs.weaviate.io/cloud) | 想用托管 Weaviate，并通过云控制台管理实例 |
| Pinecone Console | [https://www.pinecone.io/](https://www.pinecone.io/) | 想用托管向量库，并通过控制台管理 index、监控和数据 |

## 搜索 API

| 工具 | 官方入口 | 适合什么时候点开 |
| --- | --- | --- |
| Tavily | [https://www.tavily.com/](https://www.tavily.com/) | 需要面向 AI Agent 的实时搜索入口 |
| Exa | [https://exa.ai/](https://exa.ai/) | 需要语义搜索、研究型 Agent 外部信息源 |
| Brave Search API | [https://brave.com/search/api/](https://brave.com/search/api/) | 需要通用网页搜索 API 和独立搜索来源 |
| SerpAPI | [https://serpapi.com/search-api](https://serpapi.com/search-api) | 需要结构化获取搜索结果页数据 |

## 网页读取、抓取与数据摄取

| 工具 | 官方入口 | 适合什么时候点开 |
| --- | --- | --- |
| Firecrawl | [https://www.firecrawl.dev/](https://www.firecrawl.dev/) | 需要网页抓取、Markdown 提取和站点映射 |
| Jina AI Reader | [https://jina.ai/reader/](https://jina.ai/reader/) | 需要把网页内容转换为 LLM 更容易处理的文本 |
| Unstructured | [https://unstructured.io/](https://unstructured.io/) | 需要文档解析、数据摄取和非结构化资料预处理 |
| Apify | [https://apify.com/](https://apify.com/) | 需要托管爬虫、Actor 生态和批量网页采集 |
| Crawl4AI | [https://docs.crawl4ai.com/](https://docs.crawl4ai.com/) | 需要自托管、面向 LLM 的 crawler 和网页抽取 |
| Scrapy | [https://scrapy.org/](https://scrapy.org/) | 需要传统结构化爬虫框架和长期采集工程 |

## Embedding 与 Reranker

| 工具 | 官方入口 | 适合什么时候点开 |
| --- | --- | --- |
| OpenAI Embeddings | [https://platform.openai.com/docs/guides/embeddings](https://platform.openai.com/docs/guides/embeddings) | 需要通用托管 Embedding API |
| Google Gemini Embeddings | [https://ai.google.dev/gemini-api/docs/embeddings](https://ai.google.dev/gemini-api/docs/embeddings) | 需要评估 Gemini 生态 Embedding 能力 |
| Cohere Rerank | [https://cohere.com/rerank](https://cohere.com/rerank) | 需要托管 Rerank API 和多语言重排基线 |
| Voyage AI | [https://www.voyageai.io/](https://www.voyageai.io/) | 需要专业检索场景的 Embedding 与 Rerank 服务 |
| Jina Reranker | [https://jina.ai/reranker/](https://jina.ai/reranker/) | 需要 Jina 的托管或开源多语言 Reranker |
| BAAI BGE | [https://bge-model.com/bge/](https://bge-model.com/bge/) | 需要开源中文、多语言 Embedding 和 Reranker 基线 |
| Nomic Embed | [https://home.nomic.ai/embed](https://home.nomic.ai/embed) | 需要开源 Embedding、可视化和本地化能力 |

## 观测、评估与生产治理

| 工具 | 官方入口 | 适合什么时候点开 |
| --- | --- | --- |
| LangSmith | [https://www.langchain.com/langsmith](https://www.langchain.com/langsmith) | 需要 trace、dataset、eval 和 LangChain/LangGraph 集成 |
| Arize Phoenix | [https://phoenix.arize.com/](https://phoenix.arize.com/) | 需要开源 LLM tracing、RAG 评估和可观测性 |
| Langfuse | [https://langfuse.com/](https://langfuse.com/) | 需要 LLM tracing、prompt 管理和评估数据集 |
| Ragas | [https://docs.ragas.io/](https://docs.ragas.io/) | 需要 RAG 指标、测试集评估和检索生成质量分析 |
| TruLens | [https://www.trulens.org/](https://www.trulens.org/) | 需要评估和观测 AI Agent、LLM 应用和 RAG 链路 |
| DeepEval | [https://deepeval.com/](https://deepeval.com/) | 需要 LLM 应用测试、回归评估和 CI 集成 |
| OpenAI Evals | [https://github.com/openai/evals](https://github.com/openai/evals) | 需要参考通用 LLM 系统评估框架 |

## 使用原则

| 原则 | 说明 |
| --- | --- |
| 先选问题，再点官网 | 官网是确认细节的入口，不是选型判断的起点 |
| 按链路分层，不按品牌堆栈 | 框架、RAG 平台、向量库、管理控制台、搜索抓取、评估工具不是同一层 |
| 不重复引入同层组件 | 同一项目里不应该因为工具热门就同时引入多个同层组件 |
| 先看部署和权限 | 企业知识库、代码库 Agent 和客服 Agent 必须先确认数据权限、审计和部署边界 |
| 先做小 POC | 官网能力再强，也要用自己的样本集验证检索质量、延迟、成本和失败模式 |

相关选型文章：

- [Agent 框架与 Runtime 怎么选](/agent-selection/01-agent-frameworks)
- [RAG 平台与方案怎么选](/agent-selection/05-rag-platforms)
- [搜索与抓取工具怎么选](/agent-selection/04-search-tools)
- [Embedding 模型怎么选](/agent-selection/14-embedding-models)
- [向量数据库怎么选](/agent-selection/15-vector-database-selection)
- [检索组件怎么选](/agent-selection/16-retrieval-patterns)
- [Reranker 模型怎么选](/agent-selection/17-reranker-models)
- [Agent 可观测性与评估怎么选](/agent-selection/21-observability-trace-replay-eval)

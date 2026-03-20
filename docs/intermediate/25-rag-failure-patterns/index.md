---
title: 第25章：RAG 为什么总是答不准？
description: 从五个高频翻车场景切入，理解 RAG 系统为何会答偏、漏答、编造，以及如何用工程手段逐个修复。
---

<script setup>
import SourceSnapshotCard from '../../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/session/compaction.ts`、`packages/opencode/src/session/summary.ts`、`packages/opencode/src/tool/truncation.ts`、`packages/opencode/src/session/processor.ts`、`docs/intermediate/examples/25-rag-failure-patterns/`
> **前置阅读**：[P7：RAG 基础](/practice/p07-rag-basics/)、[P8：GraphRAG](/practice/p08-graphrag/)、[P9：混合检索策略](/practice/p09-hybrid-retrieval/)
> **学习目标**：把“RAG 答不准”拆成分块、向量、召回、提示词、文档冲突五类具体故障，建立排查顺序，并理解这些问题为什么最终都会落到上下文组织与信息预算上。

---

## 这篇解决什么问题

很多人第一次把 RAG 跑通以后，马上就会遇到一个更现实的问题：

- 文档明明在库里，模型就是找不到
- 找到了相关文档，但答案还是答偏
- 一问数字、版本、日期，输出就开始不稳定
- 多份文档互相矛盾时，模型会把新旧规则混在一起

这类问题如果只用一句“检索效果不好”来概括，通常修不动。因为它们其实来自五条完全不同的故障链：

1. 分块错了，召回单元从一开始就不对
2. Embedding 选错了，向量相似度没有表达真实语义
3. 只靠语义召回，精确关键词和数字被冲掉
4. Prompt 没收口，模型拿着资料继续自由发挥
5. 文档冲突没治理，模型不知道该信哪份资料

这一章就是把这五种翻车模式拆开，给你一个真正能落地的排查顺序。

## 为什么真实系统里重要

RAG 最大的误区，是把它理解成“多了一次检索”。真实系统里，RAG 更像一条信息供应链：

```text
原始文档
  -> 分块
  -> 向量化 / 关键词索引
  -> 召回
  -> 重排 / 过滤
  -> Prompt 组装
  -> LLM 生成
```

任何一段出错，最后都会表现成“模型答错了”。但模型答错，往往不是模型本身的问题，而是上游喂进去的信息已经失真了。

对团队来说，这一点重要在三个层面：

- **排障效率**：你要先知道是召回错，还是生成错，才谈得上修复。
- **成本控制**：很多团队会下意识换更贵的模型，但如果根因是 chunk 切错，换模型只是在烧钱。
- **可信度建设**：企业知识库、客服、制度问答、法务检索，本质都在卖“答案可追溯”。一旦出现编造或版本混用，用户信任会迅速下降。

## 核心概念与主链路

先记住一条主链路：

```text
先保证召回单元正确
  -> 再保证相似度判断靠谱
  -> 再补上关键词召回能力
  -> 再把回答边界收紧
  -> 最后处理多文档冲突与来源追踪
```

这五步的顺序很关键，因为它们是逐层收敛的。

### 25.1 分块不是预处理细节，而是“知识单元”的定义

如果 chunk 太大，回答会被无关信息淹没；如果 chunk 太小，关键信息会在切分时断开。示例里的 `smart_chunk()` 用段落和句子边界代替固定字数切割，本质是在定义“什么叫一个可检索的最小语义单元”：

```python
def smart_chunk(text, max_size=300):
    paragraphs = re.split(r'\n\s*\n|(?=\n[一二三四五六七八九十]+、)|(?=\n\d+\.)', text)
    paragraphs = [p.strip() for p in paragraphs if p.strip()]

    chunks = []
    for para in paragraphs:
        if len(para) <= max_size:
            chunks.append(para)
        else:
            sentences = re.split(r'([。.!?！？\n])', para)
            ...
```

这里最重要的工程判断不是“300 字是不是最佳值”，而是：

- 优先保语义完整，不要先追求均匀切块
- 中文制度、FAQ、手册类文档，往往天然按标题和段落组织
- 一旦查询经常落在某个局部规则上，分块就应该围绕这个局部规则来定义

### 25.2 Embedding 模型决定了“相似”到底是什么意思

如果你的文档是中文制度、中文 FAQ，却拿一个不适合中文语义的模型做向量，召回从底层就偏了。这里不是简单的“模型越贵越好”，而是**语义空间要和语料匹配**。

这也是为什么实践里要先观察两个指标：

- 相关文档和无关文档的分数能不能明显拉开
- 近义表达、改写表达、问句表达能不能召回到同一类片段

如果这两个指标都不稳定，先别急着调 top-k，也别急着换 rerank，先确认 Embedding 模型是否匹配你的语料语言和领域。

### 25.3 混合检索是在补语义检索的盲区

第 3 个坑是最常见的线上事故来源之一：型号、版本号、人名、金额、日期，这些精确关键词经常被纯向量召回排错顺序。

示例里的 `HybridSearch` 很直接，它把 BM25 和向量检索做了加权融合：

```python
class HybridSearch:
    def __init__(self, name="hybrid", bm25_weight=0.4):
        self.collection = chroma_client.create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"}
        )
        self.bm25_weight = bm25_weight
        self.vector_weight = 1 - bm25_weight

    def search(self, query, top_k=3):
        tokenized_query = list(jieba.cut(query))
        bm25_scores = self._bm25_index.get_scores(tokenized_query)
        ...
        score = (self.bm25_weight * bm25_normalized[i] +
                self.vector_weight * vector_scores[i])
```

这个类的核心价值不是“0.4 这个权重最优”，而是提醒你：

- 语义检索擅长找“意思像”的内容
- 关键词检索擅长找“字面必须命中”的内容
- 真正的生产系统通常要同时要两者

也正因此，你应该优先把以下查询识别为“必须带关键词权重”的请求：

- 型号、工单号、订单号、员工编号
- 日期、金额、数字阈值
- 专有名词、产品名、接口名

### 25.4 Prompt 的职责不是润色，而是把回答边界钉死

很多人把 RAG 做坏，不是没检索到，而是检索到了以后又让模型开始自由发挥。

示例中“坏 Prompt”和“好 Prompt”的差别非常典型：

```python
good_prompt = f"""你是一个企业知识库问答助手。请严格根据【参考资料】回答用户问题。

【核心规则】
1. 只基于参考资料中明确提到的信息回答
2. 如果参考资料中没有相关信息，必须明确说"根据现有资料，未找到相关信息"
3. 绝对禁止推测、补充、编造参考资料中没有的内容
4. 涉及数字、金额、日期的信息必须原文引用，不能近似
"""
```

这里的重点不在措辞华丽，而在四条约束非常可执行：

- 信息源锁死
- 缺失时明确说不知道
- 数字类信息要求原文引用
- 把“编造”定义成明确违规

对知识库问答来说，这通常比“回答尽量完整”更重要。因为一旦你允许模型“合理补充”，它就会把资料里没有的规则也包装成资料结论。

### 25.5 多文档冲突必须转成显式规则

只要知识库存在新旧版本、部门补充规定、地域差异或流程变更，冲突就不是偶发问题，而是必然问题。

示例里修复这个问题靠的是两步：

1. 每个 chunk 带上元数据
2. Prompt 里写清楚冲突处理优先级

```python
chunks_with_meta = [
    {
        "content": "...",
        "source": "员工手册",
        "version": "v3.0",
        "date": "2024-01-01",
        "status": "现行有效"
    },
    ...
]

meta_line = f"[来源: {chunk['source']} {chunk['version']} | 日期: {chunk['date']} | 状态: {chunk['status']}]"
```

这一步非常像数据库里的“排序规则”和“约束条件”。没有这些显式规则，模型只能自己猜。而模型最不适合做的，就是在冲突制度里拍脑袋决定谁优先。

## OpenCode 源码映射

OpenCode 原仓并没有内建一套通用 RAG 模块，但这章讲的五类故障，在 OpenCode 里会以另一种形式反复出现：都是“哪些信息该进上下文、哪些该裁掉、冲突时怎么收口”的问题。

- `session/compaction.ts`：对应“上下文预算不够怎么办”，和 RAG 里的召回裁剪、本地压缩是同类问题。
- `session/summary.ts`：对应“旧信息如何保留核心事实”，这和长文档压缩、历史信息抽取是一条线。
- `tool/truncation.ts`：对应“信息太长时不能全塞给模型”，和 RAG 检索结果只保留关键片段的思路一致。
- `session/processor.ts`：对应“信息最后如何进入主循环”，它决定了模型到底看到了哪些消息。

换句话说，RAG 不是独立知识点，它只是把 OpenCode 已经在做的“上下文治理”问题，换了一个检索增强的入口重新演了一遍。

<SourceSnapshotCard
  title="第25章源码映射"
  description="OpenCode 没有原生 RAG 子系统，但会话压缩、摘要重建、输出裁剪和主循环消息组织，本质都在解决同一类信息供给问题。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-17"
  :entries="[
    {
      label: '上下文预算控制',
      path: 'packages/opencode/src/session/compaction.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/compaction.ts'
    },
    {
      label: '历史摘要重建',
      path: 'packages/opencode/src/session/summary.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/summary.ts'
    },
    {
      label: '工具输出裁剪',
      path: 'packages/opencode/src/tool/truncation.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/tool/truncation.ts'
    },
    {
      label: '主循环消息组织',
      path: 'packages/opencode/src/session/processor.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/processor.ts'
    }
  ]"
/>

## 教学代码示例映射

**下面这些都是教学示例，不是 OpenCode 原仓实现。** 它们位于 `docs/intermediate/examples/25-rag-failure-patterns/`，目的是把五类故障拆开演示，方便你逐个验证。

- `v1_chunk_problem.py`：固定切块与语义切块对比
- `v2_embedding_problem.py`：Embedding 模型选择与中文召回差异
- `v3_hybrid_search.py`：BM25 + 向量的混合检索
- `v4_prompt_control.py`：回答边界约束与“资料未提及”
- `v5_metadata_conflict.py`：元数据治理与冲突处理规则
- `production_rag.py`：把五类修复串成一条完整 RAG 流水线

建议按这个顺序阅读和运行：

```text
v1_chunk_problem.py
  -> v2_embedding_problem.py
  -> v3_hybrid_search.py
  -> v4_prompt_control.py
  -> v5_metadata_conflict.py
  -> production_rag.py
```

第 25 章的示例总量较大，这里只展示关键片段；完整脚本请直接查看示例目录。

::: details 教学示例主目录速览

```text
docs/intermediate/examples/25-rag-failure-patterns/
├── v1_chunk_problem.py
├── v2_embedding_problem.py
├── v3_hybrid_search.py
├── v4_prompt_control.py
├── v5_metadata_conflict.py
└── production_rag.py
```

:::

## 常见误区

### 误区1：RAG 答不准，优先换更强的模型

**错误理解**：先把生成模型换成更贵的型号，准确率自然会上去。

**实际情况**：如果召回单元错了、关键词没召回、资料有冲突，换模型通常只会让它更流畅地答错。RAG 的第一性原理不是“更强生成”，而是“更准供给”。

### 误区2：top-k 调大一点，总能覆盖正确答案

**错误理解**：检索多拿几段资料，总比拿少了安全。

**实际情况**：过量召回会把无关信息、旧版本信息和噪声一起送进上下文，导致答案更散、更不稳定。top-k 不是越大越好，而是越接近“足够覆盖且不稀释注意力”越好。

### 误区3：Prompt 只是锦上添花，检索准了就够了

**错误理解**：只要检索结果相关，Prompt 怎么写都差不多。

**实际情况**：检索解决的是“有没有资料”，Prompt 解决的是“模型能不能越界”。没有边界约束，模型会把“资料推断”伪装成“资料结论”。

### 误区4：文档冲突是内容团队的问题，不是系统问题

**错误理解**：新旧版本冲突只要让运营整理文档就行，系统不用处理。

**实际情况**：真实业务里旧版本不会立刻消失，补充规定也会长期并存。冲突优先级、来源标注、版本状态必须进入索引和生成流程，否则模型每次都在赌运气。

## 延伸阅读与回链

- 如果你还没搭过完整 RAG 流程，先回到 [P7：RAG 基础](/practice/p07-rag-basics/)，把分块、向量化和检索主链跑通。
- 如果你的问题已经不是“找不到”，而是“关系推理做不到”，接着看 [P8：GraphRAG](/practice/p08-graphrag/)。
- 如果你已经明确遇到关键词与语义检索互补的问题，继续看 [P9：混合检索策略](/practice/p09-hybrid-retrieval/)。
- 如果你想把这章和 OpenCode 的上下文治理放到一起看，建议串读 [第5章：会话管理](/04-session-management/) 与 [第16章：高级主题与最佳实践](/15-advanced-topics/)。

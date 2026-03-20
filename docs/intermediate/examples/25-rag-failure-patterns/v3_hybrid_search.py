"""
坑三：检索只靠向量，关键词全丢

演示问题：
- 向量检索对精确关键词（产品型号、人名、数字）不敏感
- 搜索"A7-Pro"可能找不到包含"A7-Pro"的文档

修复方案：
- 混合检索：BM25 关键词检索 + 向量语义检索
- BM25 负责精确匹配，向量负责语义理解

运行方式：
    pip install openai chromadb jieba rank-bm25
    export DEEPSEEK_API_KEY="your_key_here"
    export SILICONFLOW_API_KEY="your_key_here"
    python v3_hybrid_search.py
"""
import os
from openai import OpenAI
import chromadb
import jieba
from rank_bm25 import BM25Okapi

# ==================== 环境配置 ====================

deepseek_key = os.getenv("DEEPSEEK_API_KEY")
if not deepseek_key:
    raise ValueError("请设置环境变量 DEEPSEEK_API_KEY")

siliconflow_key = os.getenv("SILICONFLOW_API_KEY")
if not siliconflow_key:
    raise ValueError("请设置环境变量 SILICONFLOW_API_KEY")

chat_client = OpenAI(base_url="https://api.deepseek.com", api_key=deepseek_key)
embedding_client = OpenAI(base_url="https://api.siliconflow.cn/v1", api_key=siliconflow_key)

CHAT_MODEL = "deepseek-chat"
EMBEDDING_MODEL = "netease-youdao/bce-embedding-base_v1"

# ==================== 测试数据 ====================

docs = [
    "产品型号 A7-Pro 的售价为 2999 元，支持 5G 网络。",
    "产品型号 B5-Lite 的售价为 1599 元，仅支持 4G。",
    "产品型号 C9-Max 的售价为 4999 元，支持 5G 和卫星通信。",
    "所有产品均提供一年质保，可延长至三年（付费）。",
]

query = "A7-Pro 多少钱？"

# ==================== 工具函数 ====================

def get_embedding(text):
    """获取文本的向量表示"""
    if not text or not text.strip():
        raise ValueError("文本不能为空")
    try:
        response = embedding_client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        raise RuntimeError(f"Embedding生成失败: {e}")

# ==================== 翻车场景：纯向量检索 ====================

print("=" * 60)
print("【翻车场景】纯向量检索")
print("=" * 60)

chroma_client = chromadb.Client()
collection_vector = chroma_client.create_collection(name="vector_only")

# 添加文档
for i, doc in enumerate(docs):
    collection_vector.add(
        ids=[f"doc_{i}"],
        embeddings=[get_embedding(doc)],
        documents=[doc]
    )

# 检索
print(f"\n查询：{query}\n")
results = collection_vector.query(
    query_embeddings=[get_embedding(query)],
    n_results=3
)

print("纯向量检索结果：\n")
for i, doc in enumerate(results["documents"][0]):
    status = "✅" if "A7-Pro" in doc else "❌"
    print(f"{status} [{i+1}] {doc}")

print("\n❌ 问题分析：")
print("  - 'A7-Pro' 这种型号名对大模型来说就是一串字符")
print("  - 向量检索不理解这个字符串的'语义'")
print("  - 正确答案可能排到第三，甚至找不到")

# ==================== 修复方案：混合检索 ====================

class HybridSearch:
    """混合检索：BM25 关键词检索 + 向量语义检索"""

    def __init__(self, name="hybrid", bm25_weight=0.4):
        """初始化混合检索

        Args:
            name: 集合名称
            bm25_weight: BM25权重（0-1之间），向量权重自动为1-bm25_weight
        """
        self.collection = chroma_client.create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"}
        )
        self.bm25_weight = bm25_weight
        self.vector_weight = 1 - bm25_weight
        self._docs = []
        self._bm25_index = None

    def add_documents(self, documents):
        """添加文档并构建索引"""
        if not documents:
            raise ValueError("文档列表不能为空")

        self._docs = documents

        # 构建BM25索引
        tokenized = [list(jieba.cut(doc)) for doc in documents]
        self._bm25_index = BM25Okapi(tokenized)

        # 存入向量数据库
        for i, doc in enumerate(documents):
            self.collection.add(
                ids=[f"doc_{i}"],
                embeddings=[get_embedding(doc)],
                documents=[doc]
            )

    def search(self, query, top_k=3):
        """混合检索"""
        if self._bm25_index is None:
            raise RuntimeError("请先调用add_documents添加文档")

        # BM25 检索
        tokenized_query = list(jieba.cut(query))
        bm25_scores = self._bm25_index.get_scores(tokenized_query)

        # 归一化 BM25 分数到 0-1
        max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1
        bm25_normalized = [s / max_bm25 for s in bm25_scores]

        # 向量检索
        results = self.collection.query(
            query_embeddings=[get_embedding(query)],
            n_results=len(self._docs),
            include=["distances"]
        )
        vector_scores = [1 - d for d in results["distances"][0]]

        # 混合打分（加权求和）
        hybrid_scores = []
        for i in range(len(self._docs)):
            score = (self.bm25_weight * bm25_normalized[i] +
                    self.vector_weight * vector_scores[i])
            hybrid_scores.append((i, score))

        hybrid_scores.sort(key=lambda x: x[1], reverse=True)
        return [(self._docs[idx], score) for idx, score in hybrid_scores[:top_k]]

print("\n" + "=" * 60)
print("【修复方案】混合检索（BM25 + 向量）")
print("=" * 60)

hybrid = HybridSearch(name="hybrid_demo", bm25_weight=0.4)
hybrid.add_documents(docs)

print(f"\n查询：{query}\n")
print("混合检索结果：\n")
hybrid_results = hybrid.search(query, top_k=3)
for i, (doc, score) in enumerate(hybrid_results):
    status = "✅" if "A7-Pro" in doc else "⚠️"
    print(f"{status} [{i+1}] (分数 {score:.3f}) {doc}")

print("\n✅ 效果分析：")
print("  - BM25 精确匹配 'A7-Pro'，分数拉满")
print("  - 正确结果直接排到第一位")
print("  - 关键词 + 语义，两全其美")

# ==================== 详细对比 ====================

print("\n" + "=" * 60)
print("【详细对比】纯向量 vs 混合检索")
print("=" * 60)

print(f"\n查询：{query}\n")

print("┌─────────────────────────────────────────────────────────┐")
print("│ 纯向量检索                                               │")
print("├─────────────────────────────────────────────────────────┤")
for i, doc in enumerate(results["documents"][0]):
    status = "✅" if "A7-Pro" in doc else "❌"
    print(f"│ {status} [{i+1}] {doc:<50} │")
print("└─────────────────────────────────────────────────────────┘")

print("\n┌─────────────────────────────────────────────────────────┐")
print("│ 混合检索                                                 │")
print("├─────────────────────────────────────────────────────────┤")
for i, (doc, score) in enumerate(hybrid_results):
    status = "✅" if "A7-Pro" in doc else "⚠️"
    print(f"│ {status} [{i+1}] ({score:.2f}) {doc:<43} │")
print("└─────────────────────────────────────────────────────────┘")

# ==================== 何时需要混合检索 ====================

print("\n" + "=" * 60)
print("【总结】何时需要混合检索？")
print("=" * 60)
print("""
✅ 需要混合检索：
  - 文档包含大量产品编号、人名、专有名词、精确数字
  - 用户查询经常包含精确的关键词（如 "A7-Pro"、"5天年假"）
  - 纯向量检索的准确率低于 70%，经常找不到包含关键词的文档

❌ 不需要混合检索：
  - 文档少于 100 篇，向量检索已经足够准确
  - 查询都是自然语言问题（如 "怎么请假"），很少包含精确关键词
  - 文档中没有需要精确匹配的专有名词

💡 经验值：
  - 权重从 BM25 : 向量 = 0.4 : 0.6 开始试
  - 如果关键词匹配很重要，提高 BM25 权重到 0.5-0.6
  - 如果语义理解更重要，降低 BM25 权重到 0.3
  - 根据实际效果调整，没有固定答案
""")

# ==================== 权重调整演示 ====================

print("\n" + "=" * 60)
print("【进阶】不同权重的效果对比")
print("=" * 60)

weights = [
    (0.3, "语义优先"),
    (0.4, "平衡"),
    (0.5, "关键词优先"),
]

for bm25_w, desc in weights:
    hybrid_test = HybridSearch(name=f"hybrid_{bm25_w}", bm25_weight=bm25_w)
    hybrid_test.add_documents(docs)
    results_test = hybrid_test.search(query, top_k=1)
    top_doc, top_score = results_test[0]
    status = "✅" if "A7-Pro" in top_doc else "❌"
    print(f"\n{desc}（BM25={bm25_w}, 向量={1-bm25_w}）：")
    print(f"  {status} Top1: {top_doc}")
    print(f"     分数: {top_score:.3f}")

print("\n💡 观察：")
print("  - BM25 权重越高，关键词匹配越准")
print("  - 但也不能太高，否则失去语义理解能力")
print("  - 0.4-0.5 是个不错的平衡点")

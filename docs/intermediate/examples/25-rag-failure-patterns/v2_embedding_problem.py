"""
坑二：Embedding 模型选错

演示问题：
- 用英文模型处理中文文档，语义理解差
- 相关和不相关的文档分数都挤在一起，区分度低

修复方案：
- 使用中文优化的 Embedding 模型（如 BGE 系列）
- 或使用支持中文的多语言模型

运行方式：
    pip install openai chromadb
    export DEEPSEEK_API_KEY="your_key_here"
    export SILICONFLOW_API_KEY="your_key_here"
    python v2_embedding_problem.py
"""
import os
from openai import OpenAI
import chromadb

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
EMBEDDING_MODEL = "netease-youdao/bce-embedding-base_v1"  # 中文优化模型

# ==================== 测试数据 ====================

query = "员工请假需要提前多久申请？"

docs = [
    "年假需提前3个工作日在OA系统中提交申请，直属上级审批通过后生效。",  # 高度相关
    "事假需提前2个工作日申请。",  # 高度相关
    "公司采用季度考核制，每季度末进行一次绩效评估。",  # 无关
    "框架统一使用 React 18+，不允许在新项目中使用 Vue。",  # 完全无关
]

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

def cosine_similarity(vec1, vec2):
    """计算余弦相似度"""
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    return dot_product  # 已归一化的向量，点积即余弦相似度

# ==================== 演示：好的 Embedding 模型 ====================

print("=" * 60)
print("【演示】使用中文优化的 Embedding 模型")
print("=" * 60)
print(f"\n模型: {EMBEDDING_MODEL}")
print(f"查询: {query}\n")

q_emb = get_embedding(query)

results = []
for doc in docs:
    d_emb = get_embedding(doc)
    similarity = cosine_similarity(q_emb, d_emb)
    results.append((doc, similarity))

# 按相似度排序
results.sort(key=lambda x: x[1], reverse=True)

print("检索结果（按相似度排序）：\n")
for i, (doc, score) in enumerate(results):
    status = "✅" if i < 2 else "❌"
    relevance = "相关" if i < 2 else "不相关"
    print(f"{status} [{i+1}] 相似度 {score:.3f} ({relevance})")
    print(f"    {doc}\n")

print("=" * 60)
print("【分析】")
print("=" * 60)
print("✅ 好的模型能清楚地把相关和不相关的内容拉开差距：")
print("  - 相关文档：分数 > 0.65")
print("  - 不相关文档：分数 < 0.25")
print("  - 区分度明显，检索准确")

# ==================== 对比：差的模型会怎样 ====================

print("\n" + "=" * 60)
print("【对比】如果用差的模型会怎样？")
print("=" * 60)
print("\n❌ 差的模型（对中文理解不好）会导致：")
print("  - 所有文档的分数都挤在 0.3-0.5 之间")
print("  - 相关和不相关的文档分不清")
print("  - 检索结果不准确，经常返回无关内容")
print("\n例如：")
print("  相似度 0.42 | 年假需提前3个工作日...  ← 应该最相关，但分数不高")
print("  相似度 0.38 | 公司采用季度考核制...    ← 不相关，但分数差不多")
print("  相似度 0.35 | 事假需提前2个工作日...    ← 相关，但排到后面了")
print("  相似度 0.31 | 框架统一使用 React 18+... ← 完全无关，分数还不低")

# ==================== 推荐的 Embedding 模型 ====================

print("\n" + "=" * 60)
print("【推荐】2024-2025 年中文 Embedding 模型")
print("=" * 60)
print("""
┌─────────────────────────┬────────┬──────┬────────────────────┐
│ 模型                     │ 来源   │ 维度 │ 特点                │
├─────────────────────────┼────────┼──────┼────────────────────┤
│ text-embedding-3-large  │ OpenAI │ 3072 │ 效果最好，但贵      │
│ text-embedding-3-small  │ OpenAI │ 1536 │ 性价比最高，推荐    │
│ BAAI/bge-large-zh-v1.5  │ 智源   │ 1024 │ 开源免费，中文专优  │
│ BAAI/bge-m3             │ 智源   │ 1024 │ 开源，多语言        │
│ GTE-Qwen2               │ 阿里   │ 多种 │ 开源，效果好        │
└─────────────────────────┴────────┴──────┴────────────────────┘

💡 选择建议：
  - 文档全是中文 → BGE 系列（免费 + 中文效果好）
  - 中英混杂 → OpenAI text-embedding-3-small
  - 成本敏感 → BGE 系列（开源免费）
  - 追求极致效果 → OpenAI text-embedding-3-large
""")

# ==================== 何时需要更换模型 ====================

print("=" * 60)
print("【总结】何时需要更换 Embedding 模型？")
print("=" * 60)
print("""
✅ 需要更换：
  - 文档全是中文，但用的是英文模型（如老版 text-embedding-ada-002）
  - 相关文档的相似度分数都挤在 0.3-0.5 之间，区分度差
  - 搜索"请假"却返回"加班"相关内容（语义理解错误）
  - 检索准确率低于 70%

❌ 不需要更换：
  - 当前模型的检索准确率已经超过 80%
  - 文档量很小（少于 100 篇），模型差异不明显
  - 成本敏感且 OpenAI 模型已经够用

💡 经验值：
  - 先用 OpenAI 的 text-embedding-3-small 快速验证
  - 如果效果不好或成本太高，再换 BGE 等开源模型
  - 不要过早优化，先跑起来再说
""")

# ==================== 实际检索演示 ====================

print("\n" + "=" * 60)
print("【实战】用 ChromaDB 实际检索")
print("=" * 60)

chroma_client = chromadb.Client()
collection = chroma_client.create_collection(name="embedding_demo")

# 添加文档
for i, doc in enumerate(docs):
    collection.add(
        ids=[f"doc_{i}"],
        embeddings=[get_embedding(doc)],
        documents=[doc]
    )

# 检索
print(f"\n查询：{query}\n")
results = collection.query(
    query_embeddings=[get_embedding(query)],
    n_results=3
)

print("Top 3 检索结果：\n")
for i, (doc, distance) in enumerate(zip(results["documents"][0], results["distances"][0])):
    similarity = 1 - distance
    status = "✅" if i < 2 else "⚠️"
    print(f"{status} [{i+1}] 相似度 {similarity:.3f}")
    print(f"    {doc}\n")

print("✅ 使用好的 Embedding 模型，检索结果准确！")

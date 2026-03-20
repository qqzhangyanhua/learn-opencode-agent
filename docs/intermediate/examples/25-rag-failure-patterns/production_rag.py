"""
生产级 RAG：集成五大修复方案

集成内容：
1. 语义分块（坑一）
2. 中文优化的 Embedding 模型（坑二）
3. 混合检索 BM25+向量（坑三）
4. 严格约束 Prompt（坑四）
5. 元数据管理（坑五）

特性：
- 向后兼容：支持简单调用和完整元数据两种方式
- 错误处理：完善的输入验证和异常处理
- 可配置：BM25权重、chunk大小等参数可调

运行方式：
    pip install openai chromadb jieba rank-bm25
    export DEEPSEEK_API_KEY="your_key_here"
    export SILICONFLOW_API_KEY="your_key_here"
    python production_rag.py
"""
import os
import re
import jieba
from datetime import datetime
from openai import OpenAI
import chromadb
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

def ask_llm(prompt):
    """调用大模型生成回答"""
    if not prompt or not prompt.strip():
        raise ValueError("提示词不能为空")
    try:
        response = chat_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        raise RuntimeError(f"LLM调用失败: {e}")

def smart_chunk(text, max_size=300):
    """按自然边界切块，保留语义完整性

    策略：
    1. 优先按段落（双换行）切分
    2. 段落过大时按句子切分（支持中英文）
    3. 句子过大时强制切分
    """
    if not text or not text.strip():
        return []

    # 第一步：按段落切分
    paragraphs = re.split(r'\n\s*\n|(?=\n[一二三四五六七八九十]+、)|(?=\n\d+\.)', text)
    paragraphs = [p.strip() for p in paragraphs if p.strip()]

    chunks = []
    for para in paragraphs:
        if len(para) <= max_size:
            chunks.append(para)
        else:
            # 第二步：按句子切分
            sentences = re.split(r'([。.!?！？\n])', para)
            sentences = [''.join(sentences[i:i+2]) for i in range(0, len(sentences)-1, 2)]

            current = ""
            for sent in sentences:
                if not sent.strip():
                    continue
                if len(current) + len(sent) <= max_size:
                    current += sent
                else:
                    if current:
                        chunks.append(current.strip())
                    # 第三步：如果单个句子超长，强制切分
                    if len(sent) > max_size:
                        for i in range(0, len(sent), max_size):
                            chunks.append(sent[i:i+max_size].strip())
                    else:
                        current = sent
            if current:
                chunks.append(current.strip())

    return [c for c in chunks if c]

# ==================== 生产级 RAG 类 ====================

class ProductionRAG:
    """生产级 RAG：集成五大修复方案

    特性：
    1. 语义分块（坑一）
    2. 支持自定义Embedding模型（坑二）
    3. 混合检索 BM25+向量（坑三）
    4. 严格约束Prompt（坑四）
    5. 元数据管理（坑五）
    """

    def __init__(self, bm25_weight=0.4):
        """初始化RAG系统

        Args:
            bm25_weight: BM25权重（0-1之间）
        """
        self.collection = chromadb.Client().create_collection(
            name=f"production_rag_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            metadata={"hnsw:space": "cosine"}
        )
        self.bm25_weight = bm25_weight
        self.vector_weight = 1 - bm25_weight
        self.chunks = []
        self.chunk_metas = []
        self._bm25_index = None

    def add_document(self, content, metadata=None):
        """添加文档：语义分块 + 元数据

        Args:
            content: 文档内容
            metadata: 可选的元数据字典，包含：
                - source: 来源（默认"未知"）
                - version: 版本（默认"v1.0"）
                - date: 日期（默认当前日期）
                - status: 状态（默认"现行有效"）

        Raises:
            ValueError: 如果content为空
        """
        if not content or not content.strip():
            raise ValueError("文档内容不能为空")

        # 向后兼容：如果没有提供元数据，使用默认值
        if metadata is None:
            metadata = {}

        default_meta = {
            "source": "未知",
            "version": "v1.0",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "status": "现行有效"
        }
        # 合并用户提供的元数据和默认值
        meta = {**default_meta, **metadata}

        # 语义分块
        chunks = smart_chunk(content, max_size=300)

        for i, chunk in enumerate(chunks):
            chunk_id = f"{meta['source']}_{meta['version']}_{i}_{len(self.chunks)}"
            embedding = get_embedding(chunk)
            self.collection.add(
                ids=[chunk_id],
                embeddings=[embedding],
                documents=[chunk],
                metadatas=[meta]
            )
            self.chunks.append(chunk)
            self.chunk_metas.append(meta)

        # 重建 BM25 索引
        tokenized = [list(jieba.cut(c)) for c in self.chunks]
        self._bm25_index = BM25Okapi(tokenized)
        print(f"  ✅ 已添加：{meta['source']} {meta['version']}（{len(chunks)} 块）")

    def hybrid_search(self, query, top_k=5):
        """混合检索：BM25 + 向量

        Args:
            query: 查询文本
            top_k: 返回结果数量

        Returns:
            [(chunk, metadata, score), ...]

        Raises:
            RuntimeError: 如果未添加文档
        """
        if self._bm25_index is None:
            raise RuntimeError("请先调用add_document添加文档")

        # BM25
        bm25_scores = self._bm25_index.get_scores(list(jieba.cut(query)))
        max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1
        bm25_norm = [s / max_bm25 for s in bm25_scores]

        # 向量
        results = self.collection.query(
            query_embeddings=[get_embedding(query)],
            n_results=len(self.chunks),
            include=["distances"]
        )
        vector_scores = [1 - d for d in results["distances"][0]]

        # 混合打分
        scored = []
        for i in range(len(self.chunks)):
            score = (self.bm25_weight * bm25_norm[i] +
                    self.vector_weight * vector_scores[i])
            scored.append((i, score))
        scored.sort(key=lambda x: x[1], reverse=True)

        return [(self.chunks[i], self.chunk_metas[i], s)
                for i, s in scored[:top_k]]

    def query(self, question):
        """完整的 RAG 问答

        Args:
            question: 用户问题

        Returns:
            大模型生成的答案

        Raises:
            ValueError: 如果question为空
        """
        if not question or not question.strip():
            raise ValueError("问题不能为空")

        print(f"\n{'='*50}")
        print(f"  问题: {question}")
        print(f"{'='*50}")

        results = self.hybrid_search(question, top_k=4)

        print(f"\n📚 检索到 {len(results)} 段：")
        context_parts = []
        for i, (chunk, meta, score) in enumerate(results):
            status_tag = "⚠️已废止" if meta["status"] == "已废止" else "✅现行"
            print(f"  [{i+1}] {status_tag} {meta['source']} {meta['version']} (分数{score:.2f})")
            meta_line = f"[{meta['source']} {meta['version']} | {meta['date']} | {meta['status']}]"
            context_parts.append(f"{meta_line}\n{chunk}")

        context = "\n\n---\n\n".join(context_parts)

        prompt = f"""你是企业知识库问答助手。请严格根据参考资料回答。

【规则】
1. 只基于参考资料回答，禁止编造
2. 多文档冲突时，以"现行有效"且日期最新的为准
3. 资料未提及的，明确说"资料未提及"
4. 数字、金额必须原文引用
5. 标注信息来源

【参考资料】
{context}

【问题】{question}"""

        answer = ask_llm(prompt)
        print(f"\n✅ 回答：\n{answer}")
        return answer


# ==================== 使用示例 ====================

if __name__ == "__main__":
    print("=" * 60)
    print("生产级 RAG 演示")
    print("=" * 60)

    # 创建 RAG 实例
    rag = ProductionRAG(bm25_weight=0.4)

    print("\n【添加文档】\n")

    # 方式1：简单使用（向后兼容旧代码）
    rag.add_document(
        content="年假：入职满一年享有5天。病假工资按70%发放。事假无薪。"
    )

    # 方式2：带完整元数据（推荐）
    rag.add_document(
        content="""年假规定：入职满一年的员工，每年享有7天带薪年假（2024年起上调）。
病假规定：病假期间工资按基本工资的80%发放。
事假规定：事假为无薪假期，每次不超过3天。""",
        metadata={
            "source": "员工手册",
            "version": "v3.0",
            "date": "2024-01-01",
            "status": "现行有效"
        }
    )

    rag.add_document(
        content="""差旅报销标准：
- 一线城市（北上广深）住宿每晚不超过500元
- 其他城市住宿每晚不超过350元
- 餐饮补贴每天100元
- 报销需在出差结束后5个工作日内提交""",
        metadata={
            "source": "报销制度",
            "version": "v1.0",
            "date": "2024-06-01",
            "status": "现行有效"
        }
    )

    rag.add_document(
        content="技术部员工在年假基础上额外享有2天'技术充电假'，用于参加技术会议或自学。",
        metadata={
            "source": "技术部补充规定",
            "version": "v1.0",
            "date": "2024-03-01",
            "status": "现行有效"
        }
    )

    # 测试查询
    print("\n" + "=" * 60)
    print("【测试查询】")
    print("=" * 60)

    rag.query("年假有几天？病假工资打几折？")
    rag.query("出差住酒店的报销上限是多少？")
    rag.query("技术部员工年假一共有几天？")

    print("\n" + "=" * 60)
    print("【总结】")
    print("=" * 60)
    print("""
✅ 生产级 RAG 的五大特性：

1. 语义分块
   - 按自然段落边界切分，保留语义完整性
   - 支持中英文混合文档

2. 中文优化的 Embedding 模型
   - 使用 BCE 等中文优化模型
   - 相关和不相关文档区分度高

3. 混合检索（BM25 + 向量）
   - BM25 负责精确关键词匹配
   - 向量负责语义理解
   - 权重可调（默认 0.4 : 0.6）

4. 严格约束 Prompt
   - 只基于参考资料回答
   - 资料里没有的明确说"资料未提及"
   - 禁止编造和推测

5. 元数据管理
   - 支持版本、日期、状态等元数据
   - 自动处理文档冲突
   - 标注信息来源

💡 何时需要生产级 RAG？

✅ 需要：
  - 企业知识库、法律文档等严肃场景
  - 文档超过 100 篇，包含多个版本
  - 需要高准确率（>90%）和可追溯性

❌ 不需要（用基础 RAG）：
  - 文档少于 50 篇
  - 只是做原型验证
  - 向量检索准确率已经超过 80%

🚀 渐进式升级路径：
  1. 基础 RAG（向量检索 + 简单 Prompt）
  2. 加语义分块（如果答案经常不完整）
  3. 加混合检索（如果关键词搜不准）
  4. 严格 Prompt（如果大模型爱编造）
  5. 元数据管理（如果有版本冲突）

不要一上来就全上，根据实际问题逐步优化！
    """)

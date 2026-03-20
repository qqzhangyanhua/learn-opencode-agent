"""
坑一：Chunk 切太大或太小

演示问题：
- 切太大：信息被淹没在一堆无关内容里
- 切太小：上下文被切断，答案不完整

修复方案：
- 语义分块：按自然段落边界切分，保留语义完整性

运行方式：
    pip install openai chromadb
    export DEEPSEEK_API_KEY="your_key_here"
    export SILICONFLOW_API_KEY="your_key_here"
    python v1_chunk_problem.py
"""
import os
import re
from openai import OpenAI
import chromadb

# ==================== 环境配置 ====================

deepseek_key = os.getenv("DEEPSEEK_API_KEY")
if not deepseek_key:
    raise ValueError(
        "请设置环境变量 DEEPSEEK_API_KEY\n"
        "  macOS/Linux: export DEEPSEEK_API_KEY='your_key_here'\n"
        "  Windows:     set DEEPSEEK_API_KEY=your_key_here"
    )

siliconflow_key = os.getenv("SILICONFLOW_API_KEY")
if not siliconflow_key:
    raise ValueError(
        "请设置环境变量 SILICONFLOW_API_KEY\n"
        "  macOS/Linux: export SILICONFLOW_API_KEY='your_key_here'\n"
        "  Windows:     set SILICONFLOW_API_KEY=your_key_here"
    )

chat_client = OpenAI(base_url="https://api.deepseek.com", api_key=deepseek_key)
embedding_client = OpenAI(base_url="https://api.siliconflow.cn/v1", api_key=siliconflow_key)

CHAT_MODEL = "deepseek-chat"
EMBEDDING_MODEL = "netease-youdao/bce-embedding-base_v1"

# ==================== 测试文档 ====================

test_doc = """公司请假制度（2024年修订版）

一、年假规定
1. 入职满1年不满10年的员工，每年享有5天带薪年假。
2. 入职满10年不满20年的员工，每年享有10天带薪年假。
3. 入职满20年以上的员工，每年享有15天带薪年假。

二、病假规定
1. 病假需提供正规医院出具的诊断证明和病假条。
2. 3天以内的病假由直属上级审批。
3. 3天以上的病假需由部门总监审批。
4. 病假期间工资按基本工资的80%发放。

三、事假规定
1. 事假为无薪假期，按日扣除工资。
2. 事假每次不超过3天，需提前2个工作日申请。
3. 全年事假累计不超过15天。

四、婚假规定
1. 符合法定结婚年龄的员工，可享受3天婚假。
2. 晚婚（男满25岁、女满23岁）可额外增加7天，共10天。
3. 婚假需在领证后6个月内使用。

五、产假规定
1. 女员工产假为158天（含法定节假日）。
2. 难产增加15天，多胞胎每多一个增加15天。
3. 男员工陪产假为15天。
4. 产假期间工资照常发放。"""

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

# ==================== 翻车代码：切太大 ====================

def chunk_too_large(text, chunk_size=1000):
    """反面教材：chunk 太大"""
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)
            if text[i:i+chunk_size].strip()]

print("=" * 60)
print("【翻车场景1】Chunk 切太大（1000字一块）")
print("=" * 60)

big_chunks = chunk_too_large(test_doc, chunk_size=1000)
print(f"\n切分结果：切成 {len(big_chunks)} 块")
for i, c in enumerate(big_chunks):
    print(f"  块{i+1}：{len(c)} 字 — {c[:40]}...")

print("\n❌ 问题：整篇文档变成一块！")
print("   用户问'婚假几天'，你把整篇请假制度（包括年假、病假、事假……）")
print("   全塞进 prompt，大模型从一堆无关信息里翻找，既浪费 token 又容易答偏。")

# ==================== 翻车代码：切太小 ====================

print("\n" + "=" * 60)
print("【翻车场景2】Chunk 切太小（50字一块）")
print("=" * 60)

small_chunks = chunk_too_large(test_doc, chunk_size=50)
print(f"\n切分结果：切成 {len(small_chunks)} 块")
for i, c in enumerate(small_chunks[:5]):  # 只显示前5块
    print(f"  块{i+1}：「{c}」")
print("  ...")

print("\n❌ 问题：'入职满1年不满10年'和'每年享有5天带薪年假'被劈成两块了！")
print("   检索的时候很可能只找到前半截或后半截，答案不完整。")

# ==================== 修复方案：语义分块 ====================

def smart_chunk(text, max_size=300):
    """按自然边界切块，保留语义完整性

    策略：
    1. 优先按段落（双换行）切分
    2. 段落过大时按句子切分（支持中英文）
    3. 句子过大时强制切分
    """
    if not text or not text.strip():
        return []

    # 第一步：按段落切分（双换行或标题）
    paragraphs = re.split(r'\n\s*\n|(?=\n[一二三四五六七八九十]+、)|(?=\n\d+\.)', text)
    paragraphs = [p.strip() for p in paragraphs if p.strip()]

    chunks = []
    for para in paragraphs:
        if len(para) <= max_size:
            chunks.append(para)
        else:
            # 第二步：按句子切分（支持中英文标点）
            sentences = re.split(r'([。.!?！？\n])', para)
            # 重新组合句子和标点
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

    return [c for c in chunks if c]  # 过滤空块

print("\n" + "=" * 60)
print("【修复方案】语义分块（按自然边界切分）")
print("=" * 60)

smart_chunks = smart_chunk(test_doc, max_size=200)
print(f"\n切分结果：切成 {len(smart_chunks)} 块\n")
for i, c in enumerate(smart_chunks):
    print(f"块{i+1}（{len(c)}字）：")
    print(f"「{c}」\n")

print("✅ 优点：每一块都是一个完整的语义单元")
print("   - 年假归年假，病假归病假，不会从中间劈开")
print("   - 用户问'婚假几天'，只返回婚假相关的块")
print("   - 上下文完整，答案准确")

# ==================== 实际效果对比 ====================

print("\n" + "=" * 60)
print("【效果对比】用 ChromaDB 实际检索看看")
print("=" * 60)

# 创建两个集合：一个用大块，一个用语义块
chroma_client = chromadb.Client()

# 大块版本
collection_big = chroma_client.create_collection(name="big_chunks")
for i, chunk in enumerate(big_chunks):
    collection_big.add(
        ids=[f"big_{i}"],
        embeddings=[get_embedding(chunk)],
        documents=[chunk]
    )

# 语义块版本
collection_smart = chroma_client.create_collection(name="smart_chunks")
for i, chunk in enumerate(smart_chunks):
    collection_smart.add(
        ids=[f"smart_{i}"],
        embeddings=[get_embedding(chunk)],
        documents=[chunk]
    )

# 测试查询
query = "婚假有几天？"
print(f"\n查询：{query}\n")

print("【大块切分】检索结果：")
results_big = collection_big.query(
    query_embeddings=[get_embedding(query)],
    n_results=1
)
print(f"  返回内容（前100字）：{results_big['documents'][0][0][:100]}...")
print("  ❌ 包含了大量无关信息（年假、病假、事假...）")

print("\n【语义切分】检索结果：")
results_smart = collection_smart.query(
    query_embeddings=[get_embedding(query)],
    n_results=1
)
print(f"  返回内容：{results_smart['documents'][0][0]}")
print("  ✅ 精准命中婚假相关内容，没有无关信息")

print("\n" + "=" * 60)
print("【总结】")
print("=" * 60)
print("✅ 何时需要语义分块？")
print("  - 文档有明确的章节结构（标题、段落）")
print("  - 用户查询针对特定主题（如'年假规定'）")
print("  - 固定切分导致答案不完整或包含无关信息")
print("\n❌ 何时不需要？")
print("  - 文档是纯文本流（如小说、日志）")
print("  - 文档很短（少于1000字）")
print("  - 固定切分已经足够准确")
print("\n💡 经验值：中文文档 chunk_size 在 200-500 字之间比较合适")

"""
坑四：Prompt 没约束，大模型开始自由发挥

演示问题：
- 大模型看完参考资料后"好心"补充资料里没有的信息
- 编造的内容和真实内容混在一起，用户分不清

修复方案：
- 严格约束 Prompt：只基于参考资料回答
- 资料里没有的，明确说"资料未提及"
- 禁止推测、补充、编造

运行方式：
    pip install openai chromadb
    export DEEPSEEK_API_KEY="your_key_here"
    export SILICONFLOW_API_KEY="your_key_here"
    python v4_prompt_control.py
"""
import os
from openai import OpenAI

# ==================== 环境配置 ====================

deepseek_key = os.getenv("DEEPSEEK_API_KEY")
if not deepseek_key:
    raise ValueError("请设置环境变量 DEEPSEEK_API_KEY")

chat_client = OpenAI(base_url="https://api.deepseek.com", api_key=deepseek_key)
CHAT_MODEL = "deepseek-chat"

# ==================== 测试数据 ====================

context = """公司规定，出差住宿费标准：
- 一线城市（北上广深）每晚不超过500元
- 其他城市每晚不超过350元"""

question = "出差住宿标准是多少？包含早餐吗？可以住民宿吗？"

# ==================== 工具函数 ====================

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

# ==================== 翻车场景：没有约束的 Prompt ====================

print("=" * 60)
print("【翻车场景】Prompt 没约束")
print("=" * 60)

bad_prompt = f"""参考资料：{context}

问题：{question}"""

print(f"\n使用的 Prompt：")
print("─" * 60)
print(bad_prompt)
print("─" * 60)

print("\n大模型的回答：")
print("─" * 60)
bad_answer = ask_llm(bad_prompt)
print(bad_answer)
print("─" * 60)

print("\n❌ 问题分析：")
print("  - 参考资料里压根没提'早餐'和'民宿'")
print("  - 但大模型'好心'地自己补充了")
print("  - 说得有模有样，你不仔细看根本分不出哪些是文档里的，哪些是它编的")
print("  - 这在企业知识库、法律文档等严肃场景是致命的")

# ==================== 修复方案：严格约束 Prompt ====================

print("\n" + "=" * 60)
print("【修复方案】严格约束 Prompt")
print("=" * 60)

good_prompt = f"""你是一个企业知识库问答助手。请严格根据【参考资料】回答用户问题。

【核心规则】
1. 只基于参考资料中明确提到的信息回答
2. 如果参考资料中没有相关信息，必须明确说"根据现有资料，未找到相关信息"
3. 绝对禁止推测、补充、编造参考资料中没有的内容
4. 涉及数字、金额、日期的信息必须原文引用，不能近似

【参考资料】
{context}

【用户问题】
{question}

【回答格式】
对于能回答的部分，给出准确答案。对于资料中未提及的部分，明确标注"资料未提及"。"""

print(f"\n使用的 Prompt：")
print("─" * 60)
print(good_prompt)
print("─" * 60)

print("\n大模型的回答：")
print("─" * 60)
good_answer = ask_llm(good_prompt)
print(good_answer)
print("─" * 60)

print("\n✅ 效果分析：")
print("  - 知道的说，不知道的说'资料未提及'")
print("  - 不瞎编了，答案可信度大幅提升")
print("  - 用户可以清楚知道哪些信息是有依据的，哪些需要进一步查询")

# ==================== 对比总结 ====================

print("\n" + "=" * 60)
print("【对比总结】")
print("=" * 60)

print("\n┌─────────────────────────────────────────────────────────┐")
print("│ 坏 Prompt（没约束）                                      │")
print("├─────────────────────────────────────────────────────────┤")
print("│ ❌ 大模型会'好心'补充资料里没有的信息                    │")
print("│ ❌ 编造的内容和真实内容混在一起                          │")
print("│ ❌ 用户无法判断哪些是可信的                              │")
print("│ ❌ 严肃场景（企业知识库、法律、医疗）不可接受            │")
print("└─────────────────────────────────────────────────────────┘")

print("\n┌─────────────────────────────────────────────────────────┐")
print("│ 好 Prompt（严格约束）                                    │")
print("├─────────────────────────────────────────────────────────┤")
print("│ ✅ 只基于参考资料回答                                    │")
print("│ ✅ 资料里没有的明确说'资料未提及'                        │")
print("│ ✅ 数字、金额必须原文引用                                │")
print("│ ✅ 答案可追溯，可信度高                                  │")
print("└─────────────────────────────────────────────────────────┘")

# ==================== 四条管用的规矩 ====================

print("\n" + "=" * 60)
print("【四条管用的规矩】")
print("=" * 60)
print("""
1. 给它定角色
   "你是知识库问答助手"，别让它觉得自己是百科全书

2. 锁死信息源
   "只基于参考资料"，别用你自己的知识

3. 堵死编造的路（最关键）
   "资料里没有就说没有"，这条最关键

4. 约束格式
   "数字必须原文引用"，不然它会给你来个"大约500元"
""")

# ==================== 何时需要严格约束 ====================

print("=" * 60)
print("【总结】何时需要严格约束 Prompt？")
print("=" * 60)
print("""
✅ 需要严格约束：
  - RAG系统用于企业知识库、法律文档、医疗咨询等严肃场景
  - 大模型经常"补充"参考资料中没有的信息
  - 用户需要可追溯的答案来源，不能接受任何编造
  - 答案的准确性比完整性更重要

❌ 不需要严格约束：
  - 用于创意写作、头脑风暴等场景，需要大模型发挥想象力
  - 参考资料只是辅助，允许大模型结合自身知识回答
  - 文档覆盖率很高（>90%），大模型很少需要说"不知道"
  - 个人学习助手，允许大模型适当扩展

💡 经验值：
  - 企业级 RAG 系统必须严格约束 Prompt
  - 个人学习助手可以放宽
  - 关键是在"准确性"和"有用性"之间找平衡
  - 宁可说"不知道"，也不要编造
""")

# ==================== 更多测试案例 ====================

print("\n" + "=" * 60)
print("【更多测试】不同问题的表现")
print("=" * 60)

test_cases = [
    ("一线城市住宿标准是多少？", "资料里有，应该能准确回答"),
    ("住宿费可以超标吗？", "资料里没有，应该说'资料未提及'"),
    ("出差可以带家属吗？", "资料里没有，应该说'资料未提及'"),
]

for q, expected in test_cases:
    print(f"\n问题：{q}")
    print(f"预期：{expected}")

    test_prompt = f"""你是企业知识库问答助手。请严格根据参考资料回答。

【规则】
1. 只基于参考资料回答
2. 资料里没有的，说"资料未提及"
3. 禁止编造

【参考资料】
{context}

【问题】{q}"""

    answer = ask_llm(test_prompt)
    print(f"回答：{answer}")
    print("─" * 60)

print("\n✅ 观察：")
print("  - 资料里有的，准确回答")
print("  - 资料里没有的，明确说'资料未提及'")
print("  - 不会编造，不会推测")
print("  - 这就是严格约束 Prompt 的效果")

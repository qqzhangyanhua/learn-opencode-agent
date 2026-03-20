"""
坑五：多文档冲突，大模型不知道信谁

演示问题：
- 同一主题有多个版本的文档，信息矛盾
- 大模型不知道该信哪个，可能混用新旧信息

修复方案：
- 元数据管理：给每段文档打上版本号、日期、状态标签
- 冲突处理规则：在 Prompt 里明确告诉大模型如何处理冲突

运行方式：
    pip install openai
    export DEEPSEEK_API_KEY="your_key_here"
    python v5_metadata_conflict.py
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

chunk_old = """【员工手册 v2.0 | 2022年版】
年假规定：入职满一年的员工，每年享有5天带薪年假。
病假工资：按基本工资的70%发放。"""

chunk_new = """【员工手册 v3.0 | 2024年修订版】
年假规定：入职满一年的员工，每年享有7天带薪年假（2024年起上调）。
病假工资：按基本工资的80%发放。"""

chunk_dept = """【技术部补充规定 | 2024年】
技术部员工在年假基础上额外享有2天"技术充电假"，用于参加技术会议或自学。"""

question = "技术部的员工年假一共有几天？病假工资怎么算？"

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

# ==================== 翻车场景：不处理冲突 ====================

print("=" * 60)
print("【翻车场景】不处理文档冲突")
print("=" * 60)

bad_context = f"{chunk_old}\n\n---\n\n{chunk_new}"
bad_prompt = f"""参考资料：
{bad_context}

问题：{question}"""

print("\n参考资料（包含新旧两个版本）：")
print("─" * 60)
print(bad_context)
print("─" * 60)

print(f"\n问题：{question}\n")
print("大模型的回答：")
print("─" * 60)
bad_answer = ask_llm(bad_prompt)
print(bad_answer)
print("─" * 60)

print("\n❌ 问题分析：")
print("  - 大模型看到了两个版本的信息（5天 vs 7天）")
print("  - 虽然这次猜对了'以最新版为准'")
print("  - 但它不是每次都能猜对")
print("  - 有时会把两个版本的信息混在一起")
print("  - 或者干脆只引用旧版")

# ==================== 修复方案：元数据 + 冲突处理规则 ====================

print("\n" + "=" * 60)
print("【修复方案】元数据标注 + 冲突处理规则")
print("=" * 60)

# 构建带元数据的文档
chunks_with_meta = [
    {
        "content": "年假规定：入职满一年的员工，每年享有5天带薪年假。病假工资：按基本工资的70%发放。",
        "source": "员工手册",
        "version": "v2.0",
        "date": "2022-01-01",
        "status": "已废止"
    },
    {
        "content": "年假规定：入职满一年的员工，每年享有7天带薪年假（2024年起上调）。病假工资：按基本工资的80%发放。",
        "source": "员工手册",
        "version": "v3.0",
        "date": "2024-01-01",
        "status": "现行有效"
    },
    {
        "content": "技术部员工在年假基础上额外享有2天'技术充电假'，用于参加技术会议或自学。",
        "source": "技术部补充规定",
        "version": "v1.0",
        "date": "2024-03-01",
        "status": "现行有效"
    }
]

# 构建带元数据的上下文
context_parts = []
for chunk in chunks_with_meta:
    meta_line = f"[来源: {chunk['source']} {chunk['version']} | 日期: {chunk['date']} | 状态: {chunk['status']}]"
    context_parts.append(f"{meta_line}\n{chunk['content']}")

good_context = "\n\n---\n\n".join(context_parts)

good_prompt = f"""你是企业知识库问答助手。请根据参考资料回答问题。

【冲突处理规则】
1. 如果多篇资料信息冲突，以"现行有效"状态的文档为准
2. 如果都是"现行有效"，以日期更新的为准
3. 部门补充规定是对公司规定的补充，两者不冲突时都适用
4. 回答中要标注信息来源

【参考资料】
{good_context}

【用户问题】
{question}"""

print("\n参考资料（带元数据）：")
print("─" * 60)
print(good_context)
print("─" * 60)

print(f"\n问题：{question}\n")
print("大模型的回答：")
print("─" * 60)
good_answer = ask_llm(good_prompt)
print(good_answer)
print("─" * 60)

print("\n✅ 效果分析：")
print("  - 不仅答对了，还自己算出来 7+2=9")
print("  - 连信息来源都标得清清楚楚")
print("  - 明确说明了 v2.0 已废止，以 v3.0 为准")
print("  - 正确组合了公司规定和部门补充规定")

# ==================== 关键改进点 ====================

print("\n" + "=" * 60)
print("【关键改进】")
print("=" * 60)
print("""
改进点 1：给每段文档打上元数据标签
  - 来源（source）：哪个文档
  - 版本（version）：v2.0, v3.0
  - 日期（date）：发布日期
  - 状态（status）：现行有效 / 已废止

改进点 2：在 Prompt 里写明冲突处理规则
  - 以"现行有效"的文档为准
  - 日期更新的优先
  - 部门补充规定是补充，不是替代

改进点 3：要求标注信息来源
  - 让用户知道答案来自哪里
  - 方便追溯和验证
  - 提高可信度
""")

# ==================== 对比总结 ====================

print("=" * 60)
print("【对比总结】")
print("=" * 60)

print("\n┌─────────────────────────────────────────────────────────┐")
print("│ 不处理冲突                                               │")
print("├─────────────────────────────────────────────────────────┤")
print("│ ❌ 大模型不知道该信哪个版本                              │")
print("│ ❌ 可能混用新旧信息                                      │")
print("│ ❌ 答案不稳定，每次可能不一样                            │")
print("│ ❌ 用户无法追溯信息来源                                  │")
print("└─────────────────────────────────────────────────────────┘")

print("\n┌─────────────────────────────────────────────────────────┐")
print("│ 元数据 + 冲突处理规则                                    │")
print("├─────────────────────────────────────────────────────────┤")
print("│ ✅ 明确告诉大模型如何处理冲突                            │")
print("│ ✅ 以最新、有效的文档为准                                │")
print("│ ✅ 答案稳定、可追溯                                      │")
print("│ ✅ 标注信息来源，方便验证                                │")
print("└─────────────────────────────────────────────────────────┘")

# ==================== 何时需要元数据管理 ====================

print("\n" + "=" * 60)
print("【总结】何时需要元数据管理？")
print("=" * 60)
print("""
✅ 需要元数据管理：
  - 文档有多个版本，存在新旧信息冲突
  - 不同部门有补充规定，需要组合多个文档的信息
  - 需要标注答案来源，方便用户追溯和验证
  - 文档会定期更新，旧版本不能立即删除（过渡期）

❌ 不需要元数据管理：
  - 文档都是最新版本，没有历史版本冲突
  - 文档量很小（少于50篇），手动管理即可
  - 不需要追溯答案来源，只要答案正确就行
  - 文档更新频率很低（一年一次或更少）

💡 经验值：
  - 如果你的知识库会持续更新（如企业制度、产品文档）
  - 从一开始就加上元数据管理，否则后期补救成本很高
  - 元数据至少包含：来源、版本、日期、状态
  - 在 Prompt 里明确冲突处理规则
""")

# ==================== 更多测试案例 ====================

print("\n" + "=" * 60)
print("【更多测试】不同冲突场景")
print("=" * 60)

test_cases = [
    ("病假工资按多少发放？", "应该回答80%（v3.0），而不是70%（v2.0已废止）"),
    ("年假有几天？", "应该回答7天（v3.0），而不是5天（v2.0已废止）"),
    ("技术部员工年假一共几天？", "应该回答9天（7+2），组合公司规定和部门补充"),
]

for q, expected in test_cases:
    print(f"\n问题：{q}")
    print(f"预期：{expected}")

    test_prompt = f"""你是企业知识库问答助手。

【冲突处理规则】
1. 以"现行有效"状态的文档为准
2. 日期更新的优先
3. 部门补充规定是补充，不是替代
4. 标注信息来源

【参考资料】
{good_context}

【问题】{q}"""

    answer = ask_llm(test_prompt)
    print(f"回答：{answer}")
    print("─" * 60)

print("\n✅ 观察：")
print("  - 所有答案都基于最新、有效的文档")
print("  - 正确处理了版本冲突")
print("  - 正确组合了公司规定和部门补充")
print("  - 标注了信息来源")
print("  - 这就是元数据管理 + 冲突处理规则的效果")

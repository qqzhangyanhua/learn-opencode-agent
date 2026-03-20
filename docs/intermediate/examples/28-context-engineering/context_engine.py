"""
上下文工程实战：选、排、压、拼
完整可运行示例 —— 对应文章第 16 篇

运行：
    export DEEPSEEK_API_KEY="your_key"
    python context_engine.py
"""
import os
import json
from openai import OpenAI
import tiktoken
import chromadb

# ==================== 环境配置 ====================

client = OpenAI(
    base_url="https://api.deepseek.com",
    api_key=os.getenv("DEEPSEEK_API_KEY")
)
MODEL_NAME = "deepseek-chat"


# ==================== 基础工具 ====================

def count_tokens(text: str, model: str = "gpt-4o") -> int:
    """计算文本的 token 数"""
    try:
        enc = tiktoken.encoding_for_model(model)
    except KeyError:
        enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(text))


# ==================== 选：相关性过滤 ====================

def filter_by_relevance(
    query: str, documents: list[dict], threshold: float = 0.6
) -> list[dict]:
    """用 LLM 评估每段文档与问题的相关性，过滤掉不相关的"""
    filtered = []
    for doc in documents:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{
                "role": "user",
                "content": (
                    f"判断以下文档与问题的相关性。\n\n"
                    f"问题：{query}\n"
                    f"文档：{doc['content'][:500]}\n\n"
                    f"只返回一个 0 到 1 之间的数字，表示相关程度。"
                    f"1 = 完全相关，0 = 完全无关。只返回数字，不要其他内容。"
                )
            }],
            temperature=0
        )
        try:
            score = float(response.choices[0].message.content.strip())
            if score >= threshold:
                doc["relevance_score"] = score
                filtered.append(doc)
        except ValueError:
            pass
    return sorted(filtered, key=lambda x: x["relevance_score"], reverse=True)


def select_relevant_history(
    history: list[dict],
    current_query: str,
    max_turns: int = 5
) -> list[dict]:
    """从历史对话中挑选与当前问题相关的轮次"""
    if len(history) <= max_turns * 2:
        return history

    system_msgs = [m for m in history if m["role"] == "system"]
    conversations = [m for m in history if m["role"] != "system"]

    turns = []
    for i in range(0, len(conversations) - 1, 2):
        if i + 1 < len(conversations):
            turns.append((conversations[i], conversations[i + 1]))

    must_keep = turns[-2:] if len(turns) >= 2 else turns[:]
    candidates = turns[:-2] if len(turns) > 2 else []

    scored = []
    query_words = set(current_query)
    for turn in candidates:
        turn_text = turn[0]["content"] + turn[1]["content"]
        turn_words = set(turn_text)
        overlap = len(query_words & turn_words) / max(len(query_words), 1)
        scored.append((overlap, turn))

    scored.sort(key=lambda x: x[0], reverse=True)
    selected = [t for _, t in scored[:max_turns - len(must_keep)]]

    all_selected = selected + must_keep
    result_msgs = system_msgs[:]
    for turn in turns:
        if turn in all_selected:
            result_msgs.extend(turn)

    return result_msgs


# ==================== 排：信息排列 ====================

def arrange_context(
    system_prompt: str,
    retrieved_docs: list[dict],
    history: list[dict],
    user_query: str,
    tool_results: list[str] | None = None
) -> list[dict]:
    """按最优顺序组装上下文"""
    messages: list[dict] = []
    messages.append({"role": "system", "content": system_prompt})
    messages.extend(history)

    context_parts = []
    if retrieved_docs:
        docs_text = "\n\n".join(
            f"【参考资料 {i+1}】\n{doc['content']}"
            for i, doc in enumerate(retrieved_docs)
        )
        context_parts.append(f"以下是与问题相关的参考资料：\n\n{docs_text}")

    if tool_results:
        tools_text = "\n\n".join(
            f"【工具输出 {i+1}】\n{result}"
            for i, result in enumerate(tool_results)
        )
        context_parts.append(f"以下是工具执行的结果：\n\n{tools_text}")

    context_parts.append(f"基于以上信息，请回答：{user_query}")
    messages.append({"role": "user", "content": "\n\n---\n\n".join(context_parts)})
    return messages


# ==================== 压：历史压缩 ====================

def progressive_compress(
    history: list[dict],
    max_tokens: int = 4000
) -> list[dict]:
    """渐进式压缩：近的保原文，远的压摘要，更远的提关键事实"""
    system_msgs = [m for m in history if m["role"] == "system"]
    conversations = [m for m in history if m["role"] != "system"]

    turns = []
    for i in range(0, len(conversations) - 1, 2):
        if i + 1 < len(conversations):
            turns.append([conversations[i], conversations[i + 1]])

    if not turns:
        return history

    total_text = " ".join(m["content"] for m in conversations)
    total_tokens = count_tokens(total_text)

    if total_tokens <= max_tokens:
        return history

    recent = turns[-3:]
    middle = turns[-8:-3] if len(turns) > 3 else []
    old = turns[:-8] if len(turns) > 8 else []

    compressed: list[dict] = system_msgs[:]

    if old:
        old_text = "\n".join(
            f"用户：{t[0]['content']}\n助手：{t[1]['content']}"
            for t in old
        )
        facts_response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{
                "role": "user",
                "content": (
                    f"从以下对话中提取关键事实，用简短的要点列表表示，"
                    f"只保留对后续对话有用的信息：\n\n{old_text}"
                )
            }],
            temperature=0
        )
        facts = facts_response.choices[0].message.content
        compressed.append({
            "role": "system",
            "content": f"[早期对话关键事实]\n{facts}"
        })

    if middle:
        middle_text = "\n".join(
            f"用户：{t[0]['content']}\n助手：{t[1]['content']}"
            for t in middle
        )
        summary_response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{
                "role": "user",
                "content": f"用 2-3 句话概括以下对话的主要内容：\n\n{middle_text}"
            }],
            temperature=0
        )
        summary = summary_response.choices[0].message.content
        compressed.append({
            "role": "system",
            "content": f"[近期对话摘要]\n{summary}"
        })

    for turn in recent:
        compressed.extend(turn)

    return compressed


def compress_document(doc: str, query: str, max_sentences: int = 3) -> str:
    """把长文档压缩成与问题最相关的几句话"""
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{
            "role": "user",
            "content": (
                f"从以下文档中提取与问题最相关的内容，"
                f"最多 {max_sentences} 句话，保留关键数据和结论。\n\n"
                f"问题：{query}\n\n"
                f"文档：{doc}"
            )
        }],
        temperature=0
    )
    return response.choices[0].message.content


# ==================== 拼：上下文预算 + 引擎 ====================

class ContextBudget:
    """上下文预算管理器"""

    def __init__(self, max_tokens: int = 8000, reserved_for_output: int = 2000):
        self.max_tokens = max_tokens
        self.reserved_for_output = reserved_for_output
        self.available = max_tokens - reserved_for_output
        self.allocations: dict[str, int] = {}

    def allocate(self) -> dict[str, int]:
        budget = self.available
        alloc: dict[str, int] = {}
        alloc["system_prompt"] = min(1000, budget)
        budget -= alloc["system_prompt"]
        alloc["current_query"] = min(500, budget)
        budget -= alloc["current_query"]
        alloc["retrieved_docs"] = int(budget * 0.5)
        budget -= alloc["retrieved_docs"]
        alloc["tool_results"] = int(budget * 0.4)
        budget -= alloc["tool_results"]
        alloc["history"] = budget
        self.allocations = alloc
        return alloc

    def report(self) -> str:
        if not self.allocations:
            self.allocate()
        lines = [f"总预算：{self.max_tokens} tokens（输出预留 {self.reserved_for_output}）"]
        for name, tokens in self.allocations.items():
            pct = tokens / self.available * 100
            lines.append(f"  {name}: {tokens} tokens ({pct:.0f}%)")
        return "\n".join(lines)


class ContextEngine:
    """上下文工程引擎：负责选、排、压、拼"""

    def __init__(self, max_context_tokens: int = 8000):
        self.budget = ContextBudget(max_tokens=max_context_tokens)
        self.budget.allocate()

    def build_context(
        self,
        system_prompt: str,
        user_query: str,
        history: list[dict] | None = None,
        retrieved_docs: list[dict] | None = None,
        tool_results: list[str] | None = None
    ) -> list[dict]:
        """一站式上下文组装"""
        messages: list[dict] = []

        sys_tokens = self.budget.allocations["system_prompt"]
        trimmed_system = self._trim_to_budget(system_prompt, sys_tokens)
        messages.append({"role": "system", "content": trimmed_system})

        if history:
            hist_tokens = self.budget.allocations["history"]
            compressed_history = self._compress_history(history, hist_tokens)
            messages.extend(compressed_history)

        user_parts: list[str] = []

        if retrieved_docs:
            doc_tokens = self.budget.allocations["retrieved_docs"]
            filtered_docs = self._filter_docs(retrieved_docs, user_query)
            docs_text = self._format_docs(filtered_docs, doc_tokens)
            if docs_text:
                user_parts.append(f"参考资料：\n{docs_text}")

        if tool_results:
            tool_tokens = self.budget.allocations["tool_results"]
            tools_text = self._trim_to_budget(
                "\n\n".join(f"[工具输出 {i+1}] {r}" for i, r in enumerate(tool_results)),
                tool_tokens
            )
            user_parts.append(f"工具执行结果：\n{tools_text}")

        user_parts.append(f"请回答：{user_query}")
        messages.append({"role": "user", "content": "\n\n---\n\n".join(user_parts)})
        return messages

    def _trim_to_budget(self, text: str, max_tokens: int) -> str:
        tokens = count_tokens(text)
        if tokens <= max_tokens:
            return text
        ratio = max_tokens / tokens
        return text[:int(len(text) * ratio * 0.9)]

    def _compress_history(self, history: list[dict], max_tokens: int) -> list[dict]:
        non_system = [m for m in history if m["role"] != "system"]
        total = count_tokens(" ".join(m["content"] for m in non_system))
        if total <= max_tokens:
            return non_system
        result: list[dict] = []
        current_tokens = 0
        for msg in reversed(non_system):
            msg_tokens = count_tokens(msg["content"])
            if current_tokens + msg_tokens > max_tokens:
                break
            result.insert(0, msg)
            current_tokens += msg_tokens
        return result

    def _filter_docs(self, docs: list[dict], query: str) -> list[dict]:
        if any("relevance_score" in d for d in docs):
            return [d for d in docs if d.get("relevance_score", 0) >= 0.5]
        return docs

    def _format_docs(self, docs: list[dict], max_tokens: int) -> str:
        parts: list[str] = []
        current_tokens = 0
        for i, doc in enumerate(docs):
            text = f"【{i+1}】{doc['content']}"
            t = count_tokens(text)
            if current_tokens + t > max_tokens:
                break
            parts.append(text)
            current_tokens += t
        return "\n\n".join(parts)


# ==================== System Prompt 设计 ====================

def build_system_prompt(
    role: str,
    capabilities: list[str],
    constraints: list[str],
    output_format: str,
    context_instructions: str = ""
) -> str:
    """构建结构化的 System Prompt"""
    sections = [
        f"# 角色\n你是{role}。",
        f"# 能力\n" + "\n".join(f"- {c}" for c in capabilities),
        f"# 约束\n" + "\n".join(f"- {c}" for c in constraints),
        f"# 输出格式\n{output_format}",
    ]
    if context_instructions:
        sections.append(f"# 上下文使用说明\n{context_instructions}")
    return "\n\n".join(sections)


PROMPT_TEMPLATES: dict[str, dict] = {
    "technical": {
        "role": "Python 技术顾问",
        "style": "专业、简洁、给代码示例",
        "constraints": "只基于参考资料回答，不编造"
    },
    "casual": {
        "role": "友好的 AI 助手",
        "style": "轻松、有趣、可以聊天",
        "constraints": "保持友好，不涉及敏感话题"
    },
    "code_review": {
        "role": "资深代码审查员",
        "style": "严格、指出问题、给改进建议",
        "constraints": "关注安全性、性能和可维护性"
    }
}


def classify_intent(query: str) -> str:
    """简单的意图分类"""
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{
            "role": "user",
            "content": (
                f"判断以下用户输入属于哪个类别，只返回类别名：\n"
                f"- technical（技术问题）\n"
                f"- casual（闲聊）\n"
                f"- code_review（代码审查）\n\n"
                f"用户输入：{query}\n\n"
                f"只返回一个类别名，不要其他内容。"
            )
        }],
        temperature=0
    )
    intent = response.choices[0].message.content.strip().lower()
    return intent if intent in PROMPT_TEMPLATES else "technical"


def get_dynamic_system_prompt(query: str) -> str:
    """根据用户意图动态选择 System Prompt"""
    intent = classify_intent(query)
    template = PROMPT_TEMPLATES[intent]
    return (
        f"你是{template['role']}。\n"
        f"回答风格：{template['style']}。\n"
        f"约束：{template['constraints']}。"
    )


# ==================== 完整智能体 ====================

class ContextAwareAgent:
    """上下文感知智能体：自动管理上下文质量"""

    def __init__(self, max_tokens: int = 8000):
        self.engine = ContextEngine(max_context_tokens=max_tokens)
        self.history: list[dict] = []
        self.knowledge_base = self._init_knowledge_base()

    def _init_knowledge_base(self) -> chromadb.Collection:
        chroma = chromadb.Client()
        collection = chroma.get_or_create_collection("tech_docs")
        docs = [
            "FastAPI 是高性能 Python Web 框架，基于 Starlette，支持异步，基准测试 9000+ req/s。",
            "Django 是全功能 Python Web 框架，内置 ORM、Admin、认证系统，适合大型项目。",
            "Flask 是轻量级 Python Web 框架，核心精简，通过扩展添加功能，适合小型项目和微服务。",
            "Uvicorn 是 ASGI 服务器，常配合 FastAPI 使用，支持 HTTP/2 和 WebSocket。",
            "SQLAlchemy 是 Python 最流行的 ORM，支持多种数据库，Django 内置自己的 ORM。",
            "pytest 是 Python 最流行的测试框架，支持参数化、fixture、插件等高级功能。",
        ]
        ids = [f"doc_{i}" for i in range(len(docs))]
        existing = collection.get()["ids"]
        new_docs = [(id_, doc) for id_, doc in zip(ids, docs) if id_ not in existing]
        if new_docs:
            collection.add(
                ids=[x[0] for x in new_docs],
                documents=[x[1] for x in new_docs]
            )
        return collection

    def _retrieve(self, query: str, top_k: int = 3) -> list[dict]:
        results = self.knowledge_base.query(query_texts=[query], n_results=top_k)
        docs = []
        if results["documents"]:
            for doc, dist in zip(results["documents"][0], results["distances"][0]):
                relevance = max(0, 1 - dist)
                docs.append({"content": doc, "relevance_score": relevance})
        return docs

    def chat(self, user_input: str) -> str:
        system_prompt = get_dynamic_system_prompt(user_input)
        docs = self._retrieve(user_input)
        messages = self.engine.build_context(
            system_prompt=system_prompt,
            user_query=user_input,
            history=self.history,
            retrieved_docs=docs,
        )
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.7
        )
        answer = response.choices[0].message.content
        self.history.append({"role": "user", "content": user_input})
        self.history.append({"role": "assistant", "content": answer})
        return answer

    def show_stats(self) -> None:
        total_history_tokens = count_tokens(
            " ".join(m["content"] for m in self.history)
        )
        print(f"对话轮数：{len(self.history) // 2}")
        print(f"历史 token 数：{total_history_tokens}")
        print(f"预算分配：")
        print(self.engine.budget.report())


# ==================== 运行演示 ====================

if __name__ == "__main__":
    if not os.getenv("DEEPSEEK_API_KEY"):
        print("请先设置环境变量 DEEPSEEK_API_KEY")
        print("  export DEEPSEEK_API_KEY='your_key'")
        exit(1)

    print("=" * 60)
    print("Demo 1：上下文预算分配")
    print("=" * 60)
    budget = ContextBudget(max_tokens=8000, reserved_for_output=2000)
    print(budget.report())

    print("\n" + "=" * 60)
    print("Demo 2：上下文引擎组装")
    print("=" * 60)
    engine = ContextEngine(max_context_tokens=6000)
    messages = engine.build_context(
        system_prompt="你是一个 Python 技术顾问，基于提供的资料回答问题。",
        user_query="FastAPI 和 Django 性能差多少？",
        history=[
            {"role": "user", "content": "我想做一个 API 服务"},
            {"role": "assistant", "content": "好的，你对性能有什么具体要求？"},
        ],
        retrieved_docs=[
            {"content": "FastAPI 在基准测试中达到 9000+ req/s，接近 Go 的性能"},
            {"content": "Django 的同步模式约 1500 req/s，配合 ASGI 可提升到 4000+"},
        ],
        tool_results=["基准测试：FastAPI=9200 req/s, Django+ASGI=4100 req/s"]
    )
    print(f"组装完成，共 {len(messages)} 条消息：")
    for msg in messages:
        print(f"  [{msg['role']}] {msg['content'][:80]}...")

    print("\n" + "=" * 60)
    print("Demo 3：上下文感知智能体对话")
    print("=" * 60)
    agent = ContextAwareAgent(max_tokens=6000)
    questions = [
        "FastAPI 和 Django 哪个性能更好？",
        "如果我要做一个内部管理系统呢？",
        "那测试怎么写？用什么框架？",
    ]
    for q in questions:
        print(f"\n用户：{q}")
        answer = agent.chat(q)
        print(f"助手：{answer}")

    print("\n--- 统计 ---")
    agent.show_stats()

"""
性能与成本控制：Token 计量 + 模型路由 + 上下文预算
原始来源：AI 智能体系列第 20 篇
当前对应：中级篇第 32 章

运行：
    export DEEPSEEK_API_KEY="your_key"
    python performance_cost.py
"""
import os
import time
from dataclasses import dataclass, field
from openai import OpenAI

client = OpenAI(
    base_url="https://api.deepseek.com",
    api_key=os.getenv("DEEPSEEK_API_KEY")
)

# 模型分层：便宜模型 vs 强模型（演示用同一 endpoint，真实系统中可指向不同 provider）
CHEAP_MODEL = "deepseek-chat"
STRONG_MODEL = "deepseek-chat"

# 定价（USD / 百万 token，以 DeepSeek 为例）
PRICING: dict[str, dict[str, float]] = {
    "deepseek-chat": {"input": 0.14, "output": 0.28},
}


# ==================== Token 计量 ====================

def count_tokens_approx(text: str) -> int:
    """粗略估算：中文约 1.5 字/token，英文约 4 字/token"""
    chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    other_chars = len(text) - chinese_chars
    return int(chinese_chars / 1.5 + other_chars / 4)


def estimate_cost(input_tokens: int, output_tokens: int, model: str) -> float:
    """估算单次调用成本（USD）"""
    pricing = PRICING.get(model, {"input": 0.14, "output": 0.28})
    return (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000


# ==================== 成本预估器 ====================

@dataclass
class CostEstimate:
    daily_conversations: int
    turns_per_conversation: int
    tokens_per_turn: int
    model: str = "deepseek-chat"

    def monthly_cost_usd(self) -> float:
        monthly_input = self.daily_conversations * self.turns_per_conversation * self.tokens_per_turn * 30
        monthly_output = monthly_input * 0.3  # 输出约为输入的 30%
        pricing = PRICING.get(self.model, {"input": 0.14, "output": 0.28})
        return (monthly_input * pricing["input"] + monthly_output * pricing["output"]) / 1_000_000

    def report(self) -> str:
        cost = self.monthly_cost_usd()
        monthly_tokens = self.daily_conversations * self.turns_per_conversation * self.tokens_per_turn * 30
        return (
            f"月度成本估算\n"
            f"  日对话数：{self.daily_conversations}\n"
            f"  每对话轮次：{self.turns_per_conversation}\n"
            f"  每轮 token：{self.tokens_per_turn}\n"
            f"  月总 token：{monthly_tokens:,}\n"
            f"  月成本（{self.model}）：${cost:.4f} USD"
        )


# ==================== 成本感知路由器 ====================

COMPLEXITY_THRESHOLDS = {
    "simple": 50,    # 字符数 < 50：简单问题
    "medium": 200,   # 字符数 < 200：中等复杂度
    # 其余：复杂问题
}

KEYWORD_COMPLEXITY = {
    "high": ["分析", "设计", "架构", "优化", "比较", "为什么", "如何实现"],
    "low": ["是什么", "定义", "什么意思", "翻译"],
}


def estimate_complexity(query: str) -> str:
    """启发式复杂度判断，不调用 LLM"""
    length = len(query)

    # 关键词优先
    for kw in KEYWORD_COMPLEXITY["high"]:
        if kw in query:
            return "high"
    for kw in KEYWORD_COMPLEXITY["low"]:
        if kw in query:
            return "low"

    # 长度兜底
    if length < COMPLEXITY_THRESHOLDS["simple"]:
        return "low"
    if length < COMPLEXITY_THRESHOLDS["medium"]:
        return "medium"
    return "high"


class CostAwareRouter:
    """成本感知路由：把请求分层到不同模型"""

    def __init__(self):
        self.call_log: list[dict] = []

    def route(self, query: str) -> str:
        complexity = estimate_complexity(query)
        model = CHEAP_MODEL if complexity == "low" else STRONG_MODEL
        return model

    def call(self, query: str, system_prompt: str = "") -> tuple[str, dict]:
        model = self.route(query)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": query})

        start = time.time()
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7
        )
        latency_ms = (time.time() - start) * 1000

        input_tokens = resp.usage.prompt_tokens if resp.usage else count_tokens_approx(query)
        output_tokens = resp.usage.completion_tokens if resp.usage else 0
        cost = estimate_cost(input_tokens, output_tokens, model)
        complexity = estimate_complexity(query)

        stats = {
            "model": model,
            "complexity": complexity,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost,
            "latency_ms": round(latency_ms, 1),
        }
        self.call_log.append(stats)
        return resp.choices[0].message.content, stats

    def budget_summary(self) -> dict:
        if not self.call_log:
            return {}
        total_cost = sum(c["cost_usd"] for c in self.call_log)
        total_input = sum(c["input_tokens"] for c in self.call_log)
        total_output = sum(c["output_tokens"] for c in self.call_log)
        avg_latency = sum(c["latency_ms"] for c in self.call_log) / len(self.call_log)
        by_complexity = {}
        for log in self.call_log:
            c = log["complexity"]
            by_complexity[c] = by_complexity.get(c, 0) + 1
        return {
            "total_calls": len(self.call_log),
            "total_cost_usd": round(total_cost, 6),
            "total_tokens": total_input + total_output,
            "avg_latency_ms": round(avg_latency, 1),
            "by_complexity": by_complexity,
        }


# ==================== 上下文预算管理 ====================

@dataclass
class ContextBudget:
    max_tokens: int = 8000
    reserved_output: int = 2000

    @property
    def available(self) -> int:
        return self.max_tokens - self.reserved_output

    def allocate(self) -> dict[str, int]:
        budget = self.available
        alloc: dict[str, int] = {}
        alloc["system_prompt"] = min(1000, budget)
        budget -= alloc["system_prompt"]
        alloc["current_query"] = min(500, budget)
        budget -= alloc["current_query"]
        alloc["retrieved_docs"] = int(budget * 0.5)
        budget -= alloc["retrieved_docs"]
        alloc["tool_results"] = int(budget * 0.3)
        budget -= alloc["tool_results"]
        alloc["history"] = budget
        return alloc

    def report(self) -> str:
        alloc = self.allocate()
        lines = [f"上下文预算（总 {self.max_tokens}，输出预留 {self.reserved_output}）"]
        for name, tokens in alloc.items():
            pct = tokens / self.available * 100
            lines.append(f"  {name}: {tokens} tokens ({pct:.0f}%)")
        return "\n".join(lines)


def trim_to_budget(text: str, max_tokens: int) -> tuple[str, bool]:
    """按 token 预算截断文本，返回截断后文本和是否被截断"""
    approx = count_tokens_approx(text)
    if approx <= max_tokens:
        return text, False
    # 粗略按比例截断
    ratio = max_tokens / approx
    trimmed = text[:int(len(text) * ratio * 0.85)]
    return trimmed + " ...[已截断]", True


def compress_history(
    messages: list[dict],
    max_tokens: int
) -> list[dict]:
    """历史压缩：保留最近 N 轮，超出则从旧到新丢弃"""
    non_system = [m for m in messages if m["role"] != "system"]
    total = sum(count_tokens_approx(m["content"]) for m in non_system)
    if total <= max_tokens:
        return messages

    result: list[dict] = [m for m in messages if m["role"] == "system"]
    current = 0
    for msg in reversed(non_system):
        t = count_tokens_approx(msg["content"])
        if current + t > max_tokens:
            break
        result.insert(len([m for m in messages if m["role"] == "system"]), msg)
        current += t
    return result


# ==================== 运行演示 ====================

if __name__ == "__main__":
    if not os.getenv("DEEPSEEK_API_KEY"):
        print("请先设置环境变量 DEEPSEEK_API_KEY")
        print("  export DEEPSEEK_API_KEY='your_key'")
        exit(1)

    print("=" * 60)
    print("Demo 1：月度成本预估")
    print("=" * 60)
    scenarios = [
        CostEstimate(daily_conversations=100, turns_per_conversation=5, tokens_per_turn=2000),
        CostEstimate(daily_conversations=1000, turns_per_conversation=5, tokens_per_turn=2000),
        CostEstimate(daily_conversations=10000, turns_per_conversation=3, tokens_per_turn=1500),
    ]
    for s in scenarios:
        print(f"\n  {s.report()}")

    print("\n" + "=" * 60)
    print("Demo 2：成本感知模型路由")
    print("=" * 60)
    router = CostAwareRouter()
    questions = [
        "什么是 Python？",                              # low
        "FastAPI 和 Flask 的区别是什么？",              # medium/low
        "如何设计一个高可用的微服务架构，分析各层职责？",   # high
        "定义：什么叫异步编程",                         # low
        "为什么 Redis 比 Memcached 在持久化上有优势？",   # high
    ]
    for q in questions:
        answer, stats = router.call(q)
        print(f"\n  问题：{q[:50]}")
        print(f"  → 复杂度：{stats['complexity']} | 模型：{stats['model']} | "
              f"tokens: {stats['input_tokens']}+{stats['output_tokens']} | "
              f"成本: ${stats['cost_usd']:.6f} | 延迟: {stats['latency_ms']}ms")

    print("\n" + "=" * 60)
    print("Demo 3：路由预算汇总")
    print("=" * 60)
    summary = router.budget_summary()
    for k, v in summary.items():
        print(f"  {k}: {v}")

    print("\n" + "=" * 60)
    print("Demo 4：上下文预算分配")
    print("=" * 60)
    budget = ContextBudget(max_tokens=8000, reserved_output=2000)
    print(budget.report())

    print("\n" + "=" * 60)
    print("Demo 5：工具输出截断策略")
    print("=" * 60)
    tool_output = "搜索结果：" + "这是一段很长的工具输出内容，包含大量的详细信息。" * 50
    trimmed, was_trimmed = trim_to_budget(tool_output, max_tokens=200)
    print(f"  原始长度：{count_tokens_approx(tool_output)} tokens（估算）")
    print(f"  截断后：{count_tokens_approx(trimmed)} tokens（估算）")
    print(f"  是否截断：{was_trimmed}")
    print(f"  截断结果（前100字）：{trimmed[:100]}...")

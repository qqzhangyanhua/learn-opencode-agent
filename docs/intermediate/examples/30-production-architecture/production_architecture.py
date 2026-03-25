"""
生产架构：从 Demo 到可上线系统
原始来源：AI 智能体系列第 18 篇
当前对应：中级篇第 30 章

运行：
    export DEEPSEEK_API_KEY="your_key"
    python production_architecture.py
"""
import os
import time
import uuid
import json
from dataclasses import dataclass, field
from openai import OpenAI

client = OpenAI(
    base_url="https://api.deepseek.com",
    api_key=os.getenv("DEEPSEEK_API_KEY")
)
MODEL_NAME = "deepseek-chat"
FALLBACK_MODEL = "deepseek-chat"  # 真实系统中可换为其他可用模型


# ==================== 会话状态（持久化层） ====================

@dataclass
class Message:
    role: str
    content: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class Session:
    session_id: str
    messages: list[Message] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def add_message(self, role: str, content: str) -> None:
        self.messages.append(Message(role=role, content=content))
        self.updated_at = time.time()

    def to_llm_messages(self) -> list[dict]:
        return [{"role": m.role, "content": m.content} for m in self.messages]


class SessionStore:
    """会话存储：生产环境应换成 SQLite / Redis"""

    def __init__(self):
        self._store: dict[str, Session] = {}

    def create(self, system_prompt: str = "") -> Session:
        session_id = str(uuid.uuid4())[:8]
        session = Session(session_id=session_id)
        if system_prompt:
            session.add_message("system", system_prompt)
        self._store[session_id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        return self._store.get(session_id)

    def list_sessions(self) -> list[str]:
        return list(self._store.keys())


# ==================== 可观测性（横切关注点） ====================

@dataclass
class RequestTrace:
    request_id: str
    session_id: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: float = 0.0
    retries: int = 0
    fallback_used: bool = False
    error: str | None = None

    def cost_usd(self, input_price: float = 0.14, output_price: float = 0.28) -> float:
        """估算成本（以 DeepSeek 价格为例，单位：USD/百万 token）"""
        return (self.input_tokens * input_price + self.output_tokens * output_price) / 1_000_000


class ObservabilityLayer:
    """观测层：记录每次调用的链路信息"""

    def __init__(self):
        self.traces: list[RequestTrace] = []

    def record(self, trace: RequestTrace) -> None:
        self.traces.append(trace)
        status = "FALLBACK" if trace.fallback_used else ("ERROR" if trace.error else "OK")
        print(
            f"  [TRACE] req={trace.request_id} sess={trace.session_id} "
            f"model={trace.model} status={status} "
            f"tokens={trace.input_tokens}+{trace.output_tokens} "
            f"latency={trace.latency_ms:.0f}ms retries={trace.retries} "
            f"cost=${trace.cost_usd():.6f}"
        )

    def summary(self) -> dict:
        if not self.traces:
            return {}
        total_cost = sum(t.cost_usd() for t in self.traces)
        total_input = sum(t.input_tokens for t in self.traces)
        total_output = sum(t.output_tokens for t in self.traces)
        errors = sum(1 for t in self.traces if t.error)
        fallbacks = sum(1 for t in self.traces if t.fallback_used)
        avg_latency = sum(t.latency_ms for t in self.traces) / len(self.traces)
        return {
            "total_requests": len(self.traces),
            "total_cost_usd": round(total_cost, 6),
            "total_tokens": total_input + total_output,
            "error_rate": f"{errors}/{len(self.traces)}",
            "fallback_rate": f"{fallbacks}/{len(self.traces)}",
            "avg_latency_ms": round(avg_latency, 1),
        }


# ==================== Provider 层（故障转移） ====================

class ProviderWithFallback:
    """模型调用层：带重试和主备切换"""

    def __init__(self, primary: str, fallback: str, max_retries: int = 2):
        self.primary = primary
        self.fallback = fallback
        self.max_retries = max_retries

    def call(
        self,
        messages: list[dict],
        trace: RequestTrace,
        temperature: float = 0.7
    ) -> str:
        start = time.time()

        for attempt in range(self.max_retries + 1):
            model = self.primary if attempt < self.max_retries else self.fallback
            if attempt > 0:
                trace.retries = attempt
            if model == self.fallback and attempt > 0:
                trace.fallback_used = True

            try:
                resp = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature
                )
                trace.model = model
                trace.input_tokens = resp.usage.prompt_tokens if resp.usage else 0
                trace.output_tokens = resp.usage.completion_tokens if resp.usage else 0
                trace.latency_ms = (time.time() - start) * 1000
                return resp.choices[0].message.content

            except Exception as e:
                if attempt == self.max_retries:
                    trace.error = str(e)
                    trace.latency_ms = (time.time() - start) * 1000
                    raise
                print(f"  [RETRY] attempt={attempt+1} error={e}")
                time.sleep(0.5 * (attempt + 1))

        raise RuntimeError("所有重试均失败")


# ==================== 编排层（主循环） ====================

class ProductionAgent:
    """生产级 Agent：会话管理 + Provider 故障转移 + 观测"""

    SYSTEM_PROMPT = (
        "你是一个专业的 AI 助手，回答简洁准确。"
        "不确定时先说明缺少信息，不推测。"
    )

    def __init__(self):
        self.store = SessionStore()
        self.provider = ProviderWithFallback(
            primary=MODEL_NAME,
            fallback=FALLBACK_MODEL
        )
        self.obs = ObservabilityLayer()

    def new_session(self) -> str:
        session = self.store.create(system_prompt=self.SYSTEM_PROMPT)
        print(f"  [SESSION] 创建会话 {session.session_id}")
        return session.session_id

    def chat(self, session_id: str, user_input: str) -> str:
        session = self.store.get(session_id)
        if not session:
            raise ValueError(f"会话 {session_id} 不存在")

        session.add_message("user", user_input)

        trace = RequestTrace(
            request_id=str(uuid.uuid4())[:8],
            session_id=session_id,
            model=MODEL_NAME,
        )

        answer = self.provider.call(
            messages=session.to_llm_messages(),
            trace=trace,
        )
        session.add_message("assistant", answer)
        self.obs.record(trace)
        return answer

    def get_session_stats(self, session_id: str) -> dict:
        session = self.store.get(session_id)
        if not session:
            return {}
        non_system = [m for m in session.messages if m.role != "system"]
        return {
            "session_id": session_id,
            "turns": len(non_system) // 2,
            "message_count": len(non_system),
            "duration_s": round(session.updated_at - session.created_at, 1),
        }


# ==================== 运行演示 ====================

if __name__ == "__main__":
    if not os.getenv("DEEPSEEK_API_KEY"):
        print("请先设置环境变量 DEEPSEEK_API_KEY")
        print("  export DEEPSEEK_API_KEY='your_key'")
        exit(1)

    agent = ProductionAgent()

    print("=" * 60)
    print("Demo 1：会话创建与多轮对话")
    print("=" * 60)
    sess1 = agent.new_session()
    conversations = [
        "什么是 Python 的 GIL？",
        "它对多线程性能有什么影响？",
        "如何绕过这个限制？",
    ]
    for q in conversations:
        print(f"\n  用户：{q}")
        answer = agent.chat(sess1, q)
        print(f"  助手：{answer[:200]}...")

    print("\n" + "=" * 60)
    print("Demo 2：多个并发会话（会话隔离）")
    print("=" * 60)
    sess2 = agent.new_session()
    sess3 = agent.new_session()

    print(f"\n  会话 {sess2}：")
    ans2 = agent.chat(sess2, "FastAPI 和 Flask 的核心区别是什么？")
    print(f"  助手：{ans2[:150]}...")

    print(f"\n  会话 {sess3}：")
    ans3 = agent.chat(sess3, "Redis 和 Memcached 的主要区别？")
    print(f"  助手：{ans3[:150]}...")

    print("\n" + "=" * 60)
    print("Demo 3：会话统计")
    print("=" * 60)
    stats = agent.get_session_stats(sess1)
    print(f"  会话 {sess1} 统计：{json.dumps(stats, ensure_ascii=False)}")

    print("\n" + "=" * 60)
    print("Demo 4：可观测性汇总")
    print("=" * 60)
    summary = agent.obs.summary()
    print("  全局请求汇总：")
    for k, v in summary.items():
        print(f"    {k}: {v}")

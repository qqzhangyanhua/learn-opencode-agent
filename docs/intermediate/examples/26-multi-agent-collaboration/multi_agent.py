"""
多智能体协作：主从、辩论、流水线
完整可运行示例 —— 对应文章第 08 篇

运行：
    export DEEPSEEK_API_KEY="your_key"
    python multi_agent.py
"""
import os
import json
from openai import OpenAI

client = OpenAI(
    base_url="https://api.deepseek.com",
    api_key=os.getenv("DEEPSEEK_API_KEY")
)
MODEL_NAME = "deepseek-chat"


class Agent:
    """统一的 Agent 基类"""

    def __init__(self, system_prompt: str):
        self.system_prompt = system_prompt

    def run(self, message: str) -> str:
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": message}
            ]
        )
        return resp.choices[0].message.content.strip()


# ==================== 模式一：主从模式 ====================

class OrchestratorAgent:
    """主从模式：老板拆任务，员工执行"""

    def __init__(self):
        self.workers = {
            "researcher": Agent("你是信息调研专家，负责搜索收集资料。输出简洁有条理。"),
            "writer": Agent("你是技术写手，负责把资料整理成结构清晰的文章。300字以内。"),
            "reviewer": Agent("你是严格的审稿人，检查文章质量给出修改意见。简洁。"),
        }
        self.orchestrator = Agent(
            "你是项目经理，把任务拆解成子任务并指定执行者。"
            "可用执行者：researcher（调研）、writer（写作）、reviewer（审阅）。"
            '只输出 JSON 数组：[{"worker":"xxx","subtask":"xxx"}]'
        )

    def run(self, task: str) -> str:
        print(f"\n--- 主从模式 ---")
        plan_str = self.orchestrator.run(f"任务：{task}")
        if "```" in plan_str:
            plan_str = plan_str.split("```")[1].replace("json", "").strip()
        try:
            plan = json.loads(plan_str)
        except json.JSONDecodeError:
            return f"计划解析失败：{plan_str}"

        results = {}
        for step in plan:
            worker_name = step["worker"]
            subtask = step["subtask"]
            context = subtask
            if results:
                context += "\n\n已有结果：\n" + "\n".join(
                    f"- {k}: {v[:200]}" for k, v in results.items()
                )
            print(f"  [{worker_name}] {subtask[:50]}...")
            if worker_name in self.workers:
                results[worker_name] = self.workers[worker_name].run(context)
        return results.get("reviewer", results.get("writer", list(results.values())[-1]))


# ==================== 模式二：辩论模式 ====================

class DebateSystem:
    """辩论模式：正方反方辩论，裁判总结"""

    def __init__(self):
        self.pro = Agent("你是辩论正方，支持给定观点。论据简洁有力，100字以内。")
        self.con = Agent("你是辩论反方，反驳给定观点。论据简洁有力，100字以内。")
        self.judge = Agent(
            "你是辩论裁判。听取正反双方论点后，给出客观、平衡的总结。"
            "指出哪方论据更有力，给出你的判断。200字以内。"
        )

    def run(self, topic: str, rounds: int = 2) -> str:
        print(f"\n--- 辩论模式 ---")
        print(f"辩题：{topic}")
        history: list[str] = []

        for r in range(rounds):
            print(f"\n  第 {r+1} 轮：")
            context = f"辩题：{topic}"
            if history:
                context += "\n之前的辩论：\n" + "\n".join(history)

            pro_arg = self.pro.run(context + "\n请发表正方观点。")
            print(f"  [正方] {pro_arg[:100]}...")
            history.append(f"正方第{r+1}轮：{pro_arg}")

            con_arg = self.con.run(context + f"\n正方说：{pro_arg}\n请反驳。")
            print(f"  [反方] {con_arg[:100]}...")
            history.append(f"反方第{r+1}轮：{con_arg}")

        debate_record = "\n".join(history)
        verdict = self.judge.run(f"辩题：{topic}\n\n辩论记录：\n{debate_record}\n\n请做出裁判。")
        return verdict


# ==================== 模式三：流水线模式 ====================

class Pipeline:
    """流水线模式：每个 Agent 处理后传给下一个"""

    def __init__(self, agents: list[tuple[str, Agent]]):
        self.agents = agents

    def run(self, initial_input: str) -> str:
        print(f"\n--- 流水线模式 ---")
        current = initial_input
        for name, agent in self.agents:
            print(f"  [{name}] 处理中...")
            current = agent.run(current)
        return current


# ==================== 运行演示 ====================

if __name__ == "__main__":
    if not os.getenv("DEEPSEEK_API_KEY"):
        print("请先设置 DEEPSEEK_API_KEY")
        exit(1)

    # Demo 1：主从模式
    print("=" * 60)
    print("Demo 1：主从模式")
    print("=" * 60)
    orch = OrchestratorAgent()
    result = orch.run("写一篇关于 RAG 技术的简短调研报告（300字以内）")
    print(f"\n最终结果：\n{result}")

    # Demo 2：辩论模式
    print("\n" + "=" * 60)
    print("Demo 2：辩论模式")
    print("=" * 60)
    debate = DebateSystem()
    verdict = debate.run("AI 会取代大部分程序员的工作吗？", rounds=2)
    print(f"\n裁判总结：\n{verdict}")

    # Demo 3：流水线模式
    print("\n" + "=" * 60)
    print("Demo 3：流水线模式")
    print("=" * 60)
    pipe = Pipeline([
        ("需求分析", Agent("你是需求分析师。收到一个产品想法，列出3-5个核心功能点。简洁。")),
        ("技术方案", Agent("你是架构师。收到功能列表，给出技术选型和架构方案。简洁。")),
        ("工作量评估", Agent("你是项目经理。收到技术方案，估算开发工时和里程碑。简洁。")),
    ])
    result = pipe.run("做一个内部知识库问答系统，支持文档上传和智能检索")
    print(f"\n最终结果：\n{result}")

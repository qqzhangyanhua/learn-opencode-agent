"""
Planning 机制：从 ReAct 到 Plan-and-Execute
完整可运行示例 —— 对应文章第 10 篇

运行：
    export DEEPSEEK_API_KEY="your_key"
    python plan_and_execute.py
"""
import os
import json
from openai import OpenAI

client = OpenAI(
    base_url="https://api.deepseek.com",
    api_key=os.getenv("DEEPSEEK_API_KEY")
)
MODEL_NAME = "deepseek-chat"


# ==================== 模拟工具 ====================

def get_weather(city: str) -> str:
    data = {"北京": "晴 25°C 微风", "上海": "多云 22°C 东南风", "广州": "雷阵雨 30°C 闷热", "深圳": "阴转小雨 28°C", "杭州": "晴 24°C"}
    return data.get(city, f"{city}：暂无数据")

def calculate(expression: str) -> str:
    allowed = set("0123456789+-*/.(). ")
    if not all(c in allowed for c in expression):
        return "错误：只支持基本运算"
    try:
        return str(eval(expression))
    except Exception as e:
        return f"计算错误：{e}"

def search_news(keyword: str) -> str:
    news = {"AI": "OpenAI 发布 GPT-5，Google 推出 Gemini 2.5 Pro", "天气": "华南地区将迎强降雨"}
    for k, v in news.items():
        if k in keyword:
            return v
    return f"未找到关于 '{keyword}' 的新闻"

def get_exchange_rate(from_currency: str, to_currency: str) -> str:
    rates = {("USD", "CNY"): 7.24, ("EUR", "CNY"): 7.86, ("CNY", "USD"): 0.138}
    rate = rates.get((from_currency.upper(), to_currency.upper()))
    return f"1 {from_currency.upper()} = {rate} {to_currency.upper()}" if rate else f"不支持 {from_currency}→{to_currency}"

def search_web(query: str) -> str:
    data = {"Django": "Django：全栈框架，ORM 强大，内置 Admin。", "Flask": "Flask：微框架，轻量灵活。", "FastAPI": "FastAPI：异步框架，性能高，自动生成文档。"}
    for k, v in data.items():
        if k.lower() in query.lower():
            return v
    return f"未找到关于 '{query}' 的信息"

TOOLS = {"get_weather": get_weather, "calculate": calculate, "search_news": search_news, "get_exchange_rate": get_exchange_rate, "search_web": search_web}

def execute_tool(name: str, args: dict) -> str:
    if name in TOOLS:
        return TOOLS[name](**args)
    return f"未知工具: {name}"


# ==================== Plan-and-Execute ====================

PLAN_PROMPT = """你是任务规划专家。把以下任务拆解成 3-8 个具体步骤。
每步标注工具：get_weather/calculate/search_news/get_exchange_rate/search_web/none
任务：{task}
输出 JSON 数组：[{{"step": 1, "action": "描述", "tool": "工具名"}}]
只输出 JSON，不要其他文字。"""


class PlanAndExecuteAgent:
    """Plan-and-Execute 智能体"""

    def __init__(self):
        self.plan: list[dict] = []
        self.results: dict = {}

    def _make_plan(self, task: str) -> list[dict]:
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": PLAN_PROMPT.format(task=task)}]
        )
        content = resp.choices[0].message.content.strip()
        if "```" in content:
            content = content.split("```")[1].replace("json", "").strip()
        self.plan = json.loads(content)
        return self.plan

    def _execute_step(self, step: dict) -> str:
        action = step.get("action", "")
        tool_hint = step.get("tool", "")
        prompt = (
            f"步骤：{action}\n建议工具：{tool_hint}\n"
            f"可用：get_weather(city), calculate(expression), search_news(keyword), "
            f"get_exchange_rate(from_currency, to_currency), search_web(query)\n"
            f'输出 JSON：{{"tool": "名", "args": {{}}}} 或 {{"tool": null}}'
        )
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}]
        )
        content = resp.choices[0].message.content.strip()
        if "```" in content:
            content = content.split("```")[1].replace("json", "").strip()
        try:
            call = json.loads(content)
            if call.get("tool"):
                return execute_tool(call["tool"], call.get("args", {}))
            return "无需调用工具"
        except:
            return content

    def run(self, task: str) -> str:
        print(f"\n{'='*50}")
        print(f"Plan-and-Execute | 任务：{task}")
        print(f"{'='*50}")

        self._make_plan(task)
        print(f"\n计划（{len(self.plan)} 步）：")
        for s in self.plan:
            print(f"  Step {s.get('step', '?')}: {s.get('action', '')}")

        print(f"\n执行：")
        for step in self.plan:
            s_num = step.get("step", "?")
            result = self._execute_step(step)
            self.results[s_num] = result
            print(f"  Step {s_num}: {result[:80]}{'...' if len(result) > 80 else ''}")

        synth = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": f"任务：{task}\n结果：{json.dumps(self.results, ensure_ascii=False)}\n请生成完整回答。"}]
        )
        return synth.choices[0].message.content


# ==================== SmartAgent（自动选模式）====================

class SmartAgent:
    """根据任务复杂度自动选择执行模式"""

    def __init__(self, mode: str = "auto"):
        self.mode = mode

    def _select_mode(self, task: str) -> str:
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": f"评估任务复杂度（1-10，1=极简单如查天气，10=极复杂如多步调研）。只输出数字。\n任务：{task}"}]
        )
        try:
            score = int(resp.choices[0].message.content.strip())
            return "react" if score <= 3 else "plan_execute"
        except:
            return "plan_execute"

    def _react_loop(self, task: str) -> str:
        """简化的 ReAct 模式"""
        tools_schema = [
            {"type": "function", "function": {"name": "get_weather", "description": "查天气", "parameters": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}}},
            {"type": "function", "function": {"name": "calculate", "description": "计算", "parameters": {"type": "object", "properties": {"expression": {"type": "string"}}, "required": ["expression"]}}},
            {"type": "function", "function": {"name": "search_news", "description": "搜新闻", "parameters": {"type": "object", "properties": {"keyword": {"type": "string"}}, "required": ["keyword"]}}},
        ]
        messages = [{"role": "system", "content": "你是全能助手，回答简洁。"}, {"role": "user", "content": task}]
        for _ in range(5):
            resp = client.chat.completions.create(model=MODEL_NAME, messages=messages, tools=tools_schema)
            msg = resp.choices[0].message
            if not msg.tool_calls:
                return msg.content or ""
            messages.append({"role": "assistant", "content": msg.content, "tool_calls": [{"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}} for tc in msg.tool_calls]})
            for tc in msg.tool_calls:
                result = execute_tool(tc.function.name, json.loads(tc.function.arguments))
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})
        return "达到最大轮次"

    def run(self, task: str) -> str:
        mode = self._select_mode(task) if self.mode == "auto" else self.mode
        print(f"\n选用模式：{mode}")
        if mode == "react":
            return self._react_loop(task)
        else:
            agent = PlanAndExecuteAgent()
            return agent.run(task)


if __name__ == "__main__":
    if not os.getenv("DEEPSEEK_API_KEY"):
        print("请先设置 DEEPSEEK_API_KEY")
        exit(1)

    # Demo 1：Plan-and-Execute
    print("Demo 1：Plan-and-Execute")
    agent = PlanAndExecuteAgent()
    result = agent.run("帮我查北京和上海天气，对比哪个更适合周末出游，再算500美元换多少人民币")
    print(f"\n最终回答：\n{result}")

    # Demo 2：SmartAgent 自动选模式
    print("\n\nDemo 2：SmartAgent 自动选模式")
    smart = SmartAgent(mode="auto")
    for task in ["北京天气怎么样？", "调研 Django/Flask/FastAPI 并输出对比报告"]:
        result = smart.run(task)
        print(f"\n回答：{result[:200]}...")

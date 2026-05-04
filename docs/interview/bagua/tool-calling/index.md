---
title: AI Agent 面试八股文：工具调用
description: 从 Function Calling、Tool 设计、MCP、路由与编排到安全治理，系统梳理 Agent 工具调用的关键问题。
contentType: support
series: support
contentId: support-agent-interview-bagua-tool-calling
shortTitle: 工具调用
summary: 以 Function Calling 和 MCP 为主线，补齐工具调用、工具设计、路由和编排的面试回答骨架。
difficulty: intermediate
estimatedTime: 45 分钟
learningGoals:
  - 理解 Function Calling 的执行闭环与参数校验逻辑
  - 说清 MCP、工具路由、工具编排和安全边界的关系
  - 能从工程角度回答工具调用的失败处理和治理问题
prerequisites:
  - 已掌握 Agent 基础闭环和常见框架概念
  - 对 API 调用和 JSON Schema 有基本认识
recommendedNext:
  - /interview/bagua/memory/
  - /interview/bagua/rag/
  - /interview/tools/
practiceLinks:
  - /03-tool-system/
  - /practice/p14-mcp/
  - /practice/p18-model-routing/
searchTags:
  - 工具调用
  - Function Calling
  - MCP
  - Tool Routing
  - Tool Orchestration
navigationLabel: 工具调用
entryMode: read-first
roleDescription: 帮助读者把 Agent 的工具能力从“会调 API”提升为“能解释工具协议、调度和安全治理”的系统化表达。
---

# 工具调用

面向初学者的 AI Agent「工具调用」面试八股文:从 Function Calling、Tool 设计,到MCP、路由与编排,再到安全与常见实现。每个知识点尽量包含:概念解释、原理详解、面试 Q&A、追问应对、Python 代码示例。

## 目录

- Function Calling 基础
- Tool Use / Tool Calling
- MCP 协议(Model Context Protocol)
- 工具路由(Tool Routing)
- 工具编排(Tool Orchestration)
- 安全性
- 常见工具实现
- 综合面试题精选(≥15 题)

## 1. Function Calling 基础

### 1.1 什么是 Function Calling

概念解释
Function Calling(函数调用)指:大语言模型在生成回复时,不是直接输出最终答案,而是先输出「要调用哪个外部函数、用什么参数」的结构化指令;宿主程序(你的 Python 服务)真正执行该函数,再把结果喂回模型,形成多轮对话闭环。这样模型可以查实时数据、算复杂表达式、操作数据库等,突破「仅靠训练记忆回答」的限制。
原理详解
从接口角度:多数厂商把「可调用的函数列表」和「用户问题」一起发给模型;模型在概率分布上被训练/对齐为:在合适时输出 tool_calls(或等价字段),而不是胡编乱造函数结果。从安全角度:模型不直接执行代码,执行权在应用层,便于鉴权、审计、限流。与「纯文本里写 call foo(1,2) 」的区别:Function Calling 使用 机器可解析 的 JSON/结构化格式,便于框架自动解析与校验。

### 1.2 OpenAI Function Calling 的工作原理

概念解释
以 OpenAI Chat Completions 为例:你在请求里提供  tools (函数元数据数组)和
tool_choice (可选,控制是否必须调用工具);模型返回的  message  里可能带有
tool_calls ,每一项包含  id 、 function.name 、 function.arguments (JSON 字符串)。
你的代码解析后执行本地函数,再以 role=tool  的消息把结果追加到对话里,再次请求模型生成面向用户的自然语言答案。
原理详解
1. 首轮: system  +  user  +  tools  → 模型可能返回  assistant  +  tool_calls 。
2. 执行:应用根据  name  路由到 Python 函数, arguments  反序列化后调用。
3. 次轮:把每条工具结果作为  tool  消息(带  tool_call_id )写回,再请求 → 模型综合工具输出作答。
4. 并行:若模型一次返回多个  tool_calls ,可并行执行(注意线程安全与副作用)。
5. 流式:流式响应里  tool_calls  可能分片到达,需要增量拼接  arguments 。

面试 Q1:OpenAI 的 Function Calling 大致流程是什么?标准答案(A):客户端把工具定义(名称、描述、参数 JSON Schema)随对话发给 API;模型在
需要时返回 tool_calls ;宿主解析并执行真实函数;将结果以  tool  角色消息写回并再次调
用 API;直到模型不再请求工具或达到轮次上限。核心是「模型只负责决策与参数,执行在应用
侧」。

追问应对
问:tool_choice  有什么用?
答:auto  由模型决定; none  禁止工具; required  强制至少调用一次;也可指定某个
function  强制调用。用于调试、合规场景(必须走某工具)或 A/B。
问:和 RAG 的关系?
答:RAG 是「检索再生成」;Function Calling 是「模型选择动作」。常组合:检索用工具或向量库,生成阶段再决定是否调用计算器/数据库。

### 1.3 函数定义(JSON Schema)

概念解释
每个可调用函数在 API 里通常描述为: type: function , function.name (唯一标识),function.description (给模型看的自然语言说明), function.parameters (符合 JSON Schema 的对象,描述参数类型、是否必填、枚举等)。
原理详解
JSON Schema 让运行时可以做校验( jsonschema  库),也让模型有明确字段名与类型提示。
建议:description  写清「何时调用、不何时调用」;对模糊词(如「最近」)在描述里约定格式(如 ISO 日期)。
复杂结构可用 object 、 array 、 enum 、 oneOf  等;但过于复杂的 Schema 可能增加模型填错概率,可适当拆分多个小函数。

面试 Q2:为什么用 JSON Schema 描述参数?

A:三方面——(1)跨语言标准,各 SDK 统一;(2)可自动校验,避免脏参数进业务;(3)作为
模型「字段说明」,减少胡编参数名。缺点是 Schema 过长会占 token,需要精简描述或工具路由。

追问应对
问:必填字段怎么表示?
答:在 JSON Schema 里用  required: ["a","b"] ,同时  properties  里声明各字段
type 。OpenAI 工具格式与 JSON Schema Draft 兼容(具体以厂商文档为准)。

### 1.4 模型如何决定调用哪个函数

概念解释
模型并非运行「真正的 if-else 规则引擎」,而是基于训练与对齐后,在看到用户意图 + 工具描述时,输出概率最高的结构化动作。等价于:在「续写」空间里,工具描述把某些 token 序列(函
数名、JSON 参数)的概率抬高。
原理详解
描述质量决定区分度:两个工具功能重叠时,模型容易混淆。用户表述触发关键词与语义:例如「明天天气」更可能触发 get_weather 。系统提示可约束:「涉及计算必须用 calculate 」。部分实现会做两阶段:先小模型/分类器选工具,再大模型填参(见「工具路由」)。

面试 Q3:模型选错工具怎么办?

A:工程上(1)优化  description  与示例边界;(2)工具路由缩小候选集;(3)执行前做规则
校验或二次确认;(4)对高风险操作要求人类确认;(5)记录 bad case 做 prompt 迭代。不能
假设模型 100% 正确。

### 1.5 参数提取与验证

概念解释
参数提取:从 tool_calls[].function.arguments  得到 JSON 字符串并  json.loads 。验
证:用 JSON Schema 校验类型、范围、枚举;业务层再校验权限与资源是否存在。
原理详解
模型可能输出不完整 JSON(流式)或多余字段(若你未禁止);需在服务端additionalProperties: false (若支持)并剥离未知键。
对数字、日期做规范化(时区)。
失败策略:返回错误信息给模型「请重试」或降级为只读工具。

面试 Q4:如何做参数校验?

A:分层——语法层 json.loads ;结构层  jsonschema.validate ;语义层业务函数(如用户
ID 是否存在);安全层鉴权与输入清洗(见第 6 节)。

### 1.6 完整代码示例(OpenAI API 调用)

下面示例使用 OpenAI 官方 Python SDK 风格(需安装  openai ,并设置环境变量
OPENAI_API_KEY )。为便于阅读,省略生产级重试与日志。

```python
import json
from typing import Any
from jsonschema import validate, ValidationError
from openai import OpenAI

# 工具 JSON Schema(parameters)
WEATHER_PARAMS = {
    "type": "object",
    "properties": {
        "city": {"type": "string", "description": "城市名,中文或英文"},
        "date": {"type": "string", "description": "日期 YYYY-MM-DD"},
    },
    "required": ["city"],
    "additionalProperties": False,
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "查询指定城市在某日期的天气。用户只说「今天」时,请换算为具体日期再调用。",
            "parameters": WEATHER_PARAMS,
        },
    }
]

# 假实现:真实项目里对接 HTTP API
def get_weather(city: str, date: str | None = None) -> dict[str, Any]:
    return {"city": city, "date": date or "today", "condition": "晴", "temp_c": 22}

def run_tool(name: str, arguments: str) -> str:
    args = json.loads(arguments or '{}')
    validate(instance=args, schema=WEATHER_PARAMS)  # 与 TOOLS 中一致
    if name == 'get_weather':
        return json.dumps(get_weather(**args), ensure_ascii=False)
    raise ValueError(f'unknown tool: {name}')

def chat_with_tools(user_message: str) -> str:
    client = OpenAI()
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": "你是助手,需要数据时调用工具,不要编造天气。"},
        {"role": "user", "content": user_message},
    ]
    for _ in range(5):  # 防止死循环
        resp = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=messages,
            tools=TOOLS,
            tool_choice='auto',
        )
        msg = resp.choices[0].message
        messages.append(msg.model_dump())
        if not msg.tool_calls:
            return msg.content or ''

        for tc in msg.tool_calls:
            try:
                result = run_tool(tc.function.name, tc.function.arguments)
            except (json.JSONDecodeError, ValidationError, ValueError) as e:
                result = json.dumps({'error': str(e)}, ensure_ascii=False)

            messages.append(
                {
                    'role': 'tool',
                    'tool_call_id': tc.id,
                    'content': result,
                }
            )

    return '超过最大工具调用轮次'

if __name__ == '__main__':
    print(chat_with_tools('北京明天天气怎么样?'))
```

追问应对
问:为什么要循环 for _ in range(5) ?
答:多轮工具调用(先查列表再查详情)需要多次 API;上限防止逻辑错误导致无限循环。
问:tool_call_id  作用?
答:把工具结果与某次 tool_calls  中的条目一一对应,支持并行多个调用。

## 2. Tool Use / Tool Calling

### 2.1 Tool 的定义与注册

概念解释
在应用内部,「Tool」= 可执行能力单元:名称、描述、参数规范、处理函数。注册指在 Agent 启动时把工具对象加入注册表(字典或列表),运行时由路由器/模型选择并派发。
原理详解
注册表常见结构:name -> callable  或  List[BaseTool] 。
与纯 Function Calling 映射:把同一套元数据转成各厂商 API 需要的  tools  格式(适配层)。

面试 Q5:Tool 与业务里的普通 Python 函数有何不同?

A:Tool 多了面向模型的元数据(描述、Schema)和统一执行接口(记录日志、超时、权限)。
业务函数关注领域逻辑;Tool 是 Agent 可调度的「外壳」。

### 2.2 工具描述的最佳实践

概念解释
description  是模型判断是否调用、如何填参的主要依据。应写:功能一句话、何时用、何时不
要用、参数含义与格式、返回值语义(若影响后续推理)。
原理详解
避免两个工具描述语义重叠;重叠时加「优先使用 A 当...,否则 B」。
对易混参数(如 user_id  vs  email )举例说明。
英文或中文与模型服务语言一致可减少混淆。

追问应对
问:描述太长怎么办?
答:分层——核心描述保持短;细节放 parameter.description ;超大工具集用路由先筛选(见第 4 节)。

### 2.3 工具参数设计

概念解释
参数宜少而精、类型明确;能用枚举就不用自由文本;日期时间统一 ISO 8601;避免「万能字符
串」承载多种含义。
原理详解
多参数强依赖时,可拆成链式多个工具,降低单次 JSON 复杂度。对可选参数默认值在 Schema 或文档中写清。

### 2.4 工具返回值处理

概念解释
工具返回值会作为 tool  消息内容进入上下文。应稳定、可解析:优先 JSON 字符串;错误用统
一结构  { "error": "--." } ,便于模型纠错。
原理详解
超大结果需摘要或分页(再提供 fetch_more  工具),避免撑爆上下文。
二进制内容应转为文本描述或 URL,不要直接塞原始字节。

面试 Q6:工具返回 10MB 日志怎么办?

A:不应直接返回。应(1)截断 + 摘要;(2)写入对象存储返回链接;(3)提供 grep_in_log
等缩小工具;(4)向量索引仅检索相关片段。

### 2.5 错误处理与重试

概念解释
网络与模型都可能失败。策略包括:可重试错误(429、5xx)指数退避;不可重试(4xx 参数错)把错误给模型;工具内部超时;熔断防止拖垮依赖。
原理详解
幂等:重试前确认接口幂等或使用去重键。
部分成功:多工具并行时,单个子失败可只重试该分支。

### 2.6 LangChain 中的 Tool 定义代码示例

以下使用 LangChain 1.x 风格( langchain-core  的  @tool ;版本差异请以官方文档为准)。
若你环境版本不同,可改为 StructuredTool.from_function 。

```python
from typing import Literal from langchain_core.tools import tool
@tool
def search_product(
query: str,
category: Literal["book", "electronics", ""] = "",
) -> str:
"""在电商站内搜索商品。用户要找商品、比价、看库存时用;不要用于闲聊。
Args:
query: 搜索关键词
category: 可选类目过滤,不知道则留空"""
# 伪实现
return f"[dummy] results for {query!r} in {category or 'all'}"
# 注册到 Agent 时通常传入 tools=[search_product]
# 例如 create_react_agent(llm, tools=[search_product], --.)

追问应对
问:@tool  和手写  StructuredTool  区别?
答:@tool  从 docstring 推断描述与参数,开发快;复杂 Schema 或需自定义校验时用
StructuredTool  更可控。

## 3. MCP 协议(Model Context Protocol)

### 3.1 MCP 是什么

概念解释
MCP(Model Context Protocol)是由 Anthropic 推动的开放标准,用于在 AI 应用(Host) 与外部数据源/工具(MCP Server) 之间建立统一、可插拔的通信方式。可理解为「AI 侧的 USBC」:一次实现 Server,多个客户端(Claude Desktop、IDE、自研 Agent)可复用。
原理详解
协议定义了能力发现、资源读取、工具调用、提示模板等消息格式与生命周期。目标:把「每个产品各写一套插件」变成「标准协议 + 多实现」。

### 3.2 核心组件:Client、Server、Transport

概念解释
MCP Server:暴露工具/资源/提示的实现进程(如连接 GitHub、数据库)。MCP Client:运行在 Host 内,与 Server 建立会话,转发模型侧请求与结果。
Transport:传输层,常见 stdio(子进程标准输入输出)、HTTP/SSE 等。
原理详解
stdio 适合本地子进程;HTTP 适合远程服务。Client 负责能力协商、把 Server 工具映射为模型可用的工具列表(与 Function Calling 衔接)。

面试 Q7:MCP 里 Client 和你在 OpenAI 里写的「执行工具的 Python 代码」是什么关系?

A:OpenAI 场景下你手写  run_tool ;MCP 下 Client 把远端/子进程 Server 的工具列表拉平,
调用时按协议发 RPC,结果再转成  tool  消息。你仍要写 Host 逻辑,但工具实现可独立进程、
独立语言。

### 3.3 MCP vs Function Calling 的区别

| 维度 | Function Calling | MCP |
| --- | --- | --- |
| 层级 | 多为“单次 API 能力”，模型输出调用指令 | 系统级协议，关注如何发现与调用工具、资源实现 |
| 实现位置 | 通常在应用进程内函数 | 常在独立 Server，可远程部署 |
| 复用 | 每个应用往往单独集成 | 标准 Server 可被多个 Host 复用 |

互补关系: Host 常把 MCP 工具转成 FC 的 `tools` 定义交给模型。

标准答案:Function Calling 解决「模型怎么表达调用」;MCP 解决「工具能力怎么暴露与连接」。二者常一起出现:模型侧用 FC,工具侧来自 MCP。

### 3.4 MCP 的优势

概念解释
标准化:消息与能力模型统一,降低集成成本。可复用:同一 MCP Server 给桌面、IDE、Agent 用。生态:社区可共享 Server 实现;企业可内网部署私有 Server。隔离:工具崩溃不拖垮主进程(进程边界)。

### 3.5 MCP Server 的实现示例

以下为示意代码:真实项目请使用官方 mcp Python 包( pip install mcp ),并以最新文档为准。下面用常见「FastMCP」风格说明结构。

```python
# 需要: pip install mcp
# 以下为概念示例,包名与 API 请以官方文档为准

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    FastMCP = None  # 环境未安装时仅作结构说明

if FastMCP:
    mcp = FastMCP("demo")

    @mcp.tool()
    def add(a: int, b: int) -> int:
        """返回两个整数之和。"""
        return a + b

# 通常以 `mcp.run(transport="stdio")` 由 Host 拉起子进程
```

若未使用 FastMCP,也可用手写 Server + stdio,核心是:声明工具列表、处理  tools/call
类请求、返回结构化内容。面试中讲清「进程边界 + JSON-RPC 风格消息」即可得分。

追问应对
问:MCP 和 OpenAPI 网关区别?
答:OpenAPI 面向通用 HTTP 客户端;MCP 面向 AI Host 与模型工具循环,带会话、资源、
提示等 AI 原生语义。

### 3.6 MCP 在企业级应用中的价值

概念解释
治理:工具集中在 MCP Server,便于审计、版本与权限。复用:数据中台、工单、内部 Wiki 各做一个 Server,多产品接入。安全边界:敏感系统只对内网 Server 开放,模型不直连数据库。合规:在 Server 侧落日志与审批,比散落在每个 Agent 代码里更可控。

面试 Q8:企业为什么愿意接 MCP 而不是每个业务线自己写 Function?

A:降低重复建设、统一安全与观测、加快试点(换模型不换工具链)、利于平台组与业务组分
工。

## 4. 工具路由(Tool Routing)

### 4.1 当工具数量多时如何高效选择

概念解释
工具过多时,一次性把所有 description  塞进上下文会:费 token、干扰模型、增加误选。解
决思路是先缩小候选集再让大模型填参,或用小模型专门做路由。
原理详解
典型阈值:几十到上百个工具就要开始考虑路由(视模型与描述长度而定)。
方法:向量检索、分类/意图模型、层级目录(先选类再选工具)、规则前缀(用户以 /db 开头走数据库类)。

### 4.2 基于向量检索的工具路由

概念解释
离线:把每个工具的 name + description + 关键词  做成 embedding,存向量库。在线:用户
问题 embedding,Top-K 相似工具作为本轮唯一候选,再交给 LLM。
原理详解
优点:实现快、可跨语种模糊匹配。
缺点:极依赖描述质量;边界 case 需加规则或混合检索(关键词 + 向量)。

### 4.3 基于分类模型的工具路由

概念解释
训练或提示一个轻量分类器(BERT、小 LLM、或结构化输出),输入用户句,输出工具 ID 或工
具组 ID。比全量工具更省、更稳。
原理详解
数据:历史日志标注「正确工具」可finetune。与向量路由混合:分类器粗分 + 向量细分。

### 4.4 工具分组与层级

概念解释
按域分组:database_* 、 hr_* 、 crm_* 。第一轮只暴露组级 meta-tool(如list_hr_tools ),或让模型先选组再选具体工具。
原理详解
层级过深会增加对话轮次,需在「token 节省」与「轮次增加」间权衡。

### 4.5 代码示例(向量路由示意)

```python
from dataclasses import dataclass
import numpy as np
from openai import OpenAI

@dataclass
class ToolSpec:
    name: str
    description: str

def embed_texts(client: OpenAI, model: str, texts: list[str]) -> np.ndarray:
    resp = client.embeddings.create(model=model, input=texts)
    vecs = [np.array(d.embedding, dtype=np.float32) for d in resp.data]
    mat = np.stack(vecs, axis=0)
    norms = np.linalg.norm(mat, axis=1, keepdims=True) + 1e-8
    return mat / norms

def route_tools(
    query: str,
    tools: list[ToolSpec],
    client: OpenAI,
    embed_model: str = "text-embedding-3-small",
    top_k: int = 3,
) -> list[ToolSpec]:
    corpus = [f"{t.name}\n{t.description}" for t in tools]
    doc_emb = embed_texts(client, embed_model, corpus)
    q_emb = embed_texts(client, embed_model, [query])[0]
    scores = doc_emb @ q_emb
    idx = np.argsort(-scores)[:top_k]
    return [tools[i] for i in idx]

# 使用:仅把 route_tools 返回的子集塞进 chat.completions 的 tools 参数
```

面试 Q9:向量路由选出来的工具不对怎么兜底?

A:Top-K 调大、混合关键词打分、加一层 LLM「是否适用」二分类、允许用户澄清、保留「通
用搜索」工具作后备。

## 5. 工具编排(Tool Orchestration)

### 5.1 串行工具调用

概念解释
后一步依赖前一步输出,例如:先 lookup_user_id  再  get_orders(user_id) 。实现上必须
等前一个  tool  消息返回后再发起下一轮模型请求(或在同轮若模型一次输出多个有依赖的调用,需谨慎,通常仍按顺序执行)。
原理详解
在图工作流里体现为有向边;LangGraph、Temporal 等可显式建模。

### 5.2 并行工具调用

概念解释
无相互依赖的多个查询(查天气 + 查股价)可并行 HTTP,缩短延迟。OpenAI 可能在一次
assistant  消息返回多个  tool_calls 。
原理详解
注意速率限制与连接池;写操作并行可能导致竞态,需业务锁或串行。

### 5.3 工具链(Tool Chain)

概念解释
把多个工具按固定或动态顺序组合成复合流程,如「检索 → 摘要 → 存储」。可以是代码写死的Pipeline,也可以是 LLM 每步决定下一步(ReAct / Agent)。
原理详解
静态链:适合稳定 SOP;动态链:适合开放域任务,但要防循环与成本失控。

### 5.4 条件工具调用

概念解释
根据中间结果分支:仅当 risk_score > 0.8  才调用  human_review 。可用规则引擎、小模型
分类、或让主模型输出结构化「分支字段」(需校验)。

### 5.5 工具调用的依赖管理

概念解释
显式维护 DAG:节点是工具调用,边是数据依赖。调度器拓扑排序执行;检测环;失败时重试或补偿。
原理详解
对长事务用 Saga 或幂等重试;对 AI 步骤用「检查点」持久化状态。

面试 Q10:并行与串行如何取舍?

A:读多且无依赖并行;有写冲突、强一致、或后一步参数必须来自上一步精确字段时串行;可并
行读再串行写(Quorum 读/写视业务而定)。

### 5.6 代码示例(简单编排:先路由再并行)

```python
import concurrent.futures
import json
from typing import Any, Callable

ToolFn = Callable[..., Any]

def safe_call(name: str, fn: ToolFn, kwargs: dict[str, Any]) -> dict[str, Any]:
    try:
        return {"tool": name, "ok": True, "result": fn(**kwargs)}
    except Exception as e:
        return {"tool": name, "ok": False, "error": str(e)}

def run_parallel_tools(
    calls: list[tuple[str, ToolFn, dict[str, Any]]],
) -> list[dict[str, Any]]:
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        futs = [ex.submit(safe_call, n, f, k) for n, f, k in calls]
        return [f.result() for f in futs]

# 例:先串行拿 user_id,再并行查订单与积分(伪函数)
def lookup_user_id(email: str) -> str:
    return "u_123"

def fetch_orders(uid: str) -> list:
    return [{"id": 1}]

def fetch_points(uid: str) -> int:
    return 42

def orchestrate(user_email: str) -> str:
    uid = lookup_user_id(user_email)
    second = run_parallel_tools(
        [
            ("orders", fetch_orders, {"uid": uid}),
            ("points", fetch_points, {"uid": uid}),
        ]
    )
    return json.dumps(second, ensure_ascii=False)
```

## 6. 安全性

### 6.1 工具调用的权限控制

概念解释
模型本身没有用户身份,必须在服务端把「当前会话用户」与角色/权限绑定,执行工具前检查:
是否可读该表、是否可操作该租户。
原理详解
禁止把服务账号密钥交给模型侧推理环境。
使用用户 OAuth token 或后端代持且按最小权限。

### 6.2 输入验证与清洗

概念解释
防 Prompt 注入 诱导工具执行越权参数;防 SQL 注入、路径穿越( -./-./etc/passwd )。对所有进入工具的字符串做白名单、参数化查询、chroot/沙箱。

### 6.3 敏感操作确认

概念解释
删除、转账、对外发邮件等,需 人在回路(HITL) 或二次令牌;或把工具设计为「创建草稿」而
非「直接发送」。

### 6.4 调用频率限制

概念解释
按用户/IP/工具维度 rate limit,防刷与成本失控;指数退避应对 429。

### 6.5 审计日志

概念解释
记录:时间、用户、工具名、参数摘要、结果状态、模型请求 ID。用于合规与事后追溯。

面试 Q11:如何防止模型通过工具泄露敏感数据?

A:最小权限、结果脱敏(掩码)、行级权限、禁止把密钥放进工具返回值、敏感字段仅后端可见
且不出现在模型上下文。

## 7. 常见工具实现

### 7.1 搜索工具(Web Search)

概念解释
封装搜索引擎 API(Bing、SerpAPI、自建爬虫需合规)。返回摘要与链接,避免整页 HTML 直接进入上下文。
Python 示意

```python
import os
import urllib.parse
import urllib.request

def web_search(query: str, max_results: int = 5) -> list[dict]:
    """占位:真实环境使用官方搜索 API 并处理分页。"""
    q = urllib.parse.quote(query)
    url = f"https://duckduckgo.com/html/?q={q}"  # 示例仅作结构说明,生产请用合规 API
    req = urllib.request.Request(url, headers={"User-Agent": "AgentBot/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read(200_000)
    return [{"title": "stub", "snippet": html[:200].decode(errors="ignore"), "url": url}]
```

### 7.2 数据库查询工具

概念解释
永远参数化查询,禁止字符串拼接 SQL。最好只允许只读账号 + 白名单表 + 行级权限。

```python
def query_user_orders(conn, user_id: str, limit: int = 20) -> list:
    sql = (
        "SELECT id, amount, created_at "
        "FROM orders WHERE user_id = %s "
        "ORDER BY created_at DESC LIMIT %s"
    )
    with conn.cursor() as cur:
        cur.execute(sql, (user_id, limit))
        return list(cur.fetchall())
```

### 7.3 API 调用工具

概念解释
对内部 REST 封装: GET/POST 、超时、重试、鉴权头从服务端保险柜取,不让模型看见token。

### 7.4 代码执行工具

概念解释
高风险:必须在沙箱(Docker、gVisor、WASM)中执行,限制 CPU/内存/网络,禁用危险模
块;默认应关闭或仅对内网。

### 7.5 文件操作工具

概念解释
限制根目录(chroot 或路径规范化),禁止任意路径;写操作需备份或 diff;大文件分块读。

```python
import os

SANDBOX_ROOT = "/var/agent_sandbox"

def safe_read_file(path: str, max_bytes: int = 50_000) -> str:
    full = os.path.realpath(os.path.join(SANDBOX_ROOT, path))
    if not full.startswith(os.path.realpath(SANDBOX_ROOT) + os.sep):
        raise PermissionError("path escapes sandbox")
    with open(full, "rb") as f:
        return f.read(max_bytes).decode("utf-8", errors="replace")
```

### 7.6 计算器工具

概念解释
对数学表达式用 AST 解析或  numexpr ,禁止  eval  任意字符串,以防代码执行。

```python
import ast
import operator

_ALLOWED = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.USub: operator.neg,
    ast.Pow: operator.pow,
}

def eval_expr(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED:
        return _ALLOWED[type(node.op)](eval_expr(node.left), eval_expr(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED:
        return _ALLOWED[type(node.op)](eval_expr(node.operand))
    raise ValueError("unsupported expression")

def calculator(expr: str) -> float:
    tree = ast.parse(expr, mode="eval")
    return eval_expr(tree.body)
```

## 8. 综合面试题精选(≥15 题)

下列题目覆盖前文各模块,便于系统复习。背诵时建议理解「为什么」,而非死记句子。

#### Q1: Function Calling 和「让模型输出 JSON」有什么本质区别?

A:Function Calling 是厂商提供的结构化工具调用通道(字段名、类型、与对话轮次绑定);纯
JSON 输出依赖 prompt 约束,解析脆弱、易混入闲聊文本。FC 更利于多轮 tool 消息与并行调用ID 对齐。实践中也可结合:FC 负责调度,JSON 负责业务负载。

追问:若模型不支持 FC 怎么办?——可用 JSON mode / 约束解码 / 后处理抽取;或用小模型
做「动作分类」。

#### Q2: 描述 OpenAI 兼容接口里 tool_calls  与  tool  消息的对应关系。

A:每条  assistant.tool_calls[]  有唯一  id ;执行后每条结果作为一条  role=tool  消
息,且必须带相同 tool_call_id ,保证多并行调用时不错配。

#### Q3: 为什么工具 description  比函数名更重要?

A:模型主要依据自然语言描述区分相似工具;函数名更多是给程序路由用。描述应写清边界与反
例。

#### Q4: 如何设计 JSON Schema 降低模型填错概率?

A:减少可选参数模糊性;用 enum ;在  description  给示例;避免深层嵌套;必要时分拆多
个函数。

#### Q5: LangChain Tool 的 docstring 为什么要写「何时不要用」?

A:减少误触发(false positive),尤其在工具功能重叠时,这是线上质量关键。

#### Q6: MCP 解决的主要痛点是什么?

A:工具集成碎片化、重复建设、难以跨产品复用;MCP 提供标准边界(Server)与传输,使工
具像外设一样即插即用(在生态支持前提下)。

#### Q7: MCP 与 Function Calling 是替代关系吗?

A:不是。FC 是模型侧表达;MCP 是工具侧集成。Host 常将 MCP 工具列表映射为 FC 的
tools 。

#### Q8: 工具路由什么时候必须上?

A:当工具数量导致上下文膨胀、误选率上升或延迟/成本明显增加时;具体阈值依赖模型与描述
长度,常见从几十起考虑。

#### Q9: 向量路由的缺陷与改进?

A:缺陷:描述不佳则 embedding 不准;OOV 专有名词弱。改进:混合检索、同义词表、用户域
特征、日志驱动迭代描述、加轻量分类器。

#### Q10: 并行工具调用要注意什么?

A:幂等性、后端并发限制、数据竞争(写操作)、结果合并顺序、部分失败重试策略。

#### Q11: 什么是工具编排中的「依赖 DAG」?

A:把工具调用当节点,数据依赖当边;拓扑排序执行,避免环与竞态,便于失败重试与可视化监
控。

#### Q12: 敏感操作为什么推荐「两阶段提交」式工具设计?

A:第一阶段生成草稿/待确认对象,第二阶段在用户确认后再真正执行,降低模型误触发损失。

#### Q13: 工具返回为什么要尽量结构化(JSON)?

A:便于模型解析下一步推理、便于程序校验与日志;纯自然语言易产生歧义。

#### Q14: 如何做工具调用的权限控制?

A:会话绑定真实用户身份;服务端校验租户与角色;最小权限;敏感操作 HITL;不把长期密钥
暴露给模型上下文。

#### Q15: 代码执行工具如何做到基本安全?

A:沙箱隔离、资源与网络限制、禁用危险模块、超时、只读默认、审计;生产慎用。
Q16(加一):审计日志至少记哪些字段?

A:时间、trace/request id、用户/租户、工具名、参数摘要(脱敏)、结果状态、耗时、模型版
本;合规场景保留策略与不可篡改存储视要求而定。
Q17(加一):Calculator 为什么禁止  eval ?

A: eval  可执行任意 Python,等同于远程代码执行;应使用 AST 白名单或安全数学库。
小结
Function Calling:模型产出结构化调用意图,应用在本地执行并回传,是 Agent 的「手」。Tool 工程:描述、Schema、返回值与错误模式与路由同样重要。
MCP:标准化工具与上下文连接,利于复用与治理。路由与编排:解决规模与依赖问题;安全贯穿权限、输入、确认、限流与审计。建议结合自家业务画一张「用户请求 → 路由 → 工具 → 依赖 → 回传模型」的时序图,面试时能用白板讲清楚,比背诵定义更有说服力。

---
title: 第1章：什么是 AI Agent
description: 从 LLM 到 Agent 的演进，理解 AI Agent 的本质与核心能力
---

> **学习目标**：理解 AI Agent 的定义、与 LLM/Chatbot 的区别、核心能力和应用场景
> **前置知识**：了解大语言模型（LLM）的基本概念
> **阅读时间**：15 分钟

---

## 1.1 从 LLM 到 Agent

### LLM 的能力与局限

大语言模型（LLM）如 GPT-4、Claude 等，具备强大的文本理解和生成能力：

```text
用户：什么是递归？
LLM：递归是一种编程技术，函数调用自身来解决问题...
```

但 LLM 本身有明显的局限：

1. **只能对话，不能行动**
   - 只能生成文本，无法执行代码
   - 无法读写文件、搜索网络、调用 API

2. **没有记忆**
   - 每次对话都是独立的
   - 无法记住上次的对话内容

3. **知识有截止日期**
   - 训练数据有时间限制
   - 无法获取最新信息

### Agent 的突破

**AI Agent = LLM + 工具 + 记忆 + 规划**

Agent 不只是"会说话"，更重要的是"会做事"：

```text
用户：帮我分析这个项目的代码质量

Agent 的思考过程：
1. [思考] 需要先看看项目结构
2. [行动] 调用 file_tree 工具
3. [观察] 发现是 TypeScript 项目
4. [思考] 需要检查代码规范
5. [行动] 调用 grep 工具搜索 any 类型
6. [观察] 发现 15 处使用了 any
7. [思考] 需要检查测试覆盖率
8. [行动] 调用 bash 工具运行测试
9. [观察] 测试覆盖率 65%
10. [回复] 给出完整的代码质量报告
```

这就是 Agent 与 LLM 的本质区别：**Agent 可以主动调用工具完成任务。**

---

## 1.2 Agent vs Chatbot vs Workflow

很多人容易混淆这三个概念，我们用一个例子说明：

### 任务：写一篇关于 AI 的技术文章

**Chatbot（聊天机器人）**：
```text
用户：帮我写一篇关于 AI 的文章
Chatbot：好的，这是文章内容...（直接生成）
```
- 一次性输出
- 无法调用工具
- 无法分步执行

**Workflow（工作流）**：
```text
步骤1：搜索 AI 相关资料
步骤2：总结资料
步骤3：生成文章大纲
步骤4：撰写正文
步骤5：润色文章
```
- 固定流程
- 人工定义每一步
- 无法根据情况调整

**Agent（智能体）**：
```text
Agent 自主决策：
1. [思考] 需要先了解最新的 AI 趋势
2. [行动] 搜索最新 AI 新闻
3. [观察] 发现 GPT-5 即将发布
4. [思考] 需要更多技术细节
5. [行动] 搜索 GPT-5 技术文档
6. [观察] 找到官方论文
7. [思考] 可以开始写大纲了
8. [行动] 生成文章大纲
9. [思考] 需要补充代码示例
10. [行动] 生成代码示例
11. [回复] 完整文章
```
- 自主决策每一步
- 根据结果动态调整
- 可以调用多种工具

### 对比表

| 特性 | Chatbot | Workflow | Agent |
|------|---------|----------|-------|
| 工具调用 | ❌ | ✅ | ✅ |
| 自主决策 | ❌ | ❌ | ✅ |
| 动态调整 | ❌ | ❌ | ✅ |
| 记忆能力 | ❌ | ✅ | ✅ |
| 任务规划 | ❌ | ✅（人工） | ✅（自动） |

---

## 1.3 AI Agent 的核心能力

一个完整的 AI Agent 通常包含 5 个核心模块：

### 1. LLM（大模型）

Agent 的"大脑"，负责：
- 理解用户意图
- 决策下一步行动
- 生成回复内容

```typescript
// 伪代码
const response = await llm.chat({
  messages: [
    { role: "user", content: "帮我重构这个函数" }
  ]
})
```

### 2. Tools（工具调用）

Agent 的"手"，可以执行实际操作：

```typescript
const tools = [
  {
    name: "read_file",
    description: "读取文件内容",
    parameters: { path: "string" }
  },
  {
    name: "write_file",
    description: "写入文件",
    parameters: { path: "string", content: "string" }
  },
  {
    name: "search_web",
    description: "搜索网络",
    parameters: { query: "string" }
  }
]
```

### 3. Memory（记忆）

Agent 的"记忆"，分为两种：

**短期记忆（Short-term Memory）**：
- 当前对话的历史
- 最近调用的工具结果

**长期记忆（Long-term Memory）**：
- 用户偏好
- 历史任务记录
- 知识库

```typescript
// 短期记忆
const chatHistory = [
  { role: "user", content: "读取 config.json" },
  { role: "assistant", content: "已读取，内容是..." },
  { role: "user", content: "修改 port 为 8080" }  // Agent 知道要修改哪个文件
]

// 长期记忆
const userPreferences = {
  codeStyle: "functional",
  testFramework: "vitest",
  language: "TypeScript"
}
```

### 4. Planning（任务规划）

Agent 的"规划能力"，将复杂任务分解：

```text
用户任务：创建一个 TODO 应用

Agent 规划：
1. 创建项目结构
   - 初始化 package.json
   - 创建 src 目录
2. 实现数据模型
   - 定义 Todo 类型
   - 实现 CRUD 操作
3. 实现 UI 界面
   - 创建组件
   - 添加样式
4. 编写测试
   - 单元测试
   - E2E 测试
```

### 5. Execution Loop（执行循环）

Agent 的"工作流程"，典型的循环：

```text
while (任务未完成) {
  1. Think（思考）：分析当前状态，决定下一步
  2. Act（行动）：调用工具执行操作
  3. Observe（观察）：查看执行结果
  4. Reflect（反思）：判断是否需要调整计划
}
```

---

## 1.4 为什么需要 AI Agent

### 传统开发 vs Agent 辅助开发

**场景：重构一个大型函数**

**传统方式**：
```text
1. 人工阅读代码（30分钟）
2. 理解业务逻辑（1小时）
3. 设计重构方案（30分钟）
4. 编写新代码（2小时）
5. 编写测试（1小时）
6. 调试修复（1小时）

总计：6小时
```

**Agent 辅助**：
```text
用户：帮我重构 src/utils/parser.ts 的 parseConfig 函数

Agent 自动执行：
1. 读取文件（5秒）
2. 分析代码结构（10秒）
3. 识别可优化点（15秒）
4. 生成重构方案（20秒）
5. 编写新代码（30秒）
6. 生成测试用例（20秒）
7. 运行测试验证（10秒）

总计：2分钟
```

### Agent 的优势

1. **自动化重复工作**
   - 代码生成
   - 测试编写
   - 文档生成

2. **知识整合**
   - 搜索最佳实践
   - 查阅官方文档
   - 学习项目代码

3. **持续学习**
   - 记住用户偏好
   - 积累项目知识
   - 优化工作流程

4. **24/7 可用**
   - 不需要休息
   - 即时响应
   - 并行处理

---

## 1.5 AI Agent 的应用场景

### 1. 代码助手（OpenCode 的定位）

```text
功能：
- 代码生成与重构
- Bug 修复
- 代码审查
- 测试编写
- 文档生成

示例：
用户：这个函数有性能问题，帮我优化
Agent：
1. 分析代码复杂度
2. 识别瓶颈（嵌套循环）
3. 提出优化方案（使用 Map）
4. 生成优化后的代码
5. 编写性能测试
```

### 2. 研究助手

```text
功能：
- 文献搜索
- 论文总结
- 数据分析
- 报告生成

示例：
用户：总结最近关于 Transformer 的论文
Agent：
1. 搜索 arXiv 最新论文
2. 下载 PDF
3. 提取关键信息
4. 生成总结报告
```

### 3. 客服机器人

```text
功能：
- 回答常见问题
- 查询订单状态
- 处理退款请求
- 转接人工客服

示例：
用户：我的订单什么时候发货？
Agent：
1. 识别用户身份
2. 查询订单数据库
3. 获取物流信息
4. 生成回复
```

### 4. 数据分析师

```text
功能：
- 数据清洗
- 统计分析
- 可视化
- 报告生成

示例：
用户：分析这个月的销售数据
Agent：
1. 读取 CSV 文件
2. 清洗异常数据
3. 计算统计指标
4. 生成图表
5. 撰写分析报告
```

---

## 1.6 AI Agent 的局限性

虽然 Agent 很强大，但也有明显的局限：

### 1. 成本高

```text
一次复杂任务可能需要：
- 10+ 次 LLM 调用
- 每次调用 $0.01 - $0.10
- 总成本 $0.10 - $1.00

对比：
- 人工：$50/小时
- Agent：$1/任务
```

### 2. 不可靠

```text
可能出现的问题：
- 工具调用失败
- LLM 输出格式错误
- 陷入死循环
- 产生幻觉（生成不存在的信息）
```

### 3. 需要监督

```text
危险操作需要人工确认：
- 删除文件
- 修改配置
- 执行命令
- 发送请求
```

### 4. 上下文限制

```text
LLM 的上下文窗口有限：
- GPT-4：128K tokens
- Claude：200K tokens

大型项目可能超出限制：
- 需要选择性读取文件
- 需要总结历史对话
```

---

## 1.7 常见的 Agent 框架

在开始学习 OpenCode 之前，了解一下其他 Agent 框架：

### LangChain

**特点**：
- 最流行的 Agent 框架
- 支持多种 LLM
- 丰富的工具生态

**示例**：
```python
from langchain.agents import initialize_agent, Tool
from langchain.llms import OpenAI

tools = [
    Tool(
        name="Search",
        func=search_tool,
        description="搜索网络"
    )
]

agent = initialize_agent(
    tools=tools,
    llm=OpenAI(),
    agent="zero-shot-react-description"
)

agent.run("帮我搜索最新的 AI 新闻")
```

### AutoGPT

**特点**：
- 自主 Agent
- 长期目标规划
- 自我反思

**示例**：
```text
目标：创建一个成功的 SaaS 产品

AutoGPT 自主执行：
1. 市场调研
2. 竞品分析
3. 产品设计
4. 代码实现
5. 测试部署
6. 营销推广
```

### OpenAI Assistants API

**特点**：
- 官方 API
- 内置工具（Code Interpreter、Retrieval）
- 托管服务

**示例**：
```python
from openai import OpenAI

client = OpenAI()

assistant = client.beta.assistants.create(
    name="Code Helper",
    instructions="你是一个代码助手",
    tools=[{"type": "code_interpreter"}],
    model="gpt-4"
)
```

### OpenCode 的定位

**OpenCode 的特点**：
- 100% 开源
- 提供商无关（支持多种 LLM）
- 内置 LSP 支持（代码智能）
- 专注于编码场景
- 客户端/服务器架构

**为什么选择 OpenCode**：
- 完全控制数据和隐私
- 可以自定义工具和 Agent
- 深度集成开发工具链
- 支持本地部署

---

## 本章小结

### 核心概念

1. **AI Agent = LLM + 工具 + 记忆 + 规划 + 执行循环**

2. **Agent vs LLM**：
   - LLM 只能对话
   - Agent 可以行动

3. **Agent vs Workflow**：
   - Workflow 是固定流程
   - Agent 可以自主决策

4. **Agent 的 5 个核心模块**：
   - LLM（大脑）
   - Tools（手）
   - Memory（记忆）
   - Planning（规划）
   - Execution Loop（工作流程）

### 关键要点

- Agent 不是万能的，有成本、可靠性、监督等限制
- 不同场景需要不同的 Agent 设计
- OpenCode 专注于编码场景，提供开源、可控的解决方案

### 思考题

1. 为什么 Agent 需要"执行循环"，而不是一次性生成所有答案？
2. 在什么场景下，Workflow 比 Agent 更合适？
3. 如果让你设计一个 Agent，你会选择哪些工具？

---

## 下一章预告

**第2章：AI Agent 的核心组件**

我们将深入学习 Agent 的 5 个核心模块：
- LLM 如何理解和生成文本
- Tool 如何定义和调用
- Memory 如何存储和检索
- Planning 如何分解任务
- Execution Loop 如何运转

这些概念将为后续阅读 OpenCode 源码打下基础。

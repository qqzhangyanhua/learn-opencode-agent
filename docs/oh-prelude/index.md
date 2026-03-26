---
title: 第17章：为什么需要多个 Agent？
description: 在学习 oh-my-openagent 的架构之前，先搞清楚一个根本问题——一个 Claude 不够用吗？什么情况下单模型会失败，多 Agent 编排解决的是什么真实问题
contentType: theory
series: book
contentId: book-oh-prelude
shortTitle: 为什么需要多个 Agent？
summary: 在学习 oh-my-openagent 的架构之前，先搞清楚一个根本问题——一个 Claude 不够用吗？什么情况下单模型会失败，多 Agent 编排解决的是什么真实问题
difficulty: intermediate
estimatedTime: 15 分钟
learningGoals:
  - 在学习 oh-my-openagent 的架构之前
  - 先搞清楚一个根本问题——一个 Claude 不够用吗？什么情况下单模型会失败
  - 多 Agent 编排解决的是什么真实问题
prerequisites:
  - 建议按当前章节顺序继续阅读
recommendedNext:
  - /17-multi-model-orchestration/
  - /practice/p15-multi-agent/
practiceLinks:
  - /practice/
  - /17-multi-model-orchestration/
searchTags:
  - 为什么需要多个 Agent？
  - OpenCode
  - 源码阅读
navigationLabel: 为什么需要多个 Agent？
entryMode: bridge
roleDescription: 理解多 Agent 编排的必要性，建立系统化思维。
---
<ChapterLearningGuide />

---

## 先从一个真实场景说起

假设你让 AI 帮你做这件事：

> "帮我在这个 React 项目里加一个用户登录功能：前端表单、后端 API、数据库表、测试用例，并且最后做一次 Code Review。"

你打开 Claude，把需求发出去，然后等待。

**Claude 开始工作了。它写前端，写后端，写数据库迁移脚本……**

40 分钟后，任务还没完。上下文窗口快满了。Claude 开始忘记它之前写了什么。它重复实现了一个已经写过的函数，把前端的 API 路径写错了，最后的 Code Review 只有两句话，因为它已经没有多少"精力"了。

**这不是 Claude 的问题，这是单模型处理复杂任务的结构性局限。**

---

## 单模型的三个结构性局限

### 局限 1：上下文窗口是有限的

Claude 的上下文窗口是 200K token，听起来很多，但一个中等规模的任务（写代码 + 读现有代码 + 对话历史）很容易吃掉它。

当上下文接近上限时，模型的行为会退化：
- 开始忘记早期的约束
- 代码质量下降
- 开始重复自己

更糟糕的是，你无法预测"退化从什么时候开始"。

### 局限 2：不同任务需要不同的"大脑模式"

写代码和做 Code Review，需要完全不同的思维模式：

- **写代码**：创造性的，需要构建，适当的温度，愿意尝试
- **Code Review**：批判性的，需要挑剔，低温度，找问题

同一个模型在同一个会话里做这两件事，往往哪个都不够专注。写代码的时候已经"入戏"了，再切换去做 Review，会不自觉地为自己刚写的代码辩护。

### 局限 3：所有工具权限都开着

当你让 Claude 做一个只读的调研任务（"分析一下这个模块的架构"），它仍然拥有写文件的能力。

在长任务里，这是一个真实的风险——模型可能会在"调研过程中"顺手修改一些它认为"顺带可以改掉"的东西。这不是故意的，但它会发生。

---

## 多 Agent 编排是怎么解决这些问题的

oh-my-openagent 的核心思路是：**把一个大任务拆给多个专门的 Agent，每个 Agent 只做自己擅长的那一块，用完即走。**

回到刚才的登录功能需求：

```
用户 → Sisyphus（主编排器）
         │
         ├── "前端部分" → Sisyphus-Junior (frontend 分类)
         │                  └── 完成后返回结果
         │
         ├── "后端部分" → Hephaestus（深度编码）
         │                  └── 完成后返回结果
         │
         ├── "数据库设计咨询" → Oracle（只读顾问）
         │                        └── 给出建议，不写文件
         │
         └── "Code Review" → Momus（批评者）
                               └── 专门挑毛病
```

**每个 Agent 只处理自己那一小块上下文，干完就结束。**

没有一个 Agent 需要在内存里同时装着"前端代码 + 后端逻辑 + 数据库结构 + 对话历史"。

---

## 三个局限是怎么被解决的

### 解决局限 1：上下文碎片化

每个 Agent 启动时只收到精炼的任务描述，不是完整的对话历史。Sisyphus 会提取"这个子任务需要知道的信息"，压缩后传给下游 Agent。

一个后端 API 开发的 Agent，它的上下文里只有："实现 `/api/login` 接口，接收 email + password，验证后返回 JWT token，使用已有的 User 模型"——而不是整个对话的 40 页历史。

### 解决局限 2：专门化的模式

不同 Agent 用不同的模型和参数：

| 任务 | Agent | 为什么 |
|------|-------|--------|
| 复杂编码 | Hephaestus + GPT-5 Codex | 代码专用模型 |
| 查询建议 | Oracle + GPT-5.4 high | 高推理，低温度 |
| 快速探索 | Explore + Grok-Fast | 快，不需要写文件 |
| Code Review | Momus + GPT-5.4 xhigh | 极高推理，找问题 |

Oracle 在设计上就是"只给建议不动手"的模式。它的温度低、工具受限（不能写文件），天然适合批评性思维。

### 解决局限 3：工具权限隔离

Oracle 的代码里：

```typescript
const restrictions = createAgentToolRestrictions([
  "write",
  "edit",
  "apply_patch",
  "task",
])
```

这不是 prompt 里说“你不能写文件”，这是代码层面的硬约束。无论 prompt 如何，Oracle 在能力配置上都拿不到这些写入工具。

---

## 但这不是"越多越好"

多 Agent 有代价：

- **延迟**：委托任务需要启动新的 Agent 会话，有开销
- **成本**：每个 Agent 调用都消耗 API 配额
- **复杂性**：调试多个 Agent 协作的问题比调试单模型难

所以 oh-my-openagent 的设计原则不是"把所有事都委托出去"，而是：

**只有当子任务可以并行、或者需要专门化能力时，才委托。**

Sisyphus 在面对一个简单的"改一行代码"需求时，会直接自己做，不会去委托 Hephaestus——委托的开销不值得。

---

## 用一句话总结

多 Agent 编排解决的不是"模型能力不足"，而是**任务的结构性问题**：

- 复杂任务超出单次上下文能装下的信息量
- 不同子任务需要不同的"专注模式"
- 某些角色天然需要权限隔离（顾问不能动手）

理解了这个，接下来读 oh-my-openagent 的源码，你就不会再问"为什么要搞这么复杂"——而是"哦，原来这里是这样解决的"。

---

## 想先跑起来再读？三步装好

如果你是边用边学的类型，可以先装上再读后面的章节：

```bash
# 交互式安装（推荐新手）
bunx oh-my-opencode install

# 验证安装是否正常
bunx oh-my-opencode doctor
```

装完之后**什么都不需要配置**就能用——空配置会自动启用全部默认功能。如果你想调整模型或禁用某些功能，看完[第19章：配置系统实战](/oh-config/)再改。

后面的章节（第18-22章）是拆解源码，解释"为什么这样设计"。第23章把整个流程串起来，第24章是实际动手扩展的案例。你可以按顺序读，也可以先跑起来用几天再回来读源码章节。

---

---

**下一章** → [第18章：插件系统概述](/16-plugin-overview/)

插件的入口文件只有 120 行，但它协调了整个系统的初始化。下一章逐行拆解它。

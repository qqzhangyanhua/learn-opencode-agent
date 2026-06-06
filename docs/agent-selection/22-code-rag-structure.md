---
title: 代码库 RAG 为什么不能按普通文档做
description: 说明代码库 RAG 需要按文件、符号、调用关系、测试关系和版本边界设计检索结构。
contentType: support
series: support
contentId: agent-selection-code-rag-structure
shortTitle: 代码库 RAG 结构
summary: 代码库 RAG 的核心是保留程序结构，固定 token chunk 会破坏代码语义。
difficulty: advanced
estimatedTime: 25 分钟
learningGoals:
  - 理解代码和普通文档在检索结构上的差异
  - 设计代码库 chunk、metadata 和符号索引
  - 判断代码 RAG 何时需要工具调用和测试闭环
prerequisites:
  - 已了解代码库 Agent 选型
  - 已了解 RAG 选型
recommendedNext:
  - /agent-selection/11-codebase-agent-selection
  - /agent-selection/20-retrieval-patterns
  - /practice/p22-project/
practiceLinks:
  - /practice/p09-hybrid-retrieval/
  - /practice/p20-observability/
searchTags:
  - 代码 RAG
  - 代码库检索
  - 符号索引
  - 调用链
  - Code-aware RAG
navigationLabel: 代码库 RAG 结构
entryMode: bridge
roleDescription: 适合为代码问答、代码审查和自动修改系统设计检索层时阅读。
---

<ChapterLearningGuide />

## 代码不是普通文本

普通文档按段落组织，代码按结构组织：

```text
file
  -> module
  -> class / function
  -> symbol
  -> import / export
  -> tests
```

如果按固定 token 切片，函数、类型、调用关系和测试关系都会被切碎。

## 两种索引必须配合

代码库检索至少需要：

| 索引 | 解决什么 |
| --- | --- |
| Lexical / symbol index | 精确找函数、类、文件、错误码 |
| Semantic index | 找行为相似、语义相关的实现 |

只用语义索引会漏掉精确符号，只用关键词索引又找不到“实现了某个行为”的代码。

## 一个代码问题需要哪些上下文

用户问“为什么登录失败后没有提示”，普通 RAG 可能只召回一段包含“login failed”的代码。但真正要定位问题，通常需要：

```text
入口组件
  -> 提交表单的 handler
  -> API client
  -> 错误类型定义
  -> toast / message 组件
  -> 相关测试
```

这些文件不一定语义相似，却在程序结构上相关。代码库 RAG 如果不知道调用关系、导入关系和测试关系，就很容易召回“看起来相关但不能改”的片段。

## 代码 RAG 的 metadata

每个 chunk 至少要有：

- repository；
- branch / commit；
- file_path；
- language；
- symbol_name；
- symbol_type；
- imports；
- exports；
- related_tests；
- owner 或 module。

没有这些 metadata，检索结果很难支持修改和验证。

## metadata 不是装饰

metadata 应该直接服务检索和过滤。例如：

| metadata | 用途 |
| --- | --- |
| file_path | 按模块、目录、配置类型过滤 |
| symbol_name | 精确匹配函数、类、变量 |
| language | 选择 parser 和展示方式 |
| commit | 避免混用不同版本代码 |
| related_tests | 修改后定位验证入口 |
| owner | 大仓库里定位责任边界 |
| generated | 排除生成文件和依赖文件 |

如果 metadata 只保存文件名和文本，后续要做代码审查、自动修复和影响分析时会马上不够用。

## chunk 应该怎么切

| 单元 | 适合 |
| --- | --- |
| 文件级 | 小文件、配置文件 |
| 符号级 | 函数、类、方法 |
| 代码块级 | 长函数内部局部逻辑 |
| 测试级 | case、fixture、snapshot |

不要盲目按 token 切。优先保持语法结构完整，再考虑长度。

## 不同语言要用不同 parser

代码 chunk 最好来自语法树，而不是纯文本规则。至少要区分：

- TypeScript / JavaScript 的 import、export、function、class；
- Python 的 module、class、function、decorator；
- Java 的 package、class、method、annotation；
- Markdown 和配置文件的标题、键值、代码块。

跨语言项目里，统一按 token 切会把最重要的结构抹掉。更稳妥的做法是每种语言使用对应 parser，无法解析时再退回文件级或段落级切分。

## 检索策略

| 查询 | 推荐检索 |
| --- | --- |
| 找函数或类 | 关键词 + 符号索引 |
| 解释逻辑 | 文件读取 + 语义检索 |
| 查调用链 | import / reference 图 |
| 改 bug | 相关实现 + 相关测试 |
| 找配置 | 路径和关键词检索 |

纯向量检索容易漏掉精确符号名。代码库 RAG 通常需要 hybrid。

## 修改任务要补影响分析

问答任务只需要解释上下文，修改任务还需要判断影响范围：

```text
changed symbol
  -> direct callers
  -> related tests
  -> config / schema
  -> public API boundary
```

如果系统只召回当前函数，模型可能改出局部正确、全局破坏的代码。代码库 Agent 至少要能继续读取调用方、测试和类型定义，而不是把初次 RAG 结果当成完整上下文。

## 不要只靠 RAG 改代码

RAG 能帮助定位上下文，但不能替代：

- 文件读取；
- diff 生成；
- 类型检查；
- 单元测试；
- 回归测试；
- 人工 review。

自动修改代码时，RAG 只是输入层，工具和测试才是闭环。

## 上线检查

上线前检查：

- 是否排除了 `node_modules`、lock 文件、生成文件和构建产物；
- 是否记录 branch 或 commit；
- 是否有符号索引；
- 是否能从实现找到相关测试；
- 是否支持精确文件读取；
- 是否能处理未提交变更；
- 是否能解释每个召回片段为什么相关；
- 修改类任务是否必须跑检查。

代码库 RAG 的验收不应该只看“能不能回答问题”，还要看它是否帮助模型做出可验证的修改。

## 版本边界

代码 RAG 必须记录 commit 或 branch。否则模型可能把不同版本的实现混在一起。

需要特别处理：

- 当前工作区未提交变更；
- 目标分支；
- 生成文件；
- vendored 代码；
- 大型 lock 文件；
- 测试快照。

不是所有文件都应该进入索引。

## 最终判断

```text
普通文档：段落和标题
代码库：文件、符号、调用、测试
问答：RAG 足够
修改：RAG + Tools + Tests
自动修复：Agent Loop + Review
```

代码库 RAG 的目标不是“召回一段像代码的文本”，而是召回能支持正确修改的程序上下文。

# 实践篇代码示例

本目录包含 23 个可运行的 AI Agent 实践示例，涵盖从基础到生产的完整技术栈。

它和站内理论篇的关系可以这样理解：

- 理论篇回答“OpenCode 这类 Agent 系统是怎么实现的”
- 实践篇回答“如果你自己从零搭，一个可运行版本应该怎么逐步做出来”

建议先阅读站内 [实践环境准备](/practice/setup)，再按 `P1 -> P23` 的顺序逐步推进。

## 环境配置

### 1. 安装依赖

```bash
bun install
```

### 2. 配置 API Key

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```bash
# 必填
OPENAI_API_KEY=sk-your-api-key-here

# 可选：自定义 API 端点
OPENAI_BASE_URL=https://api.openai.com/v1

# 可选：自定义模型
OPENAI_MODEL=gpt-4o
```

### 3. 运行示例

```bash
# 运行任意示例
bun run p01-minimal-agent.ts
bun run p15-multi-agent.ts
```

标准约定：全书统一使用 `bun run pxx-*.ts` 作为示例运行格式。

## 配置说明

所有示例都支持以下环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENAI_API_KEY` | OpenAI API Key（必填） | - |
| `OPENAI_BASE_URL` | API 端点（可选） | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 模型名称（可选） | `gpt-4o` 或 `gpt-4o-mini` |

## 使用场景

### 使用官方 OpenAI

```bash
OPENAI_API_KEY=sk-xxx
```

### 使用代理服务

```bash
OPENAI_API_KEY=your-proxy-key
OPENAI_BASE_URL=https://your-proxy.com/v1
```

### 使用兼容服务（如 Azure OpenAI）

```bash
OPENAI_API_KEY=your-azure-key
OPENAI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
OPENAI_MODEL=gpt-4
```

### 使用本地模型（如 Ollama）

```bash
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3
```

## 章节列表

### Phase 1 — Agent 基础
- P1: 最小 Agent (`p01-minimal-agent.ts`)
- P2: 多轮对话 (`p02-multi-turn.ts`)
- P3: 流式输出 (`p03-streaming.ts`)
- P4: 错误处理 (`p04-error-handling.ts`)

### Phase 2 — 记忆与知识系统
- P5: 记忆系统架构 (`p05-memory-arch.ts`)
- P6: 记忆增强检索 (`p06-memory-retrieval.ts`)
- P7: RAG 基础 (`p07-rag-basics.ts`)
- P8: GraphRAG (`p08-graphrag.ts`)
- P9: 混合检索 (`p09-hybrid-retrieval.ts`)

### Phase 3 — 推理与规划
- P10: ReAct Loop (`p10-react-loop.ts`)
- P11: Planning (`p11-planning.ts`)
- P12: Reflection (`p12-reflection.ts`)

### Phase 4 — 感知扩展
- P13: 多模态 (`p13-multimodal.ts`)
- P14: MCP 协议 (`p14-mcp.ts`)

### Phase 5 — 多 Agent 协作
- P15: 多 Agent 编排 (`p15-multi-agent.ts`)
- P16: 子 Agent (`p16-subagent.ts`)
- P17: Agent 通信 (`p17-agent-comm.ts`)

### Phase 6 — 生产化
- P18: 模型路由 (`p18-model-routing.ts`)
- P19: 安全防护 (`p19-security.ts`)
- P20: 可观测性 (`p20-observability.ts`)
- P21: 评估测试 (`p21-evaluation.ts`)

### Phase 7 — 综合实战
- P22: 完整项目 (`p22-project.ts`)
- P23: 生产部署 (`p23-production.ts`)

## 注意事项

1. 所有示例都需要有效的 API Key
2. 部分示例可能需要额外的依赖或配置
3. 建议按顺序学习，从 P1 开始
4. 生产环境使用时请参考 P23 的最佳实践

## 特殊章节说明

### P14：MCP 协议接入

这一章不是单脚本示例，除了 `p14-mcp.ts` 外，还需要先启动 `p14-mcp-server.ts`。

推荐顺序：

```bash
# 终端 1
bun run p14-mcp-server.ts

# 终端 2
bun run p14-mcp.ts
```

## 故障排查

### API Key 无效

```
Error: Invalid API key
```

检查 `.env` 文件中的 `OPENAI_API_KEY` 是否正确。

### 连接超时

```
Error: connect ETIMEDOUT
```

检查 `OPENAI_BASE_URL` 是否可访问，或尝试使用代理。

### 模型不存在

```
Error: The model 'xxx' does not exist
```

检查 `OPENAI_MODEL` 是否为有效的模型名称。

# 生产架构示例

## 演示目标

通过 `production_architecture.py` 理解第30章的核心主题：
- 会话状态与持久化层（`SessionStore` / `Session`）
- Provider 层带重试和主备切换（`ProviderWithFallback`）
- 可观测性横切层（`ObservabilityLayer` / `RequestTrace`）
- 多会话并发隔离（每个会话独立上下文）

## 依赖安装命令

```bash
pip install openai
```

## 必要环境变量

- `DEEPSEEK_API_KEY`：调用 DeepSeek Chat，运行前导出（macOS/Linux: `export DEEPSEEK_API_KEY="your_key"`）

## 建议先运行哪个文件

```bash
python production_architecture.py
```

运行后依次展示：
1. 会话创建与多轮对话（状态在 `SessionStore` 中持久化）
2. 多个并发会话的隔离效果
3. 单会话统计（轮次、消息数、时长）
4. 全局可观测性汇总（总成本、token 数、平均延迟、错误率）

## 对应正文哪一节

- 第30章：《从 Demo 到可上线，生产架构怎么搭》（docs/intermediate/30-production-architecture/）

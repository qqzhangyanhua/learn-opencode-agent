# 性能与成本控制示例

## 演示目标

通过 `performance_cost.py` 理解第32章的核心主题：
- 月度成本预估（`CostEstimate`）：先把账算清楚再谈优化
- 成本感知模型路由（`CostAwareRouter`）：启发式复杂度判断 + 分层模型选择
- 上下文预算管理（`ContextBudget`）：system_prompt / history / docs / tools / query 分层分配
- 工具输出截断策略（`trim_to_budget`）
- 历史消息压缩（`compress_history`）

## 依赖安装命令

```bash
pip install openai
```

## 必要环境变量

- `DEEPSEEK_API_KEY`：模型路由演示会调用 DeepSeek Chat，运行前导出（macOS/Linux: `export DEEPSEEK_API_KEY="your_key"`）

## 建议先运行哪个文件

```bash
python performance_cost.py
```

运行后依次展示：
1. 月度成本预估（三个规模场景对比）
2. 成本感知模型路由（复杂度判断 + 每次调用 token / 成本 / 延迟）
3. 路由预算汇总（总调用数、总成本、按复杂度分布）
4. 上下文预算分配报告
5. 工具输出截断策略效果

## 对应正文哪一节

- 第32章：《性能与成本，把"聪明"做在架构里》（docs/intermediate/32-performance-cost/）

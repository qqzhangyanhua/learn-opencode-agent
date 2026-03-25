# 安全边界与高风险控制示例

## 演示目标

通过 `safety_boundaries.py` 理解第31章的核心主题：
- 四级风险注册表（LOW / MEDIUM / HIGH / CRITICAL）与执行策略映射
- Human-in-the-Loop 确认门（`HumanApprovalGate`）：让执行循环真正停住
- 两层 Prompt Injection 检测（规则匹配 + LLM 语义判断）
- 角色最小权限（`AgentRole`）与运行时权限检查（`PermissionChecker`）

## 依赖安装命令

```bash
pip install openai
```

## 必要环境变量

- `DEEPSEEK_API_KEY`：注入检测的 LLM 语义判断层会调用 DeepSeek Chat，运行前导出（macOS/Linux: `export DEEPSEEK_API_KEY="your_key"`）

## 建议先运行哪个文件

```bash
python safety_boundaries.py
```

运行后依次展示：
1. 风险分级策略验证（auto / log / confirm / block 四种处理路径）
2. 角色最小权限验证（reader 角色无法执行 apply_refund）
3. Prompt Injection 检测（规则命中 + LLM 语义判断）
4. Human-in-the-Loop 确认流程（批准 vs 拒绝两种场景）

## 对应正文哪一节

- 第31章：《安全与边界，高风险操作里的 Agent 设计模式》（docs/intermediate/31-safety-boundaries/）

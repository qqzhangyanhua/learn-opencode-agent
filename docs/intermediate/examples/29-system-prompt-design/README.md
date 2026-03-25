# System Prompt 设计示例

## 演示目标

通过 `system_prompt_design.py` 理解第29章的核心主题：
- 把 System Prompt 拆成六块结构（角色、能力、约束、输出格式、安全边界、失败路径）
- 用模板库动态生成不同场景的 System Prompt
- 两层注入攻击检测（规则匹配 + LLM 语义判断）
- 基于意图路由选择合适的 Prompt 模板

## 依赖安装命令

```bash
pip install openai
```

## 必要环境变量

- `DEEPSEEK_API_KEY`：调用 DeepSeek Chat，运行前导出（macOS/Linux: `export DEEPSEEK_API_KEY="your_key"`）

## 建议先运行哪个文件

```bash
python system_prompt_design.py
```

运行后依次展示：
1. 结构化 System Prompt 构建（六段式分层写法）
2. Prompt 注入检测（规则命中 + LLM 二次判断）
3. 动态意图路由（code/data/support 三类模板）
4. 失败路径验证（无上下文、越权请求的处理）

## 对应正文哪一节

- 第29章：《如何给智能体写好灵魂说明书》（docs/intermediate/29-system-prompt-design/）

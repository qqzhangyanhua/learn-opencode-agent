# 多智能体协作示例

## 演示目标
- 演示主从、辩论、流水线三种典型多智能体协作模式，感受任务拆解、角色分工与串联流程的区别。
- 通过 `multi_agent.py` 观察不同模式下各 Agent 的职责与信息流，辅助理解第26章中的协作策略。

## 依赖安装命令
```bash
pip install openai
```

## 建议先运行哪个文件
```bash
python multi_agent.py
```
这是唯一脚本，运行后会依次在命令行演示主从、辩论和流水线三种模式，并打印每步的对话/结果。

## 对应正文哪一节
- 第26章：《让多个 AI 协作起来，多智能体模式实战》（docs/intermediate/26-multi-agent-collaboration/）

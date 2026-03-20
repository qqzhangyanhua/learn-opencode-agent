# 上下文工程示例

## 演示目标
- 展示“选、排、压、拼”四步的上下文工程流程模拟：包括上下文预算、相关文档筛选、历史压缩以及系统 prompt 生成，帮助理解第28章中上下文工程的原则。
- 通过 `context_engine.py` 回顾上下文构建、预算分配与上下文感知智能体的完整示例。

## 依赖安装命令
```bash
pip install openai tiktoken chromadb
```

## 建议先运行哪个文件
```bash
python context_engine.py
```
运行后会依次展示预算分配、上下文组装、上下文感知智能体对话等演示，观察每一步的输出与 token 预测。

## 对应正文哪一节
- 第28章：《Prompt 不够用了，上下文工程实战》（docs/intermediate/28-context-engineering/）

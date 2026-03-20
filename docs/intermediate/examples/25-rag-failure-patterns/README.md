# RAG 五大翻车场景 - 代码示例目录

## 演示目标
- 按照《你的 RAG 为什么总是答不准？五大翻车场景逐个修复》中的五个典型坑点逐个演练：chunk 切分、Embedding 模型、混合检索、Prompt 约束与元数据冲突。
- 通过 production_rag.py 汇聚这些维度，观察完整的生产级 RAG 管道在不同问题下的表现。

## 依赖安装命令
```bash
pip install -r requirements.txt
```

## 必要环境变量
- `DEEPSEEK_API_KEY`：用于与 DeepSeek API 建立会话助手调用，必须先在环境中导出（macOS/Linux: `export DEEPSEEK_API_KEY="your_key"`；Windows: `set DEEPSEEK_API_KEY=your_key`）。
- `SILICONFLOW_API_KEY`：用于 Embedding / 向量检索呼叫（v1...v5 以及 production_rag.py 都会校验），同样需提前导出。

## 建议先运行哪个文件
```bash
python v1_chunk_problem.py
```
先从 chunk 切分问题入手，理解上下文单位如何影响检索质量，再按顺序运行 v2、v3、v4、v5，最终通过 production_rag.py 看到整条流程。

## 对应正文哪一节
- 第25章：《RAG 为什么总是答不准？五大翻车场景逐个修复》（docs/intermediate/25-rag-failure-patterns/）。

## 文件速览
- `v1_chunk_problem.py`：语义分块与固定 chunk 的对比实验。
- `v2_embedding_problem.py`：中文/英文 Embedding 模型选择与分数差异。
- `v3_hybrid_search.py`：BM25 + 向量混合检索的轻量权重调参。
- `v4_prompt_control.py`：Prompt 约束策略，确保模型不编造。
- `v5_metadata_conflict.py`：多版本文档的元数据管理与冲突治理。
- `production_rag.py`：将上述能力集成成可配置的生产级 RAG。
- `requirements.txt`：当前示例所需依赖（DeepSeek、SiliconFlow、Chromadb 等）。

## 运行提示
- 运行前务必设置 `DEEPSEEK_API_KEY`（macOS/Linux: `export DEEPSEEK_API_KEY="your_key"`；Windows: `set DEEPSEEK_API_KEY=your_key`）。示例会在每个阶段输出对比结果，便于验证每类问题是否被修复。

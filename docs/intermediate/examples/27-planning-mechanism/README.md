# Planning 机制示例

## 演示目标
- 演示如何用 Plan-and-Execute、SmartAgent 等机制将复杂任务拆解、顺序执行与汇总回答，体现第27章中“先列清单再执行”的工程实践。
- 通过 `plan_and_execute.py` 了解 Plan-and-Execute agent 的规划、逐步执行与总结交互流程。

## 依赖安装命令
```bash
pip install openai
```

## 必要环境变量
- `DEEPSEEK_API_KEY`：用于所有演示的机器人调用接口，运行前请导出（macOS/Linux: `export DEEPSEEK_API_KEY="your_key"`；Windows: `set DEEPSEEK_API_KEY=your_key`）。

## 建议先运行哪个文件
```bash
python plan_and_execute.py
```
脚本包含多个演示：先运行 Plan-and-Execute，再运行 SmartAgent 的自动模式，观察任务规划、工具调用与结果汇总的对比。

## 对应正文哪一节
- 第27章：《为什么智能体要先列清单再干活》（docs/intermediate/27-planning-mechanism/）

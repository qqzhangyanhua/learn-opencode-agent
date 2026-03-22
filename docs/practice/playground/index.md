---
title: Practice Playground
description: 在浏览器中直接运行实践篇预置示例
---

<script setup>
import PracticePlaygroundShell from '../../../.vitepress/theme/components/practice-playground/PracticePlaygroundShell.vue'
</script>

# 🚀 Practice Playground

## 这是什么？

在浏览器中直接运行 AI Agent 代码，无需安装任何依赖。通过可视化编辑器和实时调试面板，快速理解 Agent 核心机制。

## ⚡ 快速开始

### 第一步：配置 API

1. 点击右上角 **"设置"** 按钮
2. 填写以下信息：
   - **API Key**（必填）：你的 OpenAI API Key
   - **baseURL**（可选）：默认 `https://api.openai.com/v1`
   - **model**（可选）：默认 `gpt-4o`
3. 点击 **"保存"**

::: tip 配置模板
- **OpenAI 官方**：`https://api.openai.com/v1` + `gpt-4o`
- **Azure OpenAI**：`https://YOUR-RESOURCE.openai.azure.com` + `gpt-4`
- **本地模型（Ollama）**：`http://localhost:11434/v1` + `llama3`
:::

### 第二步：选择章节

从左上角下拉菜单选择一个章节，推荐从 **P1：最小 Agent** 开始。

### 第三步：运行代码

- 点击 **"运行"** 按钮
- 或按快捷键 `Cmd/Ctrl + Enter`

### 第四步：查看结果

右侧面板会实时显示：
- **输出区**：模型的最终回答
- **调试区**：详细的执行日志

---

## 📊 当前支持的章节

| 章节 | 状态 | 功能 | 难度 |
|------|------|------|------|
| **P1：最小 Agent** | ✅ 可运行 | 工具调用核心机制 | 入门 |
| **P2：多轮对话** | ✅ 可运行 | 上下文管理 | 入门 |
| **P3：流式输出** | ✅ 可运行 | 实时反馈 | 入门 |
| **P10：ReAct Loop** | ✅ 可运行 | 推理行动循环 | 中级 |
| **P18：模型路由** | ✅ 可运行 | 成本控制 | 中级 |
| P4-P9, P11-P17, P19-P23 | 🚧 开发中 | 需本地运行 | - |

::: warning 功能边界
当前 Playground 仅支持 **5 个章节**（P1/P2/P3/P10/P18）。

其他 18 个章节需要在本地环境运行，请参考 [实践环境准备](/practice/setup)。
:::

---

## 🎯 核心特性

### 双面板编辑器
- **左侧**：请求模板编辑器（支持结构化编辑 + JSON 编辑）
- **右侧**：输出 / 调试信息实时展示

### 配置管理
- ✅ 浏览器本地存储（下次访问自动恢复）
- ✅ 支持清空和恢复默认值
- ✅ 配置导入导出

### 运行引擎
- ✅ 直接调用 OpenAI API（浏览器端）
- ✅ 支持流式输出（SSE）
- ✅ 支持工具调用（Tool Calling）
- ✅ 支持 ReAct 推理循环
- ✅ 内置模拟工具（天气查询、计算器、搜索）

### 模板系统
- ✅ 每个章节预置默认模板
- ✅ 支持自定义编辑
- ✅ 支持恢复到上次运行模板
- ✅ 支持重置到默认模板

### 调试功能
- ✅ 实时调试日志
- ✅ 请求/响应详情
- ✅ 错误信息展示
- ✅ 运行时长统计

---

## 🔒 安全提示

::: danger API Key 安全
- ⚠️ API Key 存储在浏览器本地 localStorage（明文）
- ⚠️ 请勿在公共设备或共享电脑上使用
- ⚠️ 使用完毕后建议清空配置
- ⚠️ 定期轮换 API Key

**推荐做法**：
1. 使用专门的测试 API Key（设置低额度限制）
2. 不要使用生产环境的 API Key
3. 定期检查 API 使用量
:::

---

## 💡 使用技巧

### 快捷键
- `Cmd/Ctrl + Enter`：运行当前模板
- `Cmd/Ctrl + R`：重置模板（需先实现）

### 调试技巧
1. **查看调试日志**：右侧调试区会显示详细的执行步骤
2. **修改模板**：左侧编辑器支持实时修改请求参数
3. **切换视图**：支持结构化编辑和 JSON 编辑两种模式

### 常见问题

**Q: 为什么点击运行没有反应？**
- 检查是否已配置 API Key
- 检查网络连接是否正常
- 查看右侧调试区的错误信息

**Q: 为什么显示"当前章节暂未接入"？**
- 该章节尚未实现在线运行功能
- 请使用本地环境运行，参考 [实践环境准备](/practice/setup)

**Q: 如何切换模型？**
- 点击右上角"设置"按钮
- 修改 model 字段（如 `gpt-4o-mini`、`gpt-4`）
- 保存后重新运行

**Q: 支持本地模型吗？**
- 支持兼容 OpenAI API 的本地模型（如 Ollama）
- 修改 baseURL 为本地地址（如 `http://localhost:11434/v1`）

---

## 🚀 开始体验

<PracticePlaygroundShell />

---

## 📚 相关资源

- [实践环境准备](/practice/setup) - 本地运行环境配置
- [实践篇首页](/practice/) - 查看完整课程大纲
- [P1：最小 Agent](/practice/p01-minimal-agent/) - 从这里开始学习
- [返回理论篇](/) - 查看理论知识

---

::: info 反馈与建议
如果你在使用过程中遇到问题或有改进建议，欢迎：
- 在 [GitHub Issues](https://github.com/qqzhangyanhua/learn-opencode-agent/issues) 提交反馈
- 加入社区讨论
:::

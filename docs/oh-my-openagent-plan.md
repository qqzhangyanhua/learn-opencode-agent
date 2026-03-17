# oh-my-openagent 章节规划

## 定位

在现有电子书基础上，新增**第五部分：oh-my-openagent 插件系统**，作为 OpenCode 的高级扩展案例，展示如何通过插件机制实现多模型编排、工具扩展和 Agent 增强。

## 目标读者

- 已经理解 OpenCode 基础架构的开发者
- 想要扩展 OpenCode 功能的插件开发者
- 对多模型编排感兴趣的 AI 工程师
- 想要构建生产级 Agent 系统的架构师

## 章节结构

### 第五部分：oh-my-openagent 插件系统（新增 5 章）

#### 第17章：插件系统概述
**目录**: `16-plugin-overview/`
**学习目标**: 理解 OpenCode 插件机制，oh-my-openagent 的设计理念
**核心内容**:
- OpenCode 插件接口（8 个 Hook）
- oh-my-openagent 的架构总览
- 插件加载流程（loadConfig → createManagers → createTools → createHooks）
- 与 OpenCode 的集成方式

**核心源码**:
- `src/index.ts` - 插件入口
- `src/plugin-interface.ts` - 插件接口实现
- `src/plugin-config.ts` - 配置加载

**关键概念**:
- Plugin Interface
- Hook System
- Config Merging Strategy

---

#### 第18章：多模型编排系统
**目录**: `17-multi-model-orchestration/`
**学习目标**: 理解如何编排多个 LLM 协同工作
**核心内容**:
- 11 个内置 Agent（Sisyphus/Hephaestus/Oracle 等）
- Agent 工厂模式（createXXXAgent）
- 模型路由策略（前端 → Gemini，后端 → Codex）
- Background Agent 并行执行

**核心源码**:
- `src/agents/` - Agent 定义
- `src/agents/builtin-agents/` - 条件工厂
- `src/features/background-agent/` - 后台执行

**关键概念**:
- Agent Factory Pattern
- Model Routing
- Parallel Execution
- Task Delegation

---

#### 第19章：Hooks 三层架构
**目录**: `18-hooks-architecture/`
**学习目标**: 理解 46 个 Hook 的分层设计
**核心内容**:
- Tier 1: Session Hooks（会话级）
- Tier 2: Tool Hooks（工具级）
- Tier 3: Event Hooks（事件级）
- Hook 注册与执行流程
- Safe Hook Creation 机制

**核心源码**:
- `src/hooks/` - 46 个 Hook 实现
- `src/create-hooks.ts` - Hook 创建
- `src/plugin/hooks/` - 三层架构

**关键概念**:
- Hook Lifecycle
- Three-Tier Architecture
- Hook Dependencies
- Error Handling

---

#### 第20章：工具扩展系统
**目录**: `19-tool-extension/`
**学习目标**: 理解如何扩展 OpenCode 的工具能力
**核心内容**:
- 26 个工具（LSP/AST/Hashline/Delegate 等）
- 工具注册机制（tool-registry）
- 权限控制（ToolGuard）
- 工具组合模式

**核心源码**:
- `src/tools/` - 26 个工具实现
- `src/tools/ast-grep/` - AST 工具
- `src/tools/interactive-bash/` - Tmux 集成
- `src/tools/hashline-edit/` - 精确编辑

**关键概念**:
- Tool Registry
- Permission System
- Tool Composition
- LSP Integration

---

#### 第21章：实战案例与最佳实践
**目录**: `20-best-practices/`
**学习目标**: 掌握插件开发的最佳实践
**核心内容**:
- 案例1：添加新的 Agent
- 案例2：扩展工具系统
- 案例3：自定义 Hook
- 案例4：配置管理
- 性能优化技巧
- 调试与测试

**核心源码**:
- 实际案例代码
- 测试用例
- 配置示例

**关键概念**:
- Plugin Development Workflow
- Testing Strategy
- Performance Optimization
- Error Handling

---

## 与现有章节的关系

```
第一部分：AI Agent 基础（第1-2章）
    ↓ 理解 Agent 概念
第二部分：OpenCode 项目架构（第3章）
    ↓ 理解 OpenCode 基础
第三部分：Agent 核心机制（第4-7章）
    ↓ 理解工具、会话、模型
第四部分：OpenCode 深入主题（第8-16章）
    ↓ 理解 TUI、API、持久化等
第五部分：oh-my-openagent 插件系统（第17-21章）★ 新增
    ↓ 理解插件扩展、多模型编排
```

## 写作风格

保持与现有章节一致：
1. **结构化**: 每章包含"本章导读"、"核心概念"、"源码分析"、"常见误区"
2. **实战导向**: 提供可运行的代码示例
3. **图示丰富**: 使用 Mermaid 图表展示架构
4. **新手友好**: 从简单到复杂，逐步深入
5. **源码对照**: 每章末尾提供 SourceSnapshotCard

## 技术要求

1. **Frontmatter**: 每章必须包含 `title` 和 `description`
2. **无重复 H1**: 正文不重复标题
3. **源码引用**: 使用真实的文件路径和行号
4. **Mermaid 图表**: 展示架构和流程
5. **Vue 组件**: 复用现有的交互组件

## 实施步骤

### 阶段 1: 创建章节骨架（1-2 天）
- [ ] 创建 5 个章节目录
- [ ] 编写每章的 frontmatter 和大纲
- [ ] 更新 `.vitepress/config.mts` 添加侧边栏

### 阶段 2: 编写核心内容（1 周）
- [ ] 第17章：插件系统概述
- [ ] 第18章：多模型编排系统
- [ ] 第19章：Hooks 三层架构
- [ ] 第20章：工具扩展系统
- [ ] 第21章：实战案例与最佳实践

### 阶段 3: 完善细节（3-5 天）
- [ ] 添加 Mermaid 图表
- [ ] 编写代码示例
- [ ] 添加 SourceSnapshotCard
- [ ] 编写"常见误区"部分

### 阶段 4: 审校与优化（2-3 天）
- [ ] 检查技术准确性
- [ ] 优化阅读体验
- [ ] 更新阅读地图
- [ ] 更新术语表

## 预期成果

1. **5 个新章节**: 完整覆盖 oh-my-openagent 的核心功能
2. **20+ 个代码示例**: 可运行的实战代码
3. **15+ 个架构图**: 清晰展示系统设计
4. **完整的学习路径**: 从概念到实战的闭环

## 注意事项

1. **版本一致性**: 基于当前 oh-my-openagent 的 dev 分支
2. **源码准确性**: 所有引用的源码路径必须真实存在
3. **概念连贯性**: 与前面章节的概念保持一致
4. **实用性优先**: 重点讲解实际应用，而非理论
5. **向后兼容**: 不破坏现有章节的结构和链接

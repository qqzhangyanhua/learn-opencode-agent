# 实践篇动画组件实现总结

## 已完成的动画组件

### 1. ToolCallingLifecycle - 工具调用生命周期动画

**位置**: `.vitepress/theme/components/ToolCallingLifecycle.vue`

**功能**:
- 展示工具调用的 4 个阶段：声明 → 决策 → 执行 → 整合
- 步进式演示，每个阶段显示对应的代码和输出
- 进度条显示当前执行进度
- 实时日志记录每个阶段的执行情况
- 阶段指示器显示当前所在阶段

**使用位置**: `/practice/p01-minimal-agent/`

**Props**:
- `autoPlay?: boolean` - 是否自动播放（默认 false）
- `playSpeed?: number` - 播放速度（毫秒，默认 2000）

**使用示例**:
```vue
<ToolCallingLifecycle />
```

---

### 2. GraphRagDemo - 知识图谱 BFS 遍历动画

**位置**: `.vitepress/theme/components/GraphRagDemo.vue`

**功能**:
- 可视化知识图谱的节点和边
- BFS 广度优先遍历演示
- 实时高亮当前访问节点和激活的边
- 显示待访问队列和已访问节点
- 跳数计数器
- 遍历日志记录

**使用位置**: `/practice/p08-graphrag/`

**Props**:
- `nodes: GraphNode[]` - 图节点数组
- `edges: GraphEdge[]` - 图边数组
- `startNodeId: string` - 起始节点 ID
- `query: string` - 查询问题
- `autoPlay?: boolean` - 是否自动播放（默认 false）
- `playSpeed?: number` - 播放速度（毫秒，默认 1500）

**使用示例**:
```vue
<GraphRagDemo
  :nodes="[
    { id: 'zhangsan', label: '张三', type: 'person', x: 100, y: 200 },
    { id: 'lisi', label: '李四', type: 'person', x: 250, y: 150 },
    ...
  ]"
  :edges="[
    { from: 'zhangsan', to: 'lisi', relation: '同事' },
    ...
  ]"
  start-node-id="zhangsan"
  query="张三的同事负责什么项目？"
/>
```

---

### 3. StreamingOutputDemo - 流式输出对比演示

**位置**: `.vitepress/theme/components/StreamingOutputDemo.vue`

**功能**:
- 非流式 vs 流式输出对比演示
- 非流式模式：5 秒等待后一次性显示全部内容
- 流式模式：逐字符打印（50ms/字符），模拟真实流式输出
- 阶段检测：idle → text → tool-call → completed
- 实时统计：模式、阶段、Chunk 数、耗时
- 执行日志：带时间戳的彩色日志（info/success/warning）
- 光标动画：流式输出时显示闪烁光标
- 对比说明面板

**使用位置**: `/practice/p03-streaming/`

**Props**:
- `autoPlay?: boolean` - 是否自动播放（默认 false）
- `playSpeed?: number` - 每个字符的延迟（毫秒，默认 50）

**使用示例**:
```vue
<StreamingOutputDemo />
```

---

### 4. ContextWindowDemo - 上下文窗口管理演示

**位置**: `.vitepress/theme/components/ContextWindowDemo.vue`

**功能**:
- 多轮对话消息累积可视化
- Token 预算实时监控（4000 tokens 预算）
- 消息列表展示（system/user/assistant 角色区分）
- Token 预算进度条（超出预算时变为警告色）
- 滑动窗口截断演示（保留 system + 最近消息，截断到 2000 tokens）
- 截断前后对比
- 实时统计：当前轮次、总 tokens、预算、状态
- 执行日志记录

**使用位置**: `/practice/p02-multi-turn/`

**Props**:
- `autoPlay?: boolean` - 是否自动播放（默认 false）
- `playSpeed?: number` - 播放速度（毫秒，默认 1500）

**使用示例**:
```vue
<ContextWindowDemo />
```

---

## 类型定义

所有类型定义已添加到 `.vitepress/theme/components/types.ts`：

### ToolCallingLifecycle 相关类型
```typescript
export type ToolCallingPhase = 'declare' | 'decide' | 'execute' | 'integrate'

export interface ToolCallingStep {
  phase: ToolCallingPhase
  title: string
  description: string
  code?: string
  output?: string
}

export interface ToolCallingLifecycleProps {
  autoPlay?: boolean
  playSpeed?: number
}
```

### GraphRagDemo 相关类型
```typescript
export type GraphNodeType = 'person' | 'project' | 'department' | 'tech'

export interface GraphNode {
  id: string
  label: string
  type: GraphNodeType
  x: number
  y: number
}

export interface GraphEdge {
  from: string
  to: string
  relation: string
}

export type GraphNodeStatus = 'unvisited' | 'current' | 'visited' | 'target'

export interface GraphRagDemoProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  startNodeId: string
  query: string
  autoPlay?: boolean
  playSpeed?: number
}
```

### StreamingOutputDemo 相关类型
```typescript
export type StreamingMode = 'non-streaming' | 'streaming'
export type StreamingPhase = 'idle' | 'text' | 'tool-call' | 'completed'

export interface StreamingOutputDemoProps {
  autoPlay?: boolean
  playSpeed?: number
}
```

### ContextWindowDemo 相关类型
```typescript
export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  role: MessageRole
  content: string
  tokens: number
}

export interface ContextWindowDemoProps {
  autoPlay?: boolean
  playSpeed?: number
}
```

---

## 组件注册

四个组件已在 `.vitepress/theme/index.ts` 中全局注册：

```typescript
import ToolCallingLifecycle from './components/ToolCallingLifecycle.vue'
import GraphRagDemo from './components/GraphRagDemo.vue'
import StreamingOutputDemo from './components/StreamingOutputDemo.vue'
import ContextWindowDemo from './components/ContextWindowDemo.vue'

const globalComponents = [
  // ... 其他组件
  ['ToolCallingLifecycle', ToolCallingLifecycle],
  ['GraphRagDemo', GraphRagDemo],
  ['StreamingOutputDemo', StreamingOutputDemo],
  ['ContextWindowDemo', ContextWindowDemo],
] as const
```

---

## 设计特点

### 1. 统一的设计语言
- 使用 VitePress 主题变量（`--vp-c-brand-1`、`--vp-c-bg-soft` 等）
- 一致的圆角、间距和字体大小
- 统一的按钮样式和交互反馈

### 2. 响应式布局
- 桌面端：左右分栏（主视图 + 侧边栏）
- 移动端：上下堆叠，自动调整布局

### 3. 交互控制
- 播放/暂停按钮
- 重置按钮
- 可配置的播放速度
- 可选的自动播放

### 4. 状态可视化
- 进度指示器
- 实时日志
- 队列状态
- 阶段高亮

### 5. 教学友好
- 清晰的标签和说明
- 颜色编码（不同阶段/状态使用不同颜色）
- 时间戳日志
- 章节标识徽章

---

## 访问方式

启动开发服务器后访问：

- **P1 工具调用动画**: http://localhost:5175/practice/p01-minimal-agent/
- **P8 图遍历动画**: http://localhost:5175/practice/p08-graphrag/
- **P3 流式输出动画**: http://localhost:5175/practice/p03-streaming/
- **P2 上下文管理动画**: http://localhost:5175/practice/p02-multi-turn/

---

## 后续扩展建议

基于现有实现，可以快速添加更多动画：

### 高优先级
1. **P12: Reflection** - Generator-Critic 迭代循环
2. **P18: 模型路由** - 路由决策树和降级链
3. **P7: RAG 基础** - 向量检索流程

### 可复用的模式
- 播放控制逻辑可抽象为 `useDemoPlayer` composable
- 日志系统可抽象为 `useExecutionLog` composable
- 队列管理可抽象为 `useQueueState` composable

### 样式复用
- 所有动画组件使用相同的 CSS 变量和类名前缀
- 可以创建共享的样式文件 `demo-common.css`

---

## 技术栈

- **框架**: Vue 3 Composition API
- **构建**: VitePress 1.6.4
- **语言**: TypeScript
- **样式**: Scoped CSS + CSS Variables
- **图形**: SVG（GraphRagDemo）

---

## 开发命令

```bash
# 启动开发服务器
bun dev

# 构建生产版本
bun build

# 预览构建产物
bun preview
```

---

## 注意事项

1. **类型安全**: 所有 Props 都有完整的 TypeScript 类型定义
2. **类型定义位置**: 为避免 Vue SFC 类型推导问题，类型直接定义在组件内部，而不是从外部导入
3. **内存管理**: 组件卸载时自动清理定时器
4. **性能优化**: 使用 `computed` 缓存计算结果
5. **可访问性**: 使用语义化 HTML 和清晰的标签
6. **浏览器兼容**: 使用标准 CSS 特性，避免实验性 API

---

## 已知问题与解决方案

### Vue SFC 类型推导问题
**问题**: 从外部导入的类型在 `defineProps<T>()` 中可能导致编译错误
```
[@vue/compiler-sfc] Unresolvable type reference or unsupported built-in utility type
```

**解决方案**: 将 Props 类型直接定义在组件内部
```typescript
// ❌ 不推荐
import type { MyProps } from './types'
const props = defineProps<MyProps>()

// ✅ 推荐
const props = defineProps<{
  autoPlay?: boolean
  playSpeed?: number
}>()
```

---

## 文件清单

```
.vitepress/theme/
├── components/
│   ├── ToolCallingLifecycle.vue    # P1 工具调用动画
│   ├── GraphRagDemo.vue            # P8 图遍历动画
│   ├── StreamingOutputDemo.vue     # P3 流式输出动画
│   ├── ContextWindowDemo.vue       # P2 上下文管理动画
│   └── types.ts                    # 类型定义（已更新）
├── index.ts                        # 主题入口（已更新）
└── custom.css                      # 全局样式

docs/practice/
├── p01-minimal-agent/index.md      # 已嵌入 ToolCallingLifecycle
├── p08-graphrag/index.md           # 已嵌入 GraphRagDemo
├── p03-streaming/index.md          # 已嵌入 StreamingOutputDemo
└── p02-multi-turn/index.md         # 已嵌入 ContextWindowDemo
```

---

## 验证清单

- [x] 类型定义已添加到 `types.ts`
- [x] 组件已创建并实现核心功能
- [x] 组件已在 `index.ts` 中注册
- [x] 组件已嵌入到对应章节
- [x] 开发服务器可正常启动
- [x] 响应式布局已测试
- [x] 交互控制已实现
- [x] 日志系统已实现
- [x] 状态管理已实现
- [x] P1 工具调用动画已完成
- [x] P8 图遍历动画已完成
- [x] P3 流式输出动画已完成
- [x] P2 上下文管理动画已完成

---

**实现完成时间**: 2026-03-23
**开发服务器**: http://localhost:5175/

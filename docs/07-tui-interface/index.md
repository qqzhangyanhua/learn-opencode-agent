---
title: 第七篇：TUI 终端界面
description: 第七篇：TUI 终端界面的详细内容
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/cli/cmd/tui/`
> **前置阅读**：第六篇 MCP 协议集成
> **学习目标**：理解 OpenCode 为什么把终端前端做成一套高密度工作台，而不是传统一问一答 CLI，以及这套 TUI 怎样复用前面讲过的 session、tool 和 provider 能力

---

<SourceSnapshotCard
  title="第七篇源码快照"
  description="这一篇先别陷进单个组件，而要先抓 TUI 这台终端工作台怎样靠 Provider、路由、快捷键和主题把高密度交互撑起来。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: 'TUI 根组件',
      path: 'packages/opencode/src/cli/cmd/tui/app.tsx',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/cli/cmd/tui/app.tsx'
    },
    {
      label: 'TUI 路由',
      path: 'packages/opencode/src/cli/cmd/tui/context/route.tsx',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/cli/cmd/tui/context/route.tsx'
    },
    {
      label: '快捷键上下文',
      path: 'packages/opencode/src/cli/cmd/tui/context/keybind.tsx',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/cli/cmd/tui/context/keybind.tsx'
    },
    {
      label: '主题上下文',
      path: 'packages/opencode/src/cli/cmd/tui/context/theme.tsx',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/cli/cmd/tui/context/theme.tsx'
    }
  ]"
/>

## 核心概念速览

如果你之前只把 OpenCode 当成命令行工具，这一篇会帮你重新校正认知：

**它的 TUI 更像一个终端里的 IDE 工作台，而不是命令回显界面。**

当前 TUI 至少同时承担这些角色：

- 会话主界面
- 状态面板
- 权限与问题交互入口
- 模型与 Agent 切换入口
- 终端工作流控制台

所以这一篇最适合带着一个问题去看：

**为什么一个 Agent 产品在终端里，也会自然长出接近 GUI 应用的状态结构和交互密度。**

## 本章导读

### 这一章解决什么问题

这一章要回答的是：

- 为什么 OpenCode 没有停留在“一问一答 CLI”
- TUI 在这个产品里承担了哪些产品职责
- 终端界面的状态、路由、快捷键、主题是怎样组织起来的
- 为什么 TUI 虽然跑在终端里，但工程结构已经接近 GUI 应用

### 必看入口

- [packages/opencode/src/cli/cmd/tui/app.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/tui/app.tsx)：TUI 根组件
- [packages/opencode/src/cli/cmd/tui/context/route.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/tui/context/route.tsx)：路由与页面切换
- [packages/opencode/src/cli/cmd/tui/context/keybind.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/tui/context/keybind.tsx)：快捷键系统
- [packages/opencode/src/cli/cmd/tui/context/theme.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/tui/context/theme.tsx)：主题系统
- [packages/opencode/src/cli/cmd/tui/context/helper.tsx](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/cli/cmd/tui/context/helper.tsx)：辅助交互能力

### 先抓一条主链路

建议先追这条线：

```text
app.tsx
  -> 多层 Context Provider 装配
  -> route.tsx 决定当前界面
  -> keybind.tsx 接收交互输入
  -> helper / theme 等上下文提供能力
  -> 最终驱动 session、permission、question 等产品状态展示
```

先理解“界面状态是怎样被组织的”，再分别读具体组件。

### 初学者阅读顺序

1. 先读 `app.tsx`，只看 Provider 装配顺序和整体骨架。
2. 再读 `route.tsx`、`keybind.tsx`、`theme.tsx`，理解 TUI 的三个核心交互面。
3. 最后选一个具体页面或组件，看它怎样消费前面这些上下文。

### 最容易误解的点

- TUI 不是 CLI 的皮肤层，而是完整的前端工作台。
- 终端 UI 的复杂度并不低，状态管理、路由、主题和快捷键一样会长成系统。
- 读 TUI 代码时不要先陷进单个组件，先看 Provider 和状态边界更有效。

## 7.1 为什么终端前端会演化成 TUI 工作台

### 如果只做成一问一答 CLI，会缺什么

如果只保留一问一答 CLI，交互大概会长这样：
```
$ opencode
> 帮我重构这个函数
[等待 30 秒...]
这是重构后的代码...

> 继续优化
[等待 30 秒...]
已优化...
```

这种形态很快会暴露几个问题：
- 一问一答，体验割裂
- 无法实时看到 AI 的思考过程
- 不支持流式输出
- 无法撤销操作
- 缺少上下文感知

### TUI 在 OpenCode 里补上了什么

OpenCode 的 TUI，本质上是在终端里补出一个持续存在的工作台：
```
┌─────────────────────────────────────────┐
│ OpenCode - Session: refactor-auth       │
├─────────────────────────────────────────┤
│ User: 帮我重构这个函数                    │
│                                         │
│ Assistant: 我来分析一下...              │
│ [实时显示推理过程]                       │
│ [实时显示代码生成]                       │
│ [显示工具调用]                          │
└─────────────────────────────────────────┘
```

它补上的不是“更好看”，而是几类 CLI 很难自然承载的产品能力：
1. **实时反馈**：流式显示 AI 响应
2. **富交互**：支持鼠标点击、滚动、选择
3. **多窗口**：同时显示多个信息面板
4. **快捷键**：高效的键盘操作
5. **主题化**：支持自定义颜色主题

### OpenCode 的 TUI 特性

打开 `cli/cmd/tui/app.tsx`，最值得先看的不是单个组件，而是最外层应用壳：

```typescript
export function App() {
  return (
    <ArgsProvider>
      <ExitProvider>
        <KVProvider>
          <ToastProvider>
            <RouteProvider>
              <TuiConfigProvider>
                <ThemeProvider mode={detectTerminalBackground()}>
                  <KeybindProvider>
                    <LocalProvider>
                      <SDKProvider>
                        <SyncProvider>
                          <PromptProvider>
                            <HelperProvider>
                              <CommandProvider>
                                <AppInner />
                              </CommandProvider>
                            </HelperProvider>
                          </PromptProvider>
                        </SyncProvider>
                      </SDKProvider>
                    </LocalProvider>
                  </KeybindProvider>
                </ThemeProvider>
              </TuiConfigProvider>
            </RouteProvider>
          </ToastProvider>
        </KVProvider>
      </ExitProvider>
    </ArgsProvider>
  )
}
```

这串 Provider 说明 TUI 的工程形态已经非常接近 GUI 应用。当前至少能看到这些职责层：
- `ArgsProvider`：命令行参数
- `ExitProvider`：退出处理
- `KVProvider`：键值存储
- `ToastProvider`：通知系统
- `RouteProvider`：路由管理
- `TuiConfigProvider`：TUI 配置
- `ThemeProvider`：主题系统
- `KeybindProvider`：快捷键
- `LocalProvider`：本地状态
- `SDKProvider`：API 客户端
- `SyncProvider`：数据同步
- `PromptProvider`：输入提示
- `HelperProvider`：帮助系统
- `CommandProvider`：命令注册

---

## 7.2 SolidJS + OpenTUI 技术栈

### 为什么选择 SolidJS？

这里更适合从“终端前端需要什么”来理解选型，而不是简单做框架优劣比较。当前文稿里可以先抓住两点：终端前端很吃启动速度，也很吃细粒度更新。

如果用更传统的前端思路，常见问题会是：
- 虚拟 DOM 开销大
- 包体积大（影响 TUI 启动速度）
- 不是真正的响应式

而 SolidJS 在这里更贴合 TUI 场景：
- 真正的响应式（细粒度更新）
- 无虚拟 DOM（直接操作 DOM）
- 包体积小（TUI 启动快）
- API 类似 React（学习成本低）

**性能对比**：
```
启动时间：
- React TUI: ~500ms
- SolidJS TUI: ~150ms

内存占用：
- React TUI: ~80MB
- SolidJS TUI: ~30MB
```

### OpenTUI 框架

**OpenTUI** 是专门为终端设计的 UI 框架，类似于 React Native 之于移动端。

**核心概念**：
```typescript
import { Box, Text, useKeyboard } from "@opentui/solid"

function MyComponent() {
  useKeyboard((evt) => {
    if (evt.name === "return") {
      // 处理回车键
    }
  })

  return (
    <Box flexDirection="column">
      <Text color="cyan">Hello Terminal!</Text>
    </Box>
  )
}
```

**OpenTUI 组件**：
- `Box`：布局容器（类似 HTML 的 div）
- `Text`：文本显示
- `Input`：输入框
- `List`：列表
- `Scrollable`：滚动容器

### 响应式原理

`context/helper.tsx` 里封装了这套 Context 工厂：

```typescript
export function createSimpleContext<T, Props extends Record<string, any>>(input: {
  name: string
  init: ((input: Props) => T) | (() => T)
}) {
  const ctx = createContext<T>()

  return {
    provider: (props: ParentProps<Props>) => {
      const init = input.init(props)
      return (
        <Show when={init.ready === undefined || init.ready === true}>
          <ctx.Provider value={init}>{props.children}</ctx.Provider>
        </Show>
      )
    },
    use() {
      const value = useContext(ctx)
      if (!value) throw new Error(`${input.name} context must be used within a context provider`)
      return value
    },
  }
}
```

**设计模式**：
1. 创建 Context
2. 提供 Provider 组件
3. 提供 use 钩子
4. 支持 `ready` 状态（异步初始化）

**使用示例**：
```typescript
// 定义 Context
export const { use: useTheme, provider: ThemeProvider } = createSimpleContext({
  name: "Theme",
  init: () => {
    const [theme, setTheme] = createSignal("opencode")
    return { theme, setTheme }
  },
})

// 使用 Context
function MyComponent() {
  const { theme, setTheme } = useTheme()
  return <Text>Current theme: {theme()}</Text>
}
```

---

## 7.3 响应式状态管理（Context 系统）

### Context 的层次结构

```
App
├── ArgsProvider          # 命令行参数（只读）
├── ExitProvider          # 退出处理
├── KVProvider            # 持久化存储
├── ToastProvider         # 通知系统
├── RouteProvider         # 路由状态
├── TuiConfigProvider     # TUI 配置
├── ThemeProvider         # 主题系统
├── KeybindProvider       # 快捷键
├── LocalProvider         # 本地状态
├── SDKProvider           # API 客户端
├── SyncProvider          # 数据同步
├── PromptProvider        # 输入提示
├── HelperProvider        # 帮助系统
└── CommandProvider       # 命令注册
```

### 路由管理

`context/route.tsx` 里可以看到最基础的路由状态：

```typescript
export type HomeRoute = {
  type: "home"
  initialPrompt?: PromptInfo
  workspaceID?: string
}

export type SessionRoute = {
  type: "session"
  sessionID: string
  initialPrompt?: PromptInfo
}

export type Route = HomeRoute | SessionRoute

export const { use: useRoute, provider: RouteProvider } = createSimpleContext({
  name: "Route",
  init: () => {
    const [store, setStore] = createStore<Route>(
      process.env["OPENCODE_ROUTE"]
        ? JSON.parse(process.env["OPENCODE_ROUTE"])
        : {
            type: "home",
          },
    )

    return {
      get data() {
        return store
      },
      navigate(route: Route) {
        console.log("navigate", route)
        setStore(route)
      },
    }
  },
})
```

**路由类型**：
- `home`：主页（项目列表）
- `session`：会话页（对话界面）

**路由切换**：
```typescript
const route = useRoute()

// 导航到主页
route.navigate({ type: "home" })

// 导航到会话
route.navigate({ type: "session", sessionID: "abc123" })
```

### 主题系统

`context/theme.tsx` 里先列出内置主题集合：

```typescript
export const DEFAULT_THEMES: Record<string, ThemeJson> = {
  aura,
  ayu,
  catppuccin,
  ["catppuccin-frappe"]: catppuccinFrappe,
  ["catppuccin-macchiato"]: catppuccinMacchiato,
  cobalt2,
  cursor,
  dracula,
  everforest,
  flexoki,
  github,
  gruvbox,
  kanagawa,
  material,
  matrix,
  mercury,
  monokai,
  nightowl,
  nord,
  ["one-dark"]: onedark,
  ["osaka-jade"]: osakaJade,
  opencode,
  orng,
  ["lucent-orng"]: lucentOrng,
  palenight,
  rosepine,
  solarized,
  synthwave84,
  tokyonight,
  vesper,
  vercel,
  zenburn,
  carbonfox,
}
```

**内置 30+ 主题**：
- `opencode`：默认主题
- `dracula`：流行的暗色主题
- `github`：GitHub 风格
- `catppuccin`：柔和的暗色主题
- `tokyonight`：东京夜景主题
- `nord`：北欧风格
- ...

**主题结构**：
```typescript
type ThemeColors = {
  primary: RGBA
  secondary: RGBA
  accent: RGBA
  error: RGBA
  warning: RGBA
  success: RGBA
  info: RGBA
  text: RGBA
  textMuted: RGBA
  background: RGBA
  backgroundPanel: RGBA
  backgroundElement: RGBA
  border: RGBA
  // ... 更多颜色
}
```

### 键值存储（KV）

**用途**：持久化用户偏好设置

```typescript
const kv = useKV()

// 保存主题选择
kv.set("theme", "dracula")

// 读取主题选择
const theme = kv.get("theme", "opencode")  // 默认值 "opencode"

// 保存窗口大小
kv.set("window_size", { width: 120, height: 40 })
```

**存储位置**：`~/.opencode/tui-kv.json`

---

## 7.4 键盘快捷键与交互设计

### 快捷键系统

`context/keybind.tsx` 里定义了快捷键解析和 Leader 机制：

```typescript
export const { use: useKeybind, provider: KeybindProvider } = createSimpleContext({
  name: "Keybind",
  init: () => {
    const config = useTuiConfig()
    const keybinds = createMemo<Record<string, Keybind.Info[]>>(() => {
      return pipe(
        (config.keybinds ?? {}) as Record<string, string>,
        mapValues((value) => Keybind.parse(value)),
      )
    })
    const [store, setStore] = createStore({
      leader: false,
    })

    // Leader 键机制
    function leader(active: boolean) {
      if (active) {
        setStore("leader", true)
        focus = renderer.currentFocusedRenderable
        focus?.blur()
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          if (!store.leader) return
          leader(false)
          if (!focus || focus.isDestroyed) return
          focus.focus()
        }, 2000)
        return
      }

      if (!active) {
        if (focus && !renderer.currentFocusedRenderable) {
          focus.focus()
        }
        setStore("leader", false)
      }
    }

    useKeyboard(async (evt) => {
      if (!store.leader && result.match("leader", evt)) {
        leader(true)
        return
      }

      if (store.leader && evt.name) {
        setImmediate(() => {
          if (focus && renderer.currentFocusedRenderable === focus) {
            focus.focus()
          }
          leader(false)
        })
      }
    })

    const result = {
      get all() {
        return keybinds()
      },
      get leader() {
        return store.leader
      },
      parse(evt: ParsedKey): Keybind.Info {
        // Handle special case for Ctrl+Underscore (represented as \x1F)
        if (evt.name === "\x1F") {
          return Keybind.fromParsedKey({ ...evt, name: "_", ctrl: true }, store.leader)
        }
        return Keybind.fromParsedKey(evt, store.leader)
      },
      match(key: KeybindKey, evt: ParsedKey) {
        const keybind = keybinds()[key]
        if (!keybind) return false
        const parsed: Keybind.Info = result.parse(evt)
        for (const key of keybind) {
          if (Keybind.match(key, parsed)) {
            return true
          }
        }
      },
      print(key: KeybindKey) {
        const first = keybinds()[key]?.at(0)
        if (!first) return ""
        const result = Keybind.toString(first)
        return result.replace("<leader>", Keybind.toString(keybinds().leader![0]!))
      },
    }
    return result
  },
})
```

**Leader 键机制**：
- 类似 Vim 的 Leader 键
- 按下 Leader 键后，进入"命令模式"
- 2 秒内按下第二个键触发命令
- 超时自动退出命令模式

**示例**：
```
Leader + s  → 保存会话
Leader + q  → 退出
Leader + t  → 切换主题
Leader + a  → 切换 Agent
```

### 默认快捷键

**全局快捷键**：
```
Ctrl+C      → 退出
Ctrl+D      → 退出
Ctrl+L      → 清屏
Ctrl+R      → 刷新
Ctrl+Z      → 挂起
```

**会话快捷键**：
```
Ctrl+A      → 切换 Agent
Ctrl+M      → 切换模型
Ctrl+T      → 切换主题
Ctrl+S      → 保存会话
Ctrl+N      → 新建会话
Ctrl+W      → 关闭会话
```

**输入快捷键**：
```
Ctrl+U      → 清空输入
Ctrl+K      → 删除到行尾
Ctrl+W      → 删除单词
Ctrl+Y      → 粘贴
Tab         → 自动补全
Up/Down     → 历史记录
```

### 命令注册系统

`app.tsx` 里把常用命令统一注册到前端命令层：

```typescript
// 注册 40+ 命令
registerCommand({
  name: "agent",
  description: "Switch agent",
  keybind: "ctrl+a",
  handler: () => {
    // 打开 Agent 选择对话框
  },
})

registerCommand({
  name: "model",
  description: "Switch model",
  keybind: "ctrl+m",
  handler: () => {
    // 打开模型选择对话框
  },
})

registerCommand({
  name: "theme",
  description: "Switch theme",
  keybind: "ctrl+t",
  handler: () => {
    // 打开主题选择对话框
  },
})
```

**命令类型**：
- 对话框命令（打开选择器）
- 导航命令（切换页面）
- 操作命令（保存、删除）
- 工具命令（清屏、刷新）

---

## 7.5 主题系统与可定制化

### 主题定义格式

**JSON 格式**（`context/theme/opencode.json`）：

```json
{
  "$schema": "https://opencode.ai/theme.schema.json",
  "defs": {
    "bg": "#0a0e14",
    "fg": "#b3b1ad",
    "cyan": "#39bae6",
    "green": "#7fd962",
    "red": "#ff3333"
  },
  "theme": {
    "primary": "cyan",
    "secondary": "#ffb454",
    "accent": "cyan",
    "error": "red",
    "warning": "#ffb454",
    "success": "green",
    "info": "cyan",
    "text": "fg",
    "textMuted": "#626a73",
    "background": "bg",
    "backgroundPanel": "#0f131a",
    "backgroundElement": "#151a21",
    "border": "#1f2430",
    "borderActive": "cyan",
    "borderSubtle": "#151a21"
  }
}
```

**支持的颜色格式**：
1. **十六进制**：`"#ff0000"`
2. **引用**：`"primary"`（引用其他颜色）
3. **定义引用**：`"bg"`（引用 defs 中的颜色）
4. **变体**：`{ "dark": "#000", "light": "#fff" }`

### 主题解析

`context/theme.tsx` 里还有主题解析逻辑：

```typescript
function resolveTheme(theme: ThemeJson, mode: "dark" | "light") {
  const defs = theme.defs ?? {}
  function resolveColor(c: ColorValue): RGBA {
    if (c instanceof RGBA) return c
    if (typeof c === "string") {
      if (c === "transparent" || c === "none") return RGBA.fromInts(0, 0, 0, 0)

      if (c.startsWith("#")) return RGBA.fromHex(c)

      if (defs[c] != null) {
        return resolveColor(defs[c])
      } else if (theme.theme[c as keyof ThemeColors] !== undefined) {
        return resolveColor(theme.theme[c as keyof ThemeColors]!)
      } else {
        throw new Error(`Color reference "${c}" not found in defs or theme`)
      }
    }
    if (typeof c === "number") {
      return ansiToRgba(c)
    }
    return resolveColor(c[mode])
  }

  const resolved = Object.fromEntries(
    Object.entries(theme.theme)
      .filter(([key]) => key !== "selectedListItemText" && key !== "backgroundMenu" && key !== "thinkingOpacity")
      .map(([key, value]) => {
        return [key, resolveColor(value as ColorValue)]
      }),
  ) as Partial<ThemeColors>

  // Handle selectedListItemText separately since it's optional
  const hasSelectedListItemText = theme.theme.selectedListItemText !== undefined
  if (hasSelectedListItemText) {
    resolved.selectedListItemText = resolveColor(theme.theme.selectedListItemText!)
  } else {
    // Backward compatibility: if selectedListItemText is not defined, use background color
    resolved.selectedListItemText = resolved.background
  }

  // Handle backgroundMenu - optional with fallback to backgroundElement
  if (theme.theme.backgroundMenu !== undefined) {
    resolved.backgroundMenu = resolveColor(theme.theme.backgroundMenu)
  } else {
    resolved.backgroundMenu = resolved.backgroundElement
  }

  // Handle thinkingOpacity - optional with default of 0.6
  const thinkingOpacity = theme.theme.thinkingOpacity ?? 0.6

  return {
    ...resolved,
    _hasSelectedListItemText: hasSelectedListItemText,
    thinkingOpacity,
  } as Theme
}
```

**解析流程**：
1. 解析 `defs` 定义
2. 递归解析颜色引用
3. 处理 dark/light 变体
4. 填充可选字段的默认值

### 自定义主题

**创建自定义主题**：

1. 在 `~/.opencode/themes/` 创建 JSON 文件：

```bash
mkdir -p ~/.opencode/themes
cat > ~/.opencode/themes/my-theme.json << 'EOF'
{
  "theme": {
    "primary": "#00ff00",
    "secondary": "#ff00ff",
    "accent": "#00ffff",
    "error": "#ff0000",
    "warning": "#ffaa00",
    "success": "#00ff00",
    "info": "#0088ff",
    "text": "#ffffff",
    "textMuted": "#888888",
    "background": "#000000",
    "backgroundPanel": "#111111",
    "backgroundElement": "#222222",
    "border": "#333333",
    "borderActive": "#00ff00",
    "borderSubtle": "#1a1a1a"
  }
}
```

2. 在 TUI 中切换主题：

```
Ctrl+T → 选择 "my-theme"
```

### 系统主题

**自动检测终端主题**：

同一个文件里后面还实现了系统主题探测：

```typescript
function resolveSystemTheme() {
  console.log("resolveSystemTheme")
  renderer
    .getPalette({
      size: 16,
    })
    .then((colors) => {
      console.log(colors.palette)
      if (!colors.palette[0]) {
        if (store.active === "system") {
          setStore(
            produce((draft) => {
              draft.active = "opencode"
              draft.ready = true
            }),
          )
        }
        return
      }
      setStore(
        produce((draft) => {
          draft.themes.system = generateSystem(colors, store.mode)
          if (store.active === "system") {
            draft.ready = true
          }
        }),
      )
    })
}
```

**流程**：
1. 读取终端的 ANSI 颜色配置
2. 生成匹配的主题
3. 使用终端的背景色、前景色
4. 保持终端透明度

**好处**：
- 与终端主题一致
- 支持透明背景
- 自动适配 dark/light 模式

---

## 本章小结

### 核心概念

1. **TUI vs CLI**
   - TUI：实时反馈、富交互、多窗口
   - CLI：一问一答、体验割裂
   - OpenCode 选择 TUI 提供类 IDE 体验

2. **SolidJS + OpenTUI**
   - SolidJS：真正的响应式、无虚拟 DOM、启动快
   - OpenTUI：专为终端设计的 UI 框架
   - 15 层 Context Provider 管理状态

3. **响应式状态管理**
   - `createSimpleContext`：统一的 Context 创建模式
   - `RouteProvider`：路由管理（home/session）
   - `ThemeProvider`：主题系统（30+ 内置主题）
   - `KeybindProvider`：快捷键系统（Leader 键机制）
   - `KVProvider`：持久化存储

4. **键盘交互**
   - Leader 键机制（类似 Vim）
   - 40+ 注册命令
   - 全局/会话/输入快捷键
   - 命令注册系统

5. **主题系统**
   - JSON 格式定义
   - 颜色引用与变体
   - 自定义主题支持
   - 系统主题自动检测

### 关键代码位置

| 功能 | 文件路径 |
|------|---------|
| TUI 入口 | `packages/opencode/src/cli/cmd/tui/app.tsx` |
| Context 工具 | `packages/opencode/src/cli/cmd/tui/context/helper.tsx` |
| 路由管理 | `packages/opencode/src/cli/cmd/tui/context/route.tsx` |
| 主题系统 | `packages/opencode/src/cli/cmd/tui/context/theme.tsx` |
| 快捷键系统 | `packages/opencode/src/cli/cmd/tui/context/keybind.tsx` |
| 内置主题 | `packages/opencode/src/cli/cmd/tui/context/theme/*.json` |
| UI 组件 | `packages/opencode/src/cli/cmd/tui/component/*.tsx` |

### 设计模式总结

#### 1. Provider 模式

```typescript
export const { use: useTheme, provider: ThemeProvider } = createSimpleContext({
  name: "Theme",
  init: () => {
    const [theme, setTheme] = createSignal("opencode")
    return { theme, setTheme }
  },
})

// 使用
function MyComponent() {
  const { theme, setTheme } = useTheme()
  return <Text>Theme: {theme()}</Text>
}
```

**好处**：
- 统一的状态管理模式
- 类型安全
- 易于测试

#### 2. 命令模式

```typescript
registerCommand({
  name: "theme",
  description: "Switch theme",
  keybind: "ctrl+t",
  handler: () => {
    // 执行命令
  },
})
```

**好处**：
- 解耦快捷键和处理逻辑
- 易于扩展新命令
- 支持动态注册

#### 3. 主题解析模式

```typescript
function resolveColor(c: ColorValue): RGBA {
  if (c.startsWith("#")) return RGBA.fromHex(c)
  if (defs[c]) return resolveColor(defs[c])
  if (theme[c]) return resolveColor(theme[c])
  return resolveColor(c[mode])  // dark/light 变体
}
```

**好处**：
- 支持颜色引用
- 支持 dark/light 变体
- 递归解析

### 实践建议

1. **创建自定义主题**
   ```bash
   mkdir -p ~/.opencode/themes
   # 复制现有主题作为模板
   cp packages/opencode/src/cli/cmd/tui/context/theme/opencode.json \
      ~/.opencode/themes/my-theme.json
   # 编辑颜色
   vim ~/.opencode/themes/my-theme.json
   ```

2. **自定义快捷键**
   ```json
   {
     "tui": {
       "keybinds": {
         "agent": "ctrl+shift+a",
         "model": "ctrl+shift+m",
         "theme": "ctrl+shift+t"
       }
     }
   }
   ```

3. **调试 TUI**
   ```bash
   # 启动时打印日志
   bun dev --log-level DEBUG

   # 查看实时日志
   tail -f ~/.opencode/logs/opencode.log
   ```

### 源码阅读路径

1. 先看 `packages/opencode/src/cli/cmd/tui/app.tsx`，了解 TUI 根组件和 providers 是怎么装起来的。
2. 再读 `context/` 目录里和你最关心的两项能力，比如 `theme`、`command`、`sync`、`keybind`。
3. 最后进入 `routes/session/`，理解会话页面、侧边栏、弹窗和快捷键怎样一起工作。

### 任务

判断 OpenCode 的 TUI 为什么已经不是“终端里的一层 UI 皮肤”，而是一台围绕会话、命令和状态同步组织起来的工作台。

### 操作

1. 打开 `packages/opencode/src/cli/cmd/tui/app.tsx`，写出 TUI 根组件装配了哪些 provider 和全局上下文。
2. 再读 `context/` 目录里你最关心的两项能力，例如 `theme`、`command`、`sync`、`keybind`，记录它们各自负责什么状态边界。
3. 最后进入 `routes/session/`，任选一个真实交互，例如切换 Agent、切换主题或打开命令面板，顺着追到它的命令注册位置和页面消费位置。

### 验收

完成后你应该能说明：

- 为什么 TUI 的复杂度来自状态协作，而不是单个组件多不多。
- 为什么 provider、route 和快捷键上下文必须一起看，才能看懂终端工作台。
- 为什么这一层已经接近产品前端，而不是命令行附属输出。

### 下一篇预告

**第八篇：HTTP API 服务器**

我们将深入 `packages/opencode/src/server/` 目录，学习：
- Hono 框架的使用
- RESTful API 设计
- SSE 流式响应
- 中间件系统
- 错误处理与日志

---

### 思考题

1. 为什么 OpenCode 选择 SolidJS 而不是 React？
2. Leader 键机制有什么好处？如何实现的？
3. 如果要添加一个新的快捷键，需要修改哪些代码？

（提示：答案都在本章的代码示例中）

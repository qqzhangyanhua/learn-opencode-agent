# 实践源文件加载与注册优化设计

## 背景
当前实践章节页面通过 PracticeProjectSourceFiles 与 practice 文件数据紧密耦合，主题在入口阶段以全局组件 + eager glob 的方式加载所有 `practice/*.ts` 文件。Reviewer 提出的 Important 问题包括：误把无关脚本预加载，及该组件对非实践页面造成静态依赖，从而拖慢启动或打包过程。

## 目标
1. 将实践脚本数据的 glob 限定到真正的实践项目脚本（以 `p` 开头的 `practice/p*.ts`），避免将 `practice/` 下的其他工具脚本也一起 eager 载入并分发。
2. 保持 PracticeProjectSourceFiles 的使用方式不变，但在 VitePress 主题 enhanceApp 入口采用异步注册（defineAsyncComponent 封装），让非实践页面不会静态拉入该组件及其所有依赖。
3. 保证依赖链仅在真正需要时建立，尽量减少对静态模块的触发，同时保持 `npm run typecheck` 与 `bun run build` 通过。

## 约束与假设
- 修改范围限定在 `.vitepress/theme/data/practice-source-files.ts` 与 `.vitepress/theme/index.ts` 两个文件，不能触及其他组件/页面。
- PracticeProjectSourceFiles 的使用方不应该察觉任何变化；即组件名与 props 保持一致。
- 目标环境是 VitePress 主题（含 SSR），defineAsyncComponent 是可用的。
- 因为暂未收到 further clarification，暂时按默认环境（VitePress + Vue 3）继续。

## 设计
### 1. 缩窄 glob
- 直接把 `practiceSourceModules` 的 glob 模式改成 `../../../practice/p*.ts`，让 Vite 的 glob 只匹配以 `p` 开头的实践脚本。
- 由于 glob 依旧给出完整路径，后续 normalize 与 map 逻辑可以保留，不额外增加过滤。
- 这样既满足 reviewer 要求，又不会额外影响后续 `practiceSourceMap` 的构建逻辑。

### 2. 异步注册 PracticeProjectSourceFiles
- 不在文件顶部直接 `import PracticeProjectSourceFiles`，改为在 `globalComponents` 中只存放字符串标识（或排除该条目）。
- 在 `enhanceApp` 中使用 Vue 的 `defineAsyncComponent(() => import('./components/PracticeProjectSourceFiles.vue'))` 生成异步组件，然后通过 `app.component('PracticeProjectSourceFiles', asyncComponent)` 注册。
- 由于 VitePress 的 enhanceApp 运行在 client 与 ssr 共同作用的阶段，defineAsyncComponent 提供了 builtin 的 lazy loading，非实践页面不会在 SSR 阶段静态引入该组件。
- 组件本身仍可通过 `<PracticeProjectSourceFiles />` 方式使用，不需要在 markdown 端做额外改动。

## 备选方案回顾
1. **按路径过滤而不改 glob**：仍会让 Vite 预加载所有 `practice/*.ts`，只是在 map 中抛弃不必要的数据；虽然简单但没有降低依赖。
2. **Router hook 动态 import**：可以彻底避免静态依赖，但必须在 router 级别新增 hook 逻辑，工作量较大，且修改范围超出了 Reviewer 指定的两个文件。
3. **Keep component synchronous + 拆分 chunk**：比如将组件拆出成单独 chunk，仍须强制导入；效果没有 defineAsyncComponent 明显。

## 验证计划
- `npm run typecheck`
- `bun run build`

## 后续
如有更多 Reviewer 要求（如针对 SSR 需要显式处理），可在此文件下方追加补充。当前假设异步组件与 VitePress 运行时兼容。

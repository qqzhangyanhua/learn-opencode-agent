# 实践篇完整源码折叠展示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `docs/practice/*` 章节底部增加“完整示例源码”区域，按 `project-id -> sourceFiles` 自动展示完整源码，每个文件一个默认折叠面板，并支持复制。

**Architecture:** 复用现有 `.vitepress/theme/data/practice-projects.ts` 中的 `sourceFiles` 元数据，在主题层新增一个构建时源码映射模块和一个独立展示组件。页面侧保持显式挂载，把新组件统一放在 `PracticeProjectActionPanel` 之前，并扩展现有校验脚本防止后续章节漏接入。

**Tech Stack:** VitePress 1.5, Vue 3 `<script setup>`, TypeScript, `import.meta.glob`, Node.js 校验脚本

**Spec:** `docs/superpowers/specs/2026-03-23-practice-source-files-design.md`

---

## File Map

**Create:**
- `.vitepress/theme/data/practice-source-files.ts`
- `.vitepress/theme/components/PracticeProjectSourceFiles.vue`

**Modify:**
- `.vitepress/theme/components/types.ts`
- `.vitepress/theme/index.ts`
- `scripts/check-practice-course-experience.mjs`
- `docs/practice/p01-minimal-agent/index.md`
- `docs/practice/p02-multi-turn/index.md`
- `docs/practice/p03-streaming/index.md`
- `docs/practice/p04-error-handling/index.md`
- `docs/practice/p05-memory-arch/index.md`
- `docs/practice/p06-memory-retrieval/index.md`
- `docs/practice/p07-rag-basics/index.md`
- `docs/practice/p08-graphrag/index.md`
- `docs/practice/p09-hybrid-retrieval/index.md`
- `docs/practice/p10-react-loop/index.md`
- `docs/practice/p11-planning/index.md`
- `docs/practice/p12-reflection/index.md`
- `docs/practice/p13-multimodal/index.md`
- `docs/practice/p14-mcp/index.md`
- `docs/practice/p15-multi-agent/index.md`
- `docs/practice/p16-subagent/index.md`
- `docs/practice/p17-agent-comm/index.md`
- `docs/practice/p18-model-routing/index.md`
- `docs/practice/p19-security/index.md`
- `docs/practice/p20-observability/index.md`
- `docs/practice/p21-evaluation/index.md`
- `docs/practice/p22-project/index.md`
- `docs/practice/p23-production/index.md`

---

### Task 1：先把校验脚本改成会抓住漏接入页面

**Files:**
- Modify: `scripts/check-practice-course-experience.mjs`

- [ ] **Step 1：先扩展校验脚本，要求新组件必须存在、被注册、并接入所有实践页**

  在脚本中新增这些检查：

  ```js
  const practiceSourceFilesPath = path.join(
    rootDir,
    '.vitepress',
    'theme',
    'components',
    'PracticeProjectSourceFiles.vue',
  )

  if (!existsSync(practiceSourceFilesPath)) {
    issues.push('缺少 .vitepress/theme/components/PracticeProjectSourceFiles.vue')
  }

  if (!themeIndex.includes('PracticeProjectSourceFiles')) {
    issues.push('主题入口尚未注册 PracticeProjectSourceFiles')
  }

  if (!pageContent.includes('<PracticeProjectSourceFiles')) {
    issues.push(`${relativePath} 尚未接入 <PracticeProjectSourceFiles />`)
  }
  ```

- [ ] **Step 2：运行校验，确认它先红灯**

  Run:
  ```bash
  node scripts/check-practice-course-experience.mjs
  ```

  Expected:
  - FAIL
  - 至少包含以下一类报错：
    - 缺少 `PracticeProjectSourceFiles.vue`
    - 主题入口尚未注册 `PracticeProjectSourceFiles`
    - 某个 `docs/practice/*/index.md` 尚未接入 `<PracticeProjectSourceFiles />`

- [ ] **Step 3：不要继续改脚本，保留这个失败信号进入后续任务**

  这一步不提交。后续实现完成后再回到这个脚本验证转绿。

---

### Task 2：新增构建时源码映射模块

**Files:**
- Create: `.vitepress/theme/data/practice-source-files.ts`
- Modify: `.vitepress/theme/components/types.ts`

- [ ] **Step 1：先写数据模块的公开接口**

  在新文件中先固定导出契约：

  ```ts
  export interface PracticeSourceFileEntry {
    path: string
    code: string
    language: string
  }

  export function getPracticeSourceFile(path: string): PracticeSourceFileEntry | null
  export function getPracticeSourceFiles(paths: string[]): PracticeSourceFileEntry[]
  ```

  同时在 `types.ts` 中加入：

  ```ts
  export interface PracticeProjectSourceFilesProps {
    projectId: PracticeProjectDefinition['projectId']
    title?: string
  }
  ```

- [ ] **Step 2：补上最小实现，让数据模块可用**

  在 `.vitepress/theme/data/practice-source-files.ts` 中使用构建时原始文本导入：

  ```ts
  const rawModules = import.meta.glob('../../../practice/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  })

  function normalizePath(modulePath: string): string {
    return modulePath.replace('../../../', '')
  }

  function inferLanguage(filePath: string): string {
    if (filePath.endsWith('.ts')) return 'ts'
    if (filePath.endsWith('.js')) return 'js'
    if (filePath.endsWith('.json')) return 'json'
    if (filePath.endsWith('.sh')) return 'sh'
    return 'text'
  }
  ```

  最终导出一个稳定的 `Record<string, PracticeSourceFileEntry>`，并提供按路径读取的 helper。

- [ ] **Step 3：运行类型检查，确认数据层可被当前工程接受**

  Run:
  ```bash
  npm run typecheck
  ```

  Expected:
  - PASS

- [ ] **Step 4：提交这一层数据契约**

  ```bash
  git add .vitepress/theme/data/practice-source-files.ts .vitepress/theme/components/types.ts
  git commit -m "feat(practice): add source file data mapping"
  ```

---

### Task 3：实现 `PracticeProjectSourceFiles` 组件和主题注册

**Files:**
- Create: `.vitepress/theme/components/PracticeProjectSourceFiles.vue`
- Modify: `.vitepress/theme/index.ts`

- [ ] **Step 1：先写组件骨架，包含 project 查询、源码映射查询、空态分支**

  组件至少具备这组计算逻辑：

  ```vue
  <script setup lang="ts">
  import { computed, ref } from 'vue'
  import { getPracticeProjectById } from '../data/practice-projects.js'
  import { getPracticeSourceFile } from '../data/practice-source-files.js'
  import type { PracticeProjectSourceFilesProps } from './types'

  const props = withDefaults(defineProps<PracticeProjectSourceFilesProps>(), {
    title: '完整示例源码'
  })

  const project = computed(() => getPracticeProjectById(props.projectId))
  const sourceFiles = computed(() =>
    (project.value?.sourceFiles ?? []).map((path) => ({
      path,
      entry: getPracticeSourceFile(path),
    })),
  )
  </script>
  ```

- [ ] **Step 2：注册组件并保持主题入口最小可用**

  在 `.vitepress/theme/index.ts` 中加入：

  ```ts
  import PracticeProjectSourceFiles from './components/PracticeProjectSourceFiles.vue'
  ```

  并把它加入 `globalComponents`。

- [ ] **Step 3：补上最小可用 UI**

  模板要求：

  ```vue
  <section v-if="project && sourceFiles.length" class="practice-project-source-files">
    <h2>{{ title }}</h2>

    <details
      v-for="file in sourceFiles"
      :key="file.path"
      class="source-file-panel"
    >
      <summary>
        <span>{{ file.path }}</span>
      </summary>

      <div class="source-file-body">
        <button type="button" @click="copySource(file.path, file.entry?.code ?? '')">
          {{ copiedPath === file.path ? '已复制' : '复制代码' }}
        </button>

        <pre v-if="file.entry"><code>{{ file.entry.code }}</code></pre>
        <p v-else>源码暂未收录</p>
      </div>
    </details>
  </section>
  ```

  行为要求：
  - 每个文件一个独立 `details`
  - 默认折叠，不手动干预 `open`
  - 使用 `navigator.clipboard.writeText()` 复制
  - 用单个 `copiedPath` + `setTimeout` 管理短暂“已复制”反馈

- [ ] **Step 4：补齐样式，但保持文档附录风格**

  样式至少保证：
  - 标题、面板、按钮使用现有 `var(--vp-*)` 变量
  - 代码区域横向可滚动
  - 移动端下 `summary` 和按钮不重叠

- [ ] **Step 5：运行类型检查，确认组件层转绿**

  Run:
  ```bash
  npm run typecheck
  ```

  Expected:
  - PASS

- [ ] **Step 6：提交组件层**

  ```bash
  git add .vitepress/theme/components/PracticeProjectSourceFiles.vue .vitepress/theme/index.ts
  git commit -m "feat(practice): add source files accordion component"
  ```

---

### Task 4：批量接入 23 个实践章节

**Files:**
- Modify: `docs/practice/p01-minimal-agent/index.md`
- Modify: `docs/practice/p02-multi-turn/index.md`
- Modify: `docs/practice/p03-streaming/index.md`
- Modify: `docs/practice/p04-error-handling/index.md`
- Modify: `docs/practice/p05-memory-arch/index.md`
- Modify: `docs/practice/p06-memory-retrieval/index.md`
- Modify: `docs/practice/p07-rag-basics/index.md`
- Modify: `docs/practice/p08-graphrag/index.md`
- Modify: `docs/practice/p09-hybrid-retrieval/index.md`
- Modify: `docs/practice/p10-react-loop/index.md`
- Modify: `docs/practice/p11-planning/index.md`
- Modify: `docs/practice/p12-reflection/index.md`
- Modify: `docs/practice/p13-multimodal/index.md`
- Modify: `docs/practice/p14-mcp/index.md`
- Modify: `docs/practice/p15-multi-agent/index.md`
- Modify: `docs/practice/p16-subagent/index.md`
- Modify: `docs/practice/p17-agent-comm/index.md`
- Modify: `docs/practice/p18-model-routing/index.md`
- Modify: `docs/practice/p19-security/index.md`
- Modify: `docs/practice/p20-observability/index.md`
- Modify: `docs/practice/p21-evaluation/index.md`
- Modify: `docs/practice/p22-project/index.md`
- Modify: `docs/practice/p23-production/index.md`

- [ ] **Step 1：先挑一页手工接入，确认目标位置**

  以 `docs/practice/p02-multi-turn/index.md` 为样板，把底部：

  ```md
  <PracticeProjectActionPanel project-id="practice-p02-multi-turn" />
  ```

  改成：

  ```md
  <PracticeProjectSourceFiles project-id="practice-p02-multi-turn" />
  <PracticeProjectActionPanel project-id="practice-p02-multi-turn" />
  ```

  要求：`PracticeProjectSourceFiles` 必须位于 `PracticeProjectActionPanel` 之前。

- [ ] **Step 2：批量把同样模式应用到其余 22 个实践章节**

  只改底部挂载顺序，不调整正文内容，不重排 `StarCTA`。

- [ ] **Step 3：重新运行课程化校验脚本，确认从红转绿**

  Run:
  ```bash
  node scripts/check-practice-course-experience.mjs
  ```

  Expected:
  - PASS
  - 输出 `check:practice-course-experience 通过`

- [ ] **Step 4：用全文搜索确认所有实践页都已接入**

  Run:
  ```bash
  rg -n "<PracticeProjectSourceFiles project-id=" docs/practice
  ```

  Expected:
  - 23 条命中
  - 每个 `p01` 到 `p23` 页面各 1 条

- [ ] **Step 5：提交页面接入**

  ```bash
  git add docs/practice/p*/index.md scripts/check-practice-course-experience.mjs
  git commit -m "feat(practice): attach source files panels to practice chapters"
  ```

---

### Task 5：完整验证和人工验收

**Files:**
- Verify: `.vitepress/theme/data/practice-source-files.ts`
- Verify: `.vitepress/theme/components/PracticeProjectSourceFiles.vue`
- Verify: `.vitepress/theme/index.ts`
- Verify: `scripts/check-practice-course-experience.mjs`
- Verify: `docs/practice/p02-multi-turn/index.md`
- Verify: `docs/practice/p14-mcp/index.md`

- [ ] **Step 1：跑类型检查**

  Run:
  ```bash
  npm run typecheck
  ```

  Expected:
  - PASS

- [ ] **Step 2：跑实践体验校验**

  Run:
  ```bash
  node scripts/check-practice-course-experience.mjs
  ```

  Expected:
  - PASS

- [ ] **Step 3：跑站点构建**

  Run:
  ```bash
  pnpm -s run build
  ```

  Expected:
  - PASS
  - 无新增 SSR 或原始文本导入相关报错

- [ ] **Step 4：手工抽查单文件与多文件场景**

  打开以下页面：
  - `/practice/p02-multi-turn/`
  - `/practice/p14-mcp/`

  检查项：
  - 默认都是折叠状态
  - P2 只有 1 个源码面板
  - P14 有 2 个源码面板，顺序与 `sourceFiles` 一致
  - 展开后可看到完整源码
  - 点击复制后按钮文案变为“已复制”，稍后恢复
  - 移动端宽度下代码块可横向滚动，按钮不遮挡标题

- [ ] **Step 5：提交最终验证通过的实现**

  ```bash
  git add .vitepress/theme/data/practice-source-files.ts .vitepress/theme/components/PracticeProjectSourceFiles.vue .vitepress/theme/components/types.ts .vitepress/theme/index.ts scripts/check-practice-course-experience.mjs docs/practice/p*/index.md
  git commit -m "feat(practice): add collapsible full source files panels"
  ```

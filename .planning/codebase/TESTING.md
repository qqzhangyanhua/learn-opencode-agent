# Testing Patterns

**Analysis Date:** 2026-03-21

## Test Framework

**Runner:**
- 仓库未接入独立测试框架（未发现 `vitest.config.*`、`jest.config.*`、`playwright.config.*` 或 `tests/` 目录）
- 当前“质量检查”主要由类型检查和内容校验脚本承担

**Assertion Library:**
- 无统一断言库
- 文档正文里会展示测试代码片段，但它们是教学内容，不是本仓库自动执行的测试

**Run Commands:**
```bash
npm run typecheck        # 检查 .vitepress 与根目录 TS 类型
npm run check:content    # 校验关键页面和未收口文案
npm run check:practice   # 校验实践页引用的脚本是否存在
npm run build:strict     # 组合执行内容检查 + 构建
```

## Test File Organization

**Location:**
- 当前没有真实测试文件组织模式
- 质量保障主要散落在 `scripts/*.mjs` 与构建命令中

**Naming:**
- 内容检查脚本采用 `check-*.mjs`
- 不存在 `*.test.ts`、`*.spec.ts`、`e2e/` 等正式测试命名约定

**Structure:**
```text
scripts/
  check-content.mjs
  check-practice-entries.mjs
package.json
```

## Test Structure

**Current Pattern:**
- 校验脚本直接遍历目标文件
- 命中规则后收集问题并汇总输出
- 出现任一问题即以非零退出码终止流程

**Examples:**
- `scripts/check-content.mjs` 会检查关键页面是否存在，并拦截 `TODO` / `FIXME` / `TBD`
- `scripts/check-practice-entries.mjs` 会扫描文档引用的 `pNN-*.ts` 是否真实存在

## Mocking

**Framework:**
- 无 mocking 框架

**Patterns:**
- 当前校验脚本直接读取真实文件系统
- 没有为外部 API、时钟、网络或浏览器环境建立测试替身

**What to Mock (future):**
- 若后续为 `practice/*.ts` 建自动化测试，应优先 mock OpenAI API
- 若为 VitePress 组件加测试，应 mock `navigator.clipboard`、`window.matchMedia` 等浏览器 API

## Fixtures and Factories

**Test Data:**
- 未发现共享 fixtures/factories 目录
- 现有校验逻辑依赖真实仓库文件作为输入样本

## Coverage

**Requirements:**
- 未设置覆盖率目标
- 当前没有自动覆盖率统计工具

**Configuration:**
- 无 `coverage/` 输出配置
- 无 CI 阶段覆盖率门禁

## Test Types

**Static Validation:**
- 范围: 文档完整性、前置页面存在性、实践入口一致性
- 执行者: `scripts/check-content.mjs`、`scripts/check-practice-entries.mjs`

**Type Validation:**
- 范围: `.vitepress/**/*.ts|.mts|.vue` 与根目录 TypeScript 文件
- 执行者: `tsc --noEmit -p .vitepress/tsconfig.json`

**Build Validation:**
- 范围: 站点是否可成功构建为静态产物
- 执行者: `vitepress build`

## Gaps

**Missing Today:**
- 没有 Vue 组件单元测试
- 没有文档站交互的 E2E 测试
- 没有实践脚本的回归测试
- 没有部署前的 CI 自动化流水线

**High-value Next Additions:**
- 为关键交互组件补 `Vitest + Vue Test Utils`
- 为首页和实践页补 `Playwright`
- 为实践脚本抽出可测试函数，减少“只能手动运行”模式

---
*Testing analysis: 2026-03-21*
*Update when test patterns change*

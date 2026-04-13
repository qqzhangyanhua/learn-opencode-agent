# 测试与校验模式

**分析日期：** 2026-04-13

## 测试框架

**当前主模式：**
- 未发现 Jest、Vitest、Playwright 等传统测试框架配置
- 仓库主要依赖“脚本化校验 + 严格构建”作为质量保障手段

**执行入口：**
```bash
bun run typecheck
bun run check:content
bun run check:practice
bun run check:learning-metadata
bun run build:strict
```

**总装命令：**
- `bun run build:strict` 会串联 11 个 `check:*` 脚本后再执行站点构建

## 校验文件组织

**位置：**
- 所有校验脚本位于 `scripts/`
- 命名统一为 `check-*.mjs`

**当前已识别的校验维度：**
- `check-content.mjs`：关键页面存在性、占位词扫描
- `check-practice-entries.mjs`：文档引用的实践脚本必须真实存在
- `check-learning-metadata.mjs`：frontmatter 契约与枚举合法性
- `check-learning-paths.mjs`
- `check-homepage-entry.mjs`
- `check-navigation-entry.mjs`
- `check-entry-context.mjs`
- `check-chapter-experience.mjs`
- `check-practice-course-experience.mjs`
- `check-discovery-experience.mjs`
- `check-learning-progress.mjs`

## 校验结构模式

**典型脚本结构：**
```javascript
1. 通过 `fileURLToPath(import.meta.url)` 计算仓库根目录
2. 递归扫描目标目录
3. 解析 Markdown/frontmatter 或数据文件
4. 收集 issues / missingEntries / missingFiles
5. 成功时输出“xxx 通过”
6. 失败时逐项打印错误并 `process.exit(1)`
```

**组织特点：**
- 偏集成校验，而非单元测试
- 直接针对真实仓库内容运行，不构造隔离测试夹具
- 规则写死在脚本内，方便内容型仓库快速演进

## Mock 与夹具

- 未发现专门的 mock 框架
- 未发现 `fixtures/` 或 `factories/` 目录
- 内容校验直接使用仓库真实文件作为输入

## 覆盖范围

**覆盖较强的部分：**
- 章节/实践页 frontmatter 一致性
- 文档入口与导航同步
- 实践页对源码文件的引用正确性
- 发布前遗留占位词扫描

**覆盖较弱或缺失的部分：**
- Vue 组件行为测试
- 主题层数据模块的单元测试
- 页面渲染回归测试
- 实践示例脚本真正“可运行”的自动化验证

## 风险导向建议

**修改主题组件时：**
- 至少执行 `bun run typecheck` 和 `bun run build:strict`
- 因为没有组件级测试，构建通过并不代表交互行为正确

**修改数据层时：**
- 必跑所有 `check:*` 脚本，尤其是学习路径、导航、发现页相关检查

**修改实践项目时：**
- 除了 `check:practice`，最好手动执行对应 `bun run pNN-*.ts`
- 因为当前仓库没有自动验证 `practice/*.ts` 的运行成功率

## 实际参考文件

- `package.json`
- `scripts/check-content.mjs`
- `scripts/check-practice-entries.mjs`
- `scripts/check-learning-metadata.mjs`

---
*测试模式分析：2026-04-13*
*若引入 Vitest/Playwright/CI，应补充新的测试层次与命令*

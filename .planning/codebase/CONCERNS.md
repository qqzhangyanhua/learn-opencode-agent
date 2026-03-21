# Codebase Concerns

**Analysis Date:** 2026-03-21

## Tech Debt

**包管理与部署命令不一致:**
- Issue: README 以 `bun` 为主，`railpack.toml` 却使用 `pnpm run build`，仓库同时保留 `bun.lockb` 与 `pnpm-lock.yaml`
- Why: 项目显然经历过多种本地/部署方式并存的演进
- Impact: 新人容易在“该用 Bun 还是 pnpm”上踩坑，依赖解析差异也可能导致构建漂移
- Fix approach: 明确一个主包管理器，并把另一套流程降级为兼容说明或删除

**内容、导航、示例三处耦合较强:**
- Issue: 章节正文、`.vitepress/config.mts` 侧边栏、`practice/*.ts` 入口需要手动同步
- Why: 当前以文档工程为主，缺少自动生成导航或目录清单
- Impact: 容易出现链接失效、章节已存在但导航未更新、实践页引用缺失等问题
- Fix approach: 把章节/实践元数据抽成单一数据源，自动生成部分导航与校验规则

## Known Bugs

**不是传统产品型 bug，而是内容一致性风险:**
- Symptoms: 页面可打开，但目录、阅读地图或实践入口与正文不同步
- Trigger: 只改正文不改侧边栏、只新增脚本不更新实践文档
- Workaround: 运行 `npm run build:strict` 并手动抽查关键页面
- Root cause: 内容系统缺少更细粒度的自动化回归测试

**本地生成目录可能污染代码搜索:**
- Symptoms: `.vitepress/cache/` 与 `.vitepress/dist/` 中的构建文件干扰全文检索
- Trigger: 使用未排除生成目录的搜索命令
- Workaround: 搜索时显式排除 `.vitepress/cache/**` 与 `.vitepress/dist/**`
- Root cause: 仓库里存在大量构建输出，且开发者工具未必默认忽略

## Security Considerations

**实践脚本依赖真实模型密钥:**
- Risk: 开发者可能把 `.env` 或示例密钥误提交、误复制到文档
- Current mitigation: `.env` 已在 `.gitignore` 中忽略，`.env.example` 提供占位格式
- Recommendations: 在发布流程中增加密钥扫描；避免在文档内展示看似真实的 token 片段

**外部源码链接容易漂移:**
- Risk: 文档中若误用 `dev` 链接，会导致内容和说明失去对应关系
- Current mitigation: README 已明确“commit 锚定优先，dev 仅作对照”
- Recommendations: 增加自动化检查，拦截不符合约定的源码链接模式

## Performance Bottlenecks

**主题组件数量持续增加:**
- Problem: `.vitepress/theme/index.ts` 全局注册组件较多，首页和章节交互组件也在增长
- Measurement: 未发现性能基准，但组件数量已经达到较高规模
- Cause: 教学演示需要大量可视化组件，且采用全局注册
- Improvement path: 按页面局部导入高成本组件，或定期审查低频组件是否需要全局注册

**文档体量增长会拉高构建成本:**
- Problem: `docs/` 章节多、示例多，构建和热更新复杂度持续上升
- Measurement: 仓库尚未记录正式构建基准
- Cause: 内容体量与交互组件都在增长
- Improvement path: 对重型示意组件做懒加载评估，并为构建时间建立基准

## Fragile Areas

**`.vitepress/config.mts`:**
- Why fragile: 同时承载导航、侧边栏、站点元数据和 Vite 配置，改动面大
- Common failures: 链接写错、路由路径不统一、分组遗漏
- Safe modification: 改完后至少执行一次 `vitepress build` 并手动检查首页、实践篇和中级篇入口
- Test coverage: 仅有构建级验证，没有配置级单测

**`docs/practice/` 与 `practice/*.ts` 的对应关系:**
- Why fragile: 这是文档与代码之间的一对多同步点
- Common failures: 文档引用脚本不存在、脚本命名调整后正文未同步
- Safe modification: 保持 `pNN-topic` 命名稳定，并运行 `npm run check:practice`
- Test coverage: 有静态校验，但没有运行脚本层面的回归测试

## Scaling Limits

**内容维护扩张速度:**
- Current capacity: 当前规模仍可人工维护，但已覆盖 30+ 章节、20+ 实践项目和多个专题文档
- Limit: 当专题和组件继续增长时，人工同步导航与交叉引用会越来越脆弱
- Symptoms at limit: 构建能过，但内容体系开始失配
- Scaling path: 引入结构化内容元数据和更细粒度校验

## Dependencies at Risk

**VitePress 1.x 与主题定制耦合:**
- Risk: 主题 API 或内部行为升级时，`.vitepress/theme/**` 可能需要同步调整
- Impact: 首页与自定义组件渲染、构建行为可能受影响
- Migration plan: 保持 VitePress 升级前的集中回归检查，优先在主题层隔离自定义逻辑

**OpenAI SDK 版本变化:**
- Risk: `practice/*.ts` 广泛依赖 `openai` 包 API 形态
- Impact: 教学脚本可能整体失效，文档示例需要同步改写
- Migration plan: 把 SDK 升级与实践篇校对绑定为同一个变更批次

## Missing Critical Features

**缺少正式自动化测试体系:**
- Problem: 当前只能靠构建与静态脚本保证质量
- Current workaround: 手动预览站点 + `build:strict`
- Blocks: 难以放心做大规模主题重构或批量章节迁移
- Implementation complexity: 中等，建议先从 Vitest 覆盖核心组件开始

**缺少 CI 工作流:**
- Problem: 仓库未发现 `.github/workflows/`
- Current workaround: 本地手动运行检查
- Blocks: 多人协作时无法稳定防止回归
- Implementation complexity: 低到中等，可先接入类型检查、内容检查和构建

---
*Concerns audit: 2026-03-21*
*Update as issues are fixed or new ones discovered*

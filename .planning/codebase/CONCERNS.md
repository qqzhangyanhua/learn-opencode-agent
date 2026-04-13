# 代码库关注点

**分析日期：** 2026-04-13

## 技术债

**包管理双轨并存：**
- 问题：仓库同时存在 `bun.lockb` 与 `pnpm-lock.yaml`
- 原因：当前命令说明全面偏向 Bun，但历史依赖树或部分协作流程明显保留了 pnpm 痕迹
- 影响：依赖漂移时可能出现“本地能跑、他人锁文件不同”的情况
- 修复方向：明确单一官方包管理器，并清理无效锁文件或在文档中解释双轨策略

**大量手写元数据镜像：**
- 问题：章节 frontmatter、`practice-projects.ts`、`learning-paths.data.ts`、`discovery-content.ts`、`.vitepress/config.mts` 同时维护相近信息
- 影响：新增/重命名内容时，容易出现一处改了、另一处漏改
- 修复方向：继续强化脚本校验，或把更多数据改成单一源派生

## 已知问题

**实践 README 数量描述已过期：**
- 症状：`practice/README.md` 仍写“23 个可运行示例”，但当前 `practice/` 下已有 29 个 `p*.ts` 文件
- 触发：查看实践篇总览时会得到过时认知
- 根因：README 未随着实践项目扩展同步更新
- 处理建议：把数量说明改成自动可维护表述，或同步为当前实际数量/结构

**实践运行命令存在不一致：**
- 症状：`practice/README.md` 推荐 `bun run p01-minimal-agent.ts`，而 `practice-projects.ts` 中个别项目写成 `bun run practice/p02-multi-turn.ts`
- 影响：读者可能复制不同风格命令，增加学习摩擦
- 修复方向：统一实践运行命令约定，并让校验脚本覆盖 `runCommand` 风格一致性

## 安全注意

**实践目录依赖真实 API Key：**
- 风险：读者运行 `practice/*.ts` 需要设置 `OPENAI_API_KEY`
- 当前缓解：`.gitignore` 已忽略 `.env`
- 建议：补充 `.env.example` 或在发布前检查文档中不要出现真实密钥样例

**示例代码与站点代码混仓：**
- 风险：未来若把更多真实服务接入仓库，示例和站点可能共享错误的环境假设
- 当前缓解：目前示例主要停留在本地运行层
- 建议：若后续加入服务端或数据库，优先把示例隔离到独立 workspace 或加更明确的环境边界

## 性能瓶颈

**主题组件体量较大：**
- 问题：`.vitepress/theme/components/` 当前约 132 个文件，且 `.vitepress/theme/index.ts` 全局注册了大量组件
- 影响：主题入口理解成本高，错误排查路径变长
- 已有缓解：部分组件采用 `defineAsyncComponent` 延迟加载
- 优化方向：继续按栏目或功能拆分注册清单，减少单文件入口复杂度

**构建前校验链很长：**
- 问题：`build:strict` 串联 11 个脚本后再构建
- 影响：内容改动较小时，验证反馈周期相对长
- 优化方向：保留严格构建，同时为高频改动提供更聚焦的本地检查组合

## 脆弱区域

**frontmatter 解析与契约校验：**
- 原因：多个脚本自己实现 frontmatter 解析逻辑，而不是依赖统一解析库
- 常见风险：一旦 frontmatter 语法稍复杂，脚本之间可能出现解析差异
- 安全修改方式：修改 frontmatter 规则时，优先联动检查 `scripts/check-learning-metadata.mjs`、`.vitepress/config.mts` 中的解析函数和相关数据加载器
- 测试覆盖：有脚本校验，但没有单元测试保护解析边界

**实践项目元数据链路：**
- 原因：`practice/*.ts`、`docs/practice/**`、`practice-projects.ts`、学习路径与发现页互相引用
- 常见风险：项目重命名或编号调整后，多处链接失配
- 安全修改方式：任何实践项目改名都要同步检查 `practice-projects.ts`、`learning-paths.data.ts`、`discovery-content.ts`、实践页 Markdown
- 测试覆盖：部分由 `check:practice` 与元数据脚本覆盖，但不是全量语义校验

## 依赖风险

**`openai` 与示例代码强绑定：**
- 风险：SDK 主要用于示例，升级后可能导致大量教学代码片段失效
- 影响：实践章节的命令与文档说明可能不同步
- 迁移方向：升级依赖时优先抽样跑 P1/P14/P15/P23 等代表性项目

**`vitepress-plugin-mermaid` + Mermaid：**
- 风险：图表插件和主站版本耦合较紧
- 影响：升级 VitePress 时可能出现构建或渲染兼容性问题
- 迁移方向：升级前先跑 `bun run build:strict` 并抽查含大量 Mermaid 的章节

## 测试覆盖缺口

**主题组件行为：**
- 未测试内容：交互式教学组件的前端行为与样式回归
- 风险：构建成功但页面交互失效
- 优先级：高

**实践脚本可运行性：**
- 未测试内容：`practice/*.ts` 是否仍能在当前依赖版本与环境变量约定下真实运行
- 风险：书里命令能展示，但读者本地跑不起来
- 优先级：高

---
*关注点审计：2026-04-13*
*问题修复或新增真实服务集成后应更新*

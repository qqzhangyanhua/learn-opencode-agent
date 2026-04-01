[根目录](../CLAUDE.md) > **docs**

# Docs 文档站模块

> 最后更新：2026-03-31 17:22:35

## 变更记录 (Changelog)

### 2026-03-31 17:22:35 - 初始化模块文档
- 新增 docs 文档站模块说明
- 扫描 `docs/` 下 35 个文件（34 篇 Markdown + 1 个本地设置）
- 识别双轨内容结构：`ebook-chapter-*` 草稿线 + `part*/chapter*.md` 正式线
- 记录阅读指南、学习路径、章节组织与与根级 `CLAUDE.md` 的关系

---

## 模块职责

`docs/` 是项目的内容层，不是运行时代码。

它承担三件事：
- 为 Claude Code 仓库编写系统化解读文档
- 为 VitePress 文档站提供页面内容
- 将源码模块重组为按主题阅读的章节体系

核心判断：这是一个“源码导读书稿”模块，不是通用 README 堆放区。

---

## 入口与启动

### 主要入口
- `README.md` - 文档站本地开发与部署说明
- `guide/reading-guide.md` - 阅读入口与学习建议
- `guide/learning-paths.md` - 读者路径分流
- `part1/` ~ `part6/` - 面向站点导航的正式章节
- `ebook-outline.md` - 全书大纲
- `ebook-chapter-01.md` ~ `ebook-chapter-15.md` - 章节草稿/长文线

### 与站点的关系
- 页面由 `.vitepress/config.ts` 配置导航与侧边栏
- 首页 `index.md` 链接到 `/docs/guide/reading-guide`
- 根级 `CLAUDE.md` 作为“源码索引页”，`docs/` 则是“连续阅读页”

---

## 对外接口

### 面向读者的内容接口
- **阅读指南**：帮助用户选择路径，而不是直接灌输所有章节
- **学习路径**：按背景分流（新手 / 实战 / 进阶 / 插件开发）
- **章节体系**：把分散在 `plugins/`、`scripts/`、`.github/workflows/` 的内容重组成连续叙事

### 内容组织结构
```text
/docs
├── guide/            # 阅读方式与路径说明
├── part1~part6/      # 正式站点章节
├── ebook-outline.md  # 全书规划
├── ebook-chapter-*.md# 扩展/草稿章节
└── README.md         # 文档站开发说明
```

### 主题覆盖
根据已扫描标题，内容重点覆盖：
- 插件系统四大组件（命令 / Agent / Hook / Skill）
- Hookify / security-guidance / plugin-dev 等代表模块
- GitHub 自动化与 CI/CD
- MCP 集成
- 安全、性能、最佳实践与案例研究

---

## 关键依赖与配置

### 运行依赖
- 由根级 `package.json` 提供脚本：`docs:dev`、`docs:build`、`docs:preview`
- 由 `.vitepress/config.ts` 控制导航、侧边栏、搜索、Mermaid

### 本地设置
- `.claude/settings.local.json` - 文档编写时的本地 Claude Code 设置

### 内容来源特征
- 主要是 Markdown
- 部分章节嵌入 YAML frontmatter、代码块、Mermaid 图
- 内容高度依赖根级与模块级 `CLAUDE.md` 的扫描成果

---

## 数据模型

### 内容分层
1. **站点引导层**：`README.md`、`guide/*`
2. **正式章节层**：`part*/chapter*.md`
3. **长稿/草稿层**：`ebook-chapter-*.md`、`ebook-outline.md`

### 叙事模式
- 根文档负责“全局索引”
- docs 负责“连续阅读”
- 章节通过模块主题把源码文件抽象成教学内容

这个结构是好品味：把“仓库导航”和“系统讲解”分离，避免一个文档同时承担两种职责。

---

## 测试与质量

### 当前状态
- 无自动化测试
- 内容型模块，质量主要依赖人工校对和站点构建
- 存在章节编号/目录演进风险：`ebook-chapter-*` 与 `part*/chapter*.md` 并非一一对称

### 推荐质量策略
1. 用 VitePress 构建检查死链与渲染错误
2. 增加文档目录与章节映射表，避免“草稿线”和“正式线”漂移
3. 对新增章节建立最小检查清单：标题、路径、前后链接、与源码引用一致性

---

## 常见问题 (FAQ)

### Q: `ebook-chapter-*` 和 `part*/chapter*.md` 为什么并存？
A: 前者更像长稿/草稿线，后者是站点导航下的正式章节线。两套结构并存说明内容生产流程还没完全收敛。

### Q: 这是源码的一部分吗？
A: 不是运行时代码，但它是项目知识架构的一部分，决定了外部读者如何理解仓库。

### Q: 为什么 docs 模块要单独建 `CLAUDE.md`？
A: 因为它已经是独立模块：有自己的入口、构建方式、目录体系和维护风险。

---

## 相关文件清单

### 引导与入口
- `docs/README.md`
- `docs/guide/reading-guide.md`
- `docs/guide/learning-paths.md`

### 章节正文
- `docs/part1/chapter01.md` ~ `docs/part6/chapter15.md`

### 长稿与规划
- `docs/ebook-outline.md`
- `docs/ebook-chapter-01.md` ~ `docs/ebook-chapter-15.md`

### 配置
- `docs/.claude/settings.local.json`

---

## 覆盖摘要

- 估算文件数：35
- 已扫描高信号文件：6
- 覆盖判断：中高
- 缺口：
  - 未逐章阅读全文
  - `learning-paths.md` 与多数章节正文未深读
  - 缺少链接一致性检查结果

---

## 变更记录 (Changelog)

### 2026-03-31 17:22:35
- 初始化 docs 模块文档

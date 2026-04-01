# VitePress 文档站点

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm docs:dev

# 构建生产版本
pnpm docs:build

# 预览生产版本
pnpm docs:preview
```

## 部署

### GitHub Pages（自动部署）

1. 在 GitHub 仓库设置中启用 GitHub Pages
2. 选择 "GitHub Actions" 作为部署源
3. 推送到 main 分支会自动触发部署

### 手动部署到其他平台

#### Vercel
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

#### Netlify
```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 部署
netlify deploy --prod --dir=.vitepress/dist
```

#### Cloudflare Pages
1. 连接 GitHub 仓库
2. 构建命令：`pnpm docs:build`
3. 输出目录：`.vitepress/dist`

## 目录结构

```
.
├── .vitepress/
│   ├── config.ts          # VitePress 配置
│   └── dist/              # 构建输出（自动生成）
├── index.md               # 首页
├── CLAUDE.md              # 项目概览
├── plugins/               # 插件文档
│   ├── README.md          # 插件总览
│   └── */CLAUDE.md        # 各插件文档
├── scripts/CLAUDE.md      # 脚本文档
├── .github/workflows/CLAUDE.md  # 工作流文档
└── .devcontainer/CLAUDE.md      # 开发容器文档
```

## 自定义配置

### 修改主题颜色

编辑 `.vitepress/config.ts`：

```typescript
themeConfig: {
  // 修改导航栏、侧边栏等配置
}
```

### 添加新页面

1. 在根目录创建 `.md` 文件
2. 在 `.vitepress/config.ts` 的 `sidebar` 中添加链接

### 启用 Algolia 搜索

替换 `.vitepress/config.ts` 中的搜索配置：

```typescript
search: {
  provider: 'algolia',
  options: {
    appId: 'YOUR_APP_ID',
    apiKey: 'YOUR_API_KEY',
    indexName: 'YOUR_INDEX_NAME'
  }
}
```

## 技术栈

- **VitePress 1.6.4**: 静态站点生成器
- **Vue 3**: 主题框架
- **Vite**: 构建工具
- **Markdown**: 文档格式
- **Mermaid**: 图表渲染

## 特性

- ✅ 零配置 Markdown 支持
- ✅ Mermaid 图表渲染
- ✅ 代码高亮和行号
- ✅ 内置搜索
- ✅ 响应式设计
- ✅ 暗色主题
- ✅ Git 集成（最后更新时间）
- ✅ 编辑链接

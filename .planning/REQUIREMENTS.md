# Requirements: AI Agent 产品化学习站

**Defined:** 2026-03-21
**Core Value:** 让想系统学习 AI Agent 的中文开发者在 30 秒内知道从哪里开始，并能沿着清晰路径持续学下去

## v1 Requirements

### Information Architecture

- [ ] **IA-01**: 新用户进入首页后，可以在 30 秒内识别至少一条适合自己的起步路线
- [x] **IA-02**: 用户可以按学习目标选择路线，而不是只能按目录顺序阅读全部内容
- [x] **IA-03**: 用户可以明确区分理论篇、实践篇和中级篇各自的定位与推荐进入方式

### Homepage & Navigation

- [ ] **HOME-01**: 用户在首页可以看到面向不同人群/目标的起步入口卡片或分流区
- [ ] **HOME-02**: 用户在全站导航中可以快速进入核心学习路径、实践入口和辅助页面，而不需要先理解完整章节树
- [ ] **HOME-03**: 用户在任意主要页面都能理解自己当前所处的学习板块及可前往的下一层入口

### Chapter Experience

- [ ] **CHAP-01**: 用户打开任一核心章节时，可以看到本章学习目标、适合人群和预计投入时间
- [ ] **CHAP-02**: 用户打开任一核心章节时，可以看到前置知识要求或推荐先读章节
- [ ] **CHAP-03**: 用户读完任一核心章节后，可以看到明确的下一步推荐（继续阅读、对应实践或进阶专题）
- [ ] **CHAP-04**: 用户读完任一核心章节后，可以看到至少一个可执行的练习、任务或对应实践入口

### Practice Experience

- [ ] **PRAC-01**: 用户可以按学习阶段或目标浏览实践项目，而不是只能面对脚本文件列表
- [ ] **PRAC-02**: 用户在每个实践项目页面都可以看到学习目标、前置要求、运行入口和完成标准
- [ ] **PRAC-03**: 用户可以从相关理论章节直接跳转到对应实践项目，形成“看完就练”的闭环

### Discovery & Search

- [ ] **DISC-01**: 用户可以通过搜索或路径页快速找到某个主题对应的章节、实践项目或专题入口
- [x] **DISC-02**: 用户可以访问按目标组织的学习路径页，并获得清晰的推荐阅读顺序
- [ ] **DISC-03**: 用户在搜索或导航结果中可以区分内容类型（章节、实践、专题、辅助页面）

## v2 Requirements

### Learning Progress

- **PROG-01**: 用户可以在本地记录已完成章节与实践项目
- **PROG-02**: 用户可以在本地保存“稍后阅读”或“继续学习”状态

### Recommendations

- **RECO-01**: 用户可以获得基于已读路径的个性化推荐
- **RECO-02**: 用户可以查看个人学习仪表盘或阶段完成概览

## Out of Scope

| Feature | Reason |
|---------|--------|
| 用户登录与云端同步 | v1 聚焦内容产品化，不引入账号系统与后端复杂度 |
| 社区评论或讨论区 | 会引入运营与审核负担，不是当前核心学习价值 |
| 题库评分系统 | 当前重点是轻量练习闭环，不做判题型平台 |
| AI 助教 / 问答 | 当前主要问题是路径与结构，不是缺少对话能力 |
| 视频课程 | 当前资产以文档、交互组件和代码示例为主 |
| 付费体系 | 先验证学习产品体验，而不是商业化流程 |
| 多语言支持 | 当前明确服务中文开发者，避免范围膨胀 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IA-01 | Phase 2 | Pending |
| IA-02 | Phase 1 | Complete |
| IA-03 | Phase 1 | Complete |
| HOME-01 | Phase 2 | Pending |
| HOME-02 | Phase 2 | Pending |
| HOME-03 | Phase 2 | Pending |
| CHAP-01 | Phase 3 | Pending |
| CHAP-02 | Phase 3 | Pending |
| CHAP-03 | Phase 3 | Pending |
| CHAP-04 | Phase 3 | Pending |
| PRAC-01 | Phase 4 | Pending |
| PRAC-02 | Phase 4 | Pending |
| PRAC-03 | Phase 4 | Pending |
| DISC-01 | Phase 5 | Pending |
| DISC-02 | Phase 1 | Complete |
| DISC-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after initialization*

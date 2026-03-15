---
title: 第九篇：数据持久化
description: 第九篇：数据持久化的详细内容
---

<script setup>
import SourceSnapshotCard from '../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/storage/`、`packages/opencode/src/session/`、`packages/opencode/src/project/`、`packages/opencode/src/control-plane/`
> **前置阅读**：第四篇 会话管理、第八篇 HTTP API 服务器
> **学习目标**：理解 OpenCode 的持久化不是“单纯用了 SQLite”，而是一套本地优先、兼容旧 JSON、支持工作区扩展、并和云端 Console 数据层明确分界的存储体系

---

<SourceSnapshotCard
  title="第九篇源码快照"
  description="这一篇先抓本地运行态和云端产品态的分界：数据怎样进 SQLite、怎样兼容旧 JSON、以及哪些状态根本不该和 Console 混在一起。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-15"
  :entries="[
    {
      label: '本地数据库入口',
      path: 'packages/opencode/src/storage/db.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/storage/db.ts'
    },
    {
      label: '会话表定义',
      path: 'packages/opencode/src/session/session.sql.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/session.sql.ts'
    },
    {
      label: 'JSON 迁移入口',
      path: 'packages/opencode/src/storage/json-migration.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/storage/json-migration.ts'
    },
    {
      label: 'Console 数据层',
      path: 'packages/console/core/src/drizzle/index.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/console/core/src/drizzle/index.ts'
    }
  ]"
/>

## 核心概念速览

很多人看到 OpenCode 的存储层，第一反应会是：

- 有一个 SQLite
- 用了 Drizzle
- 会话、消息、项目写进表里

这当然没错，但还不够。

当前仓库的持久化体系至少包含四层：

1. **本地 SQLite 主库**：承载项目、会话、消息、权限等核心状态
2. **数据库访问包装**：提供 lazy 初始化、事务上下文和副作用队列
3. **历史 JSON 迁移层**：把旧版 `storage/*.json` 数据导入 SQLite
4. **云端 Console 数据层**：独立于本地库，面向团队工作区和控制平面

所以这一篇最重要的结论不是“OpenCode 用了什么数据库”，而是：

**它把本地 Agent 运行态和云端产品态分成了两套数据边界。**

最值得先看的入口有四个：

- [packages/opencode/src/storage/db.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/storage/db.ts)
- [packages/opencode/src/session/session.sql.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/session.sql.ts)
- [packages/opencode/src/storage/json-migration.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/storage/json-migration.ts)
- [packages/console/core/src/drizzle/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/console/core/src/drizzle/index.ts)

---

## 本章导读

### 这一章解决什么问题

这一章要回答的是：

- OpenCode 的本地状态到底落在哪里
- 会话、项目、权限、分享、工作区这些数据是怎样建模的
- 为什么存储层不只有 SQLite 表，还有 JSON 迁移和访问包装
- 本地 Agent 数据层和云端 Console 数据层为什么必须分开

### 必看入口

- [packages/opencode/src/storage/db.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/storage/db.ts)：本地数据库主入口
- [packages/opencode/src/storage/schema.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/storage/schema.ts)：本地表结构汇总
- [packages/opencode/src/session/session.sql.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/session.sql.ts)：会话核心表
- [packages/opencode/src/storage/json-migration.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/storage/json-migration.ts)：旧 JSON 升级入口
- [packages/console/core/src/drizzle/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/console/core/src/drizzle/index.ts)：云端 Console 数据访问入口

### 先抓一条主链路

建议先顺着这一条线读：

```text
session / project / permission 等运行时状态
  -> storage/db.ts 初始化本地数据库
  -> session.sql.ts / project.sql.ts / workspace.sql.ts 定义表
  -> schema.ts 汇总成完整本地数据模型
  -> json-migration.ts 兼容旧数据
  -> console/core/drizzle/index.ts 形成另一条云端数据边界
```

这条线先解决“数据怎么落地”，再去看性能、一致性和迁移细节。

### 初学者阅读顺序

1. 先读 `storage/db.ts`，理解数据库是怎样初始化和被访问的。
2. 再读 `session.sql.ts`、`project.sql.ts`、`workspace.sql.ts`，看真实表结构怎样映射产品模型。
3. 最后读 `json-migration.ts` 和 `console/core/src/drizzle/index.ts`，理解历史兼容和云端边界。

### 最容易误解的点

- 持久化层不只是“用了 SQLite”，真正重要的是表结构和访问边界怎样服务于 Agent 运行时。
- JSON 迁移不是历史包袱，而是理解项目演进路径的关键入口。
- 本地数据库和云端 Console 数据库不是一主一从，而是两套不同职责的系统。

## 9.1 本地优先不是口号，而是数据库初始化策略

### `db.ts` 先解决的是“这台机器上的库怎么活起来”

[packages/opencode/src/storage/db.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/storage/db.ts) 是当前本地数据库的主入口。

它最先解决的不是表设计，而是“本地数据库如何稳定活起来”。初始化流程可以概括成：

1. 计算数据库文件路径
2. 用 Bun SQLite 打开连接
3. 配置若干 SQLite PRAGMA
4. 创建 Drizzle client
5. 自动应用迁移
6. 通过上下文包装 `use()` 和 `transaction()`

这套流程说明 OpenCode 关心的不只是“能不能写 SQL”，还包括：

- 本地库怎么按渠道隔离
- 并发访问时怎么稳定一点
- 事务外的后置副作用怎么统一执行

### 数据库路径按发行渠道隔离

`Database.Path` 当前会根据 `Installation.CHANNEL` 生成不同文件名。

典型行为是：

- `latest`、`beta` 默认写到 `opencode.db`
- 其他渠道写到 `opencode-{channel}.db`
- `OPENCODE_DISABLE_CHANNEL_DB` 可以关闭这层隔离

背后的工程考虑很直接：

- 开发版和正式版不要混数据
- 不同发布渠道不要互相踩库
- 升级实验功能时更容易控制影响范围

### SQLite 参数不是“性能彩蛋”，而是运行稳定性的底座

当前初始化至少会设置：

- `PRAGMA journal_mode = WAL`
- `PRAGMA synchronous = NORMAL`
- `PRAGMA busy_timeout = 5000`
- `PRAGMA cache_size = -64000`
- `PRAGMA foreign_keys = ON`
- `PRAGMA wal_checkpoint(PASSIVE)`

这几项不是随手加的“性能参数”，而是在分别处理本地运行时最常见的问题：

- `WAL` 让读写并发体验更平稳
- `busy_timeout` 减少锁冲突带来的立即失败
- `foreign_keys` 让级联关系真正生效
- `cache_size` 和 checkpoint 让本地库在长期运行时更可控

对本地 Agent 来说，这些设置往往比“选哪个 ORM”更影响日常稳定性。

### `Database.use()` 和 `Database.transaction()` 是真正的访问边界

`db.ts` 里没有把 Drizzle client 到处裸传，而是统一包成：

- `Database.use()`
- `Database.transaction()`
- `Database.effect()`

它们背后的设计重点也很明确：

- 没有事务上下文时，自动用全局 client
- 有事务上下文时，复用当前 `tx`
- 副作用函数先收集，事务完成后再执行

也就是说，这里不只是给 ORM 套壳，而是在建立一套数据库上下文协议。

---

## 9.2 真实表结构反映的是 Agent 运行模型

### `schema.ts` 只是导出总表，真正的数据模型分散在业务模块里

[packages/opencode/src/storage/schema.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/storage/schema.ts) 自身很短，但它把多个模块下的表重新导出：

- `ProjectTable`
- `SessionTable`
- `MessageTable`
- `PartTable`
- `TodoTable`
- `PermissionTable`
- `SessionShareTable`
- `WorkspaceTable`

这说明当前仓库的数据建模不是“数据库目录一把抓”，而是：

**谁负责业务对象，谁就定义自己的表。**

### 项目层：`project`

[packages/opencode/src/project/project.sql.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/project/project.sql.ts) 里的 `project` 表保存的是 OpenCode 认识一个仓库所需的最小信息：

- `id`
- `worktree`
- `vcs`
- `name`
- `icon_url`
- `icon_color`
- `time_initialized`
- `sandboxes`
- `commands`

从这些字段能看出，Project 在 OpenCode 里不是 Git 仓库元数据的完整镜像，而是“Agent 工作入口”的配置对象。

### 会话层：`session -> message -> part`

[packages/opencode/src/session/session.sql.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/session.sql.ts) 是整套本地数据模型里最核心的一组表。

其中：

- `session` 保存会话级元信息
- `message` 保存消息级信息
- `part` 保存消息的细粒度分片

`session` 表里最值得注意的字段包括：

- `project_id`
- `workspace_id`
- `parent_id`
- `slug`
- `directory`
- `title`
- `version`
- `share_url`
- `summary_*`
- `revert`
- `permission`
- `time_compacting`
- `time_archived`

这组字段恰好映射了你在前几篇看到的能力：

- 一个会话属于某个项目
- 会话可能属于某个 workspace
- 会话可以 fork，所以有 `parent_id`
- 会话可能被摘要压缩、回滚、分享、归档

也就是说，数据库结构本身就在说明产品能力边界。

### Todo、Permission、Share 不是附属表，而是会话治理的一部分

同一个文件里还定义了：

- `todo`
- `permission`

另一个文件 [packages/opencode/src/share/share.sql.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/share/share.sql.ts) 定义了：

- `session_share`

这些表对应的是 Agent 运行时经常被忽视的“治理信息”：

- 当前会话有哪些待办
- 当前项目允许哪些权限规则
- 某个会话是否被分享、用什么 secret、对应什么 URL

如果电子书只讲 `session` 和 `message`，读者会误以为持久化层只是聊天记录库，这会把 OpenCode 讲窄很多。

### `workspace` 表说明本地库已经在承接控制平面信息

[packages/opencode/src/control-plane/workspace.sql.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/control-plane/workspace.sql.ts) 当前定义了本地 `workspace` 表：

- `id`
- `type`
- `branch`
- `name`
- `directory`
- `extra`
- `project_id`

它的意义不是“把整个云端工作区数据都落本地”，而是：

- 本地知道有哪些 workspace
- 知道它们属于哪个 project
- 知道怎么通过 adaptor 去连接或转发

这正是第八篇里 `WorkspaceRouterMiddleware` 能工作的前提。

---

## 9.3 迁移系统分成两类：SQL 迁移和旧 JSON 升级

### 第一类：当前 SQLite schema 的正式迁移

`db.ts` 里会在启动时收集迁移条目：

- 生产环境优先用打包进产物的 `OPENCODE_MIGRATIONS`
- 开发环境则从 `packages/opencode/migration/` 目录扫描

然后统一走 `migrate(db, entries)`。

这套机制的价值在于：

- 开发环境可以直接跟着源码目录走
- 打包产物不必依赖源码目录结构
- schema 演进能保持稳定记录

### 第二类：历史 JSON 数据导入 SQLite

[packages/opencode/src/storage/json-migration.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/storage/json-migration.ts) 是当前文档里最容易被漏讲、但最能体现项目演进路径的文件。

它处理的不是 SQL schema 变更，而是：

**把早期存放在 `Global.Path.data/storage/` 下的 JSON 数据搬进 SQLite。**

它会扫描：

- `project/*.json`
- `session/*/*.json`
- `message/*/*.json`
- `part/*/*.json`
- `todo/*.json`
- `permission/*.json`
- `session_share/*.json`

然后批量导入对应表。

### 这套 JSON 迁移逻辑有几个很真实的工程细节

首先，它不是单文件循环插入，而是：

- 先全量扫描文件
- 按批读取
- 批量插入
- 收集错误
- 统计 orphan 数据

其次，它会优先根据**文件路径**推导 ID，而不是完全相信 JSON 内容本身。  
源码里甚至直接写了注释，解释为什么这样做：

- 早期迁移可能移动过目录
- JSON 内部的 ID 未必同步更新

这类细节非常适合写给初学者，因为它体现了真实项目的常态：

**数据迁移最难的部分，往往不是导入动作本身，而是纠正历史不一致。**

### 旧版 `storage.ts` 还保留着更早一代文件存储接口

[packages/opencode/src/storage/storage.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/storage/storage.ts) 现在仍然存在，它提供：

- `read`
- `write`
- `update`
- `remove`
- `list`

并带着更早期的文件级迁移逻辑。

这说明当前仓库不是“从一开始就完美统一到 SQLite”，而是经历过：

1. 纯文件 JSON
2. 文件迁移整理
3. JSON 导入 SQLite
4. SQLite 成为主存储

如果你是 Agent 开发初学者，这段演进史比抽象讨论“为什么选择某数据库”更有价值。

---

## 9.4 本地数据库和云端 Console 数据层是两套边界

### 当前 `packages/opencode` 里的数据库是本地运行态数据库

本地 SQLite 主要保存：

- 当前机器上打开过哪些项目
- 每个项目有哪些 session
- 每个 session 的消息、分片、todo、权限、分享状态
- 实验性 workspace 映射

这套数据的目标是支撑：

- CLI
- 本地 API server
- Desktop/Web 对本地实例的访问

也就是说，它首先服务的是“本地 Agent 运行态”。

### 云端 Console 走的是另一套 Drizzle + PlanetScale

[packages/console/core/src/drizzle/index.ts](https://github.com/anomalyco/opencode/blob/dev/packages/console/core/src/drizzle/index.ts) 可以看到，Console 侧使用的是：

- `drizzle-orm/planetscale-serverless`
- `@planetscale/database`

这意味着云端 Console 的数据库形态和本地完全不同：

- 本地是 Bun SQLite
- 云端是 PlanetScale MySQL

它们虽然都用了 Drizzle，但关注点不一样：

- 本地关心单机、离线、轻量、低依赖
- 云端关心团队协作、控制平面、服务化数据管理

### `workspace` 是两套数据边界的连接点，不是混用点

这一点很关键。

OpenCode 本地库里有 `workspace` 表，不代表云端数据被“整个同步到本地”。  
当前更准确的理解是：

- 本地保存 workspace 的最小连接信息
- HTTP 层用这些信息决定是否转发请求
- 云端 Console 继续维护它自己的完整业务表

所以如果你写这本书，要明确告诉读者：

**同样都是 Drizzle，不代表它们属于同一个数据库域。**

这是很多初学者最容易混淆的地方。

---

## 9.5 性能和一致性不是附录，而是存储层主设计

### 索引和级联关系已经是 schema 的一部分

`session.sql.ts` 里给常用查询路径建了索引，例如：

- `session_project_idx`
- `session_workspace_idx`
- `session_parent_idx`
- `message_session_idx`
- `part_message_idx`
- `part_session_idx`
- `todo_session_idx`

同时外键上也配了 `onDelete: "cascade"`。

这意味着数据层当前默认支持这些高频动作：

- 按项目列会话
- 按父会话找子会话
- 按 session 拉消息
- 删 session 时连带清理 message/part/todo

### 批量迁移场景做了专门优化

在 `json-migration.ts` 里，为了批量导入旧数据，代码会临时调整 SQLite 参数，例如：

- `journal_mode = WAL`
- `synchronous = OFF`
- `cache_size = 10000`
- `temp_store = MEMORY`

这说明当前仓库对“迁移过程”和“日常运行过程”是分开调优的。  
这是很成熟的工程思路。

### `Timestamps` 混入统一了大部分实体的时间语义

[packages/opencode/src/storage/schema.sql.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/storage/schema.sql.ts) 只导出一个很小的 `Timestamps`：

- `time_created`
- `time_updated`

但它的价值很大，因为多个表都共用了同一组时间字段定义。  
这能减少时间语义在不同表里逐渐漂移。

### `Database.effect()` 体现了“事务后副作用”意识

很多项目在事务成功后会顺手做：

- 发事件
- 刷缓存
- 更新状态

如果这些动作散落在各个业务函数里，一旦事务回滚就容易出错。  
`Database.effect()` 的设计正是在提前处理这类一致性问题。

对初学者来说，这是一条很值得迁移到自己项目里的经验：

**数据库事务和事务后副作用，最好在基础设施层有明确约束。**

---

## 本章小结

理解 OpenCode 的持久化层，重点不是停在“SQLite + Drizzle”这六个字，而是看清楚三件事：

1. 本地 SQLite 是 Agent 运行态的主数据库
2. 历史 JSON 迁移说明这个项目经历过真实的存储演进
3. 云端 Console 数据库和本地库虽然都用 Drizzle，但属于不同数据边界

如果你后面想自己做一个 Agent 项目，我更建议你借鉴 OpenCode 的这套思路：

- 先把本地运行态数据建模清楚
- 再考虑如何平滑迁移旧格式
- 最后再决定哪些数据真的应该进入云端控制平面

### 关键代码位置

| 模块 | 位置 | 建议关注点 |
| --- | --- | --- |
| 数据库入口 | `packages/opencode/src/storage/db.ts` | 初始化、迁移、事务包装 |
| Schema 汇总 | `packages/opencode/src/storage/schema.ts` | 本地表结构组合方式 |
| 通用字段定义 | `packages/opencode/src/storage/schema.sql.ts` | 时间字段与复用模式 |
| JSON 迁移 | `packages/opencode/src/storage/json-migration.ts` | 旧格式导入与批量迁移优化 |
| 存储兼容层 | `packages/opencode/src/storage/storage.ts` | 历史存储访问与边界过渡 |
| 项目表 | `packages/opencode/src/project/project.sql.ts` | 项目维度的最小建模 |
| 会话表 | `packages/opencode/src/session/session.sql.ts` | 会话、消息、part 主结构 |
| 工作区表 | `packages/opencode/src/control-plane/workspace.sql.ts` | 本地 workspace 建模 |
| 云端 Drizzle | `packages/console/core/src/drizzle/index.ts` | Console 数据层入口 |

### 源码阅读路径

1. 先读 `storage/db.ts`，理解本地 SQLite 是怎么初始化、迁移和包事务的。
2. 再读 `project.sql.ts`、`session.sql.ts`、`share.sql.ts`、`workspace.sql.ts`，建立核心表关系。
3. 最后读 `json-migration.ts` 和 `packages/console/core/src/drizzle/index.ts`，分别看旧格式迁移和云端数据库边界。

### 任务

判断 OpenCode 的持久化设计为什么必须把“本地运行态数据库”和“云端产品数据层”明确拆开，而不是追求一套统一主库。

### 操作

1. 打开 `packages/opencode/src/storage/db.ts`，理解本地 SQLite 是怎样初始化、迁移和包事务的。
2. 再读 `project.sql.ts`、`session.sql.ts`、`share.sql.ts`、`workspace.sql.ts`，写出一个 session 可能关联到哪些表，以及删除时哪些数据会级联变化。
3. 最后对比 `json-migration.ts` 和 `packages/console/core/src/drizzle/index.ts`，分别记录历史兼容层和云端数据层在系统里承担什么职责。

### 验收

完成后你应该能说明：

- 为什么本地库更像运行时状态底座，而不是云端产品库的缓存。
- 为什么历史 JSON 迁移代码对理解当前边界仍然重要。
- 如果要新增一个持久化字段，你应该先判断它属于本地运行态、云端产品态，还是根本不该入库。

### 下一篇预告

下一篇会回到用户真正能看到的界面层，也就是多端 UI。  
到那时你会更清楚：为什么本地数据库、HTTP API 和前端状态管理必须同时设计，而不能各写各的。

### 思考题

1. 为什么 OpenCode 要把本地运行态数据库和云端 Console 数据层明确拆开，而不是统一成一套远端主库？
2. `json-migration.ts` 这类历史兼容代码，对理解当前系统边界有什么帮助？
3. 如果你要为会话系统新增一个持久化字段，它更应该落在本地库、云端库，还是两边都不需要？

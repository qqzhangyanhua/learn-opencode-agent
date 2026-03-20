---
title: 第30章：生产架构与部署
description: 从“能跑的 Demo”到“可持续运行的产品”，理解 Agent 生产架构真正要补齐的是哪些边界、状态和闭环。
---

<script setup>
import SourceSnapshotCard from '../../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/server/`、`packages/opencode/src/session/`、`packages/opencode/src/storage/`、`packages/opencode/src/provider/`、`packages/opencode/src/permission/`、`docs/intermediate/examples/30-production-architecture/`
> **前置阅读**：[第9章：HTTP API 服务器](/08-http-api-server/)、[第10章：数据持久化](/09-data-persistence/)、[第14章：部署与基础设施](/13-deployment-infrastructure/)、[P23：生产部署清单](/practice/p23-production/)
> **学习目标**：理解 Agent 从 Demo 走向生产时必须补齐的五层能力：接入层、会话层、模型与工具执行层、持久化层、风险与观测闭环；知道这些层在 OpenCode 里分别落在哪些明确模块。

---

## 这篇解决什么问题

Demo 阶段的 Agent 往往只有一条直线：

```text
接收用户输入
  -> 调一次模型
  -> 返回答案
```

这条线在本地演示完全够用，但只要进入真实使用场景，就会马上遇到一串工程问题：

- API 超时或模型故障时，谁来重试、降级和止损
- 服务重启以后，会话、权限记录和中间状态是否还在
- 多端接入时，TUI、Web、桌面和外部 SDK 是否共用同一套协议
- 工具调用、用户确认、事件流推送如何串成一条完整闭环
- 出了问题以后，能不能知道卡在网关、会话、Provider 还是权限层

所以“生产架构”真正要解决的，不是把 Demo 打包成 Docker 镜像，而是：

**让一次请求从进入系统到离开系统，沿途每一层都有人负责、能被观察、能被恢复。**

## 为什么真实系统里重要

Agent 上线后最容易暴露的，不是“回答不够聪明”，而是系统不够稳：

- 上游模型偶发失败，用户却只看到一个 500
- 对话历史在内存里，一重启全丢
- 长工具输出把上下文冲爆，后续步骤越来越慢
- 权限确认卡住以后，前后端状态对不齐
- 出现问题时只能看零散日志，无法复原整条链路

这意味着生产架构本质上是在回答两个问题：

1. 一次请求经过哪些明确边界
2. 每个边界的失败由谁收口

如果这两个问题答不出来，系统规模一上来，问题就会变成“所有问题都像是模型问题”，最后既难排障，也难演进。

## 核心概念与主链路

先抓一条生产主链：

```text
入口协议统一
  -> 会话与执行循环解耦
  -> Provider / Tool / Permission 分层
  -> 状态持久化
  -> 观测、降级、恢复闭环
```

### 30.1 Demo 和生产系统，差的是“层”而不是“几行代码”

参考文章里那张架构图很值得保留，因为它清楚地区分了五类职责：

```text
用户端 / SDK
  -> 网关层
  -> 会话管理与编排层
  -> 模型 / 工具 / 检索执行层
  -> 输出守门人
  -> 监控、计费、追踪等横切能力
```

它的关键判断不是“所有系统都要长这样”，而是：

- 入口层负责协议，不负责业务细节
- 会话层负责状态和主循环，不负责底层模型适配
- 模型层负责统一调用，不应该掺进产品状态逻辑
- 持久化层负责把关键状态带出内存
- 权限和观测是横切能力，不应该散落在各个业务函数里

这正是生产化和 Demo 最大的区别：**边界先被定义出来，复杂度才有地方安放。**

### 30.2 在 OpenCode 里，生产闭环主要由五块模块组成

如果把 OpenCode 的产品化边界收成一句话，可以这样看：

```text
server/
  -> 负责接入协议、事件流和错误边界
session/
  -> 负责一次 Agent 任务如何推进
storage/
  -> 负责把会话和配置带出进程内存
provider/
  -> 负责模型能力抽象与统一调用
permission/
  -> 负责高风险动作的运行时收口
```

这五块拼起来，才更像一个可上线系统，而不是“会调模型的脚本”。

### 30.3 一次真实请求的主链路应该能被完整画出来

把前面的层收紧以后，主链一般长这样：

```text
客户端发请求
  -> server/routes/session.ts 接住协议
  -> session 恢复或创建当前会话
  -> processor 进入执行循环
  -> provider 发起模型调用
  -> 需要工具时由 registry + permission 决定是否可执行
  -> 结果写回 storage，并通过事件流返回前端
```

这条线的好处是，每一步都能回答“失败时谁兜底”：

- 路由层负责参数校验和 HTTP 错误语义
- 会话层负责上下文组织和循环推进
- Provider 层负责兼容不同模型供应商
- 权限层负责危险操作暂停或拒绝
- 存储层负责把关键状态留住

只要这条线能画清楚，生产系统的排障成本就会立刻下降。

### 30.4 生产架构不是只有“能处理请求”，还要能持续运营

参考文章里强调的重试、降级、限流、健康检查，在 OpenCode 的书内语境里可以换一种说法：

- **可恢复**：失败以后还能继续，而不是整条任务报废
- **可观测**：知道请求停在了哪一层
- **可持续**：成本、状态、权限不是一次性设计

这也是为什么本章必须回链到：

- [P20：可观测性与调试](/practice/p20-observability/)
- [P23：生产部署清单](/practice/p23-production/)

前者回答“怎么知道系统出了什么问题”，后者回答“上线前还缺哪些生产防护”。

## OpenCode 源码映射

这一章最重要的不是找一份“生产架构总入口”，而是看到 OpenCode 如何把产品化边界拆散到明确模块里。

- `server/server.ts`：统一 HTTP 服务和中间件边界，是接入层入口。
- `server/routes/session.ts`：把一次会话请求接入到 Agent 运行时主链。
- `session/processor.ts`：真正推进一次执行循环，决定事件、消息和工具结果怎么流动。
- `storage/db.ts`：把关键会话状态和结构化数据从内存带到持久层。
- `provider/provider.ts`：把底层模型差异封装成统一抽象，避免上层直接绑死某个厂商。
- `permission/next.ts`：把高风险操作收口成运行时协议，而不是“出了事再补规则”。

这些文件分散，但合起来正好对应“从 Demo 到可上线”的那张架构图。

<SourceSnapshotCard
  title="第30章源码映射"
  description="OpenCode 的生产化不是一个独立模块，而是 server、session、storage、provider、permission 五类边界共同组成的产品闭环。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-20"
  :entries="[
    {
      label: 'HTTP 服务入口',
      path: 'packages/opencode/src/server/server.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/server/server.ts'
    },
    {
      label: '会话路由',
      path: 'packages/opencode/src/server/routes/session.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/server/routes/session.ts'
    },
    {
      label: '执行循环核心',
      path: 'packages/opencode/src/session/processor.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/processor.ts'
    },
    {
      label: '数据库初始化',
      path: 'packages/opencode/src/storage/db.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/storage/db.ts'
    },
    {
      label: 'Provider 抽象',
      path: 'packages/opencode/src/provider/provider.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/provider/provider.ts'
    },
    {
      label: '权限决策',
      path: 'packages/opencode/src/permission/next.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/permission/next.ts'
    }
  ]"
/>

## 教学代码示例映射

**下面这些都是教学示例，不是 OpenCode 原仓实现。**

本章对应的示例目录是 `docs/intermediate/examples/30-production-architecture/`，但当前目录同样只有 `README.md` 占位说明，没有独立脚本。  
因此，本章不把“生产架构”误写成某个单文件 demo，而是采用更适合本主题的展示方式：

- 用架构主链解释模块职责
- 用关键代码骨架说明网关、会话、模型调用、持久化分别解决什么问题
- 把真正可运行的生产防护细节回链到 [P23：生产部署清单](/practice/p23-production/)

如果你要把参考文章里的关键示意收成一句话，可以记成：

```text
先让请求有统一入口
  -> 再让会话和执行循环稳定存在
  -> 再让模型、工具、权限分别负责自己的边界
  -> 最后补观测、限流、重试、降级和健康检查
```

由于示例目录目前没有整理出完整脚本，本章教学示例以目录说明和已有实践回链为主，这是刻意的收敛，不是遗漏。

## 常见误区

### 误区1：生产化就是把 Demo 部署到服务器上

**错误理解**：只要加上 Docker、域名和 HTTPS，Demo 就算上线了。

**实际情况**：真正的生产化还包括会话持久化、权限收口、异常恢复、事件流、观测与成本控制。部署只是最后一步。

### 误区2：Agent 架构的复杂度都来自模型调用

**错误理解**：最复杂的是 Provider 接入，其他模块只是配角。

**实际情况**：真实系统里，协议接入、会话管理、存储、权限和观测的工程复杂度并不比模型层低，而且更决定系统是否可运营。

### 误区3：会话状态先放内存里，后面再说

**错误理解**：早期先简单保存到列表或字典，真有用户再补持久化。

**实际情况**：一旦存在多轮任务、权限确认、重试和恢复，状态是否持久化会直接影响系统正确性，而不是纯性能优化。

### 误区4：只要日志够多，就算可观测

**错误理解**：打印足够详细的日志，就能满足生产排障。

**实际情况**：可观测性需要把请求链路、成本、错误位置和关键状态组织成可追踪结构，单纯堆日志通常只会增加噪声。

## 延伸阅读与回链

- 如果你想先从接入层理解统一协议和 SSE 事件流，回到 [第9章：HTTP API 服务器](/08-http-api-server/)。
- 如果你关心会话状态、消息和权限记录怎样持久化，继续读 [第10章：数据持久化](/09-data-persistence/)。
- 如果你想看到 OpenCode 更完整的云端、控制台和 IaC 分层，重读 [第14章：部署与基础设施](/13-deployment-infrastructure/)。
- 如果你需要一份更贴近落地执行的生产清单，直接配合 [P23：生产部署清单](/practice/p23-production/) 使用。
- 如果你想把“生产架构”与权限、上下文预算、恢复策略放在同一张图里理解，建议再串读 [第16章：高级主题与最佳实践](/15-advanced-topics/) 和 [P20：可观测性与调试](/practice/p20-observability/)。

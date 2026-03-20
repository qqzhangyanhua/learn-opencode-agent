---
title: 第31章：安全边界与高风险控制
description: 把高风险 Agent 的安全问题拆成风险分级、确认机制、最小权限和运行时边界，而不是把一切都压给 Prompt。
---

<script setup>
import SourceSnapshotCard from '../../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/agent/agent.ts`、`packages/opencode/src/permission/next.ts`、`packages/opencode/src/tool/registry.ts`、`packages/opencode/src/tool/bash.ts`、`docs/intermediate/examples/31-safety-boundaries/`
> **前置阅读**：[第4章：工具系统](/03-tool-system/)、[第16章：高级主题与最佳实践](/15-advanced-topics/)、[P19：Agent 安全与防注入](/practice/p19-security/)
> **学习目标**：理解为什么“高风险操作里的安全”首先是边界设计问题；掌握风险分级、人工确认、最小权限和渐进授权的基本思路；知道这些思路在 OpenCode 里分别由哪些运行时模块承担。

---

## 这篇解决什么问题

一个只能回答问题的 Agent，最坏情况通常是答错。  
一个能写文件、执行命令、调用外部服务的 Agent，最坏情况就不再是“答错”，而是：

- 删错文件
- 越权修改配置
- 在注入攻击下执行危险命令
- 对高风险请求没有确认就直接落地
- 把“模型认为合理”误当成“系统允许执行”

所以这一章要解决的问题不是抽象安全概念，而是更具体的一句：

**当 Agent 有执行能力时，我们怎么把错误的破坏半径控制住。**

## 为什么真实系统里重要

高风险 Agent 的危险，不在于它有恶意，而在于它往往能在错误上下文里做对自己“看起来合理”的事。

这和传统 Web 系统安全有一个很大的不同：

- 传统系统更像“用户直连后端”
- Agent 系统中间多了一个会推理、会解释、也会误解的模型层

因此真实系统里不能只问“这个功能要不要开放”，还要问：

- 哪些操作可以自动执行
- 哪些操作必须确认
- 哪些角色默认禁止
- 哪些场景就算模型想做，也必须在代码里拦住

如果这些边界不显式定义，模型能力越强，系统风险半径就越大。

## 核心概念与主链路

先记住一条安全主链：

```text
先给操作分风险等级
  -> 再给角色最小权限基线
  -> 高风险动作进入确认机制
  -> 工具执行前再做运行时校验
```

### 31.1 风险不是按“工具名”分，而是按“后果”分

参考文章里的四级风险模型很有代表性：

- `LOW`：只读查询
- `MEDIUM`：可逆写操作
- `HIGH`：难以逆转的操作
- `CRITICAL`：高影响且不可逆

这个模型最有价值的地方，不是四个英文单词，而是它强迫你先问：

**这件事做错以后，代价是什么？**

很多团队一开始只按“查询 / 写入”二分风险，这在真实系统里通常不够。因为：

- 改一个草稿字段和删一个生产目录，不是同一类写操作
- 查公开文档和查敏感配置，也不是同一类读取

风险分级做得越清楚，后面的确认机制和权限策略才越容易落地。

### 31.2 Human-in-the-Loop 不是体验补丁，而是运行时协议

参考文章把高风险动作收成一个 `HumanApprovalGate`，这和 OpenCode 里的思路高度一致：  
真正重要的不是“弹个窗”，而是让执行循环在危险动作前**停住**。

这类机制通常要满足四件事：

- 有唯一待确认操作
- 有过期时间
- 能批准 / 拒绝
- 执行必须依赖确认结果

如果没有这四件事，所谓“确认”很容易退化成一段 UI 文案，而不是安全边界。

### 31.3 最小权限比“默认相信模型”更重要

参考文章里的“渐进式信任”强调：权限不是一开始全部给满，而是随着场景和信任逐步放开。  
在 OpenCode 的语境里，对应的核心原则可以收成一句：

**角色定义时就先收紧默认能力，再让运行时规则决定是否升级。**

也正因此，安全边界不是只写在 Prompt 里，而是要同时落在：

- Agent 角色默认权限
- 工具注册表过滤
- 运行时权限检查
- 必要时的用户确认

只要其中任何一层缺失，系统就可能把“模型提出的动作”误当成“系统批准的动作”。

### 31.4 Prompt Injection 的真正兜底不在 Prompt，而在代码边界

这一点和 [P19：Agent 安全与防注入](/practice/p19-security/) 可以直接互相印证。

Prompt 可以提醒模型：

- 不要执行“忽略指令”
- 不要暴露系统信息
- 高风险动作先确认

但只要模型仍然有可能被诱导，真正可靠的兜底就必须在代码里：

```text
tool/registry.ts 先决定工具是否可见
  -> permission/next.ts 再决定这次调用是否允许
  -> tool/bash.ts 等工具在执行前请求确认
```

所以安全的关键，不是“把提示词写得更凶”，而是让越权操作即使被模型选中，也无法直接穿透系统边界。

## OpenCode 源码映射

这一章和 OpenCode 的映射非常直接，因为当前仓库里最值得学的安全经验，本来就集中在权限和工具执行主链上。

- `agent/agent.ts`：定义不同 Agent 的默认能力边界，说明“角色”本身就是安全策略的一部分。
- `permission/next.ts`：实现 `allow / deny / ask` 这类运行时决策，把确认机制做成正式协议。
- `tool/registry.ts`：统一管理工具可见性与接入方式，是权限收口前的一道过滤层。
- `tool/bash.ts`：高风险工具的典型代表，要求明确描述并走确认流程，体现“可见性 + 可控性”。

如果把这四层串起来，你会更容易理解为什么本书一直强调：

**先定义边界，再给能力。**

<SourceSnapshotCard
  title="第31章源码映射"
  description="高风险 Agent 的安全边界，在 OpenCode 里主要落在角色默认权限、运行时确认协议、工具注册过滤和危险工具执行前确认四个位置。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-20"
  :entries="[
    {
      label: 'Agent 默认权限基线',
      path: 'packages/opencode/src/agent/agent.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/agent/agent.ts'
    },
    {
      label: '权限决策与确认',
      path: 'packages/opencode/src/permission/next.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/permission/next.ts'
    },
    {
      label: '工具注册表',
      path: 'packages/opencode/src/tool/registry.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/tool/registry.ts'
    },
    {
      label: '高风险命令工具',
      path: 'packages/opencode/src/tool/bash.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/tool/bash.ts'
    }
  ]"
/>

## 教学代码示例映射

**下面这些都是教学示例，不是 OpenCode 原仓实现。**

本章对应的示例目录是 `docs/intermediate/examples/31-safety-boundaries/`，当前也只有 `README.md` 占位说明，没有完整脚本。  
因此本章不编造一套“已经迁入仓库”的安全 demo，而是保留参考文章里最有代表性的两个教学片段思路。

### 关键片段 1：先有风险注册表，后有确认策略

```python
RISK_REGISTRY = {
    "query_order": "LOW",
    "update_address": "MEDIUM",
    "apply_refund": "HIGH",
    "delete_account": "CRITICAL",
}
```

它的作用不是做权限系统本身，而是把“后果大小”提前显式化。

### 关键片段 2：确认门必须让执行真正停下

```python
class HumanApprovalGate:
    def request_approval(self, action_name, params, risk_level):
        ...

    def execute_if_approved(self, action_id, executor_fn):
        ...
```

这段骨架的重点不是类名，而是“未批准就不能执行”。  
这和 OpenCode 里 `permission/next.ts` 让执行循环挂起等待响应，是同一类设计思想。

由于示例目录目前仍是 README 占位，本章教学示例以目录说明和已有实践回链为主。真正要看完整防注入和工具沙箱示例，建议直接回链到 [P19：Agent 安全与防注入](/practice/p19-security/)。

## 常见误区

### 误区1：只要 Prompt 写了“危险操作先确认”，系统就安全了

**错误理解**：模型会遵守提示词，所以无需单独权限系统。

**实际情况**：Prompt 只能影响倾向，不能形成硬边界。真正的高风险控制仍然要落在工具过滤、权限检查和确认协议上。

### 误区2：所有写操作都算同一种风险

**错误理解**：只要是写入，就统一弹窗确认。

**实际情况**：不同操作后果差异很大。风险分级越粗糙，用户越容易被无意义确认打扰，而真正危险的动作又可能缺少更严格的收口。

### 误区3：确认机制只是前端交互问题

**错误理解**：有一个弹窗组件就等于有人类确认。

**实际情况**：真正的确认机制必须让服务端执行暂停，等待明确的批准或拒绝结果；否则只是视觉提醒，不是安全协议。

### 误区4：子 Agent 继承主 Agent 的全部能力最方便

**错误理解**：既然是同一条任务链，子代理拿同样权限最省事。

**实际情况**：多 Agent 场景下最容易失控的，就是把权限不加区分地复制给下游执行者。默认只读、按需升级，通常更安全。

## 延伸阅读与回链

- 如果你想从工具定义、权限规则和 `ctx.ask()` 的角度读懂这条链，回到 [第4章：工具系统](/03-tool-system/)。
- 如果你想把本章放进 OpenCode 更大的工程原则里理解，重读 [第16章：高级主题与最佳实践](/15-advanced-topics/)。
- 如果你关心提示注入、输入清洗、输出验证和日志审计这套纵深防御，继续读 [P19：Agent 安全与防注入](/practice/p19-security/)。
- 如果你想看确认请求在交互层怎样真正暂停执行，再补 [第8章：TUI 终端界面](/07-tui-interface/) 的权限弹窗一节。
- 如果你想把本章和下一章一起理解“为什么安全和成本都属于系统边界问题”，建议顺着读 [第32章：性能与成本控制](/intermediate/32-performance-cost/)。

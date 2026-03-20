---
title: 第32章：性能与成本控制
description: 理解 Agent 的性能与成本为什么首先是架构问题，而不是“等更强模型出来”以后自然解决的问题。
---

<script setup>
import SourceSnapshotCard from '../../../.vitepress/theme/components/SourceSnapshotCard.vue'
</script>

> **对应路径**：`packages/opencode/src/provider/models.ts`、`packages/opencode/src/provider/sync.ts`、`packages/opencode/src/session/compaction.ts`、`packages/opencode/src/tool/truncation.ts`、`docs/intermediate/examples/32-performance-cost/`
> **前置阅读**：[第6章：多模型支持](/05-provider-system/)、[第5章：会话管理](/04-session-management/)、[第16章：高级主题与最佳实践](/15-advanced-topics/)、[P18：多模型路由与成本控制](/practice/p18-model-routing/)、[P20：可观测性与调试](/practice/p20-observability/)
> **学习目标**：理解 Agent 成本为什么不仅来自模型单价，还来自上下文膨胀、工具输出和失败重试；掌握模型路由、上下文预算、输出裁剪和成本可观测四类核心手段；知道 OpenCode 在这些问题上已经有哪些明确实现。

---

## 这篇解决什么问题

Agent 做到一定阶段后，团队几乎都会遇到两个表面上不同、实质上同源的问题：

- 为什么越来越慢
- 为什么越来越贵

表面看，这像是模型问题；但真实根因通常是整条链路都在膨胀：

- System Prompt 越写越长
- 历史消息越积越多
- 工具结果原样回灌
- 检索内容塞得太满
- 简单问题也默认走最强模型
- 重试和降级没有被纳入预算

所以这一章要解决的不是“怎么再压几百个 token”，而是：

**怎么把性能和成本一起当成架构约束，而不是上线后才看的账单指标。**

## 为什么真实系统里重要

在 Agent 系统里，性能和成本会直接影响产品体验：

- **成本太高**：模型可用，但业务不可持续。
- **延迟太高**：质量可能不错，但用户根本等不住。
- **预算不可见**：团队不知道问题出在模型、检索、工具还是上下文。
- **没有分层策略**：所有请求都走同一条最贵链路，最终既慢又烧钱。

这也是为什么真正成熟的系统，不会把“性能优化”理解成临时补丁，而会在设计一开始就问：

- 什么问题值得用强模型
- 什么信息值得占用上下文窗口
- 什么输出必须裁剪
- 什么成本应该被实时展示和记录

这些问题，OpenCode 在不同章节里其实已经给出了明确答案。

## 核心概念与主链路

先抓一条成本与性能主链：

```text
先识别任务复杂度
  -> 再选择合适模型
  -> 同时给上下文和工具输出设预算
  -> 最后把成本与延迟变成可观察指标
```

### 32.1 成本的大头通常不是模型单价，而是无效 token

参考文章里给了一个很关键的判断：

**最贵的不是“模型贵”，而是“不必要的 token 消耗”。**

在真实系统里，常见浪费主要来自三类：

- 不必要地使用强模型
- 不必要地塞入长上下文
- 不必要地把工具结果全量回灌

所以性能与成本优化，首先不是换供应商，而是先搞清楚：

```text
哪些 token 真正推动了任务成功
哪些 token 只是上下文噪声
```

### 32.2 模型路由的目标不是“永远选最优”，而是先分层

参考文章里的 `CostAwareRouter` 很适合用来理解第一步：

- 简单问题走便宜模型
- 复杂分析走强模型
- 预算紧张时进一步强制降级

这个思路的价值在于，它把“选模型”从感性动作变成了显式策略。  
在书内实践篇里，[P18：多模型路由与成本控制](/practice/p18-model-routing/) 已经把这条线拆得很清楚：

- 先做启发式复杂度判断
- 再做模型选择
- 再追踪每次调用的 token 和成本
- 必要时走 fallback chain

真正重要的不是某条规则命中率 100%，而是让系统先拥有“分层使用模型”的能力。

### 32.3 上下文预算和输出预算必须同时存在

这一点在 OpenCode 的源码里非常清楚。

仅仅压缩历史消息是不够的，因为真实系统至少有两种膨胀：

1. 会话上下文膨胀
2. 工具输出膨胀

所以更完整的治理顺序应该是：

```text
先给输出预留空间
  -> 再看当前上下文是否溢出
  -> 该压缩历史就压缩历史
  -> 该裁剪工具输出就裁剪工具输出
```

这也是为什么 [第5章：会话管理](/04-session-management/) 和 [第16章：高级主题与最佳实践](/15-advanced-topics/) 会反复强调：

**预算控制不是“撞线后再补救”，而是提前给下一步生成留空间。**

### 32.4 可见的成本，才是可管理的成本

很多团队其实不是不知道成本重要，而是成本信息没有进入日常调试界面。  
一旦只靠月底账单回看，就很难知道问题到底来自哪一层。

更健康的做法通常包括：

- 每次调用记录 input / output token
- 记录使用了哪个模型
- 记录延迟和重试次数
- 记录工具输出是否被裁剪
- 让会话层或观测层能汇总这些信息

这也是本章为什么一定要回链到 [P20：可观测性与调试](/practice/p20-observability/)。  
性能与成本如果不可观测，就只能靠感觉优化。

### 32.5 “大上下文窗口”不会自动替你解决工程问题

这一点在第 16 章里已经讲过，但值得在这里再强调一次。

更大的上下文窗口会改变溢出频率，却不会消除：

- 注意力稀释
- 工具结果噪声
- 延迟上升
- 成本增加

所以即使模型上下文越来越大，系统仍然需要：

- 选择性注入
- 历史压缩
- 工具裁剪
- 模型路由

这些不是旧时代的权宜之计，而是长期有效的工程能力。

## OpenCode 源码映射

这一章最适合用四个文件来锚定：

- `provider/models.ts`：描述模型能力、上下文窗口和价格等元信息，是“为什么能做路由”的前提。
- `provider/sync.ts`：把模型元数据同步和缓存起来，说明成本与能力信息本身也是需要维护的运行时数据。
- `session/compaction.ts`：负责上下文预算控制，体现“先预留输出，再治理历史”的思路。
- `tool/truncation.ts`：负责超长工具输出裁剪，说明成本控制也发生在工具层。

换句话说，OpenCode 并没有把“性能优化”单独做成一个模块，而是把它拆进：

```text
模型能力描述
  + 上下文预算
  + 工具输出裁剪
  + 成本与状态同步
```

这正是工程化系统比 Demo 更成熟的地方。

<SourceSnapshotCard
  title="第32章源码映射"
  description="性能与成本在 OpenCode 里主要落在模型能力元数据、模型同步缓存、上下文压缩和工具输出裁剪四条主链上。"
  repo="anomalyco/opencode"
  repo-url="https://github.com/anomalyco/opencode/tree/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  branch="dev"
  commit="f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc"
  verified-at="2026-03-20"
  :entries="[
    {
      label: '模型能力与价格元数据',
      path: 'packages/opencode/src/provider/models.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/provider/models.ts'
    },
    {
      label: '模型同步与缓存',
      path: 'packages/opencode/src/provider/sync.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/provider/sync.ts'
    },
    {
      label: '上下文预算控制',
      path: 'packages/opencode/src/session/compaction.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/session/compaction.ts'
    },
    {
      label: '工具输出裁剪',
      path: 'packages/opencode/src/tool/truncation.ts',
      href: 'https://github.com/anomalyco/opencode/blob/f8475649da1cd7a6d49f8f30ee2fad374c2f4fcc/packages/opencode/src/tool/truncation.ts'
    }
  ]"
/>

## 教学代码示例映射

**下面这些都是教学示例，不是 OpenCode 原仓实现。**

本章对应的示例目录是 `docs/intermediate/examples/32-performance-cost/`，当前仍然只有 `README.md`，没有完整脚本。  
因此，本章教学示例也采用“关键片段说明 + 示例目录说明 + 现有实践回链”的方式，而不是硬写一份不存在的成本平台 demo。

### 关键片段 1：成本先算清楚，再谈优化

```python
def calculate_monthly_cost(
    daily_conversations=1000,
    turns_per_conversation=5,
    tokens_per_turn=2000,
    price_per_million_tokens=1.0,
):
    ...
```

这类函数的价值在于先把账算清楚，让“优化”从模糊感觉变成可比较指标。

### 关键片段 2：路由器把复杂度映射到模型层级

```python
class CostAwareRouter:
    def route(self, query: str) -> str:
        if len(query) < 20:
            return "cheap"
        return "strong"
```

它不是为了追求完美路由，而是先让系统具备“不是所有请求都走最贵模型”的能力。

由于示例目录目前只有 README，本章最推荐的阅读组合是：

```text
先读本章理解成本来源
  -> 再去 P18 跑通模型路由与预算追踪
  -> 回到第5章看 compaction.ts
  -> 最后用 P20 的追踪视角看性能瓶颈
```

这也是为什么本章必须明确说明：**本章教学示例以目录说明和已有实践回链为主。**

## 常见误区

### 误区1：成本高，说明应该换更便宜的模型

**错误理解**：只要模型单价降下来，整体成本自然会好。

**实际情况**：如果上下文和工具输出仍然失控，换便宜模型只是在用更低单价继续浪费 token。

### 误区2：上下文窗口够大，就不需要压缩和裁剪

**错误理解**：模型支持超长上下文后，历史消息和工具输出都可以直接塞进去。

**实际情况**：更大窗口不会消除注意力稀释、延迟增加和成本上升。预算控制仍然是必需能力。

### 误区3：性能优化是工程师的内部问题，和产品无关

**错误理解**：只要最终账单还能接受，用户不会在意性能与成本设计。

**实际情况**：延迟、失败率、输出稳定性、是否频繁降级，都会直接影响用户体验。成本设计最终会反映到产品行为上。

### 误区4：缓存命中越多越好

**错误理解**：只要缓存能省钱，就应该尽量缓存所有请求。

**实际情况**：缓存适合高频、稳定、事实性问题，不适合强个性化或强时效请求。错误缓存同样会变成质量问题。

## 延伸阅读与回链

- 如果你想先理解 OpenCode 为什么能描述不同模型的能力、价格和上下文窗口，回到 [第6章：多模型支持](/05-provider-system/)。
- 如果你想直接看上下文预算和压缩主链，重读 [第5章：会话管理](/04-session-management/)。
- 如果你想把成本控制放回更大的工程原则里理解，继续读 [第16章：高级主题与最佳实践](/15-advanced-topics/)。
- 如果你需要一份可运行的模型路由与预算追踪练习，直接配合 [P18：多模型路由与成本控制](/practice/p18-model-routing/)。
- 如果你想把成本、延迟、错误链路和调试闭环放到一起，最后再串读 [P20：可观测性与调试](/practice/p20-observability/) 和 [P23：生产部署清单](/practice/p23-production/)。

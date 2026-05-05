---
title: AI Agent 面试八股文：大模型基础
description: 从 Transformer、注意力、Tokenization 到微调、对齐、量化与推理优化，系统梳理 LLM 面试高频基础问题。
contentType: support
series: support
contentId: support-agent-interview-bagua-llm-fundamentals
shortTitle: 大模型基础
summary: 以 Transformer 和训练推理主线为骨架，系统整理 LLM 基础、微调、对齐和部署优化的面试回答框架。
difficulty: intermediate
estimatedTime: 50 分钟
learningGoals:
  - 理解 Transformer、注意力、Tokenization、推理与微调的核心原理
  - 区分 RLHF、DPO、量化和推理优化等常见大模型面试主题
  - 能从模型架构到部署推理回答 LLM 基础问题
prerequisites:
  - 对 LLM 和 Agent 有基础认识
  - 最好已经读过 Agent 基础概念或 Prompt 基础
recommendedNext:
  - /interview/bagua/prompt-engineering/
  - /interview/bagua/tool-calling/
  - /interview/fundamentals/
practiceLinks:
  - /17-multi-model-orchestration/
  - /practice/p25-long-context/
  - /practice/p26-structured-output/
searchTags:
  - 大模型基础
  - Transformer
  - 注意力机制
  - 模型微调
  - 面试八股文
navigationLabel: 大模型基础
entryMode: read-first
roleDescription: 帮助读者把大模型基础从零散概念整理成可复述的主线，能从架构、训练、对齐到推理优化完整回答相关面试问题。
---

# 大模型基础

面向零基础读者的系统梳理：每个知识点尽量包含「概念解释、原理详解、面试问答、追问应对、代码示例（如适用）」。本模块是 LLM / Agent 面试的高频核心，建议结合论文与开源实现（如 Hugging Face Transformers、vLLM）对照理解。

## 目录

- Transformer 架构
- 注意力机制详解
- Tokenization
- 大模型推理
- 模型微调
- 对齐技术
- 模型量化
- 推理优化
- 前沿模型与选型
- 综合面试题库（45 题）

## 1. Transformer 架构

### 1.1 概念解释

Transformer 是一种完全基于自注意力(Self-Attention)的神经网络结构，用于序列建模。与RNN/CNN 不同，它不依赖逐步递归或局部卷积，而是通过注意力在任意两个位置之间直接建立依赖关系，因而并行度高，且更容易捕捉长距离依赖。

经典论文 Attention Is All You Need 提出了两种用法：
Encoder：把输入序列编码成一组上下文相关的表示（适合理解、分类、双向信息）。

Decoder：自回归地生成下一个 token（适合生成）;Decoder 还可通过 Cross-Attention 读Encoder 的输出（机器翻译等 Encoder–Decoder 任务）。纯 Decoder 堆叠（如 GPT 系列）已成为当前大语言模型(LLM)的主流形态。

### 1.2 原理详解

#### 1.2.1 Encoder–Decoder 结构

Encoder（多层堆叠）：每层包含 Self-Attention（双向，每个位置能看到整句）+ FFN。输出
是一组向量 (H)，编码了源序列信息。

Decoder（多层堆叠）：每层包含 Masked Self-Attention（只能看到当前位置及之前，保证自回归）+ Encoder–Decoder Attention(Cross-Attention)（Query 来自 Decoder,Key/Value 来自 Encoder）+ FFN。用途：Seq2Seq（翻译、摘要等）。纯 Decoder LLM 往往只有 Decoder 块，用「前缀」当条件做生成，不再单独训练 Encoder。

#### 1.2.2 Self-Attention 的计算过程（Q、K、V 与缩放点积注意力）

对输入序列的每个位置 (i)，先把隐向量变成三个向量：
Query (Q)：「我要查什么」
Key (K)：「我有什么可被匹配的标签」Value (V)：「匹配成功后取出什么内容」实现上：(X \in \mathbb{R}^{n \times d_{model}})，可学习矩阵 (W_Q, W_K, W_V)，则(Q = XW_Q,\ K = XW_K,\ V = XW_V)。

缩放点积注意力输出：

```text
Attention(Q, K, V) = softmax((QK^T) / sqrt(d_k)) V
```

其中 `d_k` 为每个头的维度。对第 `i` 个位置，注意力权重是它对各个位置 `j` 的分布，再对 `V` 做加权求和。

#### 1.2.3 Multi-Head Attention(MHA)

将 (d_{model}) 拆成 (h) 个头，每个头在 (d_k = d_{model}/h) 维子空间上独立做注意力，最后Concat 再乘 (W_O) 投回 (d_{model})。直觉：不同头可以关注不同模式（语法、指代、局部搭配等），表达能力更强。

#### 1.2.4 Position Encoding

注意力本身置换不变（打乱 token 顺序若不加位置信息则结果不变），必须注入位置信息。
| 方法 | 思路简述 |
| --- | --- |
| 正弦位置编码(Sinusoidal PE) | 固定函数，不同维度用不同频率的正弦/余弦；可外推到比训练更长的位置（但现代 LLM 仍常用可学习或 RoPE）。 |
| RoPE(Rotary Position Embedding) | 在 Q、K 上施加与位置相关的旋转，相对位置以旋转角度差体现；广泛用于 LLaMA、ChatGLM 等，外推与相对位置性质较好。 |
| ALiBi(Attention with Linear Biases) | 不在 embedding 加位置向量，而在注意力 logits 上按距离加线性负偏置，远处更负，实现简单且对长度外推有一定帮助。 |

#### 1.2.5 Feed-Forward Network(FFN)

每层注意力子层后接一个位置独立的 FFN，通常形式为：

```text
FFN(x) = Activation(xW_1 + b_1) W_2 + b_2
```

常见扩展比为 `4`（隐层维度约为 `4 x d_model`），激活函数常用 GELU / SwiGLU。SwiGLU 会用三个矩阵，本质上等价于门控 FFN。

#### 1.2.6 Layer Normalization:Pre-Norm vs Post-Norm

Post-Norm（原始 Transformer）:(x \leftarrow x + \text{Sublayer}(x))，再在子层输出上做Norm。

Pre-Norm（现代 LLM 常见）：先 Norm 再进子层：(x \leftarrow x + \text{Sublayer}
(\text{LN}(x)))。

Pre-Norm 通常更稳定、更易训练深层网络；Post-Norm 在理论上与残差更「经典」，但深层时更难训。

#### 1.2.7 Residual Connection（残差连接）

```text
x_(l+1) = x_l + Sublayer(x_l)
```

或采用 Pre-Norm 变体。其作用是缓解梯度消失、提供恒等映射捷径，使深层网络更容易优化。

### 1.3 面试问题(Q)与标准答案(A)

#### Q1：Transformer 和 RNN 相比，核心优势是什么？

**A：** 自注意力在单步内连接任意两位置，并行计算好、长距离依赖路径短（常数层数内）;RNN 顺
序计算且长序列梯度路径长。代价是 (O(n^2)) 注意力内存与时间（相对序列长度）。

#### Q2：Decoder 里的 Masked Self-Attention 为什么要 mask?

**A：** 训练时一次看到整句，若不 mask，位置 (i) 会看到「未来」token，造成信息泄漏；mask 保
证训练和推理（自回归）一致。

> **追问**：为什么大模型多是 Decoder-only?
>
> **应对**：生成式预训练目标（下一词预测）与架构一致；工程上堆叠简单、扩展性好；Encoderonly（如 BERT）更偏理解，需另做生成适配。

> **追问**：Pre-Norm 和 Post-Norm 训练稳定性差异原因？
>
> **应对**：Pre-Norm 让子层输入分布更稳定，梯度在残差路径上更平滑；可提一嘴深层Transformer 实践中 Pre-Norm 更常见。

### 1.5 代码示例：缩放点积注意力（PyTorch 风格伪代码）

```python
import math

import torch
import torch.nn.functional as F

def scaled_dot_product_attention(Q, K, V, attn_mask=None):
    # Q, K, V: (batch, heads, seq_len, d_k)
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(Q.size(-1))
    if attn_mask is not None:
        scores = scores.masked_fill(attn_mask == 0, float('-inf'))

    attn = F.softmax(scores, dim=-1)
    return torch.matmul(attn, V), attn
```

## 2. 注意力机制详解

### 2.1 概念解释

注意力本质上是一种软寻址机制：根据 Query 与各个 Key 的相似度得到权重，再对 Value 加权求和。Self-Attention 中 Q、K、V 都来自同一组输入（不同线性投影）。

### 2.2 原理详解

#### 2.2.1 数学公式

```text
Attention(Q, K, V) = softmax((QK^T) / sqrt(d_k)) V
```

若为多头，则对每个头分别计算后再拼接。

#### 2.2.2 为什么要除以 (\sqrt{d_k})

当 (d_k) 较大时，(q \cdot k) 的点积方差约为 (d_k)（假设分量独立零均值单位方差），数值幅度大，softmax 会进入极陡区域，梯度不稳定。除以 (\sqrt{d_k}) 将方差缩放到约 1，使 softmax更平滑，训练更稳定。

#### 2.2.3 Multi-Head 的作用

多头 = 多个并行子空间的注意力，每头可学习不同关系。单头表达能力有限；多头类似 CNN 多通道，提高表示丰富度。

#### 2.2.4 Grouped Query Attention(GQA)

在 MHA 中，每头有独立 K、V。在 MQA 中，所有头共享一套 K、V。GQA 介于两者之间：多组 Query 共享同一组 K、V（例如 8 个 Q 组对应 2 组 KV），在推理显存与带宽（KV Cache 更小）和质量之间折中。Llama 3、Mistral 等采用 GQA。

#### 2.2.5 Multi-Query Attention(MQA)

所有注意力头共享同一份 K、V，大幅减少 KV Cache 体积与内存带宽需求，推理加速明显；但可
能略损质量，故后来流行 GQA 折中。

#### 2.2.6 Flash Attention 原理（核心思想）

标准实现需物化完整 (n \times n) 注意力矩阵，显存占用大。Flash Attention 利用 GPU SRAM 快、HBM 慢 的层次结构，把 Q、K、V 分块(tiling)，在块上融合矩阵乘、softmax 与对 V 的加权，避免或减少完整 (n \times n) 矩阵写回 HBM；并可配合 recomputation 在反向时重算以省显存。要点：IO-aware / 分块 softmax 数值稳定实现、减少 HBM 读写。后续 FlashAttention-2 等进一步优化并行与工作划分。

### 2.3 面试问题(Q)与标准答案(A)

#### Q3：简述 Flash Attention 为什么能快和省显存？

**A：** 通过分块在片上完成注意力计算，减少对慢速全局显存的读写；避免存储完整大注意力矩阵
（或显著降低峰值），并融合算子提高吞吐。

#### Q4：GQA 相对 MHA 推理上主要省在哪里？

**A：** KV Cache 随层缓存的 K、V 体积减小（多组 Query 共享 KV），内存带宽与显存占用下降，
decode 阶段受益明显。

> **追问**：不用 softmax 可以吗？
>
> **应对**：注意力需非负且归一的权重；softmax 是最常见选择，也有线性注意力、核方法等变体用于线性复杂度，但各有近似与实现代价。

### 2.5 代码示例：多头形状演示

~~~python
# batch=2, seq=128, heads=8, d_model=512 => d_k=64
# Q: (2, 8, 128, 64)  # 注意力在最后一维 seq 上 softmax
# 合并多头： (2, 128, 512) @ W_o
~~~

## 3. Tokenization

### 3.1 概念解释

Tokenization 把原始文本切成模型可处理的 token 序列；每个 token 对应词表中的 id，再经embedding 变为向量。切分方式直接影响序列长度、OOV 处理、多语言与符号表现。

### 3.2 原理详解

#### 3.2.1 BPE(Byte Pair Encoding)

从字符或字节开始，统计相邻符号对频率，合并最高频对为新符号，迭代直到词表达目标规模。特点：平衡词级与字符级，可表示未登录词（由子词拼出）；广泛用于 GPT-2、RoBERTa 等。

#### 3.2.2 WordPiece(BERT)

与 BPE 类似，但合并准则常基于最大化语言模型似然（选择使训练数据概率提升最大的合并）,
而非单纯最高频。

#### 3.2.3 SentencePiece

把整句当作输入，不依赖预分词空格；在原始字符串上学习子词（可处理无空格语言如日文）。支持 BPE 与 Unigram 等算法。Unigram 从大批子词出发，迭代删除使损失最小的词表，适合多语言。

#### 3.2.4 中文 Tokenization 的特殊处理

中文无天然空格，需在字符、子词、词级之间选择；子词级（字 + 常见片段）较常见。字符级：词表大、序列长；子词可压缩长度。中英混合、数字、emoji 常统一用 字节级 BPE（如 UTF-8 字节）避免 OOV，但序列可能变长。

实践上多用 SentencePiece + 大词表 或 字节 BPE，并对领域语料再训练词表/适配。

#### 3.2.5 Tokenizer 对模型效果的影响

序列长度：同样文本 token 数少则同样上下文窗口能容纳更多内容。

稀有词：拆成子词比 UNK 更好。

噪声：错误分词会导致语义碎片化，影响生成与理解。与预训练一致性：微调与推理必须用同一套 tokenizer 与规则。

### 3.3 面试问题(Q)与标准答案(A)

#### Q5：BPE 和 WordPiece 主要区别？

**A：** 都是子词合并思路；BPE 常用高频合并，WordPiece 更强调似然提升；具体实现因库而异，
面试答「合并准则不同」即可。

#### Q6：为什么 LLM 常用子词而不是纯词？

**A：** 控制词表规模、处理 OOV、开放集词汇；纯词级词表巨大且稀疏。

> **追问**：字节级 BPE 优缺点？
>
> **应对**：词表小、任意字符可表示；缺点是同样文本 token 变长，算力与上下文窗口压力增大。

## 4. 大模型推理

### 4.1 概念解释

推理指模型前向计算生成输出。自回归 LM 逐 token 生成，分为 Prefill（处理提示词）与Decode（逐个生成新 token）。

### 4.2 原理详解

#### 4.2.1 Prefill vs Decode

Prefill：一次性并行计算 prompt 各 token 的表示，得到第一个生成位置的 logits；计算形态
类似「整段并行注意力」。

Decode：每步只新增一个 token，但需用历史 KV Cache 避免重复计算过去 token 的 K、
V；算力小、内存带宽敏感。

#### 4.2.2 KV Cache 原理与实现

对每一层、每个注意力头，对已生成（及 prompt）位置缓存 Key 和 Value。新一步只计算当前 token 的 Q，与缓存的 K、V 做注意力，无需再算历史位置的 K、V。代价：序列越长、层数越多、模型越大，KV Cache 显存线性增长，是长上下文推理的主要瓶颈之一。

#### 4.2.3 采样策略

Temperature (T):logits 除以 (T) 再 softmax。(T>1) 分布更平（更随机）,(T<1) 更尖（更确定）。

Top-k：只保留概率最高的 k 个 token，其余置零再归一化，减少长尾胡编。Top-p(Nucleus)：按概率从大到小累加，取最小集合使累积概率 (\ge p)，动态截断候选集。

#### 4.2.4 Beam Search vs Greedy

Greedy：每步取 argmax，快但易局部最优。Beam Search：维护 top-(b) 条部分假设，适合机器翻译、摘要等可度量任务；对开放域对话常显得重复、不自然，对话场景更常用采样。

#### 4.2.5 推理延迟优化（概览）

量化、算子融合、批处理、KV Cache 压缩/分页、投机解码、模型并行、更好的注意力实现(FlashAttention)等（见第 8 节）。

### 4.3 面试问题(Q)与标准答案(A)

#### Q7：Prefill 和 Decode 哪个更吃算力？哪个更吃带宽？

**A：** Prefill 并行度高，计算密集；Decode 每步批量小，常内存带宽受限(读大权重与 KV
Cache)。实际与 batch、实现有关。

#### Q8：KV Cache 为什么能加速？

**A：** 避免对历史 token 重复计算各层 K、V，以空间换时间。

> **追问**：KV Cache 显存如何估算？
>
> **应对**：与层数、头数、每头维度、batch、序列长度、精度(FP16/BF16/INT8)成正比；可答「每层每 token 存 K、V 两份向量，总显存随长度线性增」。

### 4.5 代码示例：简单 Greedy + 温度（概念）

```python
import torch
import torch.nn.functional as F

def sample_next_token(logits, temperature=1.0, top_k=50):
    logits = logits / temperature
    if top_k > 0:
        v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
        logits[logits < v[:, [-1]]] = float('-inf')

    probs = F.softmax(logits, dim=-1)
    return torch.multinomial(probs, num_samples=1)
```

## 5. 模型微调

### 5.1 概念解释

微调在预训练模型上用下游数据继续训练，使模型适配任务或领域。全量微调更新全部参数；**参数高效微调(PEFT)**只训练少量附加参数或低秩增量，降低显存与存储。

### 5.2 原理详解

#### 5.2.1 全量微调(Full Fine-tuning)

更新 (\theta) 的全部分量。效果最好潜力大，但需要大显存、易过拟合小数据，部署时每任务一份完整权重。

#### 5.2.2 LoRA(Low-Rank Adaptation)

对某线性层 (W \in \mathbb{R}^{d \times k})，冻结 (W)，训练低秩分解：
[ W' = W + BA,\quad B \in \mathbb{R}^{d \times r},\ A \in \mathbb{R}^{r \times k},\ r \ll
\min(d,k) ]
直觉：大矩阵更新往往低秩即可近似任务有效子空间。训练只存 (A,B)，推理可合并 (W' = W +
BA) 或保持分开。

#### 5.2.3 QLoRA

在 4-bit 量化的基座权重（如 NF4）上叠加 LoRA，用 paged optimizer 等技巧减少显存峰值。

使单卡微调大模型成为可能。

#### 5.2.4 Adapter Tuning

在 Transformer 层中插入小瓶颈层（如 down-project → 激活 → up-project），只训练 adapter参数。

#### 5.2.5 Prefix Tuning

在输入前可学习的前缀向量（虚拟 token），不改变原词表 embedding，通过前缀影响注意力。

#### 5.2.6 P-Tuning v2

将 prompt tokens 扩展到每一层的可学习前缀，而不仅是输入层，提升小模型与难任务表现。

#### 5.2.7 SFT(Supervised Fine-Tuning)流程（典型）

1. 数据：高质量指令–回答对（可含思维链、拒答、工具格式）。
2. 格式：Chat 模板(system/user/assistant)与 tokenizer 对齐。
3. 训练：交叉熵损失，通常只监督 assistant 段 token。
4. 评估：验证集 loss、人工/模型裁判、任务基准。
5. 对齐：常与 DPO/RLHF 等衔接。

### 5.3 面试问题(Q)与标准答案(A)

#### Q9：LoRA 秩 r 怎么选？

**A：** 经验值 8–64 常见；越大容量越大但易过拟合、显存略增；需验证集折中。

#### Q10：QLoRA 和 LoRA 主要差在哪？

**A：** 基座权重 4-bit 量化 + LoRA；大幅降低显存，略有精度损失风险，需配合 NF4 与调参。

> **追问**：LoRA 一般接在哪些层？
>
> **应对**：常对 Attention 的 q,v（及有时 k,o）和/或 FFN 注入；实践有默认配置（如 r、alpha、target_modules）。

### 5.5 代码示例：LoRA 形式（数学）

~~~text
# 前向：h = W x + (B A) x = (W + B A) x
# 训练参数：B (d×r), A (r×k)，远小于 W (d×k) 当 r 小时
~~~

## 6. 对齐技术

### 6.1 概念解释

对齐指使模型行为符合人类意图与安全规范。RLHF 用人类偏好训练奖励模型再用强化学习；DPO 等直接用偏好数据优化策略，无需显式奖励模型与 RL 循环。

### 6.2 原理详解

#### 6.2.1 RLHF 完整流程（经典三阶段）

1. SFT：监督微调，学会基本指令跟随与格式。
2. 奖励模型(RM)：对人类标注的「好坏排序」数据，训练 (r(x,y)) 给回答打分。
3. 强化学习：以 RM 为奖励信号，用 PPO 等算法更新策略 (\pi_\theta)，并常加 KL 惩罚 约束
与参考模型 (\pi_{\text{ref}})（常为 SFT 模型）不要偏离太远。

#### 6.2.2 PPO 在 RLHF 中的应用

PPO(Proximal Policy Optimization) 通过 clipped surrogate objective 限制策略更新幅度，
训练稳定。RLHF 中：

- 策略：当前 LM。
- 奖励：RM 分数 + KL 项。
- 价值函数：常需 critic 估计优势函数。
- 挑战：训练链路长、调参难、奖励黑客(reward hacking)。

#### 6.2.3 DPO(Direct Preference Optimization)

从偏好对 ((y_w, y_l)) 出发，推导出仅用策略与参考模型、无需显式 RM 的分类式损失，直接优化策略满足偏好。简化工程、去掉 RL 采样环，但数据质量要求高。

#### 6.2.4 GRPO(Group Relative Policy Optimization)

DeepSeek 等工作中强调：对同一 prompt 一组输出内做相对奖励归一化，减 critic、适应组内比较，适合特定训练基础设施与算法设计。

#### 6.2.5 KTO(Kahneman-Tversky Optimization)

从二元反馈（好/坏）出发，用前景理论风格损失做对齐，不必成对偏好，数据收集更灵活。

#### 6.2.6 RLHF vs DPO 对比

| 维度 | RLHF | DPO |
| --- | --- | --- |
| 奖励模型 | 需要 | 不需要显式 RM |
| 训练复杂度 | 高（RL + 参考模型） | 相对较低 |
| 稳定性 | 依赖 PPO 调参 | 通常更简洁 |
| 数据 | 排序/打分 | 偏好对 |

### 6.3 面试问题(Q)与标准答案(A)

#### Q11：RLHF 为什么要 KL 惩罚？

**A：** 防止策略为刷高 RM 分数而产生分布外投机行为(reward hacking)，保持语言质量与多样
性。

#### Q12：DPO 相对 RLHF 的主要工程优势？

**A：** 无需单独训练 RM 与 RL 采样循环，静态数据上直接优化，pipeline 更简单。

> **追问**：偏好数据噪声大怎么办？
>
> **应对**：数据清洗、多裁判一致性、对比学习过滤、鲁棒损失与正则；工业界常强调标注指南与质检。

## 7. 模型量化

### 7.1 概念解释

量化把浮点权重/激活用低比特整数近似，减少显存与带宽，加速推理。训练后量化(PTQ)常见；QAT（量化感知训练）精度更好但成本高。

### 7.2 原理详解

#### 7.2.1 INT8 / INT4

INT8：每权重 8 bit，常配合 per-tensor 或 per-channel scale/zero-point。INT4:4 bit，容量减半，精度风险更高，常与 group-wise 缩放配合。

#### 7.2.2 GPTQ

逐列（或块）量化权重，用 Hessian 相关信息最小化量化误差，适合 GPU 上 PTQ，广泛用于开源 LLM 的 4-bit 权重。

#### 7.2.3 AWQ(Activation-aware Weight Quantization)

强调保留对 激活幅度大 的「显著」权重通道，按激活统计决定保护权重，小模型推理上常与硬件内核结合。

#### 7.2.4 GGUF / GGML

文件格式与生态（llama.cpp 等），便于 CPU/多端部署与多种量化类型（Q4_K、Q5_K 等），不是单一算法名，而是推理栈与格式代表。

#### 7.2.5 量化对性能的影响

正面：显存降、吞吐升、边缘部署可行。

负面：perplexity 上升、复杂推理/代码任务可能掉点；KV Cache 量化可进一步省显存但需小心误差累积。

### 7.3 面试问题(Q)与标准答案(A)

#### Q13：INT4 比 INT8 主要风险是什么？

**A：** 表示粒度更粗，误差更大；需 group-wise 缩放、混合精度或与更高比特关键层结合。

#### Q14：GPTQ 大致在优化什么？

**A：** 给定量化约束，最小化权重重构误差（常利用二阶近似信息），逐块贪心求解。

## 8. 推理优化

### 8.1 概念解释

大模型推理瓶颈来自 算力、显存带宽、KV Cache、批调度 等，工程上从模型分片、内核、缓存
管理、批处理、投机解码等多方面优化。

### 8.2 原理详解

#### 8.2.1 模型并行

张量并行(TP)：单层内矩阵分块到多 GPU(如列切分 (A)、行切分 (B))，需 all-reduce 通信。

流水线并行(PP)：不同层放在不同 GPU,micro-batch 流水，减少气泡。大集群还可 数据并行 + TP + PP 组合。

#### 8.2.2 KV Cache 优化：PagedAttention / vLLM

PagedAttention 将 KV Cache 存成非连续块（类似 OS 分页），按请求动态分配，减少 padding浪费，提高 batch 利用率，是 vLLM 的核心思想之一。

#### 8.2.3 Continuous Batching（动态批处理）

请求长度不一，传统静态 batch 浪费严重；连续批处理在迭代中动态增删请求，提高 GPU 利用率。

#### 8.2.4 Speculative Decoding（投机采样）

用小模型(draft)多步预测，大模型(target)并行验证；接受则一次前进多 token，降低每token 延迟（理想情况），需 draft 与 target 兼容。

#### 8.2.5 MoE(Mixture of Experts)

每层含多个 FFN 专家，门控只对少数专家计算（如 top-2），总参数大但每 token 激活参数少，提高容量与效率比；挑战是 负载均衡与通信（如 DeepSeek-MoE、Mixtral）。

### 8.3 面试问题(Q)与标准答案(A)

#### Q15：vLLM 的 PagedAttention 解决什么问题？

**A：** KV Cache 显存碎片化与浪费（变长序列），通过分页块管理与复用提高吞吐。

#### Q16：MoE 为什么「参数多算力少」？

**A：** 每 token 只激活部分专家，计算量随激活专家数增长，而总参数量包含所有专家。

## 9. 前沿模型与选型

### 9.1 概念解释

闭源(API)与开源（可自托管）在能力、成本、合规、迭代速度上权衡；各系列有长上下文、多
模态、代码、价格等差异。

### 9.2 原理详解

#### 9.2.1 DeepSeek 系列特点（概括）

强调工程与训练效率（如公开技术报告中的架构与训练细节）、长思维链与推理场景、开源权重降低使用门槛；具体能力随版本迭代需以官方 benchmark 为准。

部分版本采用 MoE 等提高参数效率。

#### 9.2.2 GPT-4o / Claude / Gemini 对比（面试话术）

| 维度 | 可答要点 |
| --- | --- |
| 生态 | OpenAI / Anthropic / Google 各自 API、工具链、多模态进度不同。 |
| 多模 | GPT-4o 强调语音图像端到端；Gemini 原生多模态与谷歌生态；Claude 长文与代码体验常被提及。 |
| 定位 | 面试答「需看具体版本与评测任务」；商业上关注价格、速率限制、合规区域。 |
避免编造具体 benchmark 数字，强调任务相关评测与 A/B。

#### 9.2.3 开源 vs 闭源选型

开源：数据自主、可微调、离线可部署；需自备算力与运维。闭源：上手快、持续升级；依赖供应商、成本与合规需评估。混合：敏感数据本地开源模型，通用能力调用 API。

### 9.3 面试问题(Q)与标准答案(A)

#### Q17：选开源 70B 还是闭源 API?

**A：** 看隐私、延迟、成本、定制需求与团队运维能力；高合规本地优先，快速验证可用 API。

## 10. 综合面试题库（45 题）

下列题目均附标准答案要点，可与前文章节交叉复习。

#### Q1：写出缩放点积注意力的公式，并解释 (\sqrt{d_k})。

**A：** (\text{softmax}(QK^\top/\sqrt{d_k})V)。除 (\sqrt{d_k}) 使点积方差稳定在约 1，避免
softmax 饱和与梯度问题。

#### Q2：多头注意力为什么比单头好？

**A：** 多子空间并行关注不同依赖关系，表达力更强，类似多通道特征。

#### Q3：Encoder 和 Decoder 的自注意力有何不同？

**A：** Encoder 一般为双向；Decoder 用 causal mask 保证自回归；Seq2Seq 中 Decoder 还有
Cross-Attention 读 Encoder。

#### Q4：RoPE 与正弦绝对位置编码各有什么特点？

**A：** RoPE 通过旋转编码相对位置，常用于 Decoder LLM；正弦为固定绝对位置，可外推性讨论
较多但现代架构更常选 RoPE/ALiBi。

#### Q5：Pre-Norm 和 Post-Norm 区别？

**A：** Pre-Norm:LN 在子层前；Post-Norm:LN 在子层后。深层网络 Pre-Norm 通常更稳定。

#### Q6：解释 MQA 与 GQA 的动机。

**A：** 减少 KV Cache 与带宽；MQA 共享全部 KV,GQA 分组共享以平衡质量。

#### Q7：Flash Attention 核心优化思想？

**A：** 分块、减少 HBM 访问、融合算子；降低注意力显存峰值并提速。

#### Q8：BPE 如何构建词表？

**A：** 从基础符号迭代合并最高频相邻对（或类似准则），直到目标规模。

#### Q9：SentencePiece 适合中文的原因？

**A：** 不依赖空格分词，可学习子词；适合无空格语言与多语言统一。

#### Q10：Tokenizer 不一致会导致什么问题？

**A：** id 错位、性能异常；微调与推理必须与基座一致。

#### Q11：Prefill 和 Decode 阶段特点？

**A：** Prefill 并行处理 prompt;Decode 逐步生成，常受带宽与 KV Cache 影响。

#### Q12：KV Cache 是什么？为什么能加速？

**A：** 缓存历史 K、V；避免重复计算过去 token 的注意力键值。

#### Q13：Temperature、Top-k、Top-p 各影响什么？

**A：** 随机性/确定性；截断长尾候选；动态 nucleus 截断。

#### Q14：对话生成为什么少用 Beam Search?

**A：** 易重复、不自然；开放域更常用采样类方法。

#### Q15：LoRA 的低秩假设直觉？

**A：** 任务适配更新近似落在低秩子空间，用 (BA) 参数高效逼近。

#### Q16：QLoRA 为什么省显存？

**A：** 基座 4-bit 存权重 + LoRA 训练少量参数；降低显存占用。

#### Q17：SFT 损失通常怎么算？

**A：** 常对 assistant token 做交叉熵，忽略 user 与 mask。

#### Q18：RLHF 三阶段是什么？

**A：** SFT → 奖励模型 → PPO（带 KL）强化学习。

#### Q19：DPO 相对 RLHF 最大简化是什么？

**A：** 不显式训练奖励模型与 RL 循环，用偏好直接优化策略。

#### Q20：PPO 中 KL 惩罚目的？

**A：** 限制偏离参考策略，减轻 reward hacking 与模式崩塌。

#### Q21：INT4 量化主要风险？

**A：** 精度损失；需分组缩放、混合精度或算法(GPTQ/AWQ)缓解。

#### Q22：GPTQ 大致做什么？

**A：** 训练后量化权重，按层/块最小化误差，常用 Hessian 近似。

#### Q23：张量并行与流水线并行区别？

**A：** TP 切分单层张量；PP 切分不同层到不同设备。

#### Q24：PagedAttention 解决什么？

**A：** KV Cache 变长导致的浪费与碎片化，提高批处理效率。

#### Q25：投机解码如何加速？

**A：** 小模型提议多 token，大模型并行验证，减少串行步数。

#### Q26：MoE 训练难点？

**A：** 负载均衡、通信、路由稳定性；避免专家坍塌。

#### Q27：开源模型相对闭源 API 的核心优势场景？

**A：** 数据不出域、可深度定制、长期成本可控（有算力前提）。

#### Q28：GRPO / KTO 你了解到什么程度？

**A：** 诚实答：GRPO 强调组内相对优化、可与特定 RL 基础设施配合；KTO 用二元反馈与前景式
损失；细节以论文与最新报告为准，面试可说明「用于改进 RLHF 复杂管线或数据形态」。

## 附录：速查公式与术语

| 符号/术语 | 含义 |
| --- | --- |
| `(d_{model})` | 模型隐藏维度 |
| `(d_k)` | 每头 Key/Query 维度 |
| `KV Cache` | 缓存每步 K、V 以加速自回归 |
| `PEFT` | 参数高效微调总称（LoRA、Adapter 等） |
| `PTQ` | 训练后量化 |
| `TP / PP` | 张量并行 / 流水线并行 |
文档版本：与「面试八股文」系列一致，可按岗位深度补充论文与源码阅读笔记。
## 继续阅读

- 上一篇：[← 多智能体](/interview/bagua/multi-agent/)
- 下一篇：[工程化实践 →](/interview/bagua/engineering-practice/)
- 相关速查：[基础概念速查](/interview/fundamentals/)
- 动手实践：[长上下文实战](/practice/p25-long-context/)

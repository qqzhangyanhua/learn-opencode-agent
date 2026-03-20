---
title: P13：多模态智能体
description: 图像理解与分析 — 让 Agent 看懂截图、图表与文档图片
---

<ProjectCard
  title="你将构建：一个能处理图像输入的多模态 Agent，支持图像分析、多图对比与文字提取"
  difficulty="intermediate"
  duration="45 min"
  :prerequisites="['P1']"
  :tags="['Multimodal', 'Vision', 'TypeScript', 'OpenAI SDK']"
/>

> 开始前先看：[实践环境准备](/practice/setup)。本章对应示例文件已提供在 `practice/` 目录，可直接按命令运行。

## 前置准备

开始本章前，请先确认：

- 已阅读 [实践环境准备](/practice/setup)
- 基础依赖已就绪：`openai`
- 环境变量已配置：`OPENAI_API_KEY`
- 建议先完成前置章节：`P1`
- 本章建议入口命令：`bun run p13-multimodal.ts`
- 示例文件位置：`practice/p13-multimodal.ts`

## 背景与目标

P12 的 Reflection Agent 解决了"如何让模型输出从凑合提升到达标"的问题。但所有前面的章节有一个共同的隐含前提：**输入是纯文本**。

现实中的 Agent 经常需要处理非文本输入。UI 自动化 Agent 需要理解截图；数据分析 Agent 需要解读图表；文档处理 Agent 需要从图片中提取文字。这些任务如果强行转换为文本（比如手动描述图片内容），既低效又丢失信息。

多模态已经成为主流模型能力的一部分。OpenAI 的 Chat Completions API 允许在 `content` 字段中混合传入文本和图像，模型可以直接"看"图像并回答问题。

> 时效说明：本章中提到的模型名称仅作示例。实际可用型号、视觉能力边界与输入限制，请以 OpenAI 官方文档为准：
> <https://platform.openai.com/docs/guides/vision>

**本章目标**：

1. 理解 OpenAI 多模态 API 的 `image_url` content 结构
2. 实现 `MultimodalAgent` 类，支持单图分析、多图对比和 OCR 文字提取
3. 掌握 Base64 编码图像和 URL 图像两种输入方式

## 核心概念

### 多模态 content 结构

OpenAI Chat Completions API 中，消息的 `content` 字段可以是字符串，也可以是 content 数组。每个元素有一个 `type` 字段，文本是 `"text"`，图像是 `"image_url"`。

图像的结构：

```ts
// URL 方式（直接传公开可访问的图片链接）
{
  type: "image_url",
  image_url: {
    url: "https://example.com/image.png"
  }
}

// Base64 方式（适合本地图片或私有图片）
{
  type: "image_url",
  image_url: {
    url: "data:image/png;base64,<base64编码的图像数据>"
  }
}
```

在一条用户消息里，可以同时包含多个图像和文本，顺序随意。模型会按照消息结构理解图文关系。

### 图像格式与限制

OpenAI 支持常见图像格式：

| 格式 | MIME 类型 | 说明 |
|------|-----------|------|
| JPEG | `image/jpeg` | 照片类图像，有损压缩，文件小 |
| PNG | `image/png` | 截图、图表，无损，支持透明 |
| GIF | `image/gif` | 动图（只分析第一帧）|
| WebP | `image/webp` | 现代格式，兼顾质量与体积 |

关键限制：
- **单张图像最大 20 MB**
- **单次请求支持多张图像**
- URL 方式要求图像公开可访问，OpenAI 服务器会在处理时下载图像

### 图像 Token 消耗

图像不像文本按字符计算 Token，而是按**图像尺寸**计算。OpenAI 使用固定策略来编码图像：

- 图像会被缩放到适合模型处理的尺寸
- 一张高分辨率图像可能消耗数百到上千 Token
- 缩小图像尺寸可以显著降低 Token 消耗，同时对多数分析任务影响不大

实际使用建议：对于 OCR 或 UI 分析，将图像缩放到 1280px 以内通常已经足够，可以减少 30%-50% 的 Token 消耗。

### 混合 content 数组的消息结构

向模型传递图像时，最常见的消息结构是把图像放在文本问题之前：

```ts
messages: [
  {
    role: "user",
    content: [
      { type: "image_url", image_url: { url: "data:image/png;base64,..." } },
      { type: "text", text: "这张图里有什么内容？" }
    ]
  }
]
```

多图对比时，按顺序排列多个图像 block，再在末尾加上问题文本。模型会按照从左到右、从上到下的顺序处理 content 数组。

## 动手实现

<RunCommand command="bun run p13-multimodal.ts" :verified="true" />

### 运行与验证

- 先按前置准备完成依赖和环境变量配置
- 执行上面的推荐入口命令
- 将输出与下文的“运行结果”或章节描述对照，确认主链路已经跑通
- 如果遇到命令、依赖、环境变量或样例输入问题，先回到 [实践环境准备](/practice/setup) 排查



### 第一步：类型定义

```ts
// p13-multimodal.ts
import OpenAI from 'openai'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

// 支持的图像 MIME 类型
type SupportedImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

// 图像来源的联合类型：Base64 或 URL 两种方式
type ImageSource =
  | { type: 'base64'; mediaType: SupportedImageMediaType; data: string }
  | { type: 'url'; url: string }

// 将 ImageSource 转换为 OpenAI SDK 需要的 image_url content part
function toImageContent(
  source: ImageSource,
): OpenAI.ChatCompletionContentPartImage {
  if (source.type === 'url') {
    return {
      type: 'image_url',
      image_url: {
        url: source.url,
      },
    }
  }

  return {
    type: 'image_url',
    image_url: {
      url: `data:${source.mediaType};base64,${source.data}`,
    },
  }
}
```

### 第二步：加载本地图像

```ts
// 读取本地文件并转换为 Base64 格式的 ImageSource
async function loadImageAsBase64(filePath: string): Promise<ImageSource> {
  const absolutePath = path.resolve(filePath)
  const buffer = await fs.promises.readFile(absolutePath)
  const data = buffer.toString('base64')

  // 根据扩展名推断 MIME 类型
  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, SupportedImageMediaType> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }

  return {
    type: 'base64',
    mediaType: mimeMap[ext] ?? 'image/png',
    data,
  }
}
```

### 第三步：MultimodalAgent 类

```ts
class MultimodalAgent {
  constructor(private readonly model = 'gpt-4o') {}

  // 单图分析：传入图像和问题，返回模型回答
  async analyzeImage(imageSource: ImageSource, question: string): Promise<string> {
    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [toImageContent(imageSource), { type: 'text', text: question }],
        },
      ],
    })

    return response.choices[0].message.content ?? ''
  }

  // 多图对比：传入图像数组和问题，适合 A/B 对比或序列分析
  async compareImages(images: ImageSource[], question: string): Promise<string> {
    if (images.length === 0) {
      throw new Error('compareImages 需要至少一张图像')
    }

    // 构造 content 数组：所有图像 block + 问题文本
    const content: OpenAI.ChatCompletionContentPart[] = [
      ...images.map((image) => toImageContent(image)),
      { type: 'text', text: question },
    ]

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content }],
    })

    return response.choices[0].message.content ?? ''
  }

  // OCR 文字提取：专注于从图像中提取可见文字
  async extractTextFromImage(imageSource: ImageSource): Promise<string> {
    const prompt = `请提取这张图片中所有可见的文字内容。
要求：
- 按原始布局顺序输出，保持段落结构
- 如果有标题或分级结构，用换行体现层级
- 只输出图片中实际存在的文字，不要添加任何解释或说明
- 如果图片中没有文字，输出"（未检测到文字内容）"`

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [toImageContent(imageSource), { type: 'text', text: prompt }],
        },
      ],
    })

    return response.choices[0].message.content ?? ''
  }
}
```

### 第四步：构造演示用图像并运行

实际使用时，将 `loadImageAsBase64('截图.png')` 替换为真实图片路径。
演示时使用内嵌的最小 Base64 PNG（1×1 像素白色 PNG，用于验证 API 流程）：

```ts
// 最小的有效 PNG：1×1 像素，白色背景
// 真实使用时替换为：const imageSource = await loadImageAsBase64('./your-screenshot.png')
const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg=='

async function main(): Promise<void> {
  const agent = new MultimodalAgent()

  // 预留本地图像入口，方便读者直接替换真实截图。
  const loadLocalImage = async (filePath: string): Promise<ImageSource | null> => {
    try {
      return await loadImageAsBase64(filePath)
    } catch {
      return null
    }
  }

  const localImage = await loadLocalImage('./demo-ui.png')
  const demoImageSource: ImageSource =
    localImage ?? {
      type: 'base64',
      mediaType: 'image/png',
      data: MINIMAL_PNG_BASE64,
    }

  // 演示 1：单图分析
  console.log('='.repeat(60))
  console.log('[演示 1] 分析图像内容')
  console.log('='.repeat(60))
  console.log('问题: 这张图片里有什么内容？请详细描述。')
  const analysis = await agent.analyzeImage(demoImageSource, '这张图片里有什么内容？请详细描述。')
  console.log(`Agent: ${analysis}`)
  console.log()

  // 演示 2：OCR 文字提取
  console.log('='.repeat(60))
  console.log('[演示 2] 提取图像中的文字')
  console.log('='.repeat(60))
  const ocrResult = await agent.extractTextFromImage(demoImageSource)
  console.log(`提取结果: ${ocrResult}`)
  console.log()

  // 演示 3：多图对比
  console.log('='.repeat(60))
  console.log('[演示 3] 多图对比分析')
  console.log('='.repeat(60))
  console.log('传入两张图像，进行对比分析...')
  const comparisonResult = await agent.compareImages(
    [demoImageSource, demoImageSource],
    '对比这两张图像，找出它们之间的差异，如果完全相同请说明。',
  )
  console.log(`对比结果: ${comparisonResult}`)
  console.log()

  // 演示 4：URL 图像（公开图片）
  console.log('='.repeat(60))
  console.log('[演示 4] 使用 URL 方式传入图像')
  console.log('='.repeat(60))

  const urlImageSource: ImageSource = {
    type: 'url',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
  }

  const urlAnalysis = await agent.analyzeImage(
    urlImageSource,
    '这张图片展示了什么？请用两句话描述。',
  )
  console.log(`Agent: ${urlAnalysis}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

### 运行结果

```
============================================================
[演示 1] 分析图像内容
============================================================
问题: 这张图片里有什么内容？请详细描述。
Agent: 这是一张极小的单像素白色图片，没有实质性的视觉内容。图像尺寸为 1×1 像素，
显示为纯白色背景，不包含任何文字、图标或可识别的视觉元素。

============================================================
[演示 2] 提取图像中的文字
============================================================
提取结果: （未检测到文字内容）

============================================================
[演示 3] 多图对比分析
============================================================
传入两张图像，进行对比分析...
对比结果: 这两张图像完全相同，均为 1×1 像素的白色 PNG 图片，没有任何可见差异。

============================================================
[演示 4] 使用 URL 方式传入图像
============================================================
Agent: 这张图片展示了 PNG 格式的透明度特性演示，图像中的骰子在透明背景上呈现出
半透明效果，直观展示了 Alpha 通道的工作方式。
```

## 关键点梳理

| 概念 | 说明 |
|------|------|
| `ChatCompletionContentPartImage` | OpenAI SDK 的图像 content part 类型，使用 `image_url` 格式传递图像 |
| `ImageSource` 联合类型 | 自定义类型抽象了两种来源，`toImageContent` 负责转换为 SDK 所需格式 |
| `ChatCompletionContentPart[]` | 混合 content 数组，允许在同一条消息中交叉排列图像和文本 |
| Base64 编码 | 本地图像用 `fs.readFile` 读取为 Buffer，再 `toString('base64')` 转换 |
| MIME 类型推断 | 根据文件扩展名映射 MIME 类型，Base64 图像需要在 data URI 中包含正确的 MIME 前缀 |
| 多图对比结构 | 将所有图像 block 放在 content 数组前段，问题文本放最后 |
| OCR 专用 prompt | 针对文字提取的精确 prompt，约束输出格式避免模型添加无关说明 |
| `toImageContent` 转换函数 | 集中处理 ImageSource 到 `image_url` content part 的映射，避免在业务逻辑中散落类型断言 |

## 常见问题

**Q: 图像 Token 如何计算，会不会很贵？**

图像 Token 的计算方式与文本不同：Claude 将图像切分为固定大小的"瓦片"（tile），每个瓦片约 750 Token。一张 1080×1080 的图像约消耗 1600 Token，相当于 1200 个英文单词的文本量。

控制成本的实用做法：
1. 缩小图像：将截图缩放到 1280px 宽以内，对多数分析任务影响不大，但 Token 可减少 30%-50%
2. 裁剪 ROI（Region of Interest）：如果只需要分析图像的某个区域，先裁剪再传入
3. 批量任务优先选择更便宜的视觉模型：具体型号与价格请以官方模型页、定价页为准，不要直接照抄本文中的示例型号

**Q: OpenAI 支持 PDF 输入吗？**

GPT-4 Vision 主要支持图像输入。对于 PDF 文档，建议先转换为图像再传入，或使用专门的 PDF 解析工具提取文本和图像后再处理。
    data: "<base64编码的PDF>"
  }
}
```

模型会同时理解 PDF 中的文字层和图像内容，对扫描件 PDF 也有一定识别能力。单个 PDF 限制 100 页、32 MB。

**Q: 图像分辨率影响理解质量吗？**

影响存在，但不是线性关系。低分辨率（如 320×240）会让模型难以辨认小字体和细节，但对于理解整体布局、识别大面积色块、区分 UI 元素类型（按钮、输入框、图表）通常没有明显影响。

实际建议：
- OCR 任务（提取文字）：分辨率要求较高，建议保持原始分辨率，或确保文字像素高度不低于 20px
- UI 布局分析：通常 800px 宽已经足够
- 图表数据提取：取决于图表标签的字体大小，标签文字越小越需要高分辨率

一个有效的诊断方式：先用低分辨率测试，如果模型回答不准确，再升级分辨率，而不是默认总传高清图。

## 小结与延伸

你现在有了一个完整的多模态 Agent：

- `ImageSource` 类型统一表示 Base64 和 URL 两种图像来源
- `loadImageAsBase64` 处理本地文件到 Base64 的转换
- `MultimodalAgent` 提供 `analyzeImage`、`compareImages`、`extractTextFromImage` 三个方法
- `toImageContent` 负责将 `ImageSource` 转换为 OpenAI SDK 的 `image_url` content part

多模态能力让 Agent 突破了纯文本的输入边界。结合前面章节的工具调用（P10 ReAct）和记忆系统（P5-P6），可以构建出真正实用的 Agent：读取截图后调用工具执行操作，分析文档图片后写入数据库，理解图表后生成报告。

接下来可以探索的方向：

- **P14 MCP**：通过 MCP 协议让 Agent 调用外部工具，例如把图像分析结果传给数据库写入工具
- **P15 多 Agent**：一个 Agent 专门负责图像理解，将结果以结构化数据传给下游处理 Agent
- **P21 Evaluation**：为图像分析任务构建自动化评测流水线，测量 OCR 准确率和分析质量

<StarCTA />

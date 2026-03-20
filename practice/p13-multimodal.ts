import OpenAI from 'openai'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

type SupportedImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

type ImageSource =
  | { type: 'base64'; mediaType: SupportedImageMediaType; data: string }
  | { type: 'url'; url: string }

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

async function loadImageAsBase64(filePath: string): Promise<ImageSource> {
  const absolutePath = path.resolve(filePath)
  const buffer = await fs.readFile(absolutePath)
  const data = buffer.toString('base64')

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

class MultimodalAgent {
  constructor(private readonly model = 'gpt-4o') {}

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

  async compareImages(images: ImageSource[], question: string): Promise<string> {
    if (images.length === 0) {
      throw new Error('compareImages 需要至少一张图像')
    }

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

  console.log('='.repeat(60))
  console.log('[演示 1] 分析图像内容')
  console.log('='.repeat(60))
  console.log('问题: 这张图片里有什么内容？请详细描述。')
  const analysis = await agent.analyzeImage(demoImageSource, '这张图片里有什么内容？请详细描述。')
  console.log(`Agent: ${analysis}`)
  console.log()

  console.log('='.repeat(60))
  console.log('[演示 2] 提取图像中的文字')
  console.log('='.repeat(60))
  const ocrResult = await agent.extractTextFromImage(demoImageSource)
  console.log(`提取结果: ${ocrResult}`)
  console.log()

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

import type {
  PracticePlaygroundChapter,
  PracticePlaygroundTemplate,
  PracticeTemplateMessage,
  PracticeTemplateNonToolRole,
  PracticeTemplateTool,
} from './practicePlaygroundTypes'

function createMessage(
  id: string,
  role: PracticeTemplateNonToolRole,
  content: string,
): PracticeTemplateMessage {
  return {
    id,
    role,
    content,
  }
}

function createTool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
): PracticeTemplateTool {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters,
    },
    locked: {
      name: true,
    },
  }
}

function createTemplateBase(chapter: PracticePlaygroundChapter): PracticePlaygroundTemplate {
  return {
    system: '',
    messages: [],
    tools: [],
    requestOptions: {},
    meta: {
      chapterId: chapter.id,
      templateVersion: 1,
      runner: chapter.runner,
      title: chapter.playground.title,
      description: chapter.playground.description,
    },
  }
}

function createP1Template(chapter: PracticePlaygroundChapter): PracticePlaygroundTemplate {
  return {
    ...createTemplateBase(chapter),
    messages: [
      createMessage('msg-user-1', 'user', '北京今天天气怎么样？适合出去跑步吗？'),
    ],
    tools: [
      createTool('get_weather', '查询指定城市的当前天气', {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称，如“北京”“上海”',
          },
        },
        required: ['city'],
      }),
    ],
    requestOptions: {
      toolChoice: 'auto',
    },
  }
}

function createP2Template(chapter: PracticePlaygroundChapter): PracticePlaygroundTemplate {
  return {
    ...createTemplateBase(chapter),
    system: '你是一名简洁的编程助手，回答控制在 120 字以内，并保留口语化解释。',
    messages: [
      createMessage('msg-user-1', 'user', '用 TypeScript 写一个计算数组平均值的函数。'),
      createMessage(
        'msg-assistant-1',
        'assistant',
        '可以先用 reduce 把数字累加，再除以数组长度；如果数组为空，最好显式返回 null 或抛出错误，避免除以 0。',
      ),
      createMessage(
        'msg-user-2',
        'user',
        '现在改成支持忽略 undefined 值，并继续保持口语化解释。',
      ),
      createMessage(
        'msg-assistant-2',
        'assistant',
        '可以先过滤掉 undefined，再做累加。这样调用方就不用先手动清洗数组，函数本身更稳一点。',
      ),
      createMessage(
        'msg-user-3',
        'user',
        '把刚才的平均值函数改成支持加权平均，并保留口语化解释风格。',
      ),
    ],
  }
}

function createP3Template(chapter: PracticePlaygroundChapter): PracticePlaygroundTemplate {
  return {
    ...createTemplateBase(chapter),
    system: '请分三段短文回答，每段聚焦一个核心点，适合直接展示在交互式界面中。',
    messages: [
      createMessage('msg-user-1', 'user', '请分段解释为什么流式输出更适合交互式界面。'),
    ],
    requestOptions: {
      stream: true,
    },
  }
}

function createP10Template(chapter: PracticePlaygroundChapter): PracticePlaygroundTemplate {
  return {
    ...createTemplateBase(chapter),
    system:
      '你是一名教学型 ReAct 助手。请把推理过程组织成清晰的步骤，并在需要时调用工具获得信息。',
    messages: [
      createMessage('msg-user-1', 'user', '北京和上海今天哪个城市更适合户外跑步？请说明依据。'),
    ],
    tools: [
      createTool('get_weather', '查询指定城市的当前天气', {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称，如“北京”“上海”',
          },
        },
        required: ['city'],
      }),
      createTool('search_web', '搜索与问题相关的公开信息', {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词，用于补充常识或背景信息',
          },
        },
        required: ['query'],
      }),
      createTool('calculate', '计算简单数学表达式', {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '需要计算的数学表达式，例如 (22 - 18) * 2',
          },
        },
        required: ['expression'],
      }),
    ],
    requestOptions: {
      toolChoice: 'auto',
    },
  }
}

function createP18Template(chapter: PracticePlaygroundChapter): PracticePlaygroundTemplate {
  return {
    ...createTemplateBase(chapter),
    system:
      '你是一名成本感知型助手。回答前先考虑问题复杂度、所需推理深度和成本，再用简洁结构给出建议。',
    messages: [
      createMessage(
        'msg-user-1',
        'user',
        '请比较 ReAct 和普通工具调用在可观测性、实现复杂度、成本上的差异，并给出落地建议。',
      ),
    ],
    requestOptions: {
      temperature: 0.2,
    },
  }
}

export function createPracticePlaygroundTemplate(
  chapter: PracticePlaygroundChapter,
): PracticePlaygroundTemplate {
  switch (chapter.id) {
    case 'p01-minimal-agent':
      return createP1Template(chapter)
    case 'p02-multi-turn':
      return createP2Template(chapter)
    case 'p03-streaming':
      return createP3Template(chapter)
    case 'p10-react-loop':
      return createP10Template(chapter)
    case 'p18-model-routing':
      return createP18Template(chapter)
    default:
      return createTemplateBase(chapter)
  }
}

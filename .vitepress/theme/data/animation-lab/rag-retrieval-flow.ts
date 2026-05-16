import type { Experiment, FlowCanvasConfig } from '../../components/animation-lab/type'

export const ragRetrievalFlowCanvas: FlowCanvasConfig = {
  ariaLabel: 'RAG 检索增强流程路径',
  accent: 'teal',
  motion: 'memory',
  nodes: [
    { id: 'question', label: 'Question', role: '问题', x: 18, y: 48, mobileX: 20, mobileY: 15 },
    { id: 'rewrite', label: 'Query Rewrite', role: '改写', x: 44, y: 26, mobileX: 50, mobileY: 25 },
    { id: 'retriever', label: 'Retriever', role: '检索器', x: 70, y: 18, mobileX: 78, mobileY: 35 },
    { id: 'reranker', label: 'Reranker', role: '重排', x: 78, y: 42, mobileX: 58, mobileY: 50 },
    { id: 'evidence', label: 'Evidence', role: '证据', x: 68, y: 70, mobileX: 28, mobileY: 65 },
    { id: 'answer', label: 'Answer', role: '答案', x: 42, y: 78, mobileX: 52, mobileY: 88 },
  ],
  paths: [
    { id: 'question-rewrite', from: 'question', to: 'rewrite', d: 'M180 269 C250 205 360 145 440 146' },
    { id: 'rewrite-retriever', from: 'rewrite', to: 'retriever', d: 'M450 142 C540 102 640 92 700 101' },
    { id: 'retriever-reranker', from: 'retriever', to: 'reranker', d: 'M705 110 C740 165 770 205 780 235' },
    { id: 'reranker-evidence', from: 'reranker', to: 'evidence', d: 'M775 244 C770 325 730 370 680 392' },
    { id: 'evidence-answer', from: 'evidence', to: 'answer', d: 'M670 398 C595 450 500 455 420 437' },
  ],
}

export const ragRetrievalFlowExperiment: Experiment = {
  id: 'rag-retrieval-flow',
  title: 'RAG 检索增强流程',
  summary: '展示问题如何经过改写、检索、重排、证据注入和带引用生成，避免模型只凭记忆回答。',
  kind: 'rag-retrieval-flow',
  steps: [
    {
      id: 'question-intake',
      title: 'Question Intake',
      description: '用户问题进入系统，先提取检索意图和需要补齐的信息缺口。',
      activeNodes: ['question', 'rewrite'],
      activePaths: ['question-rewrite'],
      packet: { from: 'question', to: 'rewrite', label: 'ask' },
      traceEvents: [
        { id: 'question-captured', type: 'input', title: '接收问题', detail: '接收原始问题，提取目标实体，定位需要从知识库补齐的证据缺口。', status: 'active' },
      ],
    },
    {
      id: 'query-rewrite',
      title: 'Query Rewrite',
      description: '系统把自然语言问题改写成更适合检索的查询，降低召回噪声。',
      activeNodes: ['rewrite', 'retriever'],
      activePaths: ['rewrite-retriever'],
      packet: { from: 'rewrite', to: 'retriever', label: 'query' },
      traceEvents: [
        { id: 'query-rewritten', type: 'thinking', title: '改写查询', detail: '推断检索意图，提取关键词和过滤条件，生成比原始问题更适合向量检索的查询表达。', status: 'active' },
      ],
    },
    {
      id: 'retrieve-candidates',
      title: 'Retrieve Candidates',
      description: '检索器从知识库召回候选片段，先扩大覆盖面，再交给重排层筛选。',
      activeNodes: ['retriever', 'reranker'],
      activePaths: ['retriever-reranker'],
      packet: { from: 'retriever', to: 'reranker', label: 'docs' },
      traceEvents: [
        { id: 'candidates-returned', type: 'observation', title: '召回候选', detail: '检索器返回命中文档和片段，附带初始相关度评分，移交重排层进一步筛选。', status: 'active' },
      ],
    },
    {
      id: 'rerank-evidence',
      title: 'Rerank Evidence',
      description: '重排层按相关度和可信度筛选证据，只把可支撑答案的片段留下。',
      activeNodes: ['reranker', 'evidence'],
      activePaths: ['reranker-evidence'],
      packet: { from: 'reranker', to: 'evidence', label: 'top' },
      traceEvents: [
        { id: 'evidence-ranked', type: 'repair', title: '筛选证据', detail: '按相关度和可信度重排证据，保留高质量片段，过滤低质命中，缩短注入长度。', status: 'active' },
      ],
    },
    {
      id: 'generate-with-citations',
      title: 'Generate With Citations',
      description: '模型基于证据生成答案，并保留引用来源，避免只凭内部记忆回答。',
      activeNodes: ['evidence', 'answer'],
      activePaths: ['evidence-answer'],
      packet: { from: 'evidence', to: 'answer', label: 'cite' },
      traceEvents: [
        { id: 'answer-cited', type: 'output', title: '带引用生成', detail: '基于证据生成答案，标注引用来源，明确未被知识库覆盖的回答边界。', status: 'active' },
      ],
    },
  ],
}

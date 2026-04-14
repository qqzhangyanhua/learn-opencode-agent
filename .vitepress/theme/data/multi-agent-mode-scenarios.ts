import type { MultiAgentModeScenario } from '../components/types'

export const multiAgentModeScenarios: MultiAgentModeScenario[] = [
  {
    id: 'orchestrator',
    label: '主从模式',
    summary: '一个协调者负责拆任务、派任务、收结果，多个执行者只处理局部问题。',
    agents: [
      {
        id: 'orchestrator',
        name: 'Orchestrator',
        role: '总协调',
        summary: '负责拆分任务、分派执行者，并在末尾做汇总判断。'
      },
      {
        id: 'researcher',
        name: 'Researcher',
        role: '调研',
        summary: '补资料、查风险，只处理信息收集部分。'
      },
      {
        id: 'writer',
        name: 'Writer',
        role: '写作',
        summary: '把调研结果整理成结构化初稿。'
      },
      {
        id: 'reviewer',
        name: 'Reviewer',
        role: '审查',
        summary: '检查逻辑、遗漏和质量边界。'
      }
    ],
    stages: [
      {
        id: 'orchestrator-intake',
        label: '任务进入',
        headline: '协调者先判断任务是否值得拆分，而不是一开始就广播给所有 Agent。',
        insight: '主从模式的关键收益是让全局判断和局部执行分离，避免每个执行者都背全局上下文。',
        risk: '如果协调者一开始就拆错，后续每个 Worker 都会沿着错误方向推进。',
        events: [
          {
            id: 'orc-1',
            from: '用户',
            to: 'Orchestrator',
            type: 'task',
            content: '重构认证模块，并补齐接口、实现和测试。'
          },
          {
            id: 'orc-2',
            from: 'Orchestrator',
            type: 'decision',
            content: '判断任务适合拆成接口定义、核心实现、质量审查三段。'
          }
        ]
      },
      {
        id: 'orchestrator-split',
        label: '拆分分派',
        headline: '协调者把全局目标拆成子任务，再定向派给最合适的执行者。',
        insight: '这里的重点不是并行，而是让每个执行者只拿到自己真正需要的输入。',
        risk: '拆分过粗会让 Worker 再次承担全局复杂度，拆分过细又会让协调成本暴涨。',
        events: [
          {
            id: 'orc-3',
            from: 'Orchestrator',
            to: 'Researcher',
            type: 'task',
            content: '先列出认证模块当前依赖和已知风险。'
          },
          {
            id: 'orc-4',
            from: 'Orchestrator',
            to: 'Writer',
            type: 'task',
            content: '根据风险清单，起草接口与职责边界。'
          },
          {
            id: 'orc-5',
            from: 'Orchestrator',
            to: 'Reviewer',
            type: 'task',
            content: '准备在实现完成后做契约和测试审查。'
          }
        ]
      },
      {
        id: 'orchestrator-execute',
        label: '子任务执行',
        headline: '执行者在自己的局部上下文里推进，不需要理解整条链路的所有细节。',
        insight: '这能显著降低单个 Agent 的 prompt 压力，也更便于单独替换角色或模型。',
        risk: '如果执行者之间的输入输出契约没写清，结果很容易无法汇合。 ',
        events: [
          {
            id: 'orc-6',
            from: 'Researcher',
            to: 'Orchestrator',
            type: 'result',
            content: '整理出 3 个依赖点：Token 刷新、Session 持久化、权限校验。'
          },
          {
            id: 'orc-7',
            from: 'Writer',
            to: 'Orchestrator',
            type: 'artifact',
            content: '提交接口初稿：AuthService + RefreshToken 契约。'
          },
          {
            id: 'orc-8',
            from: 'Reviewer',
            to: 'Orchestrator',
            type: 'result',
            content: '指出接口缺少登出后的 session 失效约束。'
          }
        ]
      },
      {
        id: 'orchestrator-review',
        label: '汇总审查',
        headline: '主从模式最后一定要有回收与裁决环节，否则只是把混乱分散给更多 Agent。',
        insight: '协调者负责汇总结果、识别冲突并决定是否继续派发下一轮任务。',
        risk: '如果没有统一回流口，系统会出现多个局部正确但整体冲突的结果。 ',
        events: [
          {
            id: 'orc-9',
            from: 'Orchestrator',
            type: 'decision',
            content: '合并调研、实现和审查结果，决定补充 session 失效逻辑。'
          },
          {
            id: 'orc-10',
            from: 'Orchestrator',
            to: '用户',
            type: 'result',
            content: '输出最终方案：接口、实现和测试建议形成闭环。'
          }
        ]
      }
    ]
  },
  {
    id: 'debate',
    label: '辩论模式',
    summary: '让正反双方强制提出不同立场，再由裁判收束，减少单一叙事偏差。',
    agents: [
      {
        id: 'pro',
        name: 'Pro',
        role: '正方',
        summary: '支持当前方案，强调收益和可行性。'
      },
      {
        id: 'con',
        name: 'Con',
        role: '反方',
        summary: '质疑当前方案，强调代价和风险。'
      },
      {
        id: 'judge',
        name: 'Judge',
        role: '裁判',
        summary: '总结正反论点，给出更平衡的判断。'
      }
    ],
    stages: [
      {
        id: 'debate-topic',
        label: '议题提出',
        headline: '辩论模式先把争议点钉清楚，而不是让双方空泛地各说各话。',
        insight: '当问题本质上是“做不做、先不先、值不值”时，辩论模式比执行拆分更合适。',
        risk: '如果议题定义太宽，双方会围着不同问题争论，最后没有可执行结论。',
        events: [
          {
            id: 'deb-1',
            from: '用户',
            to: 'Judge',
            type: 'task',
            content: '当前版本是否该优先上多 Agent 编排？'
          },
          {
            id: 'deb-2',
            from: 'Judge',
            type: 'decision',
            content: '确定辩题：收益是否足以覆盖复杂度和成本。'
          }
        ]
      },
      {
        id: 'debate-argue',
        label: '正反陈述',
        headline: '正反双方必须站在对立立场表述观点，才能逼出被忽略的假设。',
        insight: '这一步的价值是制造可对照的证据，而不是追求“吵得更热闹”。',
        risk: '如果两边都沿着相同前提展开，系统只是在重复同一种偏见。',
        events: [
          {
            id: 'deb-3',
            from: 'Pro',
            to: 'Judge',
            type: 'debate',
            content: '支持：多 Agent 能拆 prompt、降角色漂移，还能把审查和执行分开。'
          },
          {
            id: 'deb-4',
            from: 'Con',
            to: 'Judge',
            type: 'debate',
            content: '反对：当前任务规模太小，先上多 Agent 会增加协调和调试成本。'
          }
        ]
      },
      {
        id: 'debate-cross',
        label: '交叉质询',
        headline: '真正关键的是让双方回应彼此，而不是各自单向输出。',
        insight: '交叉质询能暴露论点背后的前提条件，帮助你判断哪个立场更贴近当前场景。',
        risk: '如果没有明确约束轮次和范围，辩论很容易变成长上下文噪声。 ',
        events: [
          {
            id: 'deb-5',
            from: 'Pro',
            to: 'Con',
            type: 'debate',
            content: '反问：如果单 Agent 已经明显角色串味，为什么还坚持不拆？'
          },
          {
            id: 'deb-6',
            from: 'Con',
            to: 'Pro',
            type: 'debate',
            content: '追问：如果没有稳定任务边界，拆成多个 Agent 只会放大协调难度。'
          }
        ]
      },
      {
        id: 'debate-verdict',
        label: '裁判收束',
        headline: '辩论模式必须收束成判断，不然只是把不确定性讲得更复杂。',
        insight: '裁判负责提炼“什么时候该用、什么时候不该用”的边界，而不是简单判输赢。',
        risk: '如果裁判只是复述双方观点，没有形成条件化结论，读者还是无法决策。 ',
        events: [
          {
            id: 'deb-7',
            from: 'Judge',
            type: 'decision',
            content: '结论：当任务已有清晰角色边界时，可以引入多 Agent；否则先把单体流程理顺。'
          },
          {
            id: 'deb-8',
            from: 'Judge',
            to: '用户',
            type: 'result',
            content: '给出条件化建议：不是“要不要”，而是“在什么条件下值得上”。'
          }
        ]
      }
    ]
  },
  {
    id: 'pipeline',
    label: '流水线模式',
    summary: '每个阶段只处理上游交给它的输入，适合顺序明确、可追踪的加工链。',
    agents: [
      {
        id: 'collector',
        name: 'Collector',
        role: '输入整理',
        summary: '把原始需求整理成更可处理的输入。'
      },
      {
        id: 'designer',
        name: 'Designer',
        role: '方案设计',
        summary: '基于上游输入产出结构化方案。'
      },
      {
        id: 'estimator',
        name: 'Estimator',
        role: '评估',
        summary: '对方案做成本、工期或风险估算。'
      },
      {
        id: 'publisher',
        name: 'Publisher',
        role: '输出整理',
        summary: '把加工结果整理成最终可交付内容。'
      }
    ],
    stages: [
      {
        id: 'pipeline-input',
        label: '初始输入',
        headline: '流水线模式最适合先后依赖很强的任务，因为输入会一级一级传下去。',
        insight: '用户只需要理解当前输入会如何被下一段消费，不必一次看完整条链路的所有细节。',
        risk: '如果第一段输入就模糊，后面每一段都会在错误基础上继续加工。',
        events: [
          {
            id: 'pipe-1',
            from: '用户',
            to: 'Collector',
            type: 'task',
            content: '把“做一个代码评审 Agent”整理成可以进入设计阶段的输入。'
          },
          {
            id: 'pipe-2',
            from: 'Collector',
            to: 'Designer',
            type: 'artifact',
            content: '输出结构化需求：输入 diff、产出 findings、支持 severity 排序。'
          }
        ]
      },
      {
        id: 'pipeline-design',
        label: '第一段加工',
        headline: '上游产物进入下一段后，会被重写成更接近目标输出的中间表示。',
        insight: '流水线的好处是每一段输入输出都很清晰，便于单独测试和替换。',
        risk: '如果中间产物格式不稳定，下游阶段会频繁因为契约变化而失效。 ',
        events: [
          {
            id: 'pipe-3',
            from: 'Designer',
            to: 'Estimator',
            type: 'artifact',
            content: '产出设计稿：解析 diff -> 生成 findings -> 汇总 report。'
          },
          {
            id: 'pipe-4',
            from: 'Estimator',
            type: 'result',
            content: '识别出高风险点：规则库维护成本和误报控制。'
          }
        ]
      },
      {
        id: 'pipeline-evaluate',
        label: '第二段加工',
        headline: '中游阶段负责把“看起来可做”变成“代价是否可接受”的判断。',
        insight: '这一步强调的是顺序依赖，前一段错了，后一段只会把错放大得更系统。 ',
        risk: '如果你误把强依赖任务并行化，会得到更多互不兼容的中间结果。 ',
        events: [
          {
            id: 'pipe-5',
            from: 'Estimator',
            to: 'Publisher',
            type: 'artifact',
            content: '补充成本和风险结论，形成可交付摘要。'
          },
          {
            id: 'pipe-6',
            from: 'Publisher',
            type: 'decision',
            content: '判断当前方案适合先做 MVP，再逐步补齐高级规则。'
          }
        ]
      },
      {
        id: 'pipeline-output',
        label: '最终输出',
        headline: '流水线最后输出的是经过层层加工的结果，而不是中途任一阶段的半成品。',
        insight: '它适合加工链清晰的任务，因为你可以明确知道每段在最终结果里贡献了什么。',
        risk: '如果末尾没有回看前序假设，系统可能把一个结构清晰但方向错误的结果交付出去。 ',
        events: [
          {
            id: 'pipe-7',
            from: 'Publisher',
            to: '用户',
            type: 'result',
            content: '交付最终摘要：需求、设计、成本和风险已经串成一条线。'
          },
          {
            id: 'pipe-8',
            from: '用户',
            type: 'decision',
            content: '可以顺着这条链继续细化，也可以回到上游重新修正输入。'
          }
        ]
      }
    ]
  }
]

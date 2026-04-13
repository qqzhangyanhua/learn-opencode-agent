import type {
  PlanningScenario,
  PlanningStepState,
  PlanningTreeNodeSnapshot
} from '../components/types'

interface PlanningChoiceMeta {
  granularity?: '粗粒度' | '中粒度' | '细粒度'
  didReplan?: boolean
}

type PlanningBranchingStep = PlanningStepState & {
  treeByChoice?: Partial<Record<string, PlanningTreeNodeSnapshot[]>>
  feedbackByChoice?: Partial<Record<string, string>>
  choiceMeta?: Partial<Record<string, PlanningChoiceMeta>>
}

type PlanningScenarioWithBranching = Omit<PlanningScenario, 'screens'> & {
  screens: PlanningBranchingStep[]
}

export const planningSimulatorScenario: PlanningScenarioWithBranching = {
  missionTitle: '打造支持上传、搜索和权限控制的文档助手',
  missionDescription:
    '在一个团队内部快速落地一个文档助手，支撑文件上传、智能搜索、访问权限与审计，并可持续迭代。',
  screens: [
    {
      screen: 1,
      stage: 'goal',
      title: '确定文档助手愿景',
      prompt: '你希望这个文档助手先解决哪个核心目标？',
      hint: '每种目标都会影响后续任务树的主干',
      choices: [
        {
          id: 'goal_upload-first',
          label: '以上传体验为中心',
          summary: '先把上传与归档打通，尽快让内容进系统',
          consequenceKey: 'upload-focus'
        },
        {
          id: 'goal_security-first',
          label: '以搜索与权限为中心',
          summary: '先确保文档可安全检索与权限可追踪',
          consequenceKey: 'security-focus'
        },
        {
          id: 'goal_balance',
          label: '平衡三条能力线',
          summary: '上传、搜索、权限都做最小上线，再逐步强化',
          consequenceKey: 'balanced'
        }
      ],
      feedback: '高层规划先定义价值目标，再进入里程碑拆解。',
      tree: [
        { id: 'mission', label: '文档助手目标', status: 'current' },
        { id: 'upload-track', label: '上传主线', status: 'pending', parentId: 'mission' },
        { id: 'search-track', label: '搜索主线', status: 'pending', parentId: 'mission' },
        { id: 'permission-track', label: '权限主线', status: 'pending', parentId: 'mission' }
      ],
      stageLabel: '目标阶段'
    },
    {
      screen: 2,
      stage: 'outline',
      title: '绘制战略纲要',
      prompt: '你会如何安排第一轮里程碑？',
      hint: '里程碑排序决定依赖暴露的时间',
      choices: [
        {
          id: 'outline_upload-first',
          label: '先打通上传链路',
          summary: '上传 UI、校验、归档 API 优先',
          consequenceKey: 'outline-upload'
        },
        {
          id: 'outline_search-track',
          label: '先强化检索路径',
          summary: '优先建立索引与搜索体验',
          consequenceKey: 'outline-search'
        },
        {
          id: 'outline_parallel',
          label: '三线并行推进',
          summary: '每条主线做最小可交付，依赖同步对齐',
          consequenceKey: 'outline-parallel'
        }
      ],
      feedback: '战略纲要强调主线顺序，不是细任务清单。',
      feedbackByChoice: {
        'goal_upload-first': '你把上传设为北极星，因此纲要先确保内容稳定入库。',
        'goal_security-first': '你先保安全检索，纲要优先权限边界与可追溯。',
        goal_balance: '你选择平衡策略，纲要需要三线并行但控制任务粒度。'
      },
      tree: [
        { id: 'mission', label: '文档助手目标', status: 'completed' },
        { id: 'milestone-1', label: '里程碑 1', status: 'current', parentId: 'mission' },
        { id: 'milestone-2', label: '里程碑 2', status: 'pending', parentId: 'mission' },
        { id: 'milestone-3', label: '里程碑 3', status: 'pending', parentId: 'mission' }
      ],
      treeByChoice: {
        'goal_upload-first': [
          { id: 'mission', label: '文档助手目标', status: 'completed' },
          { id: 'milestone-1', label: '上传链路先行', status: 'current', parentId: 'mission' },
          { id: 'milestone-2', label: '搜索体验补齐', status: 'pending', parentId: 'mission' },
          { id: 'milestone-3', label: '权限与审计落地', status: 'pending', parentId: 'mission' }
        ],
        'goal_security-first': [
          { id: 'mission', label: '文档助手目标', status: 'completed' },
          { id: 'milestone-1', label: '权限边界先行', status: 'current', parentId: 'mission' },
          { id: 'milestone-2', label: '检索体验打磨', status: 'pending', parentId: 'mission' },
          { id: 'milestone-3', label: '上传链路补齐', status: 'pending', parentId: 'mission' }
        ],
        goal_balance: [
          { id: 'mission', label: '文档助手目标', status: 'completed' },
          { id: 'milestone-1', label: '上传/搜索/权限最小并行', status: 'current', parentId: 'mission' },
          { id: 'milestone-2', label: '索引质量提升', status: 'pending', parentId: 'mission' },
          { id: 'milestone-3', label: '权限审计完善', status: 'pending', parentId: 'mission' }
        ]
      },
      stageLabel: '战略纲要'
    },
    {
      screen: 3,
      stage: 'decompose',
      title: '决定任务拆解粒度',
      prompt: '这轮里程碑你准备拆成多细的任务？',
      hint: '任务粒度会决定执行阶段的切换成本',
      choices: [
        {
          id: 'decompose_coarse',
          label: '粗粒度拆解',
          summary: '每条主线只保留 1-2 个大任务',
          consequenceKey: 'granularity-coarse'
        },
        {
          id: 'decompose_balanced',
          label: '中粒度拆解',
          summary: '每条主线拆成可并行的最小可验收任务',
          consequenceKey: 'granularity-balanced'
        },
        {
          id: 'decompose_fine',
          label: '细粒度拆解',
          summary: '把步骤拆到非常细，确保执行可控',
          consequenceKey: 'granularity-fine'
        }
      ],
      feedback: '任务粒度是 Planning 的关键杠杆，过粗和过细都容易失衡。',
      tree: [
        { id: 'milestone-1', label: '里程碑 1', status: 'completed' },
        { id: 'task-a', label: '上传能力构建', status: 'current', parentId: 'milestone-1' },
        { id: 'task-b', label: '检索能力构建', status: 'pending', parentId: 'milestone-1' },
        { id: 'task-c', label: '权限能力构建', status: 'pending', parentId: 'milestone-1' }
      ],
      treeByChoice: {
        'outline_upload-first': [
          { id: 'milestone-1', label: '上传链路先行', status: 'completed' },
          { id: 'task-a', label: '上传入口 + 校验', status: 'current', parentId: 'milestone-1' },
          { id: 'task-b', label: '归档 API', status: 'pending', parentId: 'milestone-1' },
          { id: 'task-c', label: '上传审计日志', status: 'pending', parentId: 'milestone-1' }
        ],
        'outline_search-track': [
          { id: 'milestone-1', label: '检索路径先行', status: 'completed' },
          { id: 'task-a', label: '索引构建', status: 'current', parentId: 'milestone-1' },
          { id: 'task-b', label: '召回排序', status: 'pending', parentId: 'milestone-1' },
          { id: 'task-c', label: '搜索反馈闭环', status: 'pending', parentId: 'milestone-1' }
        ],
        outline_parallel: [
          { id: 'milestone-1', label: '三线并行最小交付', status: 'completed' },
          { id: 'task-a', label: '上传最小上线', status: 'current', parentId: 'milestone-1' },
          { id: 'task-b', label: '搜索最小上线', status: 'pending', parentId: 'milestone-1' },
          { id: 'task-c', label: '权限最小上线', status: 'pending', parentId: 'milestone-1' }
        ]
      },
      choiceMeta: {
        decompose_coarse: { granularity: '粗粒度' },
        decompose_balanced: { granularity: '中粒度' },
        decompose_fine: { granularity: '细粒度' }
      },
      stageLabel: '任务分解'
    },
    {
      screen: 4,
      stage: 'execute',
      title: '执行首轮任务',
      prompt: '你会先执行哪个子任务来验证路径？',
      hint: '优先选择能最快暴露依赖风险的任务',
      choices: [
        {
          id: 'execute_upload-flow',
          label: '先做上传主链路',
          summary: '把上传 UI + 归档 API 联通',
          consequenceKey: 'execute-upload'
        },
        {
          id: 'execute_search-core',
          label: '先做搜索核心',
          summary: '优先验证索引和检索稳定性',
          consequenceKey: 'execute-search'
        },
        {
          id: 'execute_permission-guard',
          label: '先做权限守卫',
          summary: '优先验证角色策略和访问控制',
          consequenceKey: 'execute-permission'
        }
      ],
      feedback: '执行阶段要快速拿到反馈，验证任务拆解是否可落地。',
      feedbackByChoice: {
        decompose_coarse: '粗粒度下执行切换成本低，但阻塞会扩大影响面。',
        decompose_balanced: '中粒度兼顾推进速度和风险隔离，适合首轮执行。',
        decompose_fine: '细粒度更稳，但协调开销上升，执行节奏容易变慢。'
      },
      tree: [
        { id: 'task-a', label: '上传入口 + 校验', status: 'current' },
        { id: 'task-b', label: '归档 API', status: 'pending', parentId: 'task-a' },
        { id: 'task-c', label: '权限守卫', status: 'pending', parentId: 'task-a' },
        { id: 'task-d', label: '搜索索引', status: 'pending', parentId: 'task-a' }
      ],
      treeByChoice: {
        decompose_coarse: [
          { id: 'coarse-exec', label: '大任务：交付上传与权限', status: 'current' },
          { id: 'coarse-risk', label: '风险：搜索依赖未验证', status: 'pending', parentId: 'coarse-exec' }
        ],
        decompose_balanced: [
          { id: 'balanced-a', label: '上传 UI', status: 'completed' },
          { id: 'balanced-b', label: '归档 API', status: 'current', parentId: 'balanced-a' },
          { id: 'balanced-c', label: '权限守卫', status: 'pending', parentId: 'balanced-a' },
          { id: 'balanced-d', label: '搜索索引', status: 'pending', parentId: 'balanced-a' }
        ],
        decompose_fine: [
          { id: 'fine-a', label: '上传组件', status: 'completed' },
          { id: 'fine-b', label: '标签校验', status: 'completed', parentId: 'fine-a' },
          { id: 'fine-c', label: '归档 API', status: 'current', parentId: 'fine-b' },
          { id: 'fine-d', label: '策略映射', status: 'pending', parentId: 'fine-c' },
          { id: 'fine-e', label: '索引分片', status: 'pending', parentId: 'fine-c' }
        ]
      },
      stageLabel: '执行阶段'
    },
    {
      screen: 5,
      stage: 'replan',
      title: '阻塞出现，是否重规划',
      prompt: '权限校验与索引依赖冲突，当前路径受阻，你要怎么做？',
      hint: '本屏会显示旧路径受阻与新路径重组的差异',
      choices: [
        {
          id: 'push-through',
          label: '继续硬推当前路径',
          summary: '先绕过权限校验，保持交付节奏',
          consequenceKey: 'replan-push'
        },
        {
          id: 'patch-locally',
          label: '局部补丁后继续',
          summary: '先修权限冲突，再回到当前路径',
          consequenceKey: 'replan-patch'
        },
        {
          id: 'replan',
          label: '回到上层重规划',
          summary: '重新组织依赖顺序，换一条执行路径',
          consequenceKey: 'replan-reshape'
        }
      ],
      feedback: '重规划不是推翻重来，而是基于新信息重组路径。',
      feedbackByChoice: {
        'execute_upload-flow':
          '上传先行暴露了权限依赖冲突，说明高层规划中的依赖顺序需要回看。',
        'execute_search-core':
          '搜索先行触发权限阻塞，当前任务粒度下依赖关系尚未闭合。',
        'execute_permission-guard':
          '权限先行直接触发阻塞，重规划能更早修正任务顺序。',
        'push-through':
          '你选择继续硬推，短期进度保住了，但阻塞会在后续放大。',
        'patch-locally':
          '你选择局部补丁，风险下降但整体结构仍可能反复受阻。',
        replan: '你选择重规划，系统会把旧路径收束并重组新的任务主干。'
      },
      tree: [
        { id: 'old-root', label: '旧路径：上传 -> 权限 -> 搜索', status: 'current' },
        { id: 'old-upload', label: '上传链路', status: 'completed', parentId: 'old-root' },
        { id: 'old-perm', label: '权限校验', status: 'blocked', parentId: 'old-root' },
        { id: 'old-search', label: '搜索索引', status: 'blocked', parentId: 'old-perm' },
        { id: 'new-root', label: '新路径：权限澄清 -> 索引 -> 上传联调', status: 'pending' },
        { id: 'new-perm', label: '权限边界澄清', status: 'pending', parentId: 'new-root' },
        { id: 'new-search', label: '索引契约对齐', status: 'pending', parentId: 'new-root' },
        { id: 'new-upload', label: '上传联调', status: 'pending', parentId: 'new-root' }
      ],
      treeByChoice: {
        'execute_upload-flow': [
          { id: 'old-root', label: '旧路径：上传先行', status: 'current' },
          { id: 'old-upload', label: '上传链路', status: 'completed', parentId: 'old-root' },
          { id: 'old-perm', label: '权限校验', status: 'blocked', parentId: 'old-root' },
          { id: 'new-root', label: '新路径候选：先澄清权限边界', status: 'pending' },
          { id: 'new-perm', label: '权限边界澄清', status: 'pending', parentId: 'new-root' }
        ],
        'execute_search-core': [
          { id: 'old-root', label: '旧路径：搜索先行', status: 'current' },
          { id: 'old-search', label: '搜索索引', status: 'completed', parentId: 'old-root' },
          { id: 'old-perm', label: '权限校验', status: 'blocked', parentId: 'old-root' },
          { id: 'new-root', label: '新路径候选：权限契约先行', status: 'pending' },
          { id: 'new-perm', label: '权限契约梳理', status: 'pending', parentId: 'new-root' }
        ],
        'execute_permission-guard': [
          { id: 'old-root', label: '旧路径：权限先行', status: 'current' },
          { id: 'old-perm', label: '权限守卫实现', status: 'blocked', parentId: 'old-root' },
          { id: 'old-upload', label: '上传联调', status: 'blocked', parentId: 'old-perm' },
          { id: 'new-root', label: '新路径候选：先固化最小接口', status: 'pending' },
          { id: 'new-api', label: '上传/搜索最小接口', status: 'pending', parentId: 'new-root' }
        ]
      },
      choiceMeta: {
        replan: { didReplan: true }
      },
      stageLabel: '重规划阶段'
    },
    {
      screen: 6,
      stage: 'review',
      title: '复盘与最小可复刻模块',
      prompt: '基于你的路径，下一轮如何更稳地推进？',
      hint: '回看你的关键选择并抽取最小机制',
      choices: [
        {
          id: 'review_share',
          label: '输出复盘文档',
          summary: '把本轮因果和重规划触发条件沉淀下来',
          consequenceKey: 'review-share'
        },
        {
          id: 'review_next',
          label: '进入下一轮迭代',
          summary: '按复盘结果开启下一轮任务树',
          consequenceKey: 'review-next'
        }
      ],
      feedback: '复盘阶段把路径经验转成可复刻模块，形成稳定机制。',
      feedbackByChoice: {
        'push-through':
          '你选择了硬推路径，复盘重点是识别阻塞放大点并提前设置重规划阈值。',
        'patch-locally':
          '你选择了局部补丁，复盘重点是把临时修补沉淀成结构化规则。',
        replan: '你触发了重规划，复盘重点是保留旧路径证据并复用新路径骨架。'
      },
      tree: [
        { id: 'review-root', label: '最小 Planning 机制', status: 'completed' },
        { id: 'review-goal', label: '高层规划', status: 'completed', parentId: 'review-root' },
        { id: 'review-granularity', label: '任务粒度决策', status: 'completed', parentId: 'review-root' },
        { id: 'review-replan', label: '阻塞触发重规划', status: 'completed', parentId: 'review-root' }
      ],
      stageLabel: '复盘阶段',
      replaySummary: {
        headline: '可复刻的 Planning 最小模块',
        takeaways: [
          '先做高层规划，再做任务粒度决策，能降低执行阶段的不确定性',
          '阻塞并不可怕，关键是识别触发条件并及时重规划',
          '把旧路径与新路径同时保留，团队更容易理解因果变化'
        ],
        modules: [
          {
            name: '高层规划器',
            purpose: '定义目标、约束与里程碑顺序'
          },
          {
            name: '任务粒度调节器',
            purpose: '在粗/中/细粒度之间平衡速度与风险'
          },
          {
            name: '重规划反馈环',
            purpose: '监测阻塞并将旧路径重组为新路径'
          }
        ]
      }
    }
  ]
}

import type { PlanningScenario } from '../components/types'

export const planningSimulatorScenario: PlanningScenario = {
  missionTitle: '打造支持上传、搜索和权限控制的文档助手',
  missionDescription:
    '在一个团队内部快速落地一个文档助手，支撑文件上传、智能搜索、访问权限与审计，可作为后续系列实践的核心模块。',
  screens: [
    {
      screen: 1,
      stage: 'goal',
      title: '确定文档助手愿景',
      prompt: '你希望这个文档助手在上传、搜索、权限方面解决哪类核心问题？',
      hint: '聚焦最关键的体验落点并找出最初的成功指标',
      choices: [
        {
          id: 'goal_upload-first',
          label: '以上传体验为中心',
          summary: '先把上传、结构化和归档流程打通，确保内容能稳定进系统',
          consequenceKey: 'upload-focus'
        },
        {
          id: 'goal_security-first',
          label: '以搜索与权限为核心',
          summary: '先明确搜索质量与权限边界，让用户能安全快速找回文档',
          consequenceKey: 'security-focus'
        },
        {
          id: 'goal_balance',
          label: '平衡上传、搜索与权限',
          summary: '设置阶段性目标，上传先上线，再逐步强化搜索与权限策略',
          consequenceKey: 'balanced'
        }
      ],
      feedback:
        '明确愿景有助于团队对齐优先级，确保上传/搜索/权限的能力不会因边界模糊而延迟交付。',
      tree: [
        { id: 'mission', label: '文档助手愿景', status: 'current' },
        { id: 'upload', label: '上传与结构化', status: 'pending', parentId: 'mission' },
        { id: 'search', label: '搜索与提示', status: 'pending', parentId: 'mission' },
        { id: 'permissions', label: '权限与审计', status: 'pending', parentId: 'mission' }
      ],
      stageLabel: '目标阶段'
    },
    {
      screen: 2,
      stage: 'outline',
      title: '绘制执行纲要',
      prompt: '为上述能力描绘里程碑路线，哪些部分需要先行？',
      hint: '把能力分成上传/搜索/权限三条主线并标出依赖',
      choices: [
        {
          id: 'outline_upload-first',
          label: '先打通上传归档路径',
          summary: '规划上传入口、格式校验、元数据和存储 API',
          consequenceKey: 'outline-upload'
        },
        {
          id: 'outline_search-track',
          label: '先打磨搜索与提醒',
          summary: '规划索引、语义提示与搜索反馈的推进节奏',
          consequenceKey: 'outline-search'
        },
        {
          id: 'outline_parallel',
          label: '同步推进三条主线',
          summary: '标出每条主线的里程碑，让多组协作并行推进',
          consequenceKey: 'outline-parallel'
        }
      ],
      feedback:
        '清晰的战略纲要能让不同角色并行推进，并在关键节点彼此校验依赖。',
      tree: [
        { id: 'mission', label: '文档助手愿景', status: 'completed' },
        { id: 'upload', label: '上传与结构化', status: 'current', parentId: 'mission' },
        { id: 'search', label: '搜索体验', status: 'pending', parentId: 'mission' },
        { id: 'permissions', label: '权限模型', status: 'pending', parentId: 'mission' }
      ],
      stageLabel: '战略纲要'
    },
    {
      screen: 3,
      stage: 'decompose',
      title: '分解关键任务',
      prompt: '把所选里程碑拆成可以并行交付的子任务。',
      hint: '每一个子任务都要有可验证的输出和负责人',
      choices: [
        {
          id: 'decompose_upload-flow',
          label: '解构上传端到端流程',
          summary: '列出上传表单、标签输入和归档 API 的具体交付',
          consequenceKey: 'decompose-upload'
        },
        {
          id: 'decompose_search-index',
          label: '拆解搜索体验任务',
          summary: '细化索引构建、提示模板与搜索请求的步骤',
          consequenceKey: 'decompose-search'
        },
        {
          id: 'decompose_permissions-model',
          label: '拆分权限与审计动作',
          summary: '定义角色、策略与访问日志的实现步骤',
          consequenceKey: 'decompose-permissions'
        }
      ],
      feedback:
        '细化任务能让工程组把目标转换为可验证的迭代，同时提早曝光依赖与风险。',
      tree: [
        { id: 'mission', label: '文档助手愿景', status: 'completed' },
        { id: 'upload', label: '上传与结构化', status: 'completed', parentId: 'mission' },
        { id: 'upload-form', label: '上传表单与标签', status: 'current', parentId: 'upload' },
        { id: 'upload-api', label: '归档 API 与存储', status: 'pending', parentId: 'upload' },
        { id: 'search', label: '搜索体验', status: 'pending', parentId: 'mission' },
        { id: 'permissions', label: '权限模型', status: 'pending', parentId: 'mission' }
      ],
      stageLabel: '任务分解'
    },
    {
      screen: 4,
      stage: 'execute',
      title: '执行首轮建设',
      prompt: '选择一个子任务开始执行，让成果能尽快拿出来验证。',
      hint: '从前端、后端或权限中选出一个最容易验证的环节',
      choices: [
        {
          id: 'execute_upload-form',
          label: '完成上传表单与示例',
          summary: '搭建上传 UI、校验逻辑与示例文档，确认体验顺畅',
          consequenceKey: 'execute-upload-form'
        },
        {
          id: 'execute_search-index',
          label: '部署初始搜索索引',
          summary: '构建向量/关键字索引并验证搜索请求的响应',
          consequenceKey: 'execute-search'
        },
        {
          id: 'execute_permissions',
          label: '调试权限策略',
          summary: '实现基础角色权限并演练授权/拒绝场景',
          consequenceKey: 'execute-permissions'
        }
      ],
      feedback:
        '执行阶段需要快速落地可演示产物，同时捕捉回馈以便下一步调整。',
      tree: [
        { id: 'mission', label: '文档助手愿景', status: 'completed' },
        { id: 'upload', label: '上传与结构化', status: 'current', parentId: 'mission' },
        { id: 'upload-form', label: '上传表单与标签', status: 'completed', parentId: 'upload' },
        { id: 'upload-api', label: '归档 API 与存储', status: 'pending', parentId: 'upload' },
        { id: 'search', label: '搜索体验', status: 'pending', parentId: 'mission' },
        { id: 'permissions', label: '权限模型', status: 'pending', parentId: 'mission' }
      ],
      stageLabel: '执行阶段'
    },
    {
      screen: 5,
      stage: 'replan',
      title: '重规划当前路线',
      prompt: '出现了权限规则不通的风险，你希望怎么调整？',
      hint: '可以推继续、局部修复或回到上一轮重规划',
      choices: [
        {
          id: 'push-through',
          label: '坚守原计划',
          summary: '继续推进当前执行目标，把权限规则先临时绕开',
          consequenceKey: 'push-through'
        },
        {
          id: 'patch-locally',
          label: '先补局部问题',
          summary: '暂停权限验证，把相关策略修补完再继续推送',
          consequenceKey: 'patch-locally'
        },
        {
          id: 'replan',
          label: '重新规划路线',
          summary: '回退到任务分解，调整优先级与依赖顺序',
          consequenceKey: 'replan'
        }
      ],
      feedback:
        '重规划是对不确定性做出响应，明确选项可以让团队快速收敛出下一个行动方向。',
      feedbackByChoice: {
        'push-through':
          '继续当前目标可保持节奏，但要标记权限风险并准备补丁。',
        'patch-locally':
          '先修好策略后再推进，可以避免后续更大的回滚。',
        replan: '回到任务拆解，可以重新梳理依赖并调整可交付顺序。'
      },
      tree: [
        { id: 'mission', label: '文档助手愿景', status: 'completed' },
        { id: 'upload', label: '上传与结构化', status: 'completed', parentId: 'mission' },
        { id: 'permissions', label: '权限模型', status: 'blocked', parentId: 'mission' },
        {
          id: 'permissions-validate',
          label: '权限策略验证',
          status: 'blocked',
          parentId: 'permissions'
        },
        { id: 'search', label: '搜索体验', status: 'current', parentId: 'mission' }
      ],
      stageLabel: '重规划阶段'
    },
    {
      screen: 6,
      stage: 'review',
      title: '复盘与可复刻模块',
      prompt: '基于这次探索，哪些模块可以作为最小可复刻版本？',
      hint: '总结可交付模块与关键经验，便于下一轮再现',
      choices: [
        {
          id: 'review_share',
          label: '分享复盘总结',
          summary: '撰写复盘文档并同步给项目组',
          consequenceKey: 'review-share'
        },
        {
          id: 'review_next',
          label: '启动下一轮迭代',
          summary: '把复盘要点转化成下一阶段的任务清单',
          consequenceKey: 'review-next'
        }
      ],
      feedback:
        '复盘阶段的沉淀能帮助把经验固化为可复刻的组件和流程。',
      tree: [
        { id: 'mission', label: '文档助手愿景', status: 'completed' },
        { id: 'upload', label: '上传模块', status: 'completed', parentId: 'mission' },
        { id: 'search', label: '搜索模块', status: 'completed', parentId: 'mission' },
        { id: 'permissions', label: '权限模块', status: 'pending', parentId: 'mission' }
      ],
      stageLabel: '复盘阶段',
      replaySummary: {
        headline: '可复刻的文档助手模块',
        takeaways: [
          '上传、搜索、权限三大能力要分别拆设计、实现与测试',
          '重规划时及时标注风险、锁定优先级比盲目推进更划算',
          '复盘成果最好转化成可复刻模块与流程说明'
        ],
        modules: [
          {
            name: '上传流水线',
            purpose: '规范前端表单、元数据注册与归档 API 的端到端通道'
          },
          {
            name: '搜索与提示层',
            purpose: '构建索引 + 提示模板，保障用户能快速找到文档'
          },
          {
            name: '权限配置器',
            purpose: '集中管理角色、策略与访问日志，便于审计'
          }
        ]
      }
    }
  ]
}

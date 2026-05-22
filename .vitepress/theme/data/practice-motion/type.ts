export type PracticeMotionKind =
  | 'interactive-demo'
  | 'animation-lab'
  | 'lottie'
  | 'css-motion'
  | 'none'

export interface PracticeMotionEntry {
  projectId: string
  componentName: string
  kind: PracticeMotionKind
  animationLabExperimentIds: string[]
  notes: string
}

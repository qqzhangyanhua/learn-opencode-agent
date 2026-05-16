# Commit Decision History

> 此文件是 `commits.jsonl` 的人类可读视图，可由工具重生成。
> Canonical store: `commits.jsonl` (JSONL, append-only)

| Date | Context-Id | Commit | Summary | Decisions | Bugs | Risk |
|------|-----------|--------|---------|-----------|------|------|
| 2026-05-16T14:53:15Z | 01a9e913-ebe3-44c5-a14f-77550163cf42 | pending | chore(context): initialize project decision tracking | Initialize .context so project-specific coding and workflow rules are shared in the repository.; Document .context entry points in AGENTS.md so future agents read prefs before modifying code. |  | Low; adds repository workflow metadata and does not change site runtime behavior. |
| 2026-05-16T14:54:24Z | f2255ff3-e748-42b1-9227-0786fef7da82 | pending | feat(animation-lab): harden flow experiments | Reuse FlowExperimentCanvas for the agent-loop scene so every animation lab experiment follows the same canvas contract.; Split large motion CSS into scene and keyframe files to keep animation-lab component files under the 500-line project limit.; Enhance check-animation-lab with node/path/packet reference validation and file length enforcement.; Accumulate trace events across steps so the trace panel shows completed prior events while preserving the active step. |  | Medium; shared animation-lab canvas, trace display, and validation script behavior changed together, covered by targeted checks and site build. |

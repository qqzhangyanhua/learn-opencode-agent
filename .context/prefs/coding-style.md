# Coding Style Guide

> 此文件定义团队编码规范，所有 LLM 工具在修改代码时必须遵守。
> 提交到 Git，团队共享。

## General

- Prefer small, reviewable changes; avoid unrelated refactors.
- Keep functions short (<50 lines); avoid deep nesting (≤3 levels).
- Name things explicitly; no single-letter variables except loop counters.
- Handle errors explicitly; never swallow errors silently.

## Language-Specific

<!-- 根据项目语言补充，例如：-->
<!-- ### TypeScript -->
<!-- - Use strict mode; prefer `interface` over `type` for object shapes. -->

## Git Commits

- Conventional Commits, imperative mood.
- Atomic commits: one logical change per commit.

## Testing

- Every feat/fix MUST include corresponding tests.
- Coverage must not decrease.
- Fix flow: write failing test FIRST, then fix code.

## Security

- Never log secrets (tokens/keys/cookies/JWT).
- Validate inputs at trust boundaries.

<template>
  <FlowScenarioDemo
    :scenario="transactionEffectScenario"
    variant="timeline"
    :interval-ms="1500"
  />
</template>

<script setup lang="ts">
import FlowScenarioDemo from './FlowScenarioDemo.vue'
import type { FlowScenario } from './flowScenario'

const transactionEffectScenario: FlowScenario = {
  title: '事务提交与副效应回放',
  summary: '展示消息写入如何先完成事务提交，再统一触发副效应与客户端通知。',
  lanes: [
    { id: 'request', label: '请求' },
    { id: 'tx', label: '数据库事务' },
    { id: 'effect', label: '副效应队列' },
    { id: 'client', label: '客户端' },
  ],
  steps: [
    {
      id: 'req',
      title: '收到写入请求',
      detail: '用户发送消息，准备写入 Session、Message 与 Part。',
      lane: 'request',
    },
    {
      id: 'write',
      title: '事务内写库',
      detail: '多表写入保持原子性，当前数据还未对外可见。',
      lane: 'tx',
      codeLabel: 'Database.transaction()',
    },
    {
      id: 'queue',
      title: '登记副效应',
      detail: '先把 Bus 通知放入 effects 队列，而不是立刻执行。',
      lane: 'effect',
      kind: 'async',
      codeLabel: 'Database.effect()',
    },
    {
      id: 'commit',
      title: '事务提交成功',
      detail: 'SQLite 正式提交后，新数据才成为一致状态。',
      lane: 'tx',
      kind: 'commit',
      emphasis: '关键点：提交前不要通知客户端，否则会出现“收到事件但查不到数据”的竞态。',
    },
    {
      id: 'flush',
      title: '执行副效应',
      detail: '队列中的 Bus.publish 等动作在提交后统一执行。',
      lane: 'effect',
      kind: 'async',
    },
    {
      id: 'push',
      title: '客户端收到更新',
      detail: 'TUI 或 Web 在收到事件后再查询数据库，此时读到的是已提交数据。',
      lane: 'client',
    },
  ],
  edges: [
    { from: 'req', to: 'write' },
    { from: 'write', to: 'queue', style: 'dashed', label: '登记待执行动作' },
    { from: 'write', to: 'commit' },
    { from: 'commit', to: 'flush' },
    { from: 'flush', to: 'push' },
  ],
}
</script>

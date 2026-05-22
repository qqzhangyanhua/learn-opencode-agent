<template>
  <section class="tfb-root">
    <div class="tfb-header">
      <p>测试边界先看 fixture，再看断言。</p>
      <span>Ch14 · Testing</span>
    </div>

    <div class="tfb-grid">
      <article
        v-for="item in layers"
        :key="item.title"
        class="tfb-card"
      >
        <h3>{{ item.title }}</h3>
        <dl>
          <div>
            <dt>负责什么</dt>
            <dd>{{ item.scope }}</dd>
          </div>
          <div>
            <dt>不负责什么</dt>
            <dd>{{ item.outOfScope }}</dd>
          </div>
          <div>
            <dt>典型文件</dt>
            <dd>{{ item.file }}</dd>
          </div>
        </dl>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
interface TestingLayer {
  title: string
  scope: string
  outOfScope: string
  file: string
}

const layers: TestingLayer[] = [
  {
    title: 'Runtime fixture',
    scope: '构造 Agent 运行时、工具注册和会话上下文。',
    outOfScope: '不验证浏览器交互和页面布局。',
    file: 'tests/runtime/*.test.ts'
  },
  {
    title: 'Component fixture',
    scope: '固定组件输入，验证状态切换和渲染结果。',
    outOfScope: '不连接真实模型、文件系统或网络。',
    file: 'components/*.test.ts'
  },
  {
    title: 'E2E fixture',
    scope: '把真实页面、路由和用户流程串起来。',
    outOfScope: '不替代底层单元测试定位具体函数错误。',
    file: 'tests/e2e/*.spec.ts'
  }
]
</script>

<style scoped>
.tfb-root {
  margin: 24px 0;
  padding: 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.tfb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.tfb-header p {
  margin: 0;
  font-weight: 700;
}

.tfb-header span {
  color: var(--vp-c-brand-1);
  font-size: 12px;
  font-weight: 700;
}

.tfb-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.tfb-card {
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

.tfb-card h3 {
  margin: 0 0 12px;
  font-size: 15px;
}

.tfb-card dl,
.tfb-card dd {
  margin: 0;
}

.tfb-card dl {
  display: grid;
  gap: 10px;
}

.tfb-card dt {
  margin-bottom: 2px;
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.tfb-card dd {
  color: var(--vp-c-text-2);
}

@media (max-width: 760px) {
  .tfb-grid {
    grid-template-columns: 1fr;
  }
}
</style>

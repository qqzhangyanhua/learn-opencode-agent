<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { buildBreadcrumbItems, type BreadcrumbCrumb } from '../../seo'

const { page, frontmatter } = useData()

const crumbs = computed((): BreadcrumbCrumb[] => {
  if (frontmatter.value.layout === 'home') {
    return []
  }

  const pageName = typeof page.value.title === 'string' && page.value.title
    ? page.value.title
    : '当前页'

  return buildBreadcrumbItems(page.value.relativePath, pageName)
})

const visible = computed(() => crumbs.value.length >= 2)
</script>

<template>
  <nav
    v-if="visible"
    class="site-breadcrumb"
    aria-label="面包屑导航"
  >
    <ol class="site-breadcrumb__list">
      <li
        v-for="(crumb, index) in crumbs"
        :key="`${crumb.path}-${index}`"
        class="site-breadcrumb__item"
      >
        <span
          v-if="index > 0"
          class="site-breadcrumb__sep"
          aria-hidden="true"
        >/</span>

        <span
          v-if="index === crumbs.length - 1"
          class="site-breadcrumb__current"
          aria-current="page"
        >{{ crumb.name }}</span>
        <a
          v-else-if="crumb.linkable !== false"
          class="site-breadcrumb__link"
          :href="crumb.path"
        >{{ crumb.name }}</a>
        <span
          v-else
          class="site-breadcrumb__muted"
        >{{ crumb.name }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.site-breadcrumb {
  margin: 0 0 14px;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.site-breadcrumb__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-breadcrumb__item {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.site-breadcrumb__sep {
  margin: 0 8px;
  color: var(--vp-c-text-3);
  user-select: none;
}

.site-breadcrumb__link {
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.15s ease;
}

.site-breadcrumb__link:hover {
  color: var(--vp-c-brand-1);
}

.site-breadcrumb__current {
  color: var(--vp-c-text-1);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: min(100%, 42ch);
}

.site-breadcrumb__muted {
  color: var(--vp-c-text-2);
}

@media (max-width: 640px) {
  .site-breadcrumb {
    font-size: 12px;
    margin-bottom: 12px;
    padding-bottom: 10px;
  }

  .site-breadcrumb__sep {
    margin: 0 6px;
  }

  .site-breadcrumb__current {
    max-width: min(100%, 28ch);
  }
}
</style>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import SiteBreadcrumb from './components/SiteBreadcrumb.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-before>
      <SiteBreadcrumb />
    </template>
  </Layout>
</template>

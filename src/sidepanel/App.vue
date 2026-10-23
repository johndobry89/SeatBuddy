<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import ProductShell from '../components/ProductShell.vue';
const LegacyAssistant = defineAsyncComponent(
  () => import('./LegacyAssistant.vue'),
);
</script>
<template>
  <ProductShell v-slot="{ active }"
    ><LegacyAssistant :active="active"
  /></ProductShell>
</template>

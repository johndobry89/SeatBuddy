<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import ProductShell from '../components/ProductShell.vue';
const LegacyPopup = defineAsyncComponent(() => import('./LegacyPopup.vue'));
</script>
<template>
  <ProductShell v-slot="{ active }" popup
    ><LegacyPopup :active="active"
  /></ProductShell>
</template>

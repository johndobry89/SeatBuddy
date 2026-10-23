<script setup lang="ts">
import { usePanelLauncher } from '../chrome/use-panel-launcher';
import NormalWindowButton from './NormalWindowButton.vue';
const launcher = usePanelLauncher();
</script>
<template>
  <button class="secondary" @click="launcher.open">
    Open boekingsassistent
  </button>
  <p v-if="launcher.error.value" role="alert" class="error">
    {{ launcher.error.value }}
  </p>
  <NormalWindowButton v-if="launcher.error.value" />
  <p v-if="launcher.opened.value" class="source">
    Chrome heeft het zijpaneel geopend. Er is niets geboekt.
  </p>
</template>

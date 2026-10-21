<script setup lang="ts">
import { ref } from 'vue';
import type { Diagnostic } from '../../privacy/diagnostics';
const props = defineProps<{
  run: () => Promise<Diagnostic>;
  busy: boolean;
}>();
const report = ref<Diagnostic | null>(null);
async function check() {
  report.value = null;
  report.value = await props.run();
}
</script>
<template>
  <details class="diagnostics">
    <summary>Diagnostiek zonder privégegevens</summary>
    <p>
      Een momentopname van deze extensie. Geen titels, URL’s, tabnummers,
      filminvoer of accountgegevens. Er wordt niets opgeslagen of verstuurd.
    </p>
    <button class="secondary" :disabled="busy" @click="check">
      Voer zelfcontrole uit
    </button>
    <p>
      Browsermogelijkheden zijn geen bewijs dat beleid een handeling toestaat.
      Echte Vue-bevestiging: NOT IMPLEMENTED.
    </p>
    <pre
      v-if="report"
      data-testid="diagnostic-report"
      tabindex="0"
      aria-label="Diagnostische momentopname"
      >{{ JSON.stringify(report, null, 2) }}</pre>
    <button v-if="report" class="text-button" @click="report = null">
      Wis diagnostische momentopname
    </button>
  </details>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import DiagnosticPreview from './DiagnosticPreview.vue';
import LocalSelfTest from './LocalSelfTest.vue';
import { diagnosticText, type Diagnostic } from '../../privacy/diagnostics';
const props = defineProps<{ run: () => Promise<Diagnostic>; busy: boolean }>();
const selfTest = ref<InstanceType<typeof LocalSelfTest> | null>(null);
const preview = ref('');
const feedback = ref('');
const checking = ref(false);

const failed = ref(false);

async function check() {
  if (checking.value) return;
  selfTest.value?.clear();
  checking.value = true;
  preview.value = '';
  feedback.value = '';
  failed.value = false;
  try {
    preview.value = diagnosticText(await props.run());
    await nextTick();
    document
      .querySelector<HTMLElement>('[data-testid="diagnostic-report"]')
      ?.focus();
  } catch {
    failed.value = true;
    feedback.value =
      'Diagnose niet beschikbaar. Er is niets gekopieerd of verstuurd.';
  } finally {
    checking.value = false;
  }
}
function clear() {
  preview.value = '';
  feedback.value = '';
  failed.value = false;
}
</script>
<template>
  <details class="diagnostics">
    <summary>Diagnostiek zonder privégegevens</summary>
    <p>
      Alleen versie, veilige buildkenmerken, adaptermodus, technische foutcode,
      mogelijkheden, rechtenscope en bewijsklassen. Geen namen, filmgegevens,
      stoelen, URL’s, browsernummers, accountgegevens of ruwe fouten. Niets
      wordt opgeslagen of verstuurd.
    </p>
    <LocalSelfTest ref="selfTest" @started="clear" />
    <slot />
    <button class="secondary" :disabled="busy || checking" @click="check">
      Voer zelfcontrole uit
    </button>
    <p>
      Browsermogelijkheden zijn geen bewijs dat beleid een handeling toestaat.
      Echte Vue-bevestiging: NOT IMPLEMENTED.
    </p>
    <DiagnosticPreview v-if="preview" :text="preview" @clear="clear" />
    <p v-if="feedback" :role="failed ? 'alert' : 'status'">{{ feedback }}</p>
    <a
      href="https://github.com/johndobry89/SeatBuddy/issues/new"
      target="_blank"
      rel="noopener noreferrer"
      class="site-link"
      >Meld een probleem ↗</a
    >
    <p class="source">
      Je opent zelf een leeg GitHub-issue. Niets wordt meegestuurd. Beschrijf
      versie, fictieve stappen, verwacht en feitelijk gedrag; geen
      privégegevens.
    </p>
  </details>
</template>

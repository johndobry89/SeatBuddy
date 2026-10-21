<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { diagnosticText, type Diagnostic } from '../../privacy/diagnostics';
const props = defineProps<{ run: () => Promise<Diagnostic>; busy: boolean }>();
const preview = ref('');
const feedback = ref('');
const checking = ref(false);
const copying = ref(false);
const failed = ref(false);
const reportElement = ref<HTMLElement | null>(null);
async function check() {
  if (checking.value || copying.value) return;
  checking.value = true;
  preview.value = '';
  feedback.value = '';
  failed.value = false;
  try {
    preview.value = diagnosticText(await props.run());
    await nextTick();
    reportElement.value?.focus();
  } catch {
    failed.value = true;
    feedback.value =
      'Diagnose niet beschikbaar. Er is niets gekopieerd of verstuurd.';
  } finally {
    checking.value = false;
  }
}
function selectPreview() {
  if (!reportElement.value) return;
  reportElement.value.focus();
  const range = document.createRange();
  range.selectNodeContents(reportElement.value);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
async function copy() {
  if (!preview.value || copying.value) return;
  copying.value = true;
  feedback.value = '';
  failed.value = false;
  try {
    await navigator.clipboard.writeText(preview.value);
    feedback.value = 'Technische diagnose gekopieerd. Er is niets verstuurd.';
  } catch {
    failed.value = true;
    feedback.value =
      'Kopiëren niet toegestaan. Selecteer de diagnose en kopieer zelf met ⌘C of Ctrl+C.';
    selectPreview();
  } finally {
    copying.value = false;
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
    <button
      class="secondary"
      :disabled="busy || checking || copying"
      @click="check"
    >
      Voer zelfcontrole uit
    </button>
    <p>
      Browsermogelijkheden zijn geen bewijs dat beleid een handeling toestaat.
      Echte Vue-bevestiging: NOT IMPLEMENTED.
    </p>
    <template v-if="preview">
      <p>Dit is exact de tekst die je bewust kunt kopiëren:</p>
      <pre
        ref="reportElement"
        data-testid="diagnostic-report"
        tabindex="0"
        aria-label="Diagnostische momentopname"
        >{{ preview }}</pre>
      <div class="actions">
        <button :disabled="copying" @click="copy">
          Kopieer technische diagnose
        </button>
        <button class="secondary" :disabled="copying" @click="selectPreview">
          Selecteer diagnose voor handmatig kopiëren
        </button>
        <button class="text-button" :disabled="copying" @click="clear">
          Wis diagnostische momentopname
        </button>
      </div>
    </template>
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

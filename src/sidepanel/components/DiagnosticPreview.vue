<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
const props = withDefaults(
  defineProps<{ text: string; copyLabel?: string; testId?: string }>(),
  { copyLabel: 'Kopieer technische diagnose', testId: 'diagnostic-report' },
);
const emit = defineEmits<{ clear: [] }>();
const copying = ref(false),
  feedback = ref(''),
  failed = ref(false);
const element = ref<HTMLElement | null>(null);
let active = true;
onUnmounted(() => {
  active = false;
});
watch(
  () => props.text,
  () => {
    feedback.value = '';
    failed.value = false;
  },
);
function select() {
  if (!element.value) return;
  element.value.focus();
  const range = document.createRange();
  range.selectNodeContents(element.value);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
async function copy() {
  if (!props.text || copying.value) return;
  const exact = props.text;
  copying.value = true;
  feedback.value = '';
  failed.value = false;
  try {
    await navigator.clipboard.writeText(exact);
    if (active && props.text === exact)
      feedback.value = 'Technische diagnose gekopieerd. Er is niets verstuurd.';
  } catch {
    if (active && props.text === exact) {
      failed.value = true;
      feedback.value =
        'Kopiëren niet toegestaan. Selecteer de diagnose en kopieer zelf met ⌘C of Ctrl+C.';
      select();
    }
  } finally {
    if (active) copying.value = false;
  }
}
</script>
<template>
  <div class="diagnostic-preview">
    <p>Dit is exact de tekst die je bewust kunt kopiëren:</p>
    <pre
      ref="element"
      :data-testid="testId"
      tabindex="0"
      aria-label="Diagnostische momentopname"
      >{{ text }}</pre>
    <div class="actions">
      <button :disabled="copying" @click="copy">{{ copyLabel }}</button>
      <button class="secondary" :disabled="copying" @click="select">
        Selecteer diagnose voor handmatig kopiëren
      </button>
      <button class="text-button" :disabled="copying" @click="emit('clear')">
        Wis diagnostische momentopname
      </button>
    </div>
    <p v-if="feedback" :role="failed ? 'alert' : 'status'">{{ feedback }}</p>
  </div>
</template>

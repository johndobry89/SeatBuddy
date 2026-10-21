<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue';
import {
  runLocalSelfTest,
  localTestText,
  testLabels,
  testReasons,
  type LocalTestReport,
} from '../../self-test/local-test';
import DiagnosticPreview from './DiagnosticPreview.vue';
const emit = defineEmits<{ started: [] }>();
const report = ref<LocalTestReport | null>(null),
  running = ref(false),
  notice = ref('');
const heading = ref<HTMLElement | null>(null);
let controller: AbortController | null = null;
let serial = 0;
const passed = computed(
  () =>
    !!report.value &&
    report.value.checks.every((check) => check.status === 'PASS'),
);
const text = computed(() => (report.value ? localTestText(report.value) : ''));
function cancel() {
  serial++;
  controller?.abort();
  controller = null;
  running.value = false;
  report.value = null;
  notice.value =
    'Lokale proef geannuleerd. Gebruikersgegevens zijn niet gewijzigd.';
}
onUnmounted(() => {
  serial++;
  controller?.abort();
});
function clear() {
  serial++;
  controller?.abort();
  controller = null;
  running.value = false;
  report.value = null;
  notice.value = '';
}
defineExpose({ clear });
async function run() {
  if (running.value) return;
  emit('started');
  const current = ++serial;
  controller = new AbortController();
  const signal = controller.signal;
  running.value = true;
  report.value = null;
  notice.value = '';
  try {
    const result = await runLocalSelfTest(signal);
    if (current !== serial || signal.aborted) return;
    report.value = result;
    await nextTick();
    heading.value?.focus();
  } catch {
    if (current === serial) {
      notice.value =
        'Lokale proef niet volledig uitgevoerd. Gebruik de handmatige route; er is niets gewijzigd of verstuurd.';
    }
  } finally {
    if (current === serial) {
      running.value = false;
      controller = null;
    }
  }
}
</script>
<template>
  <section class="local-self-test" aria-labelledby="local-test-title">
    <h3 id="local-test-title">Controleer SeatBuddies</h3>
    <p class="source">
      FICTIONAL_TEST · uitsluitend eigen fictieve testmodellen. Geen huidige
      filmavond, bijnamen, opslaginhoud, tabs of accounts worden getest of
      gewijzigd. Geen netwerk.
    </p>
    <button class="secondary" :disabled="running" @click="run">
      Controleer SeatBuddies
    </button>
    <button v-if="running" class="text-button" @click="cancel">
      Annuleer lokale proef
    </button>
    <p v-if="running" role="status">Lokale fictieve controles uitvoeren…</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <template v-if="report">
      <h4 ref="heading" tabindex="-1" data-testid="local-test-result">
        {{
          passed
            ? 'Lokale proef geslaagd'
            : 'Lokale proef niet volledig uitgevoerd'
        }}
      </h4>
      <p class="source">
        Alleen lokale logica, fictief adaptercontract en API-aanwezigheid. Geen
        bewijs van worker-/Side Panel-werking, opslagrechten, accountisolatie of
        Vue-boekingen; dit vervangt Playwright niet.
      </p>
      <ul class="test-checks">
        <li
          v-for="check in report.checks"
          :key="check.id"
          :data-testid="`local-check-${check.id}`"
        >
          <strong>{{ check.status }} — {{ testLabels[check.id] }}</strong>
          <p v-if="check.status !== 'PASS'" class="source">
            {{ testReasons[check.code] }}
          </p>
        </li>
      </ul>
      <DiagnosticPreview
        :text="text"
        copy-label="Kopieer lokale testsamenvatting"
        test-id="local-test-report"
        @clear="report = null"
      />
    </template>
  </section>
</template>

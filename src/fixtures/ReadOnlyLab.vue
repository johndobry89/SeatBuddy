<script setup lang="ts">
import SeatPairLab from './SeatPairLab.vue';
import { nextTick, onBeforeUnmount, ref } from 'vue';
import { createFixtureReader, compareObservation } from './reader-entry';
import type { FixtureReader } from '../adapters/read-only/fictional-reader';
import type {
  ReadOnlyObservation,
  CompatibilityResult,
} from '../adapters/read-only/contract';
const scenario = ref('valid');
const observation = ref<ReadOnlyObservation | null>(null);
const comparison = ref<CompatibilityResult | null>(null);
let reader: FixtureReader | undefined;
let freshnessTimer: ReturnType<typeof setInterval> | undefined;
const expected = {
  movie: 'De maan van papier',
  cinema: 'Fictief Filmhuis',
  date: '2030-04-12',
  time: '19:30',
  hall: 'Zaal 2',
};
function ensureReader() {
  reader ??= createFixtureReader(
    document,
    location.protocol === 'chrome-extension:'
      ? {
          kind: 'PACKAGED',
          extensionId: chrome.runtime.id,
          world: 'PACKAGED_PAGE',
          permitted: true,
        }
      : { kind: 'LOCAL_PREVIEW', world: 'LOCAL_PREVIEW', permitted: true },
  );
  return reader;
}
async function read() {
  // Clear the previous UI result before the DOM snapshot; display writes are not parser writes.
  observation.value = null;
  comparison.value = null;
  await nextTick();
  const now = Date.now();
  observation.value = ensureReader().read(now);
  comparison.value = compareObservation(observation.value, expected, now);
  if (freshnessTimer) clearInterval(freshnessTimer);
  freshnessTimer = setInterval(() => {
    if (!reader || !observation.value) return;
    const current = reader.current(Date.now());
    if (current.compatibility !== observation.value.compatibility) {
      observation.value = current;
      comparison.value = compareObservation(current, expected, Date.now());
    }
  }, 1000);
}
async function change() {
  reader?.dispose();
  reader = undefined;
  if (freshnessTimer) clearInterval(freshnessTimer);
  observation.value = null;
  comparison.value = null;
  await nextTick();
}
onBeforeUnmount(() => {
  reader?.dispose();
  if (freshnessTimer) clearInterval(freshnessTimer);
});
</script>
<template>
  <section aria-label="Alleen-lezend fictief adapterlab">
    <h2>Alleen-lezend adapterlab · fictief</h2>
    <p>
      Alleen deze lokale pagina. Toekomstige Vue-integratie: niet ingeschakeld.
      Geen boeking, selectie, hold of accountbewijs.
    </p>
    <label for="reader-scenario">Lokale bioscoopfixture</label>
    <select id="reader-scenario" v-model="scenario" @change="change">
      <option value="valid">Zichtbare voorstelling</option>
      <option value="rerender">Gewijzigd DOM</option>
      <option value="canvas">Ontoegankelijke canvas</option>
      <option value="ambiguous">Dubbele zaal en stoellabels</option>
      <option value="mismatch">Andere datum en tijd</option>
      <option value="missing">Ontbrekende zaal</option>
      <option value="server">Fictieve serverfout</option>
    </select>
    <div
      :data-sb-readonly="scenario === 'rerender' ? '2' : '1'"
      :data-representation="scenario === 'canvas' ? 'canvas' : 'semantic'"
      :data-server-error="scenario === 'server' ? '' : undefined"
      class="fake-cinema"
    >
      <p data-field="movie">De maan van papier</p>
      <p data-field="cinema">Fictief Filmhuis</p>
      <p data-field="date">
        {{ scenario === 'mismatch' ? '2030-04-13' : '2030-04-12' }}
      </p>
      <p data-field="time">{{ scenario === 'mismatch' ? '21:00' : '19:30' }}</p>
      <p v-if="scenario !== 'missing'" data-field="hall">Zaal 2</p>
      <p v-if="scenario === 'ambiguous'" data-field="hall">Zaal 3</p>
      <canvas
        v-if="scenario === 'canvas'"
        width="120"
        height="50"
        aria-label="Fictieve ontoegankelijke stoelweergave"
      />
      <p v-else>
        <span data-seat-label>F10</span> ·
        <span data-seat-label>{{
          scenario === 'ambiguous' ? 'F10' : 'F11'
        }}</span>
      </p>
      <p v-if="scenario === 'server'">
        Fictieve server niet bereikbaar. Geen netwerkverzoek of retry.
      </p>
    </div>
    <button class="secondary" @click="read">
      Lees uitsluitend lokale fixture
    </button>
    <div v-if="observation" data-testid="readonly-result">
      <p role="status">
        {{ comparison?.status }} · {{ comparison?.reason }} · Status UNKNOWN.
        Handmatig verder.
      </p>
      <p>
        F10/F11 zijn opeenvolgende labels (niet geverifieerd). Aangrenzendheid
        en beschikbaarheid UNKNOWN.
      </p>
      <pre>{{ JSON.stringify(observation, null, 2) }}</pre>
    </div>
  </section>
  <SeatPairLab />
</template>

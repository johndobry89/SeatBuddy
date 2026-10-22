<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  categoryEligibility,
  categoryLabels,
  findSeatPairs,
  policyReasonLabels,
  type PairSearchResult,
} from '../core/seat-policy';
import {
  createSeatMap,
  pairScenarioLabels,
  type PairScenario,
} from './seat-map-data';
const scenario = ref<PairScenario>('lux');
const accessibility = ref(false);
const fixture = ref(createSeatMap(scenario.value, Date.now()));
const result = ref<PairSearchResult | null>(null);
const clock = ref(Date.now());
const eligiblePairs = computed(
  () =>
    result.value?.pairs.filter(
      (pair) =>
        categoryEligibility(pair.A.category) === 'CANDIDATE' &&
        categoryEligibility(pair.B.category) === 'CANDIDATE',
    ) ?? [],
);
const expiry = computed(
  () =>
    Math.min(
      fixture.value.map.observedAt,
      ...(result.value?.pairs.map((pair) => pair.expiresAt - 30_000) ?? []),
    ) + 30_000,
);
function change() {
  accessibility.value = false;
  result.value = null;
  fixture.value = createSeatMap(scenario.value, Date.now());
}
function search() {
  const now = Date.now();
  clock.value = now;
  result.value = findSeatPairs(fixture.value.map, {
    ...fixture.value.request,
    now,
    accessibility: { A: accessibility.value, B: accessibility.value },
  });
}
function permissionChanged() {
  result.value = null;
}
function invalidate() {
  fixture.value.map.revision++;
  result.value = null;
}
const timer = setInterval(() => {
  clock.value = Date.now();
  if (
    result.value &&
    clock.value >= expiry.value &&
    result.value.status === 'FICTIONAL_CANDIDATES'
  )
    search();
}, 1000);
onBeforeUnmount(() => clearInterval(timer));
</script>
<template>
  <section aria-labelledby="pair-lab-title" class="pair-lab">
    <p class="eyebrow">DEMO / FICTIONAL_SEATMAP</p>
    <h2 id="pair-lab-title">ZERO EXTRA · twee fictieve buurstoelen</h2>
    <p>
      Alleen een verzonnen lokale kaart. Geen live beschikbaarheid, selectie,
      hold of boeking. A en B blijven twee eigen trajecten.
    </p>
    <label for="pair-scenario">Fictieve stoelkaart</label>
    <select id="pair-scenario" v-model="scenario" @change="change">
      <option v-for="(label, id) in pairScenarioLabels" :key="id" :value="id">
        {{ label }}
      </option>
    </select>
    <p class="source">
      Bron: FICTIONAL_SEATMAP · FICTIONAL_GEOMETRY ·
      {{ new Date(fixture.map.observedAt).toLocaleTimeString('nl-NL') }} ·
      versie {{ fixture.map.revision }}. Momentopname, maximaal 30 seconden.
      Geen countdown/holdbewijs.
    </p>
    <div
      class="fictional-seating"
      role="group"
      aria-label="Uitsluitend fictieve plattegrond"
    >
      <p>FICTIEF DOEK · middenbron: opgegeven fixturekolom</p>
      <div
        v-for="row in fixture.map.rows"
        :key="row.id"
        class="physical-row"
        :aria-label="`Fictieve rij ${row.label}`"
      >
        <template v-for="cell in row.cells" :key="cell.column">
          <span
            v-if="cell.kind === 'SEAT'"
            class="drawn-seat"
            :class="`color-${cell.seat.colorHint.toLowerCase()}`"
            :data-testid="`drawn-${cell.seat.id}`"
          >
            <strong>{{ cell.seat.label }}</strong>
            <small>{{ categoryLabels[cell.seat.category] }}</small>
            <small
              >{{ categoryEligibility(cell.seat.category) }} ·
              {{ cell.seat.availability }}</small
            >
            <small v-if="cell.seat.designation !== 'STANDARD'"
              >{{ cell.seat.designation }} · toegankelijkheidsroute
              beoordelen</small
            >
          </span>
          <span v-else class="seat-gap">{{
            cell.kind === 'GAP' ? 'Onderbreking' : 'Geblokkeerd'
          }}</span>
          <span v-if="row.aisleAfter.includes(cell.column)" class="seat-gap"
            >Gangpad</span
          >
        </template>
      </div>
    </div>
    <details>
      <summary>Fictieve prijsbronnen — geen echte prijzen</summary>
      <ul v-for="row in fixture.map.rows" :key="row.id">
        <template v-for="cell in row.cells" :key="cell.column">
          <li v-if="cell.kind === 'SEAT'">
            {{ cell.seat.label }} · legenda:
            {{
              cell.seat.legendPrice
                ? `${(cell.seat.legendPrice.cents / 100).toFixed(2)} EUR gewone kaartjesprijs`
                : 'UNKNOWN'
            }}
            — geen bijbetalingsbewijs.
            <span v-for="role in ['A', 'B'] as const" :key="role"
              ><br />{{ role }}:
              {{
                cell.seat.additionalDue[role].kind === 'UNKNOWN'
                  ? 'UNKNOWN'
                  : `${(cell.seat.additionalDue[role].cents / 100).toFixed(2)} EUR fictief na de pas · ${cell.seat.additionalDue[role].coverage}`
              }}</span
            >
          </li>
        </template>
      </ul>
    </details>
    <p class="source">
      Kleuren zijn illustratief, nooit categorie- of prijsbewijs. Lux/Saver
      Lux/Super Saver Lux zijn alleen kandidaatscategorieën; Ultra Lux altijd
      uitgesloten, ook bij een fictieve €0. Legenda-/kaartjesprijzen zijn geen
      bijbetaling na Movie Pass.
    </p>
    <label
      v-if="scenario === 'accessible' || scenario === 'accessibility-unknown'"
      class="check"
    >
      <input
        v-model="accessibility"
        type="checkbox"
        @change="permissionChanged"
      />Gebruik de toegankelijkheidsroute voor deze DEMO
    </label>
    <p
      v-if="scenario === 'accessible' || scenario === 'accessibility-unknown'"
      class="source"
    >
      Geen gezondheidsgegevens nodig. Deze expliciete DEMO-keuze bewijst geen
      echte voorwaarden of geschiktheid; bij twijfel zelf Vue/support vragen.
      Toegankelijke plaatsen zijn geen algemene vrije-stoelenfallback.
    </p>
    <button class="secondary" @click="search">
      Zoek 2 stoelen zonder extra betaling (DEMO)
    </button>
    <button class="text-button" @click="invalidate">
      Wijzig fictieve kaartversie
    </button>
    <div v-if="result" data-testid="pair-result">
      <p role="status">
        {{ result.status }} · {{ eligiblePairs.length }} fictieve
        duo-kandidaten. Niets gereserveerd.
      </p>
      <p v-if="!eligiblePairs.length">
        Geen kandidaten binnen de bekende fictieve kaart.
      </p>
      <p v-if="result.hasUnknowns" class="notice">
        UNKNOWN: categorie, beschikbaarheid, voorwaarden of kosten niet volledig
        vastgesteld. Kosten nog op Vue controleren; onbekend is nooit €0.
      </p>
      <ol
        v-if="eligiblePairs.length"
        aria-label="Gerangschikte fictieve duo-kandidaten"
      >
        <li
          v-for="pair in eligiblePairs"
          :key="`${pair.A.id}-${pair.B.id}`"
          data-testid="pair-candidate"
        >
          <strong>A {{ pair.A.label }} · B {{ pair.B.label }}</strong> · rij
          {{ pair.row }}<br />
          {{ categoryLabels[pair.A.category] }} /
          {{ categoryLabels[pair.B.category] }}<br />
          <span
            v-if="
              pair.A.designation !== 'STANDARD' ||
              pair.B.designation !== 'STANDARD'
            "
            >Toegankelijkheidsroute: A {{ pair.A.designation }} / B
            {{ pair.B.designation }} · voorwaarden alleen fictief bekend.<br
          /></span>
          DEMO · FICTIONAL_GEOMETRY · fysiek naast elkaar uitsluitend in deze
          kaart.<br />
          FICTIONAL_ZERO_EXTRA: voor A en B onafhankelijk fictief €0 aan bekende
          bijbetaling. Geen garantie op Vue of finale bevestiging.
        </li>
      </ol>
      <ul
        v-if="result.reasons.length"
        class="source"
        aria-label="Uitsluitingen en onzekerheden in de fictieve kaart"
      >
        <li v-for="reason in result.reasons" :key="reason">
          {{ reason }} · {{ policyReasonLabels[reason] }}
        </li>
      </ul>
    </div>
    <p class="source">
      Rangschikking pas na uitsluitingen: echte fixture-buurrelatie, daarna
      dezelfde toegestane categorie en fictief opgegeven midden.
      USER_ENTERED_LABELS en MANUAL_SELF_REPORT blijven eigen invoer;
      LIVE_VERIFIED is niet beschikbaar zolang G0 geblokkeerd is.
    </p>
  </section>
</template>
<style scoped>
.pair-lab {
  border: 1px solid var(--border);
  padding: 1rem;
  margin-block: 1.5rem;
}
.fictional-seating {
  overflow-x: auto;
  max-width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border);
}
.physical-row {
  display: flex;
  gap: 0.4rem;
  align-items: stretch;
  min-width: 0;
}
.drawn-seat {
  border: 2px solid #757575;
  border-radius: 0.6rem 0.6rem 0.25rem 0.25rem;
  display: flex;
  flex: 1 0 5rem;
  flex-direction: column;
  padding: 0.4rem;
  gap: 0.2rem;
  max-width: 8rem;
}
.drawn-seat small {
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}
.color-blue {
  border-color: #7fa5ff;
}
.color-green {
  border-color: #9cbf71;
}
.color-red {
  border-color: #ec8393;
}
.seat-gap {
  align-self: center;
  max-width: 5rem;
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}
li {
  margin-block: 0.5rem;
}
</style>

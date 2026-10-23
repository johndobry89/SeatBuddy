<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, ref } from 'vue';
import { experimentVersion, formatReadReport } from './read-report';
import ProductShell from '../components/ProductShell.vue';
import {
  createPageReadSession,
  createDuoPlan,
  type PageRead,
} from './vue-page-reader';
import {
  DUO_TTL_MS,
  parseDuoPlan,
  duoStatusLabels,
  type DuoPlan,
  type DuoStatus,
} from './duo-plan';
const LegacyPopup = defineAsyncComponent(
  () => import('../popup/LegacyPopup.vue'),
);
const result = ref<PageRead | null>(null);
const busy = ref(false),
  message = ref('');
const copying = ref(false),
  copyMessage = ref('');
const selected = ref<number | null>(null),
  incoming = ref(''),
  importOpen = ref(false);
const duoStatus = ref<DuoStatus | null>(null),
  imported = ref<DuoPlan | null>(null);
let revision = 0;
let disposed = false,
  expiry: ReturnType<typeof setTimeout> | undefined;
function clearObservation() {
  revision++;
  clearTimeout(expiry);
  result.value = null;
  selected.value = null;
  copyMessage.value = '';
  duoStatus.value = null;
  imported.value = null;
}
function expireAt(at: number) {
  clearTimeout(expiry);
  // One-shot local freshness boundary, no site countdown or polling.
  expiry = setTimeout(
    () => {
      const wasDuo = imported.value !== null;
      clearObservation();
      if (wasDuo) duoStatus.value = 'UNKNOWN_STOP';
      message.value =
        'STOP — momentopname verlopen. Lees opnieuw of vraag een vers duo-plan.';
    },
    Math.max(0, at + DUO_TTL_MS - Date.now()),
  );
}
const session = createPageReadSession(() => {
  clearObservation();
  if (incoming.value) duoStatus.value = 'UNKNOWN_STOP';
  if (!disposed)
    message.value =
      'NIET BESCHIKBAAR — tab gewijzigd of geen tijdelijke toegang. Incognitotoegang moet uit staan. Heropen de popup op een openbare Vue-voorstelling.';
});
async function read() {
  if (busy.value) return;
  clearObservation();
  message.value = '';
  busy.value = true;
  const current = revision;
  try {
    const observation = await session.read();
    if (disposed || current !== revision) return;
    result.value = observation;
    expireAt(observation.observedAt);
    message.value =
      observation.reason === 'PROTECTED_PAGE'
        ? 'NIET BESCHIKBAAR — dialoog, account- of betaalpagina. Er zijn geen voorstellingsgegevens gelezen.'
        : observation.reason === 'AMBIGUOUS_CONTEXT'
          ? 'ONBEKEND — meerdere voorstellingscontexten. Er zijn geen gegevens gecombineerd.'
          : observation.reason === 'UNSUPPORTED'
            ? 'ONBEKEND — geen eenduidige zichtbare selectie. Kies op Vue en lees opnieuw; stop als de pagina niet wordt herkend.'
            : 'Momentopname, niet bevestigd door Vue.';
  } catch (error) {
    if (!disposed && current === revision)
      message.value =
        error instanceof Error
          ? error.message
          : 'NIET BESCHIKBAAR — geen betrouwbare waarneming.';
  } finally {
    busy.value = false;
  }
}
async function copy(reportOnly = true) {
  const observation = result.value;
  if (
    busy.value ||
    copying.value ||
    !observation ||
    observation.reason === 'PROTECTED_PAGE'
  )
    return;
  copying.value = true;
  copyMessage.value = '';
  try {
    if (
      Date.now() < observation.observedAt ||
      Date.now() - observation.observedAt >= DUO_TTL_MS
    )
      throw new Error('stale');
    const text = reportOnly
      ? formatReadReport(observation)
      : createDuoPlan(observation, selected.value ?? -1);
    await navigator.clipboard.writeText(text);
    if (!disposed && result.value === observation)
      copyMessage.value = 'Gekopieerd';
  } catch {
    if (!disposed && result.value === observation)
      copyMessage.value = `${reportOnly ? 'Rapport' : 'Duo-plan'} niet gekopieerd — klembord geweigerd, gegevens onveilig of verlopen.`;
  } finally {
    copying.value = false;
  }
}
function editIncoming() {
  clearObservation();
  message.value = '';
}
async function checkDuo() {
  if (busy.value) return;
  const text = incoming.value;
  clearObservation();
  message.value = '';
  busy.value = true;
  const current = revision;
  try {
    const plan = parseDuoPlan(text);
    const observation = await session.read(plan);
    if (disposed || current !== revision || incoming.value !== text) return;
    // Re-parse after the asynchronous browser read: a plan may have expired.
    parseDuoPlan(text);
    result.value = observation;
    imported.value = plan;
    duoStatus.value = observation.duo ?? 'UNKNOWN_STOP';
    expireAt(plan.observedAt);
  } catch {
    if (!disposed && current === revision && incoming.value === text)
      duoStatus.value = 'UNKNOWN_STOP';
  } finally {
    busy.value = false;
  }
}
onBeforeUnmount(() => {
  disposed = true;
  session.dispose();
  clearObservation();
});
const labels = {
  movie: 'Film',
  cinema: 'Bioscoop',
  date: 'Datum',
  time: 'Tijd',
  hall: 'Zaal',
};
const seatReasons = {
  CONTEXT_UNKNOWN: 'ONBEKEND — voorstelling of zaal niet eenduidig.',
  MAP_UNKNOWN: 'ONBEKEND — geen unieke zichtbare stoelkaart.',
  STRUCTURE_UNKNOWN: 'ONBEKEND — stoelgegevens tegenstrijdig of niet uniek.',
  LEGEND_UNKNOWN: 'ONBEKEND — categorieën niet betrouwbaar gekoppeld.',
  NO_SAFE_PAIR:
    'GEEN BETROUWBAAR PAAR — buurrelatie of categorie onvoldoende bewezen.',
  CHECK_VISUALLY: 'Mogelijk naast elkaar — controleer op Vue.',
};
</script>
<template>
  <ProductShell class="duo-popup" popup :test-version="experimentVersion">
    <template #page-reader>
      <button :disabled="busy" @click="read">
        {{ busy ? 'Pagina lezen…' : 'Lees deze Vue-pagina' }}
      </button>
      <div
        role="status"
        aria-live="polite"
        data-testid="page-read-result"
        :data-source="result?.screenScope"
      >
        <p v-if="message && !result?.seats?.pairs.length">{{ message }}</p>
        <template v-if="result && result.reason !== 'PROTECTED_PAGE'">
          <dl>
            <template v-for="(label, key) in labels" :key="key">
              <dt>{{ label }}</dt>
              <dd
                :data-testid="`read-${key}`"
                :data-evidence="result.fields[key].status"
              >
                {{
                  result.fields[key].value ??
                  (result.fields[key].status === 'AMBIGUOUS'
                    ? 'ONBEKEND — meerdere waarden'
                    : 'ONBEKEND')
                }}
              </dd>
            </template>
          </dl>
          <section v-if="result.seats" data-testid="read-seats">
            <h2>
              {{
                result.seats.pairs.length
                  ? 'Mogelijk naast elkaar'
                  : 'Stoelen (momentopname)'
              }}
            </h2>
            <p v-if="!result.seats.pairs.length">
              {{ seatReasons[result.seats.reason] }}
            </p>
            <details class="evidence">
              <summary>Details stoelkaart</summary>
              <p v-if="result.seats.counts" data-testid="seat-counts">
                {{ result.seats.counts.available }} beschikbaar ·
                {{ result.seats.counts.unavailable }} niet beschikbaar ·
                {{ result.seats.counts.picked }} geselecteerd ·
                {{ result.seats.counts.unknown }} onbekend
              </p>
              <small data-testid="seat-diagnostic"
                >Schema {{ result.seats.scheme }} · diagnose
                {{ result.seats.diagnostic }}</small
              >
              <small v-if="result.seats.counts"
                >{{ result.seats.counts.categoryUnknownAvailable }} beschikbare
                stoelen met categorie onbekend;
                {{ result.seats.counts.ultraLuxAvailable }} Ultra Lux herkend
                (geen bewijs van afwezigheid).</small
              >
              <small>{{
                result.seats.categoryEvidence === 'EXACT_VISIBLE_ICON'
                  ? 'Categorie via gelijke zichtbare legenda-iconen.'
                  : 'Legenda-koppeling ONBEKEND.'
              }}</small>
            </details>
            <ol
              v-if="result.seats.pairs.length"
              data-testid="seat-pairs"
              role="radiogroup"
              aria-label="Kies buurpaar voor duo-plan"
            >
              <li v-for="(pair, index) in result.seats.pairs" :key="index">
                <label class="pair-choice">
                  <input
                    type="radio"
                    name="duo-pair"
                    :value="index"
                    :checked="selected === index"
                    :disabled="busy || copying"
                    @change="
                      selected = index;
                      copyMessage = '';
                    "
                  />
                  <span
                    >Rij {{ pair.row }}: {{ pair.seats.join(' + ') }} ·
                    {{
                      pair.categories[0] === pair.categories[1]
                        ? pair.categories[0]
                        : pair.categories.join(' / ')
                    }}</span
                  ></label
                >
              </li>
            </ol>
          </section>
        </template>
      </div>
      <div class="copy-actions">
        <button
          v-if="selected !== null && result?.seats"
          type="button"
          :disabled="busy || copying"
          @click="copy(false)"
        >
          Kopieer duo-plan
        </button>
        <button
          class="copy-report"
          type="button"
          :disabled="
            busy || copying || !result || result.reason === 'PROTECTED_PAGE'
          "
          @click="copy()"
        >
          Kopieer rapport
        </button>
      </div>
      <div class="copy-caption">
        <small v-if="selected !== null">A = eerste stoel · B = tweede.</small>
        <span
          v-show="copyMessage"
          role="status"
          aria-live="polite"
          data-testid="copy-report-status"
          >{{ copyMessage }}</span
        >
      </div>
      <details
        class="duo-import"
        @toggle="importOpen = ($event.target as HTMLDetailsElement).open"
      >
        <summary>Duo-plan ontvangen</summary>
        <template v-if="importOpen">
          <label for="incoming-plan"
            >Plak het volledige duo-plan in je eigen Chrome-profiel</label
          >
          <textarea
            id="incoming-plan"
            v-model="incoming"
            maxlength="700"
            rows="2"
            autocomplete="off"
            spellcheck="false"
            @input="editIncoming"
          />
          <button type="button" :disabled="busy || !incoming" @click="checkDuo">
            Controleer duo-plan op deze Vue-pagina
          </button>
          <p v-if="imported">
            A: rij {{ imported.pair.row }}, stoel {{ imported.pair.A }} · B:
            stoel {{ imported.pair.B }}
          </p>
          <p
            role="status"
            aria-live="polite"
            data-testid="duo-status"
            :data-status="duoStatus"
          >
            {{ duoStatus ? duoStatusLabels[duoStatus] : '' }}
          </p>
        </template>
      </details>
      <small>Momentopname; bij wijziging opnieuw lezen.</small>
      <small>Controleer vóór beide boekingen; geen tijdslot of hold.</small>
      <small
        >Movie Pass-bijbetaling niet gecontroleerd; controleer zelf op
        Vue.</small
      >
    </template>
    <template #page-boundary><span /></template>
    <template #default="{ active }"><LegacyPopup :active="active" /></template>
  </ProductShell>
</template>

<style scoped>
.duo-popup {
  padding: 0.75rem;
}
.duo-popup :deep(.brand-caption) {
  display: none;
}
.duo-popup :deep(.brand-header img) {
  width: 2rem;
  height: 2rem;
}
.duo-popup :deep(.brand-header.compact) {
  margin-bottom: 0.25rem;
}
.duo-popup :deep(details) {
  margin: 0.125rem 0;
  padding-top: 0.125rem;
}
.duo-popup :deep(.product-home > h1),
.duo-popup :deep(.product-home > h1 + p),
.duo-popup :deep(.product-policy) {
  display: none;
}
.duo-popup :deep(.product-home) {
  line-height: 1.125rem;
}
.duo-popup :deep(.product-home > p) {
  margin: 0.25rem 0;
  font-size: 0.75rem;
}
.duo-popup :deep(.primary-action) {
  min-height: 0;
  margin: 0.25rem 0;
  padding: 0.25rem;
  font-size: 0.75rem;
  background: var(--surface);
}
.duo-popup :deep(footer) {
  margin: 0.25rem 0;
  font-size: 0.65rem;
}
.duo-popup :deep(.product-help summary),
.duo-popup :deep(.developer-tools > summary) {
  min-height: 1.5rem;
  line-height: 1rem;
  padding: 0.25rem 0;
  font-size: 0.75rem;
}
p {
  margin: 0.25rem 0;
}
button {
  padding: 0.4rem;
  font-size: 0.85rem;
}
button:disabled {
  cursor: default;
}
dl {
  grid-template-columns: repeat(6, 1fr);
  gap: 0;
  margin: 0.25rem 0;
  font-size: 0.8rem;
  line-height: 1rem;
}
dt {
  font-size: 0.72rem;
}
dd:nth-of-type(-n + 2) {
  grid-column: 2 / 7;
}
dt:nth-of-type(n + 3) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
}
dd:nth-of-type(3) {
  grid-column: 1 / 3;
}
dd:nth-of-type(4) {
  grid-column: 3 / 5;
}
dd:nth-of-type(5) {
  grid-column: 5 / 7;
}
.copy-caption {
  display: flex;
  gap: 0.5rem;
  font-size: 0.7rem;
  line-height: 1rem;
  flex-wrap: wrap;
}
.copy-actions {
  display: flex;
  gap: 0.35rem;
  margin: 0.25rem 0;
  align-items: center;
}
.copy-actions button {
  flex: 1 1 auto;
}
section {
  margin: 0.375rem 0;
  padding-top: 0.25rem;
}
h2 {
  margin: 0.125rem 0;
  font-size: 0.9rem;
}
small {
  display: block;
  font-size: 0.7rem;
  line-height: 1rem;
}
#seat-counts,
[data-testid='seat-counts'] {
  font-size: 0.75rem;
}
ol {
  list-style: none;
  padding: 0;
  margin: 0.25rem 0;
}
.pair-choice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  padding: 0.25rem 0;
}
input[type='radio'] {
  margin: 0;
  accent-color: var(--crimson-button);
  flex: 0 0 1rem;
}
.evidence {
  font-size: 0.7rem;
  margin: 0.125rem 0;
  padding: 0;
  border: 0;
}
.evidence summary {
  min-height: 1.5rem;
  padding: 0;
}
.copy-report {
  min-height: 1.75rem;
  padding: 0.2rem;
  background: var(--surface);
  font-size: 0.75rem;
}
.duo-import summary {
  min-height: 1.5rem;
  padding: 0;
}
.duo-import {
  margin: 0.25rem 0;
  font-size: 0.8rem;
}
textarea {
  width: 100%;
  box-sizing: border-box;
  font: inherit;
  resize: vertical;
  background: var(--surface);
  color: inherit;
  border: 1px solid var(--border);
  border-radius: 4px;
}
</style>

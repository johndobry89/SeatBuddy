<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, ref } from 'vue';
import ProductShell from '../components/ProductShell.vue';
import { createPageReadSession, type PageRead } from './vue-page-reader';
const LegacyPopup = defineAsyncComponent(
  () => import('../popup/LegacyPopup.vue'),
);
const result = ref<PageRead | null>(null);
const busy = ref(false),
  message = ref('');
let disposed = false;
const session = createPageReadSession(() => {
  result.value = null;
  if (!disposed)
    message.value =
      'NIET BESCHIKBAAR — tab gewijzigd of geen tijdelijke toegang. Incognitotoegang moet uit staan. Heropen de popup op een openbare Vue-voorstelling.';
});
async function read() {
  if (busy.value) return;
  result.value = null;
  message.value = '';
  busy.value = true;
  try {
    const observation = await session.read();
    if (disposed) return;
    result.value = observation;
    message.value =
      observation.reason === 'PROTECTED_PAGE'
        ? 'NIET BESCHIKBAAR — dialoog, account- of betaalpagina. Er zijn geen voorstellingsgegevens gelezen.'
        : observation.reason === 'AMBIGUOUS_CONTEXT'
          ? 'ONBEKEND — meerdere voorstellingscontexten. Er zijn geen gegevens gecombineerd.'
          : observation.reason === 'UNSUPPORTED'
            ? 'ONBEKEND — geen eenduidige zichtbare selectie. Kies op Vue en lees opnieuw; stop als de pagina niet wordt herkend.'
            : 'Gelezen van deze pagina, niet bevestigd door Vue. Geen ticket geboekt.';
  } catch (error) {
    if (!disposed)
      message.value =
        error instanceof Error
          ? error.message
          : 'NIET BESCHIKBAAR — geen betrouwbare waarneming.';
  } finally {
    busy.value = false;
  }
}
onBeforeUnmount(() => {
  disposed = true;
  session.dispose();
  result.value = null;
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
  <ProductShell popup test-version="0.11.3-experimental">
    <template #page-reader>
      <p class="source">EXPERIMENT · tijdelijke toegang na je klik</p>
      <button :disabled="busy" @click="read">
        {{ busy ? 'Pagina lezen…' : 'Lees deze Vue-pagina' }}
      </button>
      <div
        role="status"
        aria-live="polite"
        data-testid="page-read-result"
        :data-source="result?.screenScope"
      >
        <p v-if="message">{{ message }}</p>
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
            <h2>Stoelen (momentopname)</h2>
            <p v-if="result.seats.counts" data-testid="seat-counts">
              {{ result.seats.counts.available }} beschikbaar ·
              {{ result.seats.counts.unavailable }} niet beschikbaar ·
              {{ result.seats.counts.picked }} geselecteerd ·
              {{ result.seats.counts.unknown }} onbekend
            </p>
            <p>{{ seatReasons[result.seats.reason] }}</p>
            <ol v-if="result.seats.pairs.length" data-testid="seat-pairs">
              <li v-for="(pair, index) in result.seats.pairs" :key="index">
                Rij {{ pair.row }}: {{ pair.seats.join(' + ') }} ·
                {{
                  pair.categories[0] === pair.categories[1]
                    ? pair.categories[0]
                    : pair.categories.join(' / ')
                }}
              </li>
            </ol>
            <small>
              {{
                result.seats.categoryEvidence === 'EXACT_VISIBLE_ICON'
                  ? 'Categorie via gelijke zichtbare legenda-iconen.'
                  : 'Legenda-koppeling ONBEKEND.'
              }}
              <template v-if="result.seats.counts">
                {{ result.seats.counts.categoryUnknown }} categorie onbekend;
                {{ result.seats.counts.ultraLux }} Ultra Lux uitgesloten.
              </template>
              Ultra Lux en onbekende categorieën nooit voorgesteld. Geen
              kostenbewijs: controleer zelf géén bijbetaling na Movie Pass.
            </small>
          </section>
          <small
            >Momentopname
            {{ new Date(result.observedAt).toLocaleTimeString('nl-NL') }} ·
            {{
              result.screenScope === 'VISIBLE_QUICK_TICKET'
                ? 'Quick Ticket, zonder jaar of zaal'
                : result.screenScope === 'VISIBLE_BOOKING_HERO'
                  ? 'Booking-header'
                  : 'Zichtbare metadata'
            }}. Geen account-, reserverings- of kostenbewijs.</small
          >
          <p>
            Elke wijziging maakt dit verouderd. Lees opnieuw; geen stoelen
            vastgehouden.
          </p>
        </template>
      </div>
    </template>
    <template #page-boundary
      ><p class="product-boundary">
        Experimentele lezer, geen Vue-goedkeuring of boeking. Alleen in deze
        popup; niets bewaard.
      </p></template
    >
    <template #default="{ active }"><LegacyPopup :active="active" /></template>
  </ProductShell>
</template>

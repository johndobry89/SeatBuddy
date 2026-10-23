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
</script>
<template>
  <ProductShell popup test-version="0.11.2-experimental">
    <template #page-reader>
      <p class="source">EXPERIMENT 01 · tijdelijke toegang na je klik</p>
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
          <small
            >Momentopname
            {{ new Date(result.observedAt).toLocaleTimeString('nl-NL') }} ·
            {{
              result.screenScope === 'VISIBLE_QUICK_TICKET'
                ? 'Quick Ticket, zonder jaar of zaal'
                : result.screenScope === 'VISIBLE_BOOKING_HERO'
                  ? 'Booking-header'
                  : 'Zichtbare metadata'
            }}. Geen account-, stoel- of kostenbewijs.</small
          >
          <p>Keuze gewijzigd? Klik opnieuw op Lees deze Vue-pagina.</p>
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

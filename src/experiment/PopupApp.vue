<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, ref } from 'vue';
import ProductShell from '../components/ProductShell.vue';
import { createPageReadSession, type PageRead } from './vue-page-reader';
const LegacyPopup = defineAsyncComponent(
  () => import('../popup/LegacyPopup.vue'),
);
const result = ref<PageRead | null>(null);
const busy = ref(false),
  used = ref(false),
  message = ref('');
let disposed = false;
const session = createPageReadSession(() => {
  result.value = null;
  if (!disposed)
    message.value =
      'NIET BESCHIKBAAR — tab gewijzigd of geen tijdelijke toegang. Incognitotoegang moet uit staan. Heropen de popup op een openbare Vue-voorstelling.';
});
async function read() {
  if (busy.value || used.value) return;
  busy.value = true;
  used.value = true;
  try {
    const observation = await session.read();
    if (disposed) return;
    result.value = observation;
    message.value =
      observation.reason === 'PROTECTED_PAGE'
        ? 'NIET BESCHIKBAAR — dialoog, account- of betaalpagina. Er zijn geen voorstellingsgegevens gelezen.'
        : observation.reason === 'UNSUPPORTED'
          ? 'ONBEKEND — geen ondersteunde zichtbare metadata. Stop deze proef; geen gegevens opnieuw invoeren.'
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
  <ProductShell popup test-version="0.11.1-experimental">
    <template #page-reader>
      <p class="source">EXPERIMENT 01 · tijdelijke toegang na je klik</p>
      <button :disabled="busy || used" @click="read">
        {{ busy ? 'Pagina lezen…' : 'Lees deze Vue-pagina' }}
      </button>
      <div role="status" aria-live="polite" data-testid="page-read-result">
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
            alleen zichtbare kop/metadata in main. Geen account-, stoel- of
            kostenbewijs.</small
          >
          <p>Opnieuw lezen? Sluit en heropen de popup.</p>
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

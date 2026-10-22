<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue';
import { findSeatPairs, type FictionalPair } from '../core/seat-policy';
import { createSeatMap, pairScreening } from './seat-map-data';

// A small, disposable flow experiment, reusing the existing ZERO EXTRA engine.
// Never connected to Chrome messages, storage, account data or a live provider.
const pair = ref<FictionalPair | null>(null);
const reviewedA = ref(false),
  reviewedB = ref(false),
  expired = ref(false);
const heading = ref<HTMLHeadingElement | null>(null);
async function focusStage() {
  await nextTick();
  heading.value?.focus();
}
function reset() {
  pair.value = null;
  reviewedA.value = reviewedB.value = expired.value = false;
}
function fresh() {
  const now = Date.now();
  if (
    pair.value &&
    (now < pair.value.observedAt || now >= pair.value.expiresAt)
  ) {
    reset();
    expired.value = true;
    return false;
  }
  return Boolean(pair.value);
}
function choose() {
  reset();
  const fixture = createSeatMap('mixed', Date.now());
  pair.value = findSeatPairs(fixture.map, fixture.request).pairs[0] ?? null;
  expired.value = !pair.value;
  void focusStage();
}
function review(role: 'A' | 'B') {
  if (!fresh()) return;
  if (role === 'A') reviewedA.value = true;
  else if (reviewedA.value) reviewedB.value = true;
  void focusStage();
}
const timer = setInterval(fresh, 1000);
onBeforeUnmount(() => clearInterval(timer));
</script>
<template>
  <section
    aria-label="Compact fictief Quick Ticket-prototype"
    class="quick-prototype"
  >
    <p class="eyebrow">FICTIVE_ONLY · lokaal ontwerpexperiment</p>
    <h2 ref="heading" tabindex="-1">
      {{
        !pair
          ? 'Bestaande fictieve voorstelling'
          : !reviewedA
            ? 'Eigen overzicht A'
            : !reviewedB
              ? 'Eigen overzicht B'
              : 'Twee fictieve overzichten bekeken'
      }}
    </h2>
    <p>
      {{ pairScreening.movie }} · {{ pairScreening.cinema }} · 12 april 2030,
      19:30 · {{ pairScreening.hall }}
    </p>
    <p>
      Geen Vue, accounts, hold of boeking. De kaart is maximaal 30 seconden
      geldig.
    </p>
    <p v-if="expired" role="status">
      Voorbeeld verlopen: beide controles gewist. Kies opnieuw.
    </p>
    <button v-if="!pair" @click="choose">
      Kies deze fictieve voorstelling
    </button>
    <template v-else>
      <p>
        Fictieve fysieke buurstoelen {{ pair.A.label }} en {{ pair.B.label }}.
        Saver Lux / Super Saver Lux, fictief eindbedrag € 0 per persoon. Geen
        gangpad.
      </p>
      <p data-testid="prototype-reviews">
        A: {{ reviewedA ? 'fictief bekeken' : 'zelf bekijken' }} · B:
        {{ reviewedB ? 'fictief bekeken' : 'zelf bekijken' }}
      </p>
      <button v-if="!reviewedA" @click="review('A')">
        A: fictief overzicht bekeken
      </button>
      <button v-else-if="!reviewedB" @click="review('B')">
        B: fictief overzicht bekeken
      </button>
      <p v-else>
        Alleen het ontwerp doorlopen. Niets gereserveerd; geen bewijs van twee
        echte accounts of echte tijdwinst.
      </p>
      <button class="secondary" @click="reset">Wis prototype</button>
    </template>
  </section>
</template>

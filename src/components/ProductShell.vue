<script setup lang="ts">
import { nextTick, ref } from 'vue';
import BrandHeader from './BrandHeader.vue';
import PanelLauncher from './PanelLauncher.vue';
import { version } from '../../package.json';
defineProps<{ popup?: boolean }>();
const developerOpen = ref(false),
  developerLoaded = ref(false),
  helpLoaded = ref(false);
const developer = ref<HTMLDetailsElement | null>(null);
const primary = ref<HTMLAnchorElement | null>(null);
function toggleDeveloper(event: Event) {
  developerOpen.value = (event.target as HTMLDetailsElement).open;
  if (developerOpen.value) developerLoaded.value = true;
}
async function closeDeveloper() {
  if (developer.value) developer.value.open = false;
  developerOpen.value = false;
  await nextTick();
  primary.value?.focus();
}
</script>
<template>
  <div class="product-shell" :class="{ 'product-popup': popup }">
    <main
      v-show="!developerOpen"
      class="product-home"
      data-testid="product-home"
    >
      <BrandHeader compact />
      <h1>Verder op Vue</h1>
      <p>Kies je voorstelling op de officiële website en boek daar zelf.</p>
      <a
        ref="primary"
        class="primary-action"
        data-testid="primary-action"
        href="https://www.vuecinemas.nl/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Vue Quick Ticket
      </a>
      <p class="product-boundary">Deze versie leest Vue niet en boekt niets.</p>
      <p class="product-policy">
        Geen Ultra Lux; controleer de uiteindelijke bijbetaling op Vue.
      </p>
      <details class="product-help" @toggle="helpLoaded = true">
        <summary>Hulp en privacy</summary>
        <p>
          Twee personen? Gebruik ieder een eigen account en eigen browsersessie,
          bijvoorbeeld een ander eigen Chrome-profiel. Twee tabs in hetzelfde
          profiel zijn geen twee logins. Deze knop opent geen tweede account.
        </p>
        <p>
          Vergelijk zelf voorstelling, buurstoelen en het eindbedrag. Er is nog
          geen bewezen tijdwinst boven twee gewone Vue-tabbladen.
        </p>
        <p>
          Geen pasnummers, wachtwoorden of tickets invullen. Eerder bewust
          bewaarde bijnamen beheren of wissen: Ontwikkelaarstests → Buddy kiezen
          of beheren / Alle gegevens wissen. Openen of sluiten van tests wist
          niets.
        </p>
        <PanelLauncher v-if="popup && helpLoaded" />
      </details>
      <footer>Onafhankelijk van Vue Cinemas · test {{ version }}</footer>
    </main>
    <details
      ref="developer"
      class="developer-tools"
      data-testid="developer-tools"
      @toggle="toggleDeveloper"
    >
      <summary>Ontwikkelaarstests</summary>
      <div
        v-if="developerLoaded"
        v-show="developerOpen"
        data-testid="legacy-tools"
      >
        <p class="source">
          Fictieve ontwikkelaarstests en eerdere gegevens. Geen live
          boekingsflow.
        </p>
        <button class="secondary" @click="closeDeveloper">
          Terug naar Vue-start
        </button>
        <slot :active="developerOpen" />
      </div>
    </details>
  </div>
</template>

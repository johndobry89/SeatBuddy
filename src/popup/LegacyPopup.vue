<script setup lang="ts">
const props = withDefaults(defineProps<{ active?: boolean }>(), {
  active: true,
});
import { computed, onMounted, onUnmounted, watch } from 'vue';
import StableAnnouncer from '../components/StableAnnouncer.vue';
import { selectedBuddy } from '../core/buddies';
import BrandHeader from '../components/BrandHeader.vue';
import BuddyManager from '../components/BuddyManager.vue';
import RetentionControls from '../components/RetentionControls.vue';
import NormalWindowButton from '../components/NormalWindowButton.vue';
import { useBuddies } from './use-buddies';
import { usePanelLauncher } from '../chrome/use-panel-launcher';
import { version } from '../../package.json';
const { state, error, notice, busy, load } = useBuddies();
const launcher = usePanelLauncher();
const announcement = computed(
  () =>
    notice.value ||
    (state.value
      ? `Bijnaam: ${selectedBuddy(state.value)?.nickname ?? 'geen gekozen'}. Kies solo of samen in de assistent.`
      : ''),
);
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void load();
  timer = setInterval(() => {
    if (props.active) void load();
  }, 2000);
});
watch(
  () => props.active,
  (value) => {
    if (value) void load();
  },
);
onUnmounted(() => clearInterval(timer));
</script>
<template>
  <main class="popup-shell">
    <BrandHeader compact />
    <StableAnnouncer :message="announcement" />
    <p class="eyebrow">Samen naar de film</p>
    <h1>Met wie ga je naar de film?</h1>
    <p class="intro">
      Kies optioneel een bijnaam. Kies pas in de assistent bewust solo of samen;
      een bijnaam activeert geen tweede traject.
    </p>
    <details class="first-run">
      <summary>Wat doet SeatBuddies?</summary>
      <p>
        Plan solo of met buddy, vergelijk eigen invoer en volg je eigen stappen.
        Deze onafhankelijke assistent leest Vue niet en boekt niets. Bijnamen
        zijn optioneel.
      </p>
      <a
        href="./fixture.html"
        target="_blank"
        rel="noopener noreferrer"
        class="site-link"
        >Start met een fictieve proef ↗</a
      >
    </details>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="notice" class="notice" data-testid="popup-notice">{{ notice }}</p>
    <div class="popup-launch">
      <button @click="launcher.open">Open boekingsassistent</button>
      <NormalWindowButton v-if="error || launcher.error.value" />
      <p v-if="launcher.error.value" role="alert" class="error">
        {{ launcher.error.value }}
      </p>
      <p v-if="launcher.opened.value" class="source">
        Chrome heeft het zijpaneel geopend. Ga daar verder; er is niets geboekt.
      </p>
      <p class="source">
        Ook zonder buddy bruikbaar. Onthouden staat standaard uit. Testbuild
        {{ version }}.
      </p>
    </div>
    <BuddyManager :state="state" :busy="busy" prefix="popup" @command="load" />
    <RetentionControls
      :state="state"
      :busy="busy"
      prefix="popup"
      @command="load"
    />
    <footer>
      Onafhankelijke assistent, niet verbonden aan of goedgekeurd door Vue
      Cinemas.
    </footer>
  </main>
</template>

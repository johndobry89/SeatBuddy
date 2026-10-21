<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import BrandHeader from '../components/BrandHeader.vue';
import BuddyManager from '../components/BuddyManager.vue';
import { useBuddies } from './use-buddies';
import { usePanelLauncher } from '../chrome/use-panel-launcher';
import { version } from '../../package.json';
const { state, error, notice, busy, load } = useBuddies();
const launcher = usePanelLauncher();
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void load();
  timer = setInterval(() => void load(), 2000);
});
onUnmounted(() => clearInterval(timer));
</script>
<template>
  <main class="popup-shell">
    <BrandHeader compact />
    <p class="eyebrow">Samen naar de film</p>
    <h1>Met wie ga je naar de film?</h1>
    <p class="intro">
      Kies één buddy. Jullie houden allebei je eigen account en eigen stappen.
    </p>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="notice" class="notice">{{ notice }}</p>
    <div class="popup-launch">
      <button @click="launcher.open">Open boekingsassistent</button>
      <p v-if="launcher.error.value" role="alert" class="error">
        {{ launcher.error.value }}
      </p>
      <p v-if="launcher.opened.value" class="source">
        Chrome heeft het zijpaneel geopend. Ga daar verder; er is niets geboekt.
      </p>
      <p class="source">
        Ook zonder buddy bruikbaar. Bijnamen worden niet opgeslagen. Testbuild
        {{ version }}.
      </p>
    </div>
    <BuddyManager :state="state" :busy="busy" prefix="popup" @command="load" />
    <footer>
      Onafhankelijke assistent, niet verbonden aan of goedgekeurd door Vue
      Cinemas.
    </footer>
  </main>
</template>

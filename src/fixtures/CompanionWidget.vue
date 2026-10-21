<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import BrandHeader from '../components/BrandHeader.vue';
import { fixtureBuddyReplySchema } from '../privacy/protocol';
import { sendRuntime } from '../chrome/messaging';
import { usePanelLauncher } from '../chrome/use-panel-launcher';
defineProps<{ step: string }>();
const buddy = ref<string | null>(null);
const launcher = usePanelLauncher();
let timer: ReturnType<typeof setInterval> | undefined;
let alive = true;
let inFlight = false;
async function refresh() {
  if (inFlight || !alive) return;
  inFlight = true;
  try {
    const reply = fixtureBuddyReplySchema.parse(
      await sendRuntime({ type: 'GET_BUDDY' }),
    );
    if (alive) buddy.value = reply.ok ? (reply.buddy?.nickname ?? null) : null;
  } catch {
    if (alive) buddy.value = null;
  } finally {
    inFlight = false;
  }
}
onMounted(() => {
  void refresh();
  timer = setInterval(() => void refresh(), 2000);
});
onUnmounted(() => {
  alive = false;
  clearInterval(timer);
});
</script>
<template>
  <aside
    class="fixture-companion"
    aria-label="Fictieve SeatBuddies-widget"
    data-testid="fixture-widget"
  >
    <BrandHeader compact />
    <p class="demo-warning">DEMO · NIET GEBOEKT · GEEN VUE INTEGRATIE</p>
    <h2>{{ buddy ? `Ik + ${buddy}` : 'Ik + een buddy' }}</h2>
    <p>
      Fictieve stap: {{ step }}. Een bijnaam is geen accountbewijs. Volg A en B
      zelf afzonderlijk in de boekingsassistent.
    </p>
    <p class="source">
      Websitebewijs: UNKNOWN · geen selectie, hold of boekingsactie.
    </p>
    <button @click="launcher.open">Open boekingsassistent</button>
    <p v-if="launcher.error.value" role="alert">{{ launcher.error.value }}</p>
  </aside>
</template>
<style scoped>
.fixture-companion {
  max-width: 380px;
  margin-block: 22px;
  background: var(--surface);
  border: 1px solid var(--gold);
  border-radius: 16px;
  box-shadow: 0 14px 32px #0006;
}
.demo-warning {
  color: var(--gold);
  font-weight: 750;
  font-size: 0.73rem;
  letter-spacing: 0.04em;
}
</style>

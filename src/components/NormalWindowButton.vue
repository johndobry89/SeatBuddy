<script setup lang="ts">
import { ref } from 'vue';
const error = ref('');
const available =
  typeof chrome !== 'undefined' &&
  typeof chrome.windows?.create === 'function' &&
  typeof chrome.runtime?.getURL === 'function';
async function open() {
  error.value = '';
  try {
    await chrome.windows.create({
      url: chrome.runtime.getURL('sidepanel.html'),
      incognito: false,
      type: 'normal',
    });
  } catch {
    error.value =
      'Normaal assistentvenster kon niet worden geopend. Controleer Chrome-ondersteuning en beleid; de lokale handmatige route blijft bruikbaar.';
  }
}
</script>
<template>
  <button type="button" class="secondary" :disabled="!available" @click="open">
    Open assistent in normaal venster
  </button>
  <p class="source">
    Veilige uitwijkroute als Chrome de herkomst niet kan vaststellen: opent
    alleen SeatBuddies als gewone extensietab in een nieuw normaal venster. Geen
    website of account.
  </p>
  <p v-if="error" role="alert" class="error">{{ error }}</p>
</template>

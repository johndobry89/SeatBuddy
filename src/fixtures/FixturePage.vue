<script setup lang="ts">
import { ref } from 'vue';
import CompanionWidget from './CompanionWidget.vue';
const fixtureStep = ref('Fictieve voorstelling');
const showWidget = ref(true);
import { fictionalObservation } from './data';
import { readFictionalFixture } from '../content/fixture-observer';
import { fixtureReplySchema, type FixtureCommand } from '../privacy/protocol';
import { roles, type Role, type Status } from '../core/types';

const role = ref<Role>('A');
const status = ref<Status>('SELECTED');
const feedback = ref(
  'Nog niet gekoppeld. Kies expliciet je rol en koppel deze fictieve tab.',
);
const busy = ref(false);
async function openPanel() {
  try {
    const window = await chrome.windows.getCurrent();
    if (window.id === undefined) throw new Error('Geen venster');
    await chrome.sidePanel.open({ windowId: window.id });
    feedback.value = 'Chrome heeft het Side Panel geopend.';
  } catch {
    feedback.value =
      'Side Panel kon niet worden geopend. Controleer browserondersteuning en beleid.';
  }
}
async function send(command: FixtureCommand) {
  const raw: unknown = await chrome.runtime.sendMessage(command);
  const reply = fixtureReplySchema.parse(raw);
  if (!reply.ok) throw new Error(reply.error);
}
async function act(kind: 'BIND' | 'OBSERVE') {
  busy.value = true;
  try {
    if (kind === 'BIND') await send({ type: 'BIND', role: role.value });
    else {
      const data = fictionalObservation(role.value, Date.now());
      data.status = status.value;
      const root = document.createElement('div');
      const node = document.createElement('script');
      node.type = 'application/json';
      node.dataset.seatmatesFixture = 'v1';
      node.textContent = JSON.stringify(data);
      root.append(node);
      const observation = readFictionalFixture(root, Date.now());
      if (!observation) throw new Error('Fictieve gegevens zijn ongeldig.');
      await send({ type: 'OBSERVE', observation });
    }
    feedback.value =
      kind === 'BIND'
        ? 'Tab gekoppeld. Status UNKNOWN tot je een fictieve waarneming verstuurt.'
        : 'Fictieve waarneming verstuurd. Bekijk A en B apart in het Side Panel.';
  } catch (error) {
    feedback.value =
      error instanceof Error
        ? error.message
        : 'Verzoek mislukt. Koppel opnieuw.';
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="fictional-page">
    <div class="fixture-controls">
      <label for="fixture-step">Fictieve schermstap</label
      ><select id="fixture-step" v-model="fixtureStep">
        <option>Fictieve voorstelling</option>
        <option>Fictieve stoelen</option>
        <option>Fictief overzicht</option></select
      ><label class="check"
        ><input v-model="showWidget" type="checkbox" />Toon fictieve
        widget</label
      >
    </div>
    <CompanionWidget v-if="showWidget" :step="fixtureStep" />
    <p class="eyebrow">SIMULATION · uitsluitend fictieve gegevens</p>
    <h1>Lokale testpagina</h1>
    <p>
      De maan van papier · Fictief Filmhuis · 12 april 2030 · 19:30 · Zaal 2.
    </p>
    <p>
      Geen account, ticket, betaling of reservering. Deze verpakte pagina
      ondersteunt A in een regulier venster. B is hier alleen een negatieve
      roltest: spanning kan geen verpakte hoofdpagina in incognito laden.
      Gebruik voor B de contextkeuze in de handmatige assistent.
    </p>
    <label for="role">Rol voor deze tab</label>
    <select id="role" v-model="role">
      <option v-for="item in roles" :key="item">{{ item }}</option>
    </select>
    <div class="actions">
      <button :disabled="busy" @click="act('BIND')">
        Koppel deze fictieve tab
      </button>
    </div>
    <section>
      <label for="status">Fictieve waarneming</label>
      <select id="status" v-model="status">
        <option>UNKNOWN</option>
        <option>SELECTED</option>
        <option>REVIEW_REQUIRED</option>
        <option>SIMULATED_COMPLETE</option>
        <option>FAILED</option>
      </select>
      <div class="actions">
        <button :disabled="busy" @click="act('OBSERVE')">
          Verstuur fictieve waarneming
        </button>
      </div>
    </section>
    <button class="secondary" @click="openPanel">Open echt Side Panel</button>
    <button
      class="secondary"
      @click="
        send({ type: 'UNBIND' })
          .then(() => (feedback = 'Fictieve tab losgekoppeld.'))
          .catch(() => (feedback = 'Loskoppelen mislukt.'))
      "
    >
      Koppeling ongedaan maken
    </button>
    <p role="status">{{ feedback }}</p>
    <p>
      SIMULATED_COMPLETE is uitsluitend een demo-uitkomst en bewijst nooit
      CONFIRMED. Er bestaat geen live boekingsactie.
    </p>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ReadOnlyLab from './ReadOnlyLab.vue';
import CompanionWidget from './CompanionWidget.vue';
const fixtureStep = ref('Fictieve voorstelling');
const showWidget = ref(true);
const fixtureSchema = ref('v1');
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
      node.dataset.seatmatesFixture = fixtureSchema.value;
      node.textContent = JSON.stringify(data);
      root.append(node);
      const observation = readFictionalFixture(root, Date.now());
      if (!observation) {
        await send({ type: 'UNBIND' });
        feedback.value =
          'Status UNKNOWN — fictief schema gewijzigd. Handmatig verder: open de assistent en vergelijk eigen gegevens. Oude fictieve waarneming gewist.';
        return;
      }
      await send({ type: 'OBSERVE', observation });
    }
    feedback.value =
      kind === 'BIND'
        ? 'Tab gekoppeld. Status UNKNOWN tot je een fictieve waarneming verstuurt.'
        : 'Fictieve waarneming verstuurd. Bekijk A en B apart in het Side Panel.';
  } catch {
    feedback.value =
      'Status UNKNOWN — verzoek geweigerd of verbinding niet beschikbaar. Handmatig verder in de assistent; koppel de fictieve tab zo nodig opnieuw.';
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="fictional-page">
    <div class="fixture-controls">
      <label for="fixture-schema">Fictief adapterschema</label
      ><select id="fixture-schema" v-model="fixtureSchema">
        <option value="v1">Fictief schema v1</option>
        <option value="v2">Gewijzigd fictief schema</option>
      </select>
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
    <ReadOnlyLab />
    <p class="eyebrow">SIMULATION · uitsluitend fictieve gegevens</p>
    <h1>Lokale testpagina</h1>
    <section class="fake-cinema" aria-label="Fictief bioscoopscherm">
      <p class="eyebrow">DEMO · NIET GEBOEKT · GEEN VUE INTEGRATIE</p>
      <h2>{{ fixtureStep }}</h2>
      <p v-if="fixtureStep === 'Fictieve voorstelling'">
        De maan van papier — één filmavond, twee zelfstandige trajecten.
      </p>
      <p v-else-if="fixtureStep === 'Fictieve stoelen'">
        F10 · F11 — uitsluitend getypte voorbeeldnummers. Geen plattegrond of
        beschikbaarheidsbewijs.
      </p>
      <p v-else>
        Alleen een fictief overzicht. Geen betaling, boeking of bevestiging.
      </p>
      <details>
        <summary>Probeer SeatBuddies in 90 seconden</summary>
        <ol>
          <li>Open het echte Side Panel met de widgetknop.</li>
          <li>
            Kies bewust Ook met buddy plannen, bewaar dit fictieve filmplan en
            vul A F10 en B F11 in; controleer de review.
          </li>
          <li>
            Doorloop A’s vijf eigen controles; controleer dat B onafhankelijk
            blijft en stoelnummervergelijking geen boekingsbewijs geeft.
          </li>
        </ol>
      </details>
    </section>
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

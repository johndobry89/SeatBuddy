<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { Snapshot } from '../../background/coordinator';
import { roles, type Scenario } from '../../core/types';
import { panelReplySchema, type PanelCommand } from '../../privacy/protocol';
import { liveDetection } from '../../adapters/vue-cinemas';

const state = ref<Snapshot | null>(null);
const error = ref('');
const busy = ref(false);
const scenario = ref<Scenario>('matching');
const checks = ref<Record<string, boolean>>({});
let timer: ReturnType<typeof setInterval> | undefined;
const checklist = [
  'Gebruik een eigen geldig account en eigen pas per persoon.',
  'Vergelijk film, bioscoop, datum, aanvangstijd en zaal.',
  'Controleer stoelen, gangpaden, categorie en eventuele kosten zelf.',
  'Rond uitsluitend zelf en afzonderlijk af op de officiële website.',
  'Controleer iedere echte bevestiging apart; een vinkje hier bewijst niets.',
];
async function command(message: PanelCommand) {
  if (busy.value) return;
  busy.value = true;
  try {
    const reply: unknown = await chrome.runtime.sendMessage(message);
    const result = panelReplySchema.parse(reply);
    if (!result.ok) throw new Error(result.error);
    state.value = result.state;
    error.value = '';
    if (message.type !== 'GET_STATE') checks.value = {};
  } catch {
    state.value = null;
    error.value =
      'Geen betrouwbare verbinding met de extensie. Status UNKNOWN. Gebruik de handmatige checklist.';
  } finally {
    busy.value = false;
  }
}
async function openFixture() {
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL('fixture.html') });
  } catch {
    error.value = 'Fictieve testpagina kon niet worden geopend.';
  }
}
onMounted(() => {
  void command({ type: 'GET_STATE' });
  timer = setInterval(() => void command({ type: 'GET_STATE' }), 2000);
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <main>
    <header>
      <p class="eyebrow">Twee personen · twee onafhankelijke transacties</p>
      <h1 id="simulation-title" tabindex="-1">SeatBuddies — simulatie</h1>
      <p>Een rustige checklist naast je filmavond.</p>
    </header>
    <p class="notice">
      <strong>Alleen lokale simulatie.</strong> Geen live detectie, reservering,
      betaling of seat hold.
    </p>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="!state && !error" role="status">Status laden…</p>
    <section aria-labelledby="demo-title">
      <h2 id="demo-title">Fictieve demo</h2>
      <label for="scenario">Scenario</label>
      <select id="scenario" v-model="scenario">
        <option value="matching">
          Zelfde voorstelling, fictieve buurstoelen
        </option>
        <option value="mismatch">Verschillende aanvangstijden</option>
        <option value="partial">
          Partieel: A simulatie voltooid, B mislukt
        </option>
        <option value="aisle">Gangpad tussen F10 en F11</option>
        <option value="stale">Verlopen waarneming B</option>
      </select>
      <div class="actions">
        <button :disabled="busy" @click="command({ type: 'DEMO', scenario })">
          Start simulatie
        </button>
        <button
          class="secondary"
          :disabled="busy"
          @click="command({ type: 'MANUAL_MODE' })"
        >
          Wis sessies / handmatig
        </button>
      </div>
    </section>
    <section aria-labelledby="sessions-title">
      <h2 id="sessions-title">A en B afzonderlijk</h2>
      <p class="eyebrow">
        {{ state?.mode ?? 'UNKNOWN' }} ·
        {{
          state?.mode === 'MANUAL'
            ? 'Geen sitebewijs'
            : 'SIMULATION — geen echte boekingsstatus'
        }}
      </p>
      <div class="sessions">
        <article
          v-for="role in roles"
          :key="role"
          :aria-labelledby="`role-${role}`"
        >
          <h3 :id="`role-${role}`">Persoon {{ role }}</h3>
          <p class="status" :data-testid="`status-${role}`">
            {{ state?.sessions[role].observation?.status ?? 'UNKNOWN' }}
          </p>
          <p>Bron: {{ state?.sessions[role].evidence ?? 'UNKNOWN' }}</p>
          <template v-if="state?.sessions[role].observation">
            <p>
              {{ state.sessions[role].observation?.showtime.movie }}<br />{{
                state.sessions[role].observation?.showtime.cinema
              }}
            </p>
            <p>
              {{ state.sessions[role].observation?.showtime.date }} ·
              {{ state.sessions[role].observation?.showtime.time }} ·
              {{ state.sessions[role].observation?.showtime.hall }}
            </p>
            <p>
              Gewenste fictieve stoel:
              <strong>{{
                state.sessions[role].observation?.seat?.label ?? 'UNKNOWN'
              }}</strong>
              (niet geboekt)
            </p>
          </template>
          <p v-if="state?.sessions[role].binding">
            Fictieve tab {{ state.sessions[role].binding?.tabId }} ·
            {{
              state.sessions[role].binding?.incognito ? 'incognito' : 'regulier'
            }}
          </p>
          <p v-else>Geen browsertab gekoppeld.</p>
          <button
            v-if="state?.mode === 'DEMO'"
            class="secondary"
            :disabled="
              busy ||
              !['SELECTED', 'REVIEW_REQUIRED'].includes(
                state.sessions[role].observation?.status ?? '',
              )
            "
            @click="command({ type: 'DEMO_STEP', role })"
          >
            Volgende simulatiestap {{ role }}
          </button>
        </article>
      </div>
      <dl>
        <dt>Voorstelling</dt>
        <dd data-testid="match">{{ state?.match ?? 'UNKNOWN' }}</dd>
        <dt>Buurstoelen (alleen mock)</dt>
        <dd data-testid="adjacency">{{ state?.adjacency ?? 'UNKNOWN' }}</dd>
      </dl>
      <aside aria-live="polite">
        <strong>Volgende stap</strong>
        <p>
          {{
            state?.nextStep ??
            'Volg de handmatige checklist; er is geen betrouwbare status.'
          }}
        </p>
      </aside>
    </section>
    <section aria-labelledby="manual-title">
      <h2 id="manual-title">Handmatige fallback</h2>
      <p>
        {{ liveDetection().reason }} Deze vinkjes zijn persoonlijke
        geheugensteuntjes, geen bewijs van een boeking.
      </p>
      <fieldset v-for="role in roles" :key="role">
        <legend>Checklist persoon {{ role }}</legend>
        <label v-for="(item, index) in checklist" :key="index" class="check">
          <input v-model="checks[`${role}-${index}`]" type="checkbox" />
          <span>{{ item }}</span>
        </label>
      </fieldset>
    </section>
    <section aria-labelledby="spike-title">
      <h2 id="spike-title">Lokale sessieproef</h2>
      <p>
        Incognitotoegang:
        <strong>{{
          state?.incognitoAllowed
            ? 'toegestaan door Chrome'
            : 'niet beschikbaar / niet toegestaan'
        }}</strong
        >. Dit bewijst geen twee echte accounts of uniforme Side Panel-werking.
      </p>
      <p>
        Open de fictieve pagina voor A in een regulier venster. Een verpakte
        extensiepagina kan in spanning-modus niet als hoofdpagina van een
        incognitotab worden geladen. De A/B-demo blijft fictief. Gebruik de
        boekingsassistent voor een aparte, handmatige koppeling van echte
        Chrome-contextmetadata; die leest geen website.
      </p>
      <button class="secondary" @click="openFixture">
        Open fictieve testpagina
      </button>
      <p>
        Alles blijft tijdelijk in het geheugen. Na navigatie, sluiten, herstart
        of 60 seconden zonder waarneming vervalt de status. Er worden geen
        acties herhaald.
      </p>
    </section>
    <footer>
      Independent third-party tool. Not affiliated with or endorsed by Vue
      Cinemas. Reservations remain separate and are only final when
      independently confirmed by Vue.
    </footer>
  </main>
</template>

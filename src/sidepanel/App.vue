<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useCompanion } from './use-companion';
import { roles, type Showtime } from '../core/types';
import { manualSummary, planningSchema } from '../core/manual-assistant';
import ShowtimeFields from './components/ShowtimeFields.vue';
import ManualTrack from './components/ManualTrack.vue';
import SimulationPanel from './components/SimulationPanel.vue';
import DiagnosticsPanel from './components/DiagnosticsPanel.vue';
import { version } from '../../package.json';
import BrandHeader from '../components/BrandHeader.vue';
import BuddyManager from '../components/BuddyManager.vue';
import { selectedBuddy } from '../core/buddies';
import { selfCheck } from '../privacy/diagnostics';
const { snapshot, offline, error, busy, lifecycleNotice, command, reconnect } =
  useCompanion();
const buddyView = computed(() =>
  snapshot.value
    ? { ...snapshot.value.buddy, generation: snapshot.value.generation }
    : null,
);
const activeBuddy = computed(() =>
  snapshot.value ? selectedBuddy(snapshot.value.buddy) : null,
);
const view = ref<'manual' | 'simulation'>('manual');
async function runDiagnostic() {
  await command({ type: 'GET_STATE' });
  return selfCheck(snapshot.value, offline.value);
}
const plan = ref<Showtime>({
  movie: null,
  cinema: null,
  date: null,
  time: null,
  hall: null,
});
const formError = ref('');
watch(
  () => `${snapshot.value?.generation}:${snapshot.value?.resetVersion}`,
  (current, previous) => {
    if (current !== previous) {
      plan.value = {
        movie: null,
        cinema: null,
        date: null,
        time: null,
        hall: null,
      };
      formError.value = '';
    }
  },
);
watch(
  () => snapshot.value?.manual.plan,
  (current, previous) => {
    if (previous && !current)
      plan.value = {
        movie: null,
        cinema: null,
        date: null,
        time: null,
        hall: null,
      };
  },
);
async function clearAll() {
  if (await command({ type: 'RESET' })) {
    plan.value = {
      movie: null,
      cinema: null,
      date: null,
      time: null,
      hall: null,
    };
    formError.value = '';
  }
}
const heading = ref<HTMLElement | null>(null);
const summary = computed(() =>
  snapshot.value ? manualSummary(snapshot.value.manual) : null,
);
let timer: ReturnType<typeof setInterval> | undefined;
async function changeView(value: typeof view.value) {
  view.value = value;
  if (value === 'manual') await command({ type: 'MANUAL_MODE' });
  await nextTick();
  if (value === 'manual') heading.value?.focus();
  else document.getElementById('simulation-title')?.focus();
}
async function savePlan() {
  const parsed = planningSchema.safeParse(plan.value);
  if (!parsed.success) {
    formError.value =
      'Vul een geldige film, bioscoop, datum en tijd in. Laat een onbekende zaal leeg.';
    return;
  }
  if (await command({ type: 'PLAN', plan: parsed.data })) {
    formError.value = '';
    await nextTick();
    document.getElementById('tracks-title')?.focus();
  }
}
onMounted(async () => {
  await command({ type: 'GET_STATE' });
  if (snapshot.value?.manual.plan)
    plan.value = { ...snapshot.value.manual.plan };
  timer = setInterval(() => {
    if (view.value === 'manual') void command({ type: 'GET_STATE' });
  }, 2000);
});
onUnmounted(() => clearInterval(timer));
</script>
<template>
  <div class="app-shell">
    <BrandHeader />
    <nav aria-label="Werkwijze">
      <button :aria-pressed="view === 'manual'" @click="changeView('manual')">
        Boekingsassistent</button
      ><button
        class="secondary"
        :aria-pressed="view === 'simulation'"
        @click="changeView('simulation')"
      >
        Simulatie / technische proef
      </button>
    </nav>
    <main v-if="view === 'manual'">
      <header>
        <p class="eyebrow">Zelf plannen · afzonderlijk controleren</p>
        <h1 ref="heading" tabindex="-1">Samen naar de film</h1>
        <p class="intro" data-testid="panel-buddy">
          Ik + {{ activeBuddy?.nickname ?? 'een buddy' }} · twee eigen accounts.
          Jij houdt de regie.
        </p>
      </header>
      <p class="notice">
        Deze assistent leest Vue niet en boekt niets.
        <strong
          >Eigen vinkjes of meldingen zijn geen websitebevestiging.</strong
        >
        Gegevens blijven tijdelijk in het geheugen; sluiten of herstart kan ze
        wissen.
      </p>
      <p v-if="offline" class="notice">
        Alleen lokaal in dit paneel. Browserkoppeling is niet beschikbaar; bij
        herladen verdwijnt je invoer. Opnieuw verbinden wist ook de tijdelijke
        gegevens in andere SeatBuddies-panelen.
      </p>
      <button
        v-if="offline"
        class="secondary"
        :disabled="busy"
        @click="reconnect"
      >
        Verbind opnieuw en wis tijdelijke gegevens
      </button>
      <p v-if="lifecycleNotice" role="status" class="notice">
        {{ lifecycleNotice }}
      </p>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <details class="panel-buddies">
        <summary>Buddy kiezen of beheren</summary>
        <BuddyManager
          :state="buddyView"
          :busy="busy"
          :disabled="offline"
          prefix="panel"
          @command="command"
        />
      </details>
      <section aria-labelledby="plan-title">
        <h2 id="plan-title">1. Kies jullie voorstelling</h2>
        <p>
          Vul alleen filmgegevens in. Geen namen, pasnummers, wachtwoorden of
          betaalgegevens.
        </p>
        <form @submit.prevent="savePlan">
          <ShowtimeFields v-model="plan" prefix="plan" />
          <p v-if="formError" role="alert" class="error">{{ formError }}</p>
          <p v-if="snapshot?.manual.plan" class="source">
            Opnieuw opslaan wist beide controles en koppelingen. Je begint
            bewust opnieuw.
          </p>
          <button :disabled="busy">Bewaar filmplan</button>
        </form>
        <p
          v-if="snapshot?.manual.plan && !snapshot.manual.plan.hall"
          class="notice"
        >
          Zaal UNKNOWN. Er is nog geen volledige voorstellingmatch; vul de zaal
          in zodra je die zelf weet.
        </p>
      </section>
      <section v-if="snapshot" aria-labelledby="tracks-title">
        <h2 id="tracks-title" tabindex="-1">
          2. Controleer A en B afzonderlijk
        </h2>
        <p>
          Open zelf een normaal venster voor A en een incognitovenster voor B.
          Als dat niet kan, gebruik je aparte eigen profielen en volg je de
          handmatige stappen. De extensie bewijst geen accountisolatie.
        </p>
        <a
          href="https://www.vuecinemas.nl/"
          target="_blank"
          rel="noopener noreferrer"
          class="site-link"
          >Open de officiële Vue-website zelf ↗</a
        >
        <p class="source">
          De link opent een gewone pagina in de huidige browsercontext. Hij
          maakt geen tweede account of incognitovenster aan.
        </p>
        <div class="sessions">
          <ManualTrack
            v-for="role in roles"
            :key="`${role}-${snapshot.generation}-${snapshot.resetVersion}-${role === 'B' ? `${activeBuddy?.id ?? 'manual'}:${activeBuddy?.nickname ?? ''}` : ''}`"
            :role="role"
            :nickname="role === 'B' ? (activeBuddy?.nickname ?? null) : null"
            :state="snapshot"
            :busy="busy"
            :offline="offline"
            @command="command"
          />
        </div>
      </section>
      <section aria-labelledby="comparison-title">
        <h2 id="comparison-title">3. Vergelijk voor je zelf afrondt</h2>
        <dl>
          <dt>Voorstelling volgens eigen controles</dt>
          <dd data-testid="manual-match">
            {{ summary?.match ?? 'UNKNOWN' }} — geen sitebewijs
          </dd>
          <dt>Gewenste stoelen</dt>
          <dd data-testid="manual-adjacency">
            {{
              summary?.adjacency === 'CONSECUTIVE_UNVERIFIED'
                ? 'Nummers volgen op elkaar — niet geverifieerd naast elkaar'
                : summary?.adjacency === 'NOT_CONSECUTIVE'
                  ? 'Nummers niet opeenvolgend — controleer zelf'
                  : 'UNKNOWN — zaal, rij of stoel ontbreekt'
            }}
          </dd>
        </dl>
        <p>
          Gangpad, stoelcategorie, beschikbaarheid en echte aangrenzendheid zijn
          niet vastgesteld. Opeenvolgende nummers zijn onvoldoende bewijs.
        </p>
        <aside v-if="summary?.partial" role="status" class="notice">
          Partiële eigen melding: {{ summary.done[0] }} meldt afgerond; de ander
          is nog niet klaar. Controleer iedere uitkomst apart. Geen automatische
          herhaling, annulering of rollback.
        </aside>
        <aside v-else-if="summary?.done.length === 2" class="notice">
          Beiden melden zelf afgerond. Werkelijke bevestigingen blijven UNKNOWN
          totdat jullie die zelf op Vue controleren. De extensie heeft geen
          bevestiging waargenomen.
        </aside>
      </section>
      <details class="reset-area">
        <summary>Alle gegevens wissen</summary>
        <button class="secondary" :disabled="busy" @click="clearAll">
          Wis alle tijdelijke gegevens
        </button>
      </details>
      <footer>
        Onafhankelijke assistent, niet verbonden aan of goedgekeurd door Vue
        Cinemas. Twee afzonderlijke reserveringen; alleen echte afzonderlijke
        bevestigingen op Vue gelden. Testbuild {{ version }}.
      </footer>
    </main>
    <SimulationPanel v-else />
    <DiagnosticsPanel :run="runDiagnostic" :busy="busy" />
  </div>
</template>

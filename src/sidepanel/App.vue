<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useCompanion } from './use-companion';
import { type Showtime } from '../core/types';
import {
  manualSummary,
  planningSchema,
  activeRoles,
  hasBHistory,
} from '../core/manual-assistant';
import PreflightReview from './components/PreflightReview.vue';
import StableAnnouncer from '../components/StableAnnouncer.vue';
import { nextMovieNightStep } from '../core/movie-night';
import SeatFields from './components/SeatFields.vue';
import ShowtimeFields from './components/ShowtimeFields.vue';
import ManualTrack from './components/ManualTrack.vue';
import SimulationPanel from './components/SimulationPanel.vue';
import DiagnosticsPanel from './components/DiagnosticsPanel.vue';
import { version } from '../../package.json';
import BrandHeader from '../components/BrandHeader.vue';
import BuddyManager from '../components/BuddyManager.vue';
import RetentionControls from '../components/RetentionControls.vue';
import MovieNightHQ from './components/MovieNightHQ.vue';
import NormalWindowButton from '../components/NormalWindowButton.vue';
import { draftPlanSchema } from '../core/retained-data';
import { selectedBuddy } from '../core/buddies';
import { selfCheck } from '../privacy/diagnostics';
const {
  snapshot,
  offline,
  error,
  busy,
  lifecycleNotice,
  command,
  reconnect,
  restoredDraft,
} = useCompanion();
const buddyView = computed(() =>
  snapshot.value
    ? {
        ...snapshot.value.buddy,
        generation: snapshot.value.generation,
        retention: snapshot.value.retention,
      }
    : null,
);
const activeBuddy = computed(() =>
  snapshot.value ? selectedBuddy(snapshot.value.buddy) : null,
);
const pendingSolo = ref(false);
const discardVersion = ref(0);
const initialSeats = ref({
  A: { row: '', number: '' },
  B: { row: '', number: '' },
});
const dirty = ref({ A: false, B: false });
const announcement = computed(
  () =>
    lifecycleNotice.value ||
    (snapshot.value
      ? `${snapshot.value.manual.planningMode === 'SOLO' ? 'Solo' : 'Samen'} plannen. ${nextMovieNightStep(snapshot.value.manual).text}`
      : ''),
);
watch(
  () =>
    `${snapshot.value?.generation}:${snapshot.value?.resetVersion}:${snapshot.value?.buddyEpoch}`,
  () => {
    pendingSolo.value = false;
    dirty.value.B = false;
  },
);
async function chooseMode(mode: 'SOLO' | 'TOGETHER', confirmed = false) {
  if (!snapshot.value || mode === snapshot.value.manual.planningMode) return;
  if (
    mode === 'SOLO' &&
    !confirmed &&
    (hasBHistory(snapshot.value.manual) ||
      dirty.value.B ||
      !!initialSeats.value.B.row ||
      !!initialSeats.value.B.number)
  ) {
    pendingSolo.value = true;
    await nextTick();
    document.getElementById('solo-confirm-title')?.focus();
    return;
  }
  if (await command({ type: 'PLANNING_MODE', mode, resetB: confirmed })) {
    pendingSolo.value = false;
    initialSeats.value.B = { row: '', number: '' };
    await nextTick();
    document.getElementById('mode-title')?.focus();
  }
}
async function reviewPlan() {
  if (
    planDirty.value ||
    dirty.value.A ||
    (snapshot.value?.manual.planningMode === 'TOGETHER' && dirty.value.B)
  )
    return;
  if (await command({ type: 'REVIEW_PLAN' })) {
    await nextTick();
    (
      document.getElementById('next-own-A') ??
      document.getElementById('next-own-B') ??
      document.getElementById('tracks-title')
    )?.focus();
  }
}
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
const planDirty = computed(
  () =>
    !!snapshot.value?.manual.plan &&
    (['movie', 'cinema', 'date', 'time', 'hall'] as const).some(
      (key) => plan.value[key] !== snapshot.value?.manual.plan?.[key],
    ),
);
const formError = ref('');
const concept = ref(false);
const draftFeedback = ref('');
watch(restoredDraft, (value) => {
  if (value) {
    plan.value = { ...value };
    concept.value = true;
    draftFeedback.value =
      'Concept, opnieuw controleren. Alleen invoervelden hersteld; bewaar het filmplan na eigen controle.';
  }
});
async function draftAction(
  type: 'DRAFT_SAVE' | 'DRAFT_RESTORE' | 'DRAFT_DELETE',
) {
  if (!snapshot.value || offline.value) return;
  const gate = {
    generation: snapshot.value.generation,
    revision: snapshot.value.buddy.revision,
  };
  if (type === 'DRAFT_SAVE') {
    const parsed = draftPlanSchema.safeParse(plan.value);
    if (!parsed.success) {
      draftFeedback.value =
        'Vul alleen geldige filmgegevens in; geen accountgegevens, links of pasnummers.';
      return;
    }
    if (await command({ type, ...gate, plan: parsed.data }))
      draftFeedback.value =
        'Alleen filmplan-concept tijdelijk bewaard, maximaal 4 uur. Geen stoelen, buddy’s, controles of boekingsstatus.';
  } else if ((await command({ type, ...gate })) && type === 'DRAFT_DELETE')
    draftFeedback.value =
      'Opgeslagen concept verwijderd; je huidige invoer blijft staan.';
}
function emptyPlan() {
  return { movie: null, cinema: null, date: null, time: null, hall: null };
}
function clearForm() {
  plan.value = emptyPlan();
  initialSeats.value = {
    A: { row: '', number: '' },
    B: { row: '', number: '' },
  };
  formError.value = '';
  concept.value = false;
  draftFeedback.value = '';
  dirty.value = { A: false, B: false };
}
watch(snapshot, (current, previous) => {
  if (!current || !previous) return;
  if (current.generation !== previous.generation) {
    const edited = (['movie', 'cinema', 'date', 'time', 'hall'] as const).some(
      (key) =>
        plan.value[key] !== previous.manual.plan?.[key] &&
        plan.value[key] !== null,
    );
    if (edited) {
      concept.value = true;
      draftFeedback.value =
        'Onopgeslagen filmconcept blijft alleen hier. Geen plan, samenmodus of eigen controles hersteld; controleer en bewaar opnieuw.';
    } else {
      plan.value = emptyPlan();
      concept.value = false;
      draftFeedback.value = '';
    }
    initialSeats.value.B = { row: '', number: '' };
    formError.value = '';
    pendingSolo.value = false;
  } else if (current.resetVersion !== previous.resetVersion) {
    clearForm();
    discardVersion.value++;
  }
});
async function clearAll() {
  if (await command({ type: 'RESET' })) {
    clearForm();
    discardVersion.value++;
    plan.value = {
      movie: null,
      cinema: null,
      date: null,
      time: null,
      hall: null,
    };
    formError.value = '';
    dirty.value = { A: false, B: false };
    await nextTick();
    heading.value?.focus();
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
  const initial = !snapshot.value?.manual.plan
    ? {
        A: { ...initialSeats.value.A },
        ...(snapshot.value?.manual.planningMode === 'TOGETHER'
          ? { B: { ...initialSeats.value.B } }
          : {}),
      }
    : undefined;
  if (
    await command({
      type: 'PLAN',
      plan: parsed.data,
      ...(initial ? { initialSeats: initial } : {}),
    })
  ) {
    initialSeats.value = {
      A: { row: '', number: '' },
      B: { row: '', number: '' },
    };
    concept.value = false;
    formError.value = '';
    await nextTick();
    document.getElementById('review-title')?.focus();
  }
}
onMounted(async () => {
  await command({ type: 'GET_STATE' });
  if (snapshot.value?.manual.plan && !Object.values(plan.value).some(Boolean))
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
    <StableAnnouncer :message="announcement" />
    <main v-show="view === 'manual'">
      <header>
        <p class="eyebrow">Zelf plannen · afzonderlijk controleren</p>
        <h1 ref="heading" tabindex="-1">Samen naar de film</h1>
        <p class="intro" data-testid="panel-buddy">
          {{
            snapshot?.manual.planningMode === 'TOGETHER'
              ? `Ik + ${activeBuddy?.nickname ?? 'een buddy'} · twee eigen accounts.`
              : 'Ik ga alleen · één eigen traject.'
          }}
          Jij houdt de regie. Een gekozen bijnaam activeert B niet.
        </p>
      </header>
      <p class="notice">
        Alleen eigen invoer; SeatBuddies leest Vue niet en boekt niets. Eigen
        meldingen zijn geen websitebevestiging.
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
      <NormalWindowButton v-if="offline" />
      <p v-if="lifecycleNotice" class="notice" data-testid="lifecycle-notice">
        {{ lifecycleNotice }}
      </p>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <MovieNightHQ v-if="snapshot" :state="snapshot" />
      <section aria-labelledby="plan-title">
        <h2 id="plan-title">1. Kies jullie voorstelling</h2>
        <fieldset v-if="snapshot" class="planning-mode">
          <legend id="mode-title" tabindex="-1">
            Hoe plan je deze filmavond?
          </legend>
          <div class="actions">
            <button
              type="button"
              class="secondary"
              :aria-pressed="snapshot.manual.planningMode === 'SOLO'"
              :disabled="busy"
              @click="chooseMode('SOLO')"
            >
              Ik ga alleen
            </button>
            <button
              type="button"
              class="secondary"
              :aria-pressed="snapshot.manual.planningMode === 'TOGETHER'"
              :disabled="busy"
              @click="chooseMode('TOGETHER')"
            >
              Ook met buddy plannen
            </button>
          </div>
          <p class="source">
            B heeft een eigen account en eigen menselijke stappen. Een nieuw
            ander filmplan begint weer solo; dezelfde voorstelling bewerken
            behoudt de keuze.
          </p>
        </fieldset>
        <div
          v-if="pendingSolo"
          role="group"
          aria-labelledby="solo-confirm-title"
          class="notice"
        >
          <h3 id="solo-confirm-title" tabindex="-1">
            Alleen B’s lokale gegevens wissen?
          </h3>
          <p>
            Solo kiezen wist B’s invoer (ook onopgeslagen), koppeling en
            controles. A blijft behouden. Dit annuleert geen echte boeking.
          </p>
          <button :disabled="busy" @click="chooseMode('SOLO', true)">
            Wis lokaal B en plan solo
          </button>
          <button
            class="secondary"
            @click="
              pendingSolo = false;
              ($event.target as HTMLElement)
                .closest('section')
                ?.querySelector('legend')
                ?.focus();
            "
          >
            Behoud buddytraject
          </button>
        </div>
        <p>
          Vul alleen filmgegevens in. Geen namen, pasnummers, wachtwoorden of
          betaalgegevens.
        </p>
        <form @submit.prevent="savePlan">
          <p v-if="concept" class="notice" role="status">
            Concept, opnieuw controleren — alleen invoervelden. Een bestaand
            plan en eigen controles komen niet uit dit concept. Bewaar pas na
            eigen controle.
          </p>
          <ShowtimeFields v-model="plan" prefix="plan" />
          <div v-if="snapshot && !snapshot.manual.plan" class="initial-seats">
            <p class="source">
              Gewenste stoelen (optioneel nu invullen). Alleen eigen invoer;
              geen beschikbaarheid of hold.
            </p>
            <SeatFields
              v-for="role in activeRoles(snapshot.manual)"
              :key="role"
              v-model="initialSeats[role]"
              :role="role"
              prefix="plan-"
            />
          </div>
          <p v-if="formError" role="alert" class="error">{{ formError }}</p>
          <p v-if="snapshot?.manual.plan" class="source">
            Opnieuw opslaan wist beide controles en koppelingen. Je begint
            bewust opnieuw.
          </p>
          <button :disabled="busy">Bewaar filmplan</button>
        </form>
        <details class="draft-controls">
          <summary>Filmplan-concept veilig bewaren of herstellen</summary>
          <p class="source">
            Alleen film, bioscoop, datum, tijd en zaal. Nooit automatisch.
            Maximaal 4 uur in Chrome-sessieopslag; workerstop kan dit bewaren,
            browserherstart/extensie-update/reload wist het. Herstellen vult
            alleen dit formulier, zonder plan of controles te activeren.
          </p>
          <div class="actions">
            <button
              type="button"
              class="secondary"
              :disabled="busy || offline || !snapshot?.retention.draftSupported"
              @click="draftAction('DRAFT_SAVE')"
            >
              Bewaar tijdelijk filmplan-concept
            </button>
            <button
              type="button"
              class="secondary"
              :disabled="busy || offline || !snapshot?.retention.draftExpiresAt"
              @click="draftAction('DRAFT_RESTORE')"
            >
              Herstel concept
            </button>
            <button
              type="button"
              class="secondary"
              :disabled="busy || offline || !snapshot?.retention.draftExpiresAt"
              @click="draftAction('DRAFT_DELETE')"
            >
              Verwijder concept
            </button>
          </div>
          <p v-if="!snapshot?.retention.draftSupported" class="source">
            Conceptopslag niet beschikbaar; handmatig plannen werkt wel.
          </p>
          <p v-if="draftFeedback" role="status">{{ draftFeedback }}</p>
        </details>
        <p
          v-if="snapshot?.manual.plan && !snapshot.manual.plan.hall"
          class="notice"
        >
          Zaal UNKNOWN. Er is nog geen volledige voorstellingmatch; vul de zaal
          in zodra je die zelf weet.
        </p>
      </section>
      <PreflightReview
        v-if="snapshot"
        :state="snapshot.manual"
        :busy="busy"
        :dirty="
          planDirty ||
          dirty.A ||
          (snapshot.manual.planningMode === 'TOGETHER' && dirty.B)
        "
        @review="reviewPlan"
      />
      <section
        v-if="snapshot"
        v-show="snapshot.manual.plan || dirty.A"
        aria-labelledby="tracks-title"
      >
        <h2 id="tracks-title" tabindex="-1">
          {{
            snapshot.manual.review
              ? '3. Eigen stappen — afzonderlijk controleren'
              : 'Eigen invoer voor de review'
          }}
        </h2>
        <p>
          Open zelf een normaal venster voor A. Alleen bij samen plannen: een
          incognitovenster voor B. Als dat niet kan, gebruik je aparte eigen
          profielen en volg je de handmatige stappen. De extensie bewijst geen
          accountisolatie.
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
            v-for="role in activeRoles(snapshot.manual)"
            :key="`${role}-${discardVersion}-${role === 'B' ? `${snapshot.generation}:${snapshot.buddyEpoch}:${activeBuddy?.id ?? 'manual'}:${activeBuddy?.nickname ?? ''}` : ''}`"
            :role="role"
            :nickname="role === 'B' ? (activeBuddy?.nickname ?? null) : null"
            :state="snapshot"
            :busy="busy"
            :blocked="planDirty || dirty.A || dirty.B"
            :offline="offline"
            @command="command"
            @dirty="dirty[role] = $event"
          />
        </div>
        <p v-if="snapshot.manual.planningMode === 'SOLO'" class="source">
          Buddy (B) is niet actief. Kies bewust Ook met buddy plannen voor een
          tweede onafhankelijk traject.
        </p>
      </section>
      <section
        v-show="snapshot?.manual.planningMode === 'TOGETHER'"
        aria-labelledby="comparison-title"
      >
        <h2 id="comparison-title">Vergelijking van eigen meldingen</h2>
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
        <aside v-if="summary?.partial" class="notice">
          Partiële eigen melding: {{ summary.done[0] }} meldt afgerond; de ander
          is nog niet klaar. Controleer iedere uitkomst apart. Geen automatische
          herhaling, annulering of rollback.
        </aside>
        <aside v-else-if="summary?.done.length === 2" class="notice">
          Beide zelf gemeld; echte bevestiging op Vue niet geverifieerd.
          Werkelijke bevestigingen blijven UNKNOWN totdat jullie die zelf op Vue
          controleren. De extensie heeft geen bevestiging waargenomen.
        </aside>
      </section>
      <details class="tutorial">
        <summary>Probeer SeatBuddies in 90 seconden</summary>
        <ol>
          <li>
            Vul De maan van papier, Fictief Filmhuis, 12 april 2030, 19:30, Zaal
            2 in en bewaar het plan.
          </li>
          <li>
            Kies Ook met buddy plannen. Vul A F10 en B F11 in; controleer eerst
            de filmavond en doorloop daarna zelf de vijf stappen van A. B moet
            zelfstandig blijven.
          </li>
          <li>
            Vergelijk bovenaan: A's eigen melding is geen websitebewijs,
            opeenvolgende stoelen zijn niet bewezen aangrenzend. Alles blijft
            fictief.
          </li>
        </ol>
        <p class="source">
          Geen account, ticket of checkout nodig. Een buddy kiezen is optioneel.
        </p>
      </details>
      <details class="panel-buddies">
        <summary>Buddy kiezen of beheren</summary>
        <BuddyManager
          :state="buddyView"
          :busy="busy"
          :disabled="offline"
          prefix="panel"
          @command="command"
        />
        <RetentionControls
          :state="buddyView"
          :busy="busy || offline"
          prefix="panel"
          @command="command"
        />
      </details>
      <details class="reset-area">
        <summary>Alle gegevens wissen</summary>
        <p>
          Wist ook opgeslagen buddies en het tijdelijke concept, zonder echte
          boeking te annuleren.
        </p>
        <button class="secondary" :disabled="busy" @click="clearAll">
          Wis alle tijdelijke gegevens
        </button>
      </details>
      <footer>
        Onafhankelijke assistent, niet verbonden aan of goedgekeurd door Vue
        Cinemas. Twee afzonderlijke reserveringen; alleen echte afzonderlijke
        bevestigingen op Vue gelden. Vue kan wijzigen; deze niet-officiële
        assistent kan dan ophouden te werken. Testbuild {{ version }}.
      </footer>
    </main>
    <SimulationPanel v-if="view === 'simulation'" />
    <DiagnosticsPanel :run="runDiagnostic" :busy="busy">
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
    </DiagnosticsPanel>
  </div>
</template>

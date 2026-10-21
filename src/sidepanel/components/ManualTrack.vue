<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Snapshot } from '../../background/coordinator';
import { type Role } from '../../core/types';
import {
  manualSteps,
  stepLabels,
  recoveryText,
} from '../../core/manual-assistant';
import type { PanelCommand } from '../../privacy/protocol';
import SeatFields from './SeatFields.vue';
import ShowtimeFields from './ShowtimeFields.vue';
const props = defineProps<{
  role: Role;
  nickname: string | null;
  state: Snapshot;
  busy: boolean;
  blocked: boolean;
  offline: boolean;
}>();
const emit = defineEmits<{
  command: [command: PanelCommand];
  dirty: [value: boolean];
}>();
const track = computed(() => props.state.manual.tracks[props.role]);
const detailsOpen = ref(!props.state.manual.review);
const empty = { movie: null, cinema: null, date: null, time: null, hall: null };
const showtime = ref({
  ...(track.value.reportedShowtime ?? props.state.manual.plan ?? empty),
});
const seat = ref({ ...track.value.seat });
const isDirty = computed(
  () =>
    JSON.stringify({ showtime: showtime.value, seat: seat.value }) !==
    JSON.stringify({
      showtime:
        track.value.reportedShowtime ?? props.state.manual.plan ?? empty,
      seat: track.value.seat,
    }),
);
watch(isDirty, (value) => emit('dirty', value));
const selectedContext = ref('');
const contextFeedback = ref('');
async function focusSelected() {
  const choice = choices.value.find(
    (value) => value.tabId === Number(selectedContext.value),
  );
  if (!choice) return;
  try {
    await chrome.windows.update(choice.windowId, { focused: true });
    contextFeedback.value =
      'Gekozen venster getoond. Dit heeft nog geen koppeling gemaakt.';
  } catch {
    contextFeedback.value =
      'Venster kon niet worden getoond. Controleer de context zelf of werk handmatig.';
  }
}
const retainedDraft = ref(false);
const canonical = () =>
  JSON.stringify({
    showtime: track.value.reportedShowtime ?? props.state.manual.plan ?? empty,
    seat: track.value.seat,
  });
watch(canonical, (current, previous) => {
  const local = JSON.stringify({ showtime: showtime.value, seat: seat.value });
  if (props.role === 'A' && local !== previous && local !== current) {
    retainedDraft.value = true;
    selectedContext.value = '';
    contextFeedback.value = '';
    return;
  }
  showtime.value = {
    ...(track.value.reportedShowtime ?? props.state.manual.plan ?? empty),
  };
  seat.value = { ...track.value.seat };
  retainedDraft.value = false;
  if (track.value.seat.row && track.value.seat.number)
    detailsOpen.value = false;
});
const next = computed(() => manualSteps[track.value.completed.length]);
const choices = computed(() =>
  props.state.contexts.filter(
    (context) => context.incognito === (props.role === 'B'),
  ),
);
function saveDetails() {
  emit('command', {
    type: 'MANUAL_DETAILS',
    role: props.role,
    showtime: showtime.value,
    seat: seat.value,
  });
}
</script>
<template>
  <article class="track" :aria-labelledby="`account-${role}`">
    <div class="track-heading">
      <span class="role-mark">{{ role }}</span>
      <div>
        <h3 :id="`account-${role}`">
          <span>{{ role === 'A' ? 'Ik' : (nickname ?? 'Mijn buddy') }}</span
          ><small class="source">Account {{ role }}</small>
        </h3>
        <p>
          {{
            role === 'A'
              ? 'Eigen account · normaal venster'
              : 'Eigen account · incognito of handmatig apart'
          }}
        </p>
      </div>
    </div>
    <p v-if="retainedDraft" class="notice" data-testid="retained-track-draft">
      Onopgeslagen eigen invoer blijft alleen hier als concept. Geen controles
      of koppeling hersteld. Bewaar eerst een actueel filmplan en controleer
      daarna je invoer.
    </p>
    <p class="status" :data-testid="`manual-status-${role}`">
      {{
        track.completed.includes('DONE')
          ? 'Zelf gemeld afgerond'
          : track.problem
            ? 'Opnieuw controleren'
            : track.completed.length
              ? 'Bezig — eigen controles'
              : 'Nog niet gecontroleerd'
      }}
    </p>
    <p class="source" :data-testid="`manual-evidence-${role}`">
      Bron: {{ state.evidence[role].manual }} / eigen invoer. Websitebewijs:
      UNKNOWN.
    </p>
    <p v-if="track.reviewedAt" class="source">
      Laatste eigen controle:
      {{ new Date(track.reviewedAt).toLocaleTimeString('nl-NL') }} · vervalt na
      15 minuten.
    </p>
    <p v-if="track.problem" class="notice">
      {{ recoveryText[track.problem] }}
    </p>
    <p v-if="track.context" class="context-note">
      BROWSER_CONTEXT_ONLY · Chrome-context gekoppeld: venster
      {{ track.context.windowId }}, tab {{ track.context.tabId }},
      {{ track.context.incognito ? 'incognito' : 'normaal' }}. Dit koppelt geen
      account en leest geen Vue-pagina.
    </p>
    <p v-else class="context-note">
      Geen browsercontext gekoppeld. Volg de stappen zelf in een apart eigen
      venster; de assistent blijft bruikbaar.
    </p>
    <details>
      <summary>Browsercontext kiezen of loskoppelen</summary>
      <p>
        Maak het juiste venster zelf actief. Kies hieronder de actieve tab van
        dat venster. Alleen tab-/vensternummers en incognitostatus worden
        gelezen, geen titels of URL’s.
      </p>
      <button
        class="secondary"
        :disabled="offline || busy"
        @click="emit('command', { type: 'GET_CONTEXTS' })"
      >
        Vensterlijst ophalen / vernieuwen
      </button>
      <label :for="`context-${role}`">Actieve context {{ role }}</label>
      <select :id="`context-${role}`" v-model="selectedContext">
        <option value="">Kies een venster</option>
        <option
          v-for="context in choices"
          :key="context.tabId"
          :value="String(context.tabId)"
        >
          Venster {{ context.windowId }} · tab {{ context.tabId }} ·
          {{ context.incognito ? 'incognito' : 'normaal' }}
        </option>
      </select>
      <button
        class="text-button"
        :disabled="offline || busy || !selectedContext"
        @click="focusSelected"
      >
        Toon gekozen venster
      </button>
      <p v-if="contextFeedback" role="status">{{ contextFeedback }}</p>
      <button
        class="secondary"
        :disabled="offline || busy || !selectedContext"
        @click="
          emit('command', {
            type: 'BIND_CONTEXT',
            role,
            tabId: Number(selectedContext),
          })
        "
      >
        Koppel context {{ role }}
      </button>
      <button
        class="text-button"
        :disabled="busy || !track.context"
        @click="emit('command', { type: 'UNBIND', role })"
      >
        Koppeling {{ role }} losmaken
      </button>
      <p v-if="role === 'B' && !state.incognitoAllowed">
        Chrome geeft geen incognitotoegang. Zet die alleen zelf aan als je de
        proef wilt doen; anders werk je handmatig, bijvoorbeeld in een apart
        profiel.
      </p>
    </details>
    <details
      :open="detailsOpen"
      @toggle="detailsOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary>Voorstelling en stoel voor {{ role }} controleren</summary>
      <p>
        Deze velden zijn uit het plan overgenomen. Vergelijk ze zelf met Vue. Ze
        zijn geen automatische waarneming.
      </p>
      <form @submit.prevent="saveDetails">
        <ShowtimeFields v-model="showtime" :prefix="`reported-${role}`" />
        <SeatFields v-model="seat" :role="role" />
        <button class="secondary" :disabled="busy || !state.manual.plan">
          Bewaar eigen invoer {{ role }}
        </button>
      </form>
      <p>
        Wijzigen van de invoer wist de eerdere controles van alleen deze
        persoon.
      </p>
    </details>
    <p>
      Gewenst: {{ track.seat.row || '?' }}{{ track.seat.number || '?' }} ·
      beschikbaarheid en gangpad UNKNOWN.
    </p>
    <div v-if="state.manual.review && !isDirty">
      <p class="source">
        {{ track.completed.length }}/5 eigen controles — geen waargenomen
        bevestiging.
      </p>
      <details>
        <summary>Alle eigen stappen bekijken</summary>
        <ol class="progress">
          <li
            v-for="step in manualSteps"
            :key="step"
            :class="{ checked: track.completed.includes(step) }"
          >
            {{ stepLabels[step] }}
            <span v-if="track.completed.includes(step)" class="source"
              >— zelf gemeld</span
            >
          </li>
        </ol>
      </details>
      <div class="next-action">
        <p>
          <strong>Volgende eigen stap {{ role }}</strong>
        </p>
        <p v-if="next">
          {{ stepLabels[next] }}. Open en controleer de officiële website zelf.
        </p>
        <p v-else>
          Je meldt dat je zelf hebt afgerond. Controleer de echte bevestiging op
          Vue; de extensie heeft die niet waargenomen.
        </p>
        <button
          v-if="next"
          :id="`next-own-${role}`"
          :disabled="busy || blocked || !state.manual.plan"
          @click="emit('command', { type: 'ACKNOWLEDGE', role, step: next })"
        >
          {{ stepLabels[next] }} — {{ role }}
        </button>
      </div>
    </div>
    <p v-else class="source">
      Bewaar de eigen invoer en controleer eerst de filmavond hierboven. Eerdere
      eigen meldingen blijven zichtbaar in het overzicht.
    </p>
    <details>
      <summary>Probleem of opnieuw beginnen</summary>
      <div class="actions">
        <button
          class="secondary"
          :disabled="busy"
          @click="
            emit('command', { type: 'REPORT_PROBLEM', role, problem: 'LOGOUT' })
          "
        >
          Ik ben uitgelogd — {{ role }}</button
        ><button
          class="secondary"
          :disabled="busy"
          @click="
            emit('command', {
              type: 'REPORT_PROBLEM',
              role,
              problem: 'MISMATCH',
            })
          "
        >
          Voorstelling wijkt af — {{ role }}</button
        ><button
          class="secondary"
          :disabled="busy"
          @click="
            emit('command', { type: 'REPORT_PROBLEM', role, problem: 'FAILED' })
          "
        >
          Uitkomst onzeker / mislukt — {{ role }}</button
        ><button
          class="text-button"
          :disabled="busy"
          @click="emit('command', { type: 'RESET_TRACK', role })"
        >
          Begin {{ role }} opnieuw
        </button>
      </div>
    </details>
  </article>
</template>

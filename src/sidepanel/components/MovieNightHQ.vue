<script setup lang="ts">
import { computed } from 'vue';
import type { Snapshot } from '../../background/coordinator';
import { selectedBuddy } from '../../core/buddies';
import { checkAge, nextMovieNightStep } from '../../core/movie-night';
import { manualSummary } from '../../core/manual-assistant';
const props = defineProps<{ state: Snapshot }>();
const next = computed(() => nextMovieNightStep(props.state.manual));
const buddy = computed(() => selectedBuddy(props.state.buddy));
const summary = computed(() => manualSummary(props.state.manual));
</script>
<template>
  <section class="movie-night-hq" aria-labelledby="hq-title">
    <p class="eyebrow">Plan → Twee eigen controles → Samen controleren</p>
    <h2 id="hq-title">Filmavond-overzicht</h2>
    <h3>{{ state.manual.plan?.movie ?? 'Jullie volgende filmavond' }}</h3>
    <p>
      {{ state.manual.plan?.cinema ?? 'Bioscoop UNKNOWN' }} ·
      {{ state.manual.plan?.date ?? 'Datum UNKNOWN' }} ·
      {{ state.manual.plan?.time ?? 'Tijd UNKNOWN' }} ·
      {{ state.manual.plan?.hall ?? 'Zaal UNKNOWN' }}
    </p>
    <p class="source">
      Eigen filmplan ·
      {{ buddy?.nickname ?? 'nog geen buddy gekozen (optioneel)' }}
    </p>
    <div class="journey-grid">
      <article
        v-for="role in ['A', 'B'] as const"
        :key="role"
        :data-testid="`hq-${role}`"
      >
        <h3>
          {{
            role === 'A' ? 'Ik (A)' : `${buddy?.nickname ?? 'Mijn buddy'} (B)`
          }}
        </h3>
        <p>
          {{ state.manual.tracks[role].completed.length }}/5 eigen controles
        </p>
        <p class="source">
          {{ checkAge(state.manual.tracks[role].reviewedAt, Date.now()) }}
        </p>
        <p class="source">
          Bron:
          {{
            state.manual.tracks[role].completed.length
              ? 'eigen melding · MANUAL_SELF_REPORT'
              : 'UNKNOWN'
          }}<br />Browsercontext:
          {{
            state.manual.tracks[role].context
              ? 'gekozen · BROWSER_CONTEXT_ONLY'
              : 'niet gekoppeld (optioneel)'
          }}
        </p>
      </article>
    </div>
    <div class="next-action" aria-live="polite" aria-atomic="true">
      <h3>Wat moet ik nu doen?</h3>
      <p data-testid="hq-next" :data-step="next.code">{{ next.text }}</p>
    </div>
    <div
      class="seat-pair"
      role="img"
      :aria-label="`Eigen gewenste stoelen: A ${state.manual.tracks.A.seat.row || '?'}${state.manual.tracks.A.seat.number || '?'}, B ${state.manual.tracks.B.seat.row || '?'}${state.manual.tracks.B.seat.number || '?'}. Geen officiële plattegrond of beschikbaarheidsbewijs.`"
    >
      <span v-for="role in ['A', 'B'] as const" :key="role"
        >{{ role
        }}<strong
          >{{ state.manual.tracks[role].seat.row || '?'
          }}{{ state.manual.tracks[role].seat.number || '?' }}</strong
        ></span
      >
    </div>
    <p class="source" data-testid="hq-seats">
      {{
        summary.adjacency === 'CONSECUTIVE_UNVERIFIED'
          ? 'CONSECUTIVE_UNVERIFIED — zelfde rij, opeenvolgende nummers; niet bewezen naast elkaar.'
          : summary.adjacency === 'NOT_CONSECUTIVE'
            ? 'Andere rij of niet opeenvolgend — geen bewezen aangrenzendheid.'
            : 'Stoelinvoer onvolledig — UNKNOWN.'
      }}
      Geen officiële stoelkaart; gangpad, categorie, beschikbaarheid en hold
      zijn onbekend.
    </p>
  </section>
</template>

<script setup lang="ts">
import ZeroExtraNotice from './ZeroExtraNotice.vue';
import { categoryLabels, categoryEligibility } from '../../core/seat-policy';
import { computed } from 'vue';
import type { Snapshot } from '../../background/coordinator';
import { selectedBuddy } from '../../core/buddies';
import { checkAge, nextMovieNightStep } from '../../core/movie-night';
import { manualSummary, activeRoles } from '../../core/manual-assistant';
const props = defineProps<{ state: Snapshot }>();
const next = computed(() => nextMovieNightStep(props.state.manual));
const buddy = computed(() => selectedBuddy(props.state.buddy));
const summary = computed(() => manualSummary(props.state.manual));
</script>
<template>
  <section class="movie-night-hq" aria-labelledby="hq-title">
    <p class="eyebrow">Plan → Review → Eigen stappen</p>
    <h2 id="hq-title">Filmavond-overzicht</h2>
    <ZeroExtraNotice />
    <details v-if="!state.manual.plan" class="first-run">
      <summary>Wat doet SeatBuddies?</summary>
      <p>
        Je plant een filmavond en controleert zelf één of twee afzonderlijke
        trajecten. Geen accounts, tickets of websiteboekingen worden gekoppeld.
        Begin hieronder met een filmplan of probeer uitsluitend fictieve
        gegevens.
      </p>
    </details>
    <a
      v-if="!state.manual.plan"
      href="./fixture.html"
      target="_blank"
      rel="noopener noreferrer"
      class="site-link"
      >Start met een fictieve proef ↗</a
    >
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
        v-for="role in activeRoles(state.manual)"
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
        <p :data-testid="`hq-status-${role}`">
          {{
            state.manual.tracks[role].completed.includes('DONE')
              ? 'Zelf gemeld afgerond — niet automatisch geverifieerd'
              : state.manual.tracks[role].problem
                ? `Probleem gemeld: ${state.manual.tracks[role].problem} — controleer in eigen account`
                : 'Uitkomst UNKNOWN — nog niet zelf afgerond'
          }}
        </p>
        <p class="source" :data-testid="`hq-category-${role}`">
          {{ categoryLabels[state.manual.tracks[role].category] }} ·
          {{ categoryEligibility(state.manual.tracks[role].category) }} ·
          USER_ENTERED_LABELS. Bijbetaling UNKNOWN; nooit automatisch €0.
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
    <p
      v-if="state.manual.planningMode === 'SOLO'"
      class="source"
      data-testid="inactive-B"
    >
      Solo · buddytraject B niet actief.
    </p>
    <aside v-if="summary.partial" class="rescue" aria-labelledby="rescue-title">
      <h3 id="rescue-title">
        Partiële eigen melding — controleer elke uitkomst
      </h3>
      <details>
        <summary>Eerste reservering controleren</summary>
        <p>
          Open zelf het account van A en bekijk de echte ticketbevestiging voor
          de bedoelde voorstelling. Bij twijfel eerst op Vue of bij de bioscoop
          navragen. Deze assistent heeft de uitkomst niet waargenomen.
        </p>
      </details>
      <details>
        <summary>Tweede account opnieuw nalopen</summary>
        <p>
          Bekijk eerst de actuele uitkomst in B’s eigen account voordat je een
          handeling herhaalt. Controleer voorstelling, stoel en eventuele
          kosten. Alleen een nieuwe eigen controle mag de lokale checklist
          opnieuw beginnen.
        </p>
      </details>
      <p class="source">
        Geen automatische herhaling of annulering, geen terugbetaling beloofd.
        Lokaal wissen of opnieuw beginnen verandert niets aan een echte boeking
        of abonnement.
      </p>
    </aside>
    <div class="next-action">
      <h3>Wat moet ik nu doen?</h3>
      <p data-testid="hq-next" :data-step="next.code">{{ next.text }}</p>
    </div>
    <div
      v-if="state.manual.planningMode === 'TOGETHER'"
      class="seat-pair"
      role="img"
      :aria-label="`Eigen gewenste stoelen: A ${state.manual.tracks.A.seat.row || '?'}${state.manual.tracks.A.seat.number || '?'}, B ${state.manual.tracks.B.seat.row || '?'}${state.manual.tracks.B.seat.number || '?'}. Geen officiële plattegrond of beschikbaarheidsbewijs.`"
    >
      <span v-for="role in activeRoles(state.manual)" :key="role"
        >{{ role
        }}<strong
          >{{ state.manual.tracks[role].seat.row || '?'
          }}{{ state.manual.tracks[role].seat.number || '?' }}</strong
        ></span
      >
    </div>
    <p
      v-show="state.manual.planningMode === 'TOGETHER'"
      class="source"
      data-testid="hq-seats"
    >
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

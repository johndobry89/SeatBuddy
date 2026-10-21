<script setup lang="ts">
import { computed } from 'vue';
import type { ManualState } from '../../core/manual-assistant';
import { activeRoles, preflightIssue } from '../../core/manual-assistant';
import { matchShowtimes } from '../../core/showtime-matcher';
const props = defineProps<{
  state: ManualState;
  busy: boolean;
  dirty: boolean;
}>();
const emit = defineEmits<{ review: [] }>();
const fields = {
  movie: 'Film',
  cinema: 'Bioscoop',
  date: 'Datum',
  time: 'Tijd',
  hall: 'Zaal',
} as const;
const issue = computed(() => preflightIssue(props.state));
</script>
<template>
  <section aria-labelledby="review-title" class="preflight">
    <h2 id="review-title" tabindex="-1">2. Controleer jullie filmavond</h2>
    <p v-if="!state.plan">
      Bewaar eerst je filmplan. Daarna vul je hieronder de gewenste stoelen in.
    </p>
    <template v-else>
      <p class="source">
        Bron: eigen invoer — geen waarneming op Vue. Lokaal plannen is geen
        reservering.
      </p>
      <dl>
        <template v-for="(label, key) in fields" :key="key">
          <dt>{{ label }}</dt>
          <dd>{{ state.plan[key] ?? 'UNKNOWN' }} · eigen invoer</dd>
        </template>
      </dl>
      <ul class="review-persons">
        <li
          v-for="role in activeRoles(state)"
          :key="role"
          :data-testid="`review-${role}`"
        >
          <strong>{{ role === 'A' ? 'Ik (A)' : 'Buddy (B)' }}</strong> · eigen
          account zelf controleren.<br />
          Gewenst: {{ state.tracks[role].seat.row || '?'
          }}{{ state.tracks[role].seat.number || '?' }} · eigen invoer.<br />
          Voorstelling:
          {{ matchShowtimes(state.plan, state.tracks[role].reportedShowtime) }}
          · {{ state.tracks[role].problem ?? 'geen probleem gemeld' }}.
        </li>
      </ul>
      <p>
        Controleer zelf geldigheid van je pas, premium/speciale formaten,
        toeslagen en uitverkocht op Vue. De assistent toetst geen rechten of
        beschikbaarheid.
      </p>
      <p v-if="dirty" class="notice">
        Je hebt nog onopgeslagen eigen invoer. Bewaar die hieronder voordat je
        de filmavond controleert.
      </p>
      <p v-else-if="issue" class="notice" data-testid="preflight-issue">
        {{ issue }}
      </p>
      <p v-if="state.review && !dirty" class="source">
        Gegevens lokaal gecontroleerd. De eigen stappen staan hieronder; er is
        niets op Vue uitgevoerd.
      </p>
      <button
        v-else
        :disabled="busy || !!issue || dirty"
        @click="emit('review')"
      >
        Ik heb de gegevens gecontroleerd — naar de eigen stappen
      </button>
    </template>
  </section>
</template>

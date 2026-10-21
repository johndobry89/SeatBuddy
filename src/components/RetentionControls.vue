<script setup lang="ts">
import type { BuddyView } from '../core/buddies';
import type { RememberCommand } from '../core/retained-data';
defineProps<{ state: BuddyView | null; busy: boolean; prefix: string }>();
const emit = defineEmits<{ command: [command: RememberCommand] }>();
function change(state: BuddyView | null, enabled: boolean) {
  if (state)
    emit('command', {
      type: 'REMEMBER_BUDDIES',
      generation: state.generation,
      revision: state.revision,
      enabled,
    });
}
function requestChange(event: Event, state: BuddyView | null) {
  const input = event.target as HTMLInputElement;
  const enabled = input.checked;
  // Display acknowledged consent, including on failed or stale writes.
  input.checked = state?.retention.mode === 'REMEMBERED';
  change(state, enabled);
}
</script>
<template>
  <fieldset
    class="retention-controls"
    :disabled="busy || !state?.retention.available"
  >
    <legend>Privacy op dit apparaat</legend>
    <label class="check-label" :for="`${prefix}-remember`">
      <input
        :id="`${prefix}-remember`"
        type="checkbox"
        :checked="state?.retention.mode === 'REMEMBERED'"
        :indeterminate="state?.retention.mode === 'UNAVAILABLE'"
        :aria-describedby="`${prefix}-retention-info`"
        @change="requestChange($event, state)"
      />
      Onthoud mijn buddy-bijnamen op dit apparaat
    </label>
    <p :id="`${prefix}-retention-info`" class="source">
      Standaard uit. Alleen optionele bijnamen; geen pas, account of
      boekingsbewijs. Chrome-opslag is niet standaard versleuteld. Uitzetten
      verwijdert de opgeslagen lijst én het concept.
    </p>
    <button
      v-if="state?.retention.mode === 'REMEMBERED'"
      class="secondary"
      type="button"
      @click="change(state, false)"
    >
      Vergeet opgeslagen buddies
    </button>
  </fieldset>
  <p class="source" role="status" data-testid="retention-status">
    {{
      state?.retention.notice ??
      'Alleen tijdelijk. Onthouden is niet beschikbaar zonder normale browserverbinding.'
    }}
  </p>
</template>

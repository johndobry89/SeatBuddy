<script setup lang="ts">
import type { Showtime } from '../../core/types';
const model = defineModel<Showtime>({ required: true });
defineProps<{ prefix: string }>();
function update(key: keyof Showtime, event: Event) {
  if (event.target instanceof HTMLInputElement)
    model.value = {
      ...model.value,
      [key]: event.target.value === '' ? null : event.target.value,
    };
}
const fields = [
  { key: 'movie', label: 'Film', type: 'text' },
  { key: 'cinema', label: 'Vue-bioscoop / locatie', type: 'text' },
  { key: 'date', label: 'Datum', type: 'date' },
  { key: 'time', label: 'Aanvangstijd', type: 'time' },
  { key: 'hall', label: 'Zaal (indien bekend)', type: 'text' },
] as const;
</script>
<template>
  <div class="form-grid">
    <label
      v-for="field in fields"
      :key="field.key"
      :for="`${prefix}-${field.key}`"
    >
      {{ field.label }}
      <input
        :id="`${prefix}-${field.key}`"
        :type="field.type"
        :value="model[field.key] ?? ''"
        :maxlength="80"
        :required="field.key !== 'hall'"
        autocomplete="off"
        @input="update(field.key, $event)"
      />
    </label>
  </div>
</template>

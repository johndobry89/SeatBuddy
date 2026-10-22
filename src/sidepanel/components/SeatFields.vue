<script setup lang="ts">
import type { z } from '../../privacy/schema';
import type { intendedSeatSchema } from '../../core/manual-assistant';
import type { Role } from '../../core/types';
const model = defineModel<z.infer<typeof intendedSeatSchema>>({
  required: true,
});
withDefaults(defineProps<{ role: Role; prefix?: string }>(), { prefix: '' });
function update(key: 'row' | 'number', event: Event) {
  if (event.target instanceof HTMLInputElement)
    model.value = { ...model.value, [key]: event.target.value };
}
</script>
<template>
  <div class="seat-fields">
    <label :for="`${prefix}row-${role}`"
      >Gewenste rij {{ role
      }}<input
        :id="`${prefix}row-${role}`"
        :value="model.row"
        maxlength="12"
        autocomplete="off"
        @input="update('row', $event)"
    /></label>
    <label :for="`${prefix}seat-${role}`"
      >Stoelnummer {{ role
      }}<input
        :id="`${prefix}seat-${role}`"
        :value="model.number"
        inputmode="numeric"
        pattern="[0-9]{0,3}"
        maxlength="3"
        autocomplete="off"
        @input="update('number', $event)"
    /></label>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
const props = defineProps<{ message: string }>();
const announced = ref('');
// Watch the semantic string, never the polled snapshot or a changing age.
watch(
  () => props.message,
  (value) => {
    if (value !== announced.value) announced.value = value;
  },
);
</script>
<template>
  <p
    class="sr-only"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    data-testid="announcer"
  >
    {{ announced }}
  </p>
</template>

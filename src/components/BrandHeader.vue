<script setup lang="ts">
defineProps<{ compact?: boolean }>();
const logo = './icons/seatbuddies.svg';
</script>
<template>
  <header class="brand-header" :class="{ compact }">
    <img :src="logo" alt="" width="48" height="48" />
    <div>
      <p class="brand-name">Seat<span>Buddies</span></p>
      <p class="brand-caption">Jullie filmavond. Ieder een eigen boeking.</p>
    </div>
  </header>
</template>

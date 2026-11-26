<script setup lang="ts">
import { usePlayerStore } from '../model/player.ts'

/*
The player's failure to play, said in a line at the bottom centre of the view it is placed in, which
must be `relative`. Nothing is shown while nothing failed. The Range, Track and Split views all use
it, so the line looks and reads the same in each.
*/
const player = usePlayerStore()
</script>

<template>
  <p
    v-if="player.failure !== null"
    role="status"
    class="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"
  >
    <span class="bg-surface px-3 py-1.5 text-sm text-muted">{{ player.failure }}</span>
  </p>
</template>

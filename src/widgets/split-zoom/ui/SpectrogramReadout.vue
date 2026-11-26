<script setup lang="ts">
import type { Readout } from '../lib/use-spectrogram-readout.ts'

/*
The frequency and level under the pointer over the spectrogram strip, a small plate beside the
pointer in the view it is placed in, which must be `relative`. It follows the pointer and says what
the picture already shows, so it is hidden from a screen reader. The Split, Track and Range views
all use it.
*/
defineProps<{ readout: Readout | null }>()
</script>

<template>
  <p
    v-if="readout !== null"
    aria-hidden="true"
    class="pointer-events-none absolute -translate-y-full bg-surface px-1.5 py-0.5 text-xs whitespace-nowrap text-ink tabular-nums"
    :class="{ '-translate-x-full': readout.isLeftOfPointer }"
    :style="{
      left: `${readout.isLeftOfPointer ? readout.x - 8 : readout.x + 8}px`,
      top: `${readout.y - 8}px`,
    }"
  >
    {{ readout.text }}
  </p>
</template>

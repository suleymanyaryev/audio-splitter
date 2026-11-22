<script setup lang="ts">
import UiButton from '@/shared/ui/UiButton.vue'
import UiSlider from '@/shared/ui/UiSlider.vue'
import UiTooltip from '@/shared/ui/UiTooltip.vue'
import {
  DEFAULT_PLAY_SPEED,
  MAX_PLAY_SPEED,
  MIN_PLAY_SPEED,
  PLAY_SPEED_STEP,
} from '../config/play-speed.ts'
import { formatPlaySpeed } from '../lib/format-play-speed.ts'
import { useAuditionStore } from '../model/audition.ts'

/*
Just before the volume control in the zoom panel's title row, in all three views: how fast the
player plays, with the pitch kept (docs/concepts/10-speed-without-pitch.md). The player owns the
play speed; this only shows and sets it. The button shows the speed and brings it back to 1.0, and
is always on, as there is nothing to guard.
*/
const audition = useAuditionStore()
</script>

<template>
  <div class="flex items-center gap-1">
    <UiTooltip :label="`Reset play speed to ${formatPlaySpeed(DEFAULT_PLAY_SPEED)}`">
      <UiButton
        size="sm"
        class="min-w-11 justify-center px-1.5"
        :aria-label="`Reset play speed, now ${formatPlaySpeed(audition.playSpeed)}`"
        @click="audition.setPlaySpeed(DEFAULT_PLAY_SPEED)"
      >
        {{ formatPlaySpeed(audition.playSpeed) }}
      </UiButton>
    </UiTooltip>
    <UiSlider
      compact
      class="w-16"
      label="Play speed"
      :model-value="audition.playSpeed"
      :readout="formatPlaySpeed(audition.playSpeed)"
      :min="MIN_PLAY_SPEED"
      :max="MAX_PLAY_SPEED"
      :step="PLAY_SPEED_STEP"
      @update:model-value="audition.setPlaySpeed"
    />
  </div>
</template>

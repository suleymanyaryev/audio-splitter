<script setup lang="ts">
import { Volume2, VolumeX } from 'lucide-vue-next'

import UiIconButton from '@/shared/ui/UiIconButton.vue'
import UiSlider from '@/shared/ui/UiSlider.vue'
import { MAX_VOLUME_DB, MIN_VOLUME_DB, VOLUME_STEP_DB } from '../config/volume.ts'
import { formatVolume } from '../lib/format-volume.ts'
import { useAuditionStore } from '../model/audition.ts'

/*
The end of the zoom panel's title row, in all three views: how loud the player is heard
(docs/concepts/09-volume-is-gain.md). The player owns the level and the mute flag; this only shows
and sets them. The slider is in dB, so every step is the same change in loudness.
*/
const audition = useAuditionStore()
</script>

<template>
  <div class="flex items-center gap-1">
    <UiIconButton
      size="sm"
      :label="audition.isMuted ? 'Unmute' : 'Mute'"
      @click="audition.toggleMute()"
    >
      <VolumeX v-if="audition.isMuted" class="size-4 shrink-0" />
      <Volume2 v-else class="size-4 shrink-0" />
    </UiIconButton>
    <UiSlider
      compact
      class="w-20"
      label="Volume"
      :model-value="audition.volumeDecibels"
      :readout="formatVolume(audition.volumeDecibels)"
      :min="MIN_VOLUME_DB"
      :max="MAX_VOLUME_DB"
      :step="VOLUME_STEP_DB"
      @update:model-value="audition.setVolume"
    />
  </div>
</template>

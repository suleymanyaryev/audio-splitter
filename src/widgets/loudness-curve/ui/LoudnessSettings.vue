<script setup lang="ts">
import { useSplitStore } from '@/entities/split/model/split.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiSlider from '@/shared/ui/UiSlider.vue'
import UiTooltip from '@/shared/ui/UiTooltip.vue'
import { BOTTOM_DECIBELS } from '../lib/decibels-to-y.ts'
import { formatDecibels, formatSeconds } from '../lib/format-readout.ts'

/*
The loudness panel's title row: the two settings of gap finding, and the button that turns the
gaps they show into splits. The threshold covers the curve's drawn range, −60 to 0 dB, in tenths;
the minimum gap length runs from a few windows to a long pause. Moving either changes only the
gaps shown, so there is nothing to ask. "Find gaps" says how many splits a press would add.
*/
const split = useSplitStore()
</script>

<template>
  <div class="flex items-center gap-6">
    <UiSlider
      :model-value="split.silenceThreshold ?? 0"
      label="Silence threshold"
      :readout="formatDecibels(split.silenceThreshold ?? 0)"
      :min="BOTTOM_DECIBELS"
      :max="0"
      :step="0.1"
      class="w-96"
      @update:model-value="split.setSilenceThreshold"
    />
    <UiSlider
      :model-value="split.minimumGapLength"
      label="Minimum gap length"
      :readout="formatSeconds(split.minimumGapLength)"
      :min="0.2"
      :max="5"
      :step="0.1"
      class="w-96"
      @update:model-value="split.setMinimumGapLength"
    />
    <UiTooltip label="Add a split in the middle of each gap that has none">
      <UiButton
        size="sm"
        :disabled="split.gapSplitSeconds.length === 0"
        @click="split.addGapSplits()"
      >
        Find gaps ({{ split.gapSplitSeconds.length }})
      </UiButton>
    </UiTooltip>
  </div>
</template>

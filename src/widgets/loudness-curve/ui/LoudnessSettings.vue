<script setup lang="ts">
import { ref } from 'vue'

import { useSplitStore } from '@/entities/split/model/split.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiSlider from '@/shared/ui/UiSlider.vue'
import UiTooltip from '@/shared/ui/UiTooltip.vue'
import { BOTTOM_DECIBELS } from '../lib/decibels-to-y.ts'
import { formatDecibels, formatSeconds } from '../lib/format-readout.ts'
import ClearSplitsDialog from './ClearSplitsDialog.vue'

/*
The loudness panel's title row: the two settings of gap finding, and the button that turns the
gaps they show into splits. The threshold covers the curve's drawn range, −60 to 0 dB, in tenths;
the minimum gap length runs from a few windows to a long pause. Moving either changes only the
gaps shown, so there is nothing to ask. "Find gaps" says how many splits a press would add.
"Clear splits" starts over: it asks first only when the user has edits or pending splits to lose.
*/
const split = useSplitStore()
const asking = ref(false)

function clearSplits() {
  if (split.hasEdits || split.pendingSplits.length > 0) asking.value = true
  else split.clearSplits()
}

function confirmClear() {
  asking.value = false
  split.clearSplits()
}
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
    <div class="flex items-center gap-2">
      <UiTooltip label="Add a split in the middle of each gap that has none">
        <UiButton
          size="sm"
          :disabled="split.gapSplitSeconds.length === 0"
          @click="split.addGapSplits()"
        >
          Find gaps ({{ split.gapSplitSeconds.length }})
        </UiButton>
      </UiTooltip>
      <UiTooltip label="Delete every split and name, and start over with one track">
        <UiButton size="sm" :disabled="!split.canClearSplits" @click="clearSplits">
          Clear splits
        </UiButton>
      </UiTooltip>
    </div>
    <ClearSplitsDialog
      v-model:open="asking"
      :edit-count="split.editCount"
      :pending-count="split.pendingSplits.length"
      @clear="confirmClear"
    />
  </div>
</template>

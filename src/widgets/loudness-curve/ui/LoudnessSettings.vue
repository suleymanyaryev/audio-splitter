<script setup lang="ts">
import { useSplitStore } from '@/entities/split/model/split.ts'
import UiSlider from '@/shared/ui/UiSlider.vue'
import { BOTTOM_DECIBELS } from '../lib/decibels-to-y.ts'
import { formatDecibels, formatSeconds } from '../lib/format-readout.ts'
import { useReplaceGuard } from '../lib/use-replace-guard.ts'
import ReplaceEditsDialog from './ReplaceEditsDialog.vue'

/*
The two settings of gap finding, for the loudness panel's title row. The threshold covers the
curve's drawn range, −60 to 0 dB, in tenths; the minimum gap length runs from a few windows to a
long pause. A change goes to the split store, which finds the gaps again; with edits to lose, the
guard asks first and the slider keeps showing the old value until the user replaces them.
*/
const split = useSplitStore()
const { asking, editCount, change, replace } = useReplaceGuard()
</script>

<template>
  <div class="flex gap-6">
    <UiSlider
      :model-value="split.silenceThreshold ?? 0"
      label="Silence threshold"
      :readout="formatDecibels(split.silenceThreshold ?? 0)"
      :min="BOTTOM_DECIBELS"
      :max="0"
      :step="0.1"
      class="w-96"
      @update:model-value="(value) => change(() => split.setSilenceThreshold(value))"
    />
    <UiSlider
      :model-value="split.minimumGapLength"
      label="Minimum gap length"
      :readout="formatSeconds(split.minimumGapLength)"
      :min="0.2"
      :max="5"
      :step="0.1"
      class="w-96"
      @update:model-value="(value) => change(() => split.setMinimumGapLength(value))"
    />
    <ReplaceEditsDialog v-model:open="asking" :edit-count="editCount" @replace="replace" />
  </div>
</template>

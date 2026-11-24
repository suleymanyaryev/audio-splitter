<script setup lang="ts">
import { ref } from 'vue'

import {
  DEFAULT_MINIMUM_GAP_SECONDS,
  DEFAULT_OFFSET_DB,
  MINIMUM_GAP_MAX_SECONDS,
  MINIMUM_GAP_MIN_SECONDS,
  SETTING_STEP,
  THRESHOLD_MAX_DB,
  THRESHOLD_MIN_DB,
} from '@/entities/split/config/defaults.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiSlider from '@/shared/ui/UiSlider.vue'
import UiTooltip from '@/shared/ui/UiTooltip.vue'
import {
  formatDecibels,
  formatOffset,
  formatSeconds,
  formatSettingSeconds,
} from '../lib/format-readout.ts'
import ClearSplitsDialog from './ClearSplitsDialog.vue'

/*
The loudness panel's title row: the two settings of gap finding, and the button that turns the
gaps they show into splits. The threshold covers the curve's drawn range, −60 to 0 dB, in tenths;
the minimum gap length runs from a few windows to a long pause. Moving either changes only the
gaps shown, so there is nothing to ask. "Find gaps" says how many splits a press would add.
"Clear splits" starts over: it asks first only when the user has edits or pending splits to lose.
"Save as default" keeps the two settings for every later file, the threshold as a distance under
the median, and "Restore built-in" puts the built-in ones back; each is off when it would change
nothing.
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
      :min="THRESHOLD_MIN_DB"
      :max="THRESHOLD_MAX_DB"
      :step="SETTING_STEP"
      class="w-96"
      @update:model-value="split.setSilenceThreshold"
    />
    <UiSlider
      :model-value="split.minimumGapLength"
      label="Minimum gap length"
      :readout="formatSeconds(split.minimumGapLength)"
      :min="MINIMUM_GAP_MIN_SECONDS"
      :max="MINIMUM_GAP_MAX_SECONDS"
      :step="SETTING_STEP"
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
    <div class="flex items-center gap-2">
      <UiTooltip
        :label="`Save ${formatOffset(split.currentOffsetDb ?? 0)} and ${formatSettingSeconds(split.minimumGapLength)} as the default`"
      >
        <UiButton size="sm" :disabled="split.matchesDefaultSettings" @click="split.saveAsDefault()">
          Save as default
        </UiButton>
      </UiTooltip>
      <UiTooltip
        :label="`Put the default settings back to ${formatOffset(DEFAULT_OFFSET_DB)} and ${formatSettingSeconds(DEFAULT_MINIMUM_GAP_SECONDS)}`"
      >
        <UiButton
          size="sm"
          :disabled="split.areDefaultSettingsBuiltIn"
          @click="split.restoreBuiltIn()"
        >
          Restore built-in
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

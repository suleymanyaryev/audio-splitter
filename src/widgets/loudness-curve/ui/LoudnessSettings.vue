<script setup lang="ts">
import { ref } from 'vue'

import {
  DEFAULT_DEPTH_DB,
  DEFAULT_MINIMUM_GAP_SECONDS,
  DEFAULT_OFFSET_DB,
  DEPTH_MAX_DB,
  DEPTH_MIN_DB,
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
  formatDuplicateResult,
  formatOffset,
  formatSettingDecibels,
  formatSeconds,
  formatSettingSeconds,
} from '../lib/format-readout.ts'
import ClearSplitsDialog from './ClearSplitsDialog.vue'

/*
The loudness panel's title row: the three settings of split finding, and the button that turns what
they show into splits. The threshold covers the curve's drawn range, −60 to 0 dB, in tenths; the
minimum gap length runs from a few windows to a long pause; the depth, from 3 to 30 dB, is how far
under its surroundings a dip must fall. Moving any of them changes only what is shown (the gaps, and
a mark on the curve at each dip), so there is nothing to ask. "Find splits" says how many splits a
press would add.
"Find duplicates" looks for tracks that are the same recording as an earlier one and changes
nothing of the user's: it is off until two tracks are 30 s long, busy while it searches, and the
line beside it says what it found, nothing before the first press, or why the search failed.
"Clear splits" starts over: it asks first only when the user has edits or pending splits to lose.
"Save as default" keeps the three settings for every later file, the threshold as a distance under
the median, and "Restore built-in" puts the built-in ones back; each is off when it would change
nothing. The row wraps when the panel is too narrow for all of it, so no button is cut off.
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
  <div class="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
    <UiSlider
      :model-value="split.silenceThreshold ?? 0"
      label="Silence threshold"
      :readout="formatDecibels(split.silenceThreshold ?? 0)"
      :min="THRESHOLD_MIN_DB"
      :max="THRESHOLD_MAX_DB"
      :step="SETTING_STEP"
      class="w-80"
      @update:model-value="split.setSilenceThreshold"
    />
    <UiSlider
      :model-value="split.minimumGapLength"
      label="Minimum gap length"
      :readout="formatSeconds(split.minimumGapLength)"
      :min="MINIMUM_GAP_MIN_SECONDS"
      :max="MINIMUM_GAP_MAX_SECONDS"
      :step="SETTING_STEP"
      class="w-80"
      @update:model-value="split.setMinimumGapLength"
    />
    <UiSlider
      :model-value="split.depth"
      label="Depth"
      :readout="formatDecibels(split.depth)"
      :min="DEPTH_MIN_DB"
      :max="DEPTH_MAX_DB"
      :step="SETTING_STEP"
      class="w-80"
      @update:model-value="split.setDepth"
    />
    <div class="flex items-center gap-2">
      <UiTooltip label="Add a split at each gap and each dip that has none near it">
        <UiButton
          size="sm"
          :disabled="split.proposedSplits.length === 0"
          @click="split.findSplits()"
        >
          Find splits ({{ split.proposedSplits.length }})
        </UiButton>
      </UiTooltip>
      <UiTooltip label="Find tracks that match an earlier track, from end to end or in part">
        <UiButton
          size="sm"
          :disabled="!split.canFindDuplicates"
          :aria-busy="split.duplicateSearchStatus === 'running'"
          @click="split.findDuplicates()"
        >
          {{
            split.duplicateSearchStatus === 'running' ? 'Finding duplicates…' : 'Find duplicates'
          }}
        </UiButton>
      </UiTooltip>
      <p
        v-if="split.duplicateSearchStatus === 'failed'"
        role="alert"
        class="max-w-80 text-xs font-semibold break-words text-split"
      >
        Couldn't find duplicates: {{ split.duplicateSearchFailure }}
      </p>
      <p
        v-else-if="split.duplicateResult !== null"
        role="status"
        class="text-sm whitespace-nowrap text-muted"
      >
        {{
          formatDuplicateResult(
            split.duplicateResult.duplicates,
            split.duplicateResult.partialMatches,
          )
        }}
      </p>
      <UiTooltip label="Delete every split and name, and start over with one track">
        <UiButton size="sm" :disabled="!split.canClearSplits" @click="clearSplits">
          Clear splits
        </UiButton>
      </UiTooltip>
    </div>
    <div class="flex items-center gap-2">
      <UiTooltip
        :label="`Save ${formatOffset(split.currentOffsetDb ?? 0)}, ${formatSettingSeconds(split.minimumGapLength)} and ${formatSettingDecibels(split.depth)} deep as the default`"
      >
        <UiButton size="sm" :disabled="split.matchesDefaultSettings" @click="split.saveAsDefault()">
          Save as default
        </UiButton>
      </UiTooltip>
      <UiTooltip
        :label="`Put the default settings back to ${formatOffset(DEFAULT_OFFSET_DB)}, ${formatSettingSeconds(DEFAULT_MINIMUM_GAP_SECONDS)} and ${formatSettingDecibels(DEFAULT_DEPTH_DB)} deep`"
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

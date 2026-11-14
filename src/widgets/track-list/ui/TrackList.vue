<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'
import { Trash2 } from 'lucide-vue-next'

import { useSplitStore } from '@/entities/split/model/split.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'
import UiIconButton from '@/shared/ui/UiIconButton.vue'
import TrackNameField from './TrackNameField.vue'

/*
The tracks as a table: number, name (edited in place, `TrackNameField`), start (hundredths, where a
split's position is read), length (whole seconds) and a trash button that deletes the split where
the track starts (none on the first track). It is as tall as the zoom view's 160 px content area and
scrolls inside itself, the heading row staying in view.

A track starts at a split, so a click on its row selects that split, and the row of the selected
split's track is marked and kept in view; focusing a name field selects that split too. The first
track starts with the file and has no split: its row selects nothing. The number cell holds a
button, so a row can be selected from the keyboard too. The box has 4 px of padding (undone by the
negative margin) so the focus ring of a button at the left edge is not cut off by the scroll box.
*/
const split = useSplitStore()
const list = useTemplateRef('list')

// After the DOM has the new mark; `nearest` leaves a row that is already visible where it is.
watch(
  () => split.selectedSplitId,
  () => {
    list.value?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
  },
  { flush: 'post' },
)
</script>

<template>
  <div ref="list" class="-mx-1 h-40 overflow-y-auto px-1">
    <table class="w-full border-separate border-spacing-0 text-left text-sm">
      <thead>
        <tr class="text-xs font-medium text-muted">
          <th scope="col" class="sticky top-0 w-12 border-b border-hairline bg-surface py-1 pr-2">
            #
          </th>
          <th scope="col" class="sticky top-0 w-full border-b border-hairline bg-surface py-1 pr-3">
            Name
          </th>
          <th scope="col" class="sticky top-0 border-b border-hairline bg-surface py-1 pr-4">
            Start
          </th>
          <th scope="col" class="sticky top-0 border-b border-hairline bg-surface py-1 pr-2">
            Length
          </th>
          <th scope="col" class="sticky top-0 border-b border-hairline bg-surface py-1">
            <span class="sr-only">Delete</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="track in split.tracks"
          :key="track.number"
          :aria-current="split.isTrackSelected(track) ? 'true' : undefined"
          class="scroll-mt-7"
          :class="[
            split.isTrackSelected(track) ? 'bg-land/50 font-semibold' : '',
            track.startSplit !== null ? 'cursor-pointer hover:bg-land/40' : '',
          ]"
          @click="split.selectTrack(track)"
        >
          <td class="border-b border-hairline py-1.5 pr-2">
            <button
              v-if="track.startSplit !== null"
              type="button"
              :aria-label="`Select track ${track.number}, starts at ${formatHundredths(track.startSeconds)}`"
              class="inline-flex size-5 cursor-pointer items-center justify-center rounded-control text-muted focus-visible:focus-ring"
            >
              {{ track.number }}
            </button>
            <span v-else class="inline-flex size-5 items-center justify-center text-muted">
              {{ track.number }}
            </span>
          </td>
          <td class="max-w-0 border-b border-hairline py-1.5 pr-3">
            <TrackNameField
              :name="track.name"
              :label="`Name of track ${track.number}`"
              @start="split.selectTrack(track)"
              @save="split.renameTrack(track.startSplit?.id ?? null, $event)"
            />
          </td>
          <td class="border-b border-hairline py-1.5 pr-4 whitespace-nowrap">
            {{ formatHundredths(track.startSeconds) }}
          </td>
          <td class="border-b border-hairline py-1.5 pr-2 whitespace-nowrap">
            {{ formatDuration(track.lengthSeconds) }}
          </td>
          <td class="border-b border-hairline py-0.5">
            <UiIconButton
              v-if="track.startSplit !== null"
              size="sm"
              :label="`Delete split at ${formatHundredths(track.startSeconds)}`"
              @click.stop="split.deleteSplit(track.startSplit.id)"
            >
              <Trash2 class="size-4 shrink-0" />
            </UiIconButton>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { Trash2 } from 'lucide-vue-next'

import { useSplitStore, type Split, type Track } from '@/entities/split/model/split.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'
import UiIconButton from '@/shared/ui/UiIconButton.vue'
import TrackNameField from './TrackNameField.vue'

/*
The file as a table, in time order: a row for each track with a row for each split between two
tracks. A track row has its number (a button, so the row can be selected from the keyboard), its
name (edited in place, `TrackNameField`), its start (hundredths, where a split's position is read)
and its length (whole seconds). A split row reads `Split N` where the name goes, its time in the
start column, no length and a trash button that deletes the split, which merges the tracks either
side of it; it has no name field, because naming belongs to tracks. The box is as tall as the zoom
view's 160 px content area and scrolls inside itself, the heading row staying in view.

A click on a row selects what it shows, a track or a split (the first track included), and the
marked row, whichever kind it is, follows the selection and is kept in view; focusing a name field
selects its track too. A button stops the click, so it does only what it says. The box has 4 px of
padding (undone by the negative margin) so the focus ring of a button at the left edge is not cut
off by the scroll box.
*/
const split = useSplitStore()
const list = useTemplateRef('list')

type Row =
  | { key: string; kind: 'track'; track: Track }
  | { key: string; kind: 'split'; point: Split; number: number }

// Each track, then the split that ends it: the last track ends with the file, so no split follows.
const rows = computed<Row[]>(() =>
  split.tracks.flatMap((track, index): Row[] => {
    const trackRow: Row = { key: `track-${track.number}`, kind: 'track', track }
    const point = split.splits[index]
    return point === undefined
      ? [trackRow]
      : [trackRow, { key: `split-${point.id}`, kind: 'split', point, number: index + 1 }]
  }),
)

// After the DOM has the new mark; `nearest` leaves a row that is already visible where it is.
watch(
  () => split.selection,
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
        <template v-for="row in rows" :key="row.key">
          <tr
            v-if="row.kind === 'track'"
            :aria-current="split.isTrackSelected(row.track) ? 'true' : undefined"
            class="cursor-pointer scroll-mt-7 hover:bg-land/40"
            :class="split.isTrackSelected(row.track) ? 'bg-land/50 font-semibold' : ''"
            @click="split.selectTrack(row.track)"
          >
            <td class="border-b border-hairline py-1.5 pr-2">
              <button
                type="button"
                :aria-label="`Select track ${row.track.number}, starts at ${formatHundredths(row.track.startSeconds)}`"
                class="inline-flex size-5 cursor-pointer items-center justify-center rounded-control text-muted focus-visible:focus-ring"
              >
                {{ row.track.number }}
              </button>
            </td>
            <td class="max-w-0 border-b border-hairline py-1.5 pr-3">
              <TrackNameField
                :name="row.track.name"
                :label="`Name of track ${row.track.number}`"
                @start="split.selectTrack(row.track)"
                @save="split.renameTrack(row.track.startSplit?.id ?? null, $event)"
              />
            </td>
            <td class="border-b border-hairline py-1.5 pr-4 whitespace-nowrap">
              {{ formatHundredths(row.track.startSeconds) }}
            </td>
            <td class="border-b border-hairline py-1.5 pr-2 whitespace-nowrap">
              {{ formatDuration(row.track.lengthSeconds) }}
            </td>
            <td class="border-b border-hairline py-0.5"></td>
          </tr>
          <tr
            v-else
            :aria-current="split.selectedSplit?.id === row.point.id ? 'true' : undefined"
            class="cursor-pointer scroll-mt-7 hover:bg-land/40"
            :class="split.selectedSplit?.id === row.point.id ? 'bg-land/50 font-semibold' : ''"
            @click="split.selectSplit(row.point.id)"
          >
            <td class="border-b border-hairline py-1.5 pr-2"></td>
            <td class="border-b border-hairline py-1.5 pr-3 text-muted">Split {{ row.number }}</td>
            <td class="border-b border-hairline py-1.5 pr-4 whitespace-nowrap">
              {{ formatHundredths(row.point.seconds) }}
            </td>
            <td class="border-b border-hairline py-1.5 pr-2"></td>
            <td class="border-b border-hairline py-0.5">
              <UiIconButton
                size="sm"
                :label="`Delete split at ${formatHundredths(row.point.seconds)}`"
                @click.stop="split.deleteSplit(row.point.id)"
              >
                <Trash2 class="size-4 shrink-0" />
              </UiIconButton>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { Eye, EyeOff, Merge, Trash2, X } from 'lucide-vue-next'

import { matchTooltip, matchWords, type TrackMatch } from '@/entities/split/lib/match-words.ts'
import { useSplitStore, type Split, type Track } from '@/entities/split/model/split.ts'
import { releaseFocus } from '@/shared/lib/keyboard/release-focus.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'
import UiIconButton from '@/shared/ui/UiIconButton.vue'
import UiTooltip from '@/shared/ui/UiTooltip.vue'
import TrackNameField from './TrackNameField.vue'

/*
The file as a table, in time order: a row for each track with a row for each split between two
tracks. A track row has its number (a button, so the row can be selected from the keyboard), its
name (edited in place, `TrackNameField`, muted while the track has no name of its own, with the
words of each of its matches under it, one line each, "duplicate of 01" while it is the same
recording as an earlier track and "03 from 1:40" or "part of 03 from 0:30" while it shares part of
one, a partial match's words with a tooltip of the stretch both share, each a link that selects the
other track, with a button that dismisses the match), its start (hundredths, where a split's
position is read) and its length (whole seconds), then two buttons: one that leaves the track out of
the export or brings it back (a left-out row is muted), and a merge button that removes the track
and merges it with its neighbours (none when it is the only track). A split row reads `Split N`
where the name goes (with the band, "likely" or "doubtful", after it when Find splits was less than
sure of the split, a ring or a disc as on the canvases, and the depth in a tooltip), its time in the
start column, no length and a trash button that deletes the split, which merges the tracks either side of it; it has no name field, because naming belongs to
tracks. The two buttons carry different icons, so one is not taken for the other. The box is as tall
as the zoom view's 160 px content area and scrolls inside itself, the heading row staying in view.

A click on a row selects what it shows, a track or a split (the first track included), and the
marked row, whichever kind it is, follows the selection and is kept in view; focusing a name field
selects its track too. A button stops the click, so it does only what it says. The number button
takes no focus from a mouse press, so the next key goes to the view on show; Tab still reaches it.
The box has 4 px of padding (undone by the negative margin) so the focus ring of a button at the
left edge is not cut off by the scroll box.
*/
const split = useSplitStore()
const list = useTemplateRef('list')

type Row =
  | { key: string; kind: 'track'; track: Track }
  | { key: string; kind: 'split'; point: Split; number: number }

// The words of a match are a link: it selects the other track and shows the Track view.
function selectMatched(match: TrackMatch) {
  const other = split.tracks[match.number - 1]
  if (other !== undefined) split.selectTrack(other)
}

function isSplitSelected(point: Split) {
  return split.selectedSplit?.id === point.id
}

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
            <span class="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="row in rows" :key="row.key">
          <tr
            v-if="row.kind === 'track'"
            :aria-current="split.isTrackSelected(row.track) ? 'true' : undefined"
            class="cursor-pointer scroll-mt-7 tint-transition hover:bg-land/40"
            :class="[
              split.isTrackSelected(row.track) ? 'bg-land/50 font-semibold' : '',
              row.track.isLeftOut ? 'text-muted' : '',
            ]"
            @click="split.selectTrack(row.track)"
          >
            <td class="border-b border-hairline py-1.5 pr-2">
              <button
                type="button"
                :aria-label="`Select track ${row.track.number}, starts at ${formatHundredths(row.track.startSeconds)}`"
                class="inline-flex size-5 cursor-pointer items-center justify-center rounded-control text-muted focus-visible:focus-ring"
                @mousedown="releaseFocus"
              >
                {{ row.track.number }}
              </button>
            </td>
            <td class="max-w-0 border-b border-hairline py-1.5 pr-3">
              <TrackNameField
                :name="row.track.name"
                :is-own="row.track.ownName !== null"
                :dimmed="row.track.isLeftOut"
                :label="`Name of track ${row.track.number}`"
                @start="split.selectTrack(row.track)"
                @save="split.renameTrack(row.track.startSplit?.id ?? null, $event)"
              />
              <div
                v-for="match in row.track.matches"
                :key="match.number"
                class="flex items-center gap-1"
              >
                <p class="min-w-0 truncate text-xs">
                  <UiTooltip
                    :label="matchTooltip(match, split.tracks.length)"
                    :disabled="match.kind === 'full'"
                  >
                    <button
                      type="button"
                      class="cursor-pointer underline decoration-hairline underline-offset-2 hover:decoration-current focus-visible:focus-ring"
                      @click.stop="selectMatched(match)"
                      @mousedown="releaseFocus"
                    >
                      {{ matchWords(match, split.tracks.length) }}
                    </button>
                  </UiTooltip>
                </p>
                <UiIconButton
                  size="sm"
                  :label="`Dismiss the match of track ${row.track.number} with track ${match.number}`"
                  class="-my-1 shrink-0"
                  @click.stop="split.dismissMatch(row.track, match)"
                >
                  <X class="size-4 shrink-0" />
                </UiIconButton>
              </div>
            </td>
            <td class="border-b border-hairline py-1.5 pr-4 whitespace-nowrap">
              {{ formatHundredths(row.track.startSeconds) }}
            </td>
            <td class="border-b border-hairline py-1.5 pr-2 whitespace-nowrap">
              {{ formatDuration(row.track.lengthSeconds) }}
            </td>
            <td class="border-b border-hairline py-0.5">
              <div class="flex gap-1">
                <UiIconButton
                  size="sm"
                  :label="`${row.track.isLeftOut ? 'Bring back' : 'Leave out'} track ${row.track.number}`"
                  @click.stop="split.toggleLeftOut(row.track.startSplit?.id ?? null)"
                >
                  <EyeOff v-if="row.track.isLeftOut" class="size-4 shrink-0" />
                  <Eye v-else class="size-4 shrink-0" />
                </UiIconButton>
                <UiIconButton
                  v-if="split.tracks.length > 1"
                  size="sm"
                  :label="`Remove track ${row.track.number}`"
                  @click.stop="split.removeTrack(row.track)"
                >
                  <Merge class="size-4 shrink-0" />
                </UiIconButton>
              </div>
            </td>
          </tr>
          <tr
            v-else
            :aria-current="isSplitSelected(row.point) ? 'true' : undefined"
            class="cursor-pointer scroll-mt-7 tint-transition hover:bg-land/40"
            :class="isSplitSelected(row.point) ? 'bg-land/50 font-semibold' : ''"
            @click="split.selectSplit(row.point.id)"
          >
            <td class="border-b border-hairline py-1.5 pr-2">
              <!-- The selected split lights its number in rust, as the whole-file view does; the
              name beside it already says which split this is. -->
              <span
                v-if="isSplitSelected(row.point)"
                aria-hidden="true"
                class="inline-flex size-5 items-center justify-center rounded-full bg-split text-xs font-bold text-on-split"
              >
                {{ row.number }}
              </span>
            </td>
            <td
              class="border-b border-hairline py-1.5 pr-3"
              :class="isSplitSelected(row.point) ? '' : 'text-muted'"
            >
              Split {{ row.number }}
              <UiTooltip
                v-if="row.point.confidence !== null && row.point.confidence.band !== 'sure'"
                :label="`${row.point.confidence.depth.toFixed(1)} dB under its surroundings`"
              >
                <span
                  class="ml-2 inline-flex items-center gap-1 align-middle text-xs"
                  :class="row.point.confidence.band === 'doubtful' ? 'font-bold text-ink' : ''"
                >
                  <span
                    aria-hidden="true"
                    class="size-2 shrink-0 rounded-full border-[1.5px] border-split"
                    :class="row.point.confidence.band === 'doubtful' ? 'bg-split' : 'bg-surface'"
                  ></span>
                  {{ row.point.confidence.band }}
                </span>
              </UiTooltip>
            </td>
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

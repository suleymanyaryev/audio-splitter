<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { useSplitStore } from '@/entities/split/model/split.ts'
import { releaseFocus } from '@/shared/lib/keyboard/release-focus.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'
import { layoutTrackBlocks, SPLIT_ITEM_PX } from '../lib/layout-track-blocks.ts'

/*
The tracks as proportional blocks on a land ground, one per track, with their label and length, and
a split item between every two blocks. A block's label is the track's number while it has no name of
its own and the name as typed once it has one, so narrow blocks do not all open with the prefix; the
tooltip and the accessible label give the full name as the track list shows it. Widths come from `layoutTrackBlocks`, which needs the
strip's pixel width, and which also decides whether a block is wide enough for its name and length,
and keeps room for the 8 px split items.

Every block is a button that selects its track, the first included, and the block of the selected
track is marked with a 2 px `on-track` border (DESIGN.md's "Selected" bullet). A split item is a
button that selects the split where the next block starts, which shows the zoom view centred on it.
It is the land between the blocks at rest, and rust, the colour of a split, when it is hovered,
focused or selected; focus also draws the ink ring, so a focused item never reads as a selected
one. A mouse press on either takes no focus, so the next key goes to the view on
show (src/shared/lib/keyboard/use-page-keys.ts); Tab still reaches them.
*/
const split = useSplitStore()

const strip = useTemplateRef<HTMLElement>('strip')
const stripWidth = ref(0)
const observer = new ResizeObserver((entries) => {
  const entry = entries.at(-1)
  if (entry) stripWidth.value = entry.contentRect.width
})

onMounted(() => {
  if (strip.value === null) return
  stripWidth.value = strip.value.clientWidth
  observer.observe(strip.value)
})
onBeforeUnmount(() => {
  observer.disconnect()
})

const blocks = computed(() => {
  const layout = layoutTrackBlocks(
    split.tracks.map((track) => track.lengthSeconds),
    stripWidth.value,
  )
  return split.tracks.map((track, index) => ({
    track,
    length: formatDuration(track.lengthSeconds),
    label: track.ownName ?? String(track.number),
    // The split item before this block, where the track starts: none before the first block.
    splitItem:
      track.startSplit === null
        ? null
        : {
            id: track.startSplit.id,
            // Split k is where track k + 1 starts, which is the number the whole-file view shows.
            label: `Split ${index}, ${formatHundredths(track.startSeconds)}`,
            isSelected: split.selectedSplit?.id === track.startSplit.id,
          },
    ...layout[index]!,
  }))
})
</script>

<template>
  <ol ref="strip" aria-label="Tracks" class="flex h-14 rounded-control bg-land">
    <template v-for="block in blocks" :key="block.track.number">
      <li
        v-if="block.splitItem !== null"
        class="flex-none"
        :style="{ width: `${SPLIT_ITEM_PX}px` }"
      >
        <button
          type="button"
          :aria-label="block.splitItem.label"
          :title="block.splitItem.label"
          :aria-current="block.splitItem.isSelected ? 'true' : undefined"
          class="relative block size-full cursor-pointer rounded-control tint-transition after:absolute after:inset-y-0 after:left-[3px] after:w-0.5 after:bg-split hover:bg-split focus-visible:z-10 focus-visible:bg-split focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
          :class="block.splitItem.isSelected ? 'bg-split' : ''"
          @mousedown="releaseFocus"
          @click="split.selectSplit(block.splitItem.id)"
        />
      </li>
      <li
        :title="`${block.track.name}, ${block.length}`"
        :aria-current="split.isTrackSelected(block.track) ? 'true' : undefined"
        class="min-w-0 flex-none rounded-control border-2 bg-track text-on-track tint-transition"
        :class="[
          block.showLength ? 'px-2.5' : block.showName ? 'px-1' : '',
          split.isTrackSelected(block.track) ? 'border-on-track' : 'border-transparent',
        ]"
        :style="{ width: `${block.widthPx}px` }"
      >
        <!-- The ring is inside the block, in on-track: outside it would sit on the land, and the
      on-track colour has no contrast there. The name is the button's, as a block too narrow for
      text is still one to click. -->
        <button
          type="button"
          :aria-label="`${block.track.name}, ${block.length}`"
          class="flex size-full min-w-0 cursor-pointer flex-col justify-center gap-0.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-on-track"
          @mousedown="releaseFocus"
          @click="split.selectTrack(block.track)"
        >
          <template v-if="block.showName">
            <span class="truncate text-sm font-semibold">{{ block.label }}</span>
            <span v-if="block.showLength" class="truncate text-xs">{{ block.length }}</span>
          </template>
        </button>
      </li>
    </template>
  </ol>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { useSplitStore } from '@/entities/split/model/split.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { layoutTrackBlocks } from '../lib/layout-track-blocks.ts'

/*
The tracks as proportional blocks on a land ground, one per track, with their name and length.
Widths come from `layoutTrackBlocks`, which needs the strip's pixel width, and which also decides
whether a block is wide enough for its name and length.

A track starts at a split, so a click on its block selects that split, and the block of the
selected split's track is marked with a 2 px `on-track` border (DESIGN.md's "Selected" bullet). The
first track starts with the file: its block selects nothing and is not a button.
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
    ...layout[index]!,
  }))
})
</script>

<template>
  <ol ref="strip" aria-label="Tracks" class="flex h-14 gap-1.5 rounded-control bg-land">
    <li
      v-for="block in blocks"
      :key="block.track.number"
      :title="`${block.track.name}, ${block.length}`"
      :aria-label="`${block.track.name}, ${block.length}`"
      :aria-current="split.isTrackSelected(block.track) ? 'true' : undefined"
      class="min-w-0 flex-none rounded-control border-2 bg-track text-on-track"
      :class="[
        block.showLength ? 'px-2.5' : block.showName ? 'px-1' : '',
        split.isTrackSelected(block.track) ? 'border-on-track' : 'border-transparent',
      ]"
      :style="{ width: `${block.widthPx}px` }"
    >
      <!-- A block is a button when it starts at a split. The ring is inside the block, in on-track:
      outside it would sit on the land, and the on-track colour has no contrast there. -->
      <component
        :is="block.track.startSplit === null ? 'div' : 'button'"
        :type="block.track.startSplit === null ? undefined : 'button'"
        class="flex size-full min-w-0 flex-col justify-center gap-0.5 text-left"
        :class="
          block.track.startSplit === null
            ? ''
            : 'cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-on-track'
        "
        @click="split.selectTrack(block.track)"
      >
        <template v-if="block.showName">
          <span class="truncate text-sm font-semibold">{{ block.track.name }}</span>
          <span v-if="block.showLength" class="truncate text-xs">{{ block.length }}</span>
        </template>
      </component>
    </li>
  </ol>
</template>

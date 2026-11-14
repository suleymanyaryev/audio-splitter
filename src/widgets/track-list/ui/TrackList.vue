<script setup lang="ts">
import { useSplitStore } from '@/entities/split/model/split.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'

/*
The tracks as a read-only table: number, start (hundredths, where a split's position is read) and
length (whole seconds). It is as tall as the zoom view's 160 px content area and scrolls inside
itself, the heading row staying in view.
*/
const split = useSplitStore()
</script>

<template>
  <div class="h-40 overflow-y-auto">
    <table class="w-full border-separate border-spacing-0 text-left text-sm">
      <thead>
        <tr class="text-xs font-medium text-muted">
          <th scope="col" class="sticky top-0 w-12 border-b border-hairline bg-surface py-1 pr-2">
            #
          </th>
          <th scope="col" class="sticky top-0 border-b border-hairline bg-surface py-1 pr-2">
            Start
          </th>
          <th scope="col" class="sticky top-0 border-b border-hairline bg-surface py-1">Length</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="track in split.tracks" :key="track.number">
          <td class="border-b border-hairline py-1.5 pr-2">
            <span class="inline-flex size-5 items-center justify-center text-muted">
              {{ track.number }}
            </span>
          </td>
          <td class="border-b border-hairline py-1.5 pr-2">
            {{ formatHundredths(track.startSeconds) }}
          </td>
          <td class="border-b border-hairline py-1.5">
            {{ formatDuration(track.lengthSeconds) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'

const { hint = '' } = defineProps<{
  // What the control does ("Add split").
  label: string
  // The control's key ("Enter"), shown after the label in brackets.
  hint?: string
}>()
</script>

<template>
  <!-- Reka's tooltip needs a provider above it; one each keeps the kit component self-contained. -->
  <TooltipProvider :delay-duration="400">
    <TooltipRoot>
      <!-- The slot's one element is the trigger itself, so it keeps its own focus and click. -->
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          side="top"
          :side-offset="6"
          class="z-50 rounded-control bg-ink px-2 py-1 text-xs font-semibold whitespace-nowrap text-surface"
        >
          {{ hint ? `${label} (${hint})` : label }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

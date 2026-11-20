import type { PanelView } from '@/entities/split/model/split.ts'

// The view's section is named by the view's own name: `split`, `track` or `range`.
export function orderSections<Section extends { id: string }>(
  sections: readonly Section[],
  view: PanelView,
): Section[] {
  const shown = sections.filter((section) => section.id === view)
  return [...shown, ...sections.filter((section) => section.id !== view)]
}

import { usePageKeys } from '@/shared/lib/keyboard/use-page-keys.ts'

// Calls `onPress` when `?` is pressed anywhere on the page, under the page-level key rules.
export function useQuestionMarkKey(onPress: () => void) {
  usePageKeys((event) => {
    if (event.key !== '?') return false
    onPress()
    return true
  })
}

import { computed, readonly, ref, watch } from 'vue'

const THEME_CHOICES = ['system', 'light', 'dark'] as const
type ThemeChoice = (typeof THEME_CHOICES)[number]
type ThemeInEffect = 'light' | 'dark'

/*
Where the choice is kept between visits. The inline script in `index.html` reads the same key, so
the page is themed before the app starts.
*/
export const THEME_STORAGE_KEY = 'audio-splitter:theme'

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

const themeChoice = ref<ThemeChoice>('system')
const osIsDark = ref(false)

// The choice, or what the OS says while the choice is `system`.
const themeInEffect = computed<ThemeInEffect>(() => {
  if (themeChoice.value === 'system') return osIsDark.value ? 'dark' : 'light'
  return themeChoice.value
})

function isThemeChoice(value: unknown): value is ThemeChoice {
  return (THEME_CHOICES as readonly unknown[]).includes(value)
}

// The last choice saved, or `system`: the first visit, text this app did not write, or blocked storage.
function readSavedChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeChoice(saved)) return saved
  } catch {
    // Blocked storage: the default below.
  }
  return 'system'
}

function saveChoice(value: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // Blocked or full: the choice lasts for this visit only.
  }
}

/*
Writes the theme in effect to `<html>`: the CSS keys its dark block on `data-theme`, and
`color-scheme` themes the browser's own parts (scrollbars, text fields, the file picker button).
`data-theme` is always `light` or `dark`, never `system`.
*/
function applyToRoot(theme: ThemeInEffect) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

/*
Starts the theme: reads the saved choice, applies the theme in effect to `<html>` and from then on
keeps the attribute in step with it. The OS is listened to only while the choice is `system`.
Returns the function that stops it. Call it once, before the app mounts.
*/
export function startTheme(): () => void {
  const darkScheme = globalThis.matchMedia(DARK_SCHEME_QUERY)
  const followOs = () => {
    osIsDark.value = darkScheme.matches
  }

  themeChoice.value = readSavedChoice()
  osIsDark.value = darkScheme.matches

  const stopApplying = watch(themeInEffect, applyToRoot, { immediate: true, flush: 'sync' })
  const stopFollowing = watch(
    themeChoice,
    (value, _previous, onCleanup) => {
      if (value !== 'system') return
      followOs()
      darkScheme.addEventListener('change', followOs)
      onCleanup(() => {
        darkScheme.removeEventListener('change', followOs)
      })
    },
    { immediate: true, flush: 'sync' },
  )

  return () => {
    stopApplying()
    stopFollowing()
  }
}

// What the header's switch and the canvases read. The state is read-only; `setThemeChoice` changes it.
export function useTheme() {
  return {
    themeChoice: readonly(themeChoice),
    themeInEffect,
    setThemeChoice(value: ThemeChoice) {
      themeChoice.value = value
      saveChoice(value)
    },
  }
}

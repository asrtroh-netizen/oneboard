import { reactive, computed } from 'vue'
import { STORAGE_KEYS } from '../utils/storageKeys'

const STORAGE_KEY = STORAGE_KEYS.theme

function getStoredMode() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'auto') return value
  } catch {}
  return 'dark'
}

function resolveEffective(mode) {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export const themeState = reactive({
  mode: getStoredMode(),
})

export const effectiveTheme = computed(() => resolveEffective(themeState.mode))
export const isDark = computed(() => effectiveTheme.value === 'dark')

export function applyTheme() {
  const effective = resolveEffective(themeState.mode)
  document.documentElement.dataset.theme = effective
  document.documentElement.style.colorScheme = effective
}

export function setThemeMode(mode) {
  if (mode !== 'light' && mode !== 'dark' && mode !== 'auto') return
  themeState.mode = mode
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {}
  applyTheme()
}

export function toggleDarkMode() {
  if (themeState.mode === 'auto') {
    setThemeMode(isDark.value ? 'light' : 'dark')
    return
  }
  setThemeMode(themeState.mode === 'dark' ? 'light' : 'dark')
}

export function initTheme() {
  reloadThemeFromStorage()
  applyTheme()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (themeState.mode === 'auto') applyTheme()
  })
}

export function reloadThemeFromStorage() {
  themeState.mode = getStoredMode()
}

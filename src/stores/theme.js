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

/** 与 index.html / manifest.webmanifest 保持一致的系统级 UI 着色 */
const THEME_COLORS = { dark: '#070812', light: '#e8edff' }

/**
 * 同步 meta[name=theme-color]，让 Android 状态栏 / iOS Safari 标签栏
 * 跟随面板主题切换着色（静态 meta 只覆盖首帧，切换需运行时更新）
 */
function syncThemeColorMeta(effective) {
  // 移除带 media 的静态标签，避免与动态值互相打架
  document
    .querySelectorAll('meta[name="theme-color"][media]')
    .forEach((el) => el.remove())
  let meta = document.querySelector('meta[name="theme-color"]:not([media])')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', THEME_COLORS[effective] || THEME_COLORS.dark)
}

export function applyTheme() {
  const effective = resolveEffective(themeState.mode)
  document.documentElement.dataset.theme = effective
  document.documentElement.style.colorScheme = effective
  syncThemeColorMeta(effective)
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

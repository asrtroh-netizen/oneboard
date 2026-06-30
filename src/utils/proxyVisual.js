import { getFlagAssetPath, getFlagEmoji, GLOBAL_FLAG_PATH, normalizeCountryCode } from './countryRegistry'

export const GLOBAL_VISUAL = GLOBAL_FLAG_PATH

const TINT_ORDER = ['HK', 'JP', 'SG', 'US', 'TW', 'GB', 'DE', 'NZ', 'GLOBAL', 'APPLE', 'CAT', 'CHAIN']

/** 斜角背景裁切：锚点 + 缩放（按国旗构图单独调） */
const FLAG_BG_TUNING = {
  HK: { x: '56%', y: '42%', scaleMin: 0.74, scaleMax: 0.78 },
  GB: { x: '50%', y: '50%', scaleMin: 0.74, scaleMax: 0.78 },
  US: { x: '34%', y: '34%', scaleMin: 0.74, scaleMax: 0.78 },
  NZ: { x: '72%', y: '48%', scaleMin: 0.74, scaleMax: 0.78 },
  DE: { x: '50%', y: '46%', scaleMin: 0.7, scaleMax: 0.74 },
  JP: { x: '58%', y: '50%', scaleMin: 0.7, scaleMax: 0.74 },
  SG: { x: '50%', y: '50%', scaleMin: 0.7, scaleMax: 0.74 },
  TW: { x: '48%', y: '50%', scaleMin: 0.7, scaleMax: 0.74 },
  KR: { x: '52%', y: '50%', scaleMin: 0.7, scaleMax: 0.74 },
}

export function proxyFlagSrc(code) {
  if (!code || code === 'GLOBAL' || code === 'CHAIN' || code === 'APPLE' || code === 'CAT') return null
  const path = getFlagAssetPath(code)
  if (path === GLOBAL_FLAG_PATH) return null
  return path
}

export function proxyVisualSrc(code) {
  return proxyFlagSrc(code) || GLOBAL_VISUAL
}

export function proxyIconEmoji(code) {
  if (code === 'APPLE') return '🍎'
  if (code === 'CAT') return '🐱'
  return null
}

export function proxyWatermarkEmoji(code) {
  return proxyIconEmoji(code)
}

export function proxyFlagEmoji(code) {
  return getFlagEmoji(code)
}

export function proxyTint(code) {
  const normalized = normalizeFlagCode(code)
  const idx = TINT_ORDER.indexOf(normalized)
  if (idx >= 0) return idx % 4
  let h = 0
  for (const c of normalized || '') h = (h + c.charCodeAt(0)) % 4
  return h
}

export function normalizeFlagCode(code) {
  return normalizeCountryCode(code)
}

export function proxyFlagWatermarkFocus(code) {
  const tuning = resolveFlagBgTuning(code)
  return { x: tuning.x, y: tuning.y }
}

function resolveFlagBgTuning(code) {
  const normalized = normalizeFlagCode(code)
  if (FLAG_BG_TUNING[normalized]) return FLAG_BG_TUNING[normalized]

  let h = 0
  for (const c of normalized || '') h = (h + c.charCodeAt(0)) % 24
  return {
    x: `${46 + h}%`,
    y: '50%',
    scaleMin: 0.68,
    scaleMax: 0.72,
  }
}

/** 注入卡片 CSS 变量：裁切锚点 + 背景缩放 */
export function proxyFlagWatermarkStyle(code) {
  const tuning = resolveFlagBgTuning(code)
  return {
    '--flag-focus-x': tuning.x,
    '--flag-focus-y': tuning.y,
    '--ob-flag-scale-min': String(tuning.scaleMin),
    '--ob-flag-scale-max': String(tuning.scaleMax),
  }
}

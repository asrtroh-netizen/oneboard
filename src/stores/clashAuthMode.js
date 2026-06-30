/**
 * Clash 系后端（Mihomo / OpenClash / Nikki）鉴权模式自动探测缓存。
 *
 * 不同实现对 secret 的校验严格程度不同：
 * - Mihomo Meta：external-controller 配置了 secret 时通常严格校验
 * - OpenClash：常见配置下不严格校验（甚至允许空 secret 仍放行）
 * - Nikki：基于 Clash Meta，行为更接近 Mihomo
 *
 * 不预设任何后端必须需要 secret —— 由 fetchClashAPI() 实际探测决定，
 * 探测结果按「上游地址」缓存，避免每次请求都重复试探。
 */
import { reactive } from 'vue'
import { STORAGE_KEYS } from '../utils/storageKeys'

const STORAGE_KEY = STORAGE_KEYS.clashAuthMode

/** @typedef {'no-auth'|'auth-required'|'unknown'} ClashAuthMode */

function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const authModeCache = reactive(readCache())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...authModeCache }))
  } catch {
    /* ignore */
  }
}

function cacheKey(upstream) {
  const key = String(upstream || '').trim().toLowerCase()
  return key || '__default__'
}

/** @returns {ClashAuthMode} */
export function getClashAuthMode(upstream) {
  return authModeCache[cacheKey(upstream)] || 'unknown'
}

/** @param {ClashAuthMode} mode */
export function setClashAuthMode(upstream, mode) {
  const key = cacheKey(upstream)
  if (mode === 'no-auth' || mode === 'auth-required') {
    authModeCache[key] = mode
  } else {
    delete authModeCache[key]
  }
  persist()
}

export function clearClashAuthMode(upstream) {
  delete authModeCache[cacheKey(upstream)]
  persist()
}

export function clearAllClashAuthModes() {
  Object.keys(authModeCache).forEach((key) => delete authModeCache[key])
  persist()
}

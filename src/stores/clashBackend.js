import { reactive, computed } from 'vue'
import {
  CLASH_BACKEND_STORAGE_KEY,
  CLASH_BACKEND_LIST,
  DEFAULT_BACKEND_TYPE,
  DEFAULT_CLASH_PORT,
  getClashBackendProfile,
  isClashBackendType,
} from '../config/clashBackend'
const ENV_SECRET = String(import.meta.env.VITE_MIHOMO_SECRET || '').trim()

/**
 * 常见复制粘贴失误：从 YAML（secret: "xxxx"）里连引号一起复制进设置框，
 * 导致密钥比配置里多了一对引号，造成 401。这里统一去除首尾空白与包裹引号。
 */
function cleanSecret(raw) {
  let value = String(raw || '').trim()
  if (value.length >= 2) {
    const first = value[0]
    const last = value[value.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      value = value.slice(1, -1).trim()
    }
  }
  return value
}

function readStored() {
  try {
    const raw = localStorage.getItem(CLASH_BACKEND_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function loadInitialState() {
  const stored = readStored()
  const type = isClashBackendType(stored?.type) ? stored.type : DEFAULT_BACKEND_TYPE
  const port = Number(stored?.port) || DEFAULT_CLASH_PORT
  return {
    type,
    host: String(stored?.host || '').trim(),
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_CLASH_PORT,
    secret: cleanSecret(stored?.secret),
    connected: false,
    lastError: '',
  }
}

export const clashBackendState = reactive(loadInitialState())

export const clashBackendProfile = computed(() => getClashBackendProfile(clashBackendState.type))

export const clashBackendLabel = computed(() => {
  const profile = clashBackendProfile.value
  return profile.label
})

export const clashBackendOptions = CLASH_BACKEND_LIST

export function backendSupports(feature) {
  return Boolean(clashBackendProfile.value.features?.[feature])
}

export function resolveClashSecret() {
  return clashBackendState.secret || ENV_SECRET
}

export function isClashBackendConfigured() {
  return Boolean(clashBackendState.host.trim())
}

export function resolveClashUpstreamBase() {
  const hostOverride = clashBackendState.host.trim()
  if (!hostOverride) return ''

  const port = clashBackendState.port || DEFAULT_CLASH_PORT
  const normalized = hostOverride.replace(/^https?:\/\//i, '').replace(/\/$/, '')
  if (normalized.includes(':')) return `http://${normalized}`
  return `http://${normalized}:${port}`
}

export function shouldUseClashProxy() {
  // Always proxy through the gateway (/mihomo/) — gateway.js handles both dev and production.
  // Set VITE_MIHOMO_USE_PROXY=false only if serving static files without the gateway.
  return import.meta.env.VITE_MIHOMO_USE_PROXY !== 'false'
}

export function resolveClashApiBase() {
  if (shouldUseClashProxy()) return '/mihomo'
  return resolveClashUpstreamBase()
}

export function resolveClashWsBase() {
  const base = resolveClashApiBase()
  if (base.startsWith('/')) {
    const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost'
    return `${proto}//${host}${base}`
  }
  return base.replace(/^http/, 'ws')
}

export function resolveClashProxyTarget() {
  return resolveClashUpstreamBase()
}

export function setClashBackendConnection({ type, host, port, secret }) {
  if (isClashBackendType(type)) clashBackendState.type = type
  if (host != null) clashBackendState.host = String(host).trim()
  if (port != null) {
    const n = Number(port)
    clashBackendState.port = Number.isFinite(n) && n > 0 ? n : DEFAULT_CLASH_PORT
  }
  if (secret != null) clashBackendState.secret = cleanSecret(secret)
  persistClashBackend()
}

export function persistClashBackend() {
  try {
    localStorage.setItem(
      CLASH_BACKEND_STORAGE_KEY,
      JSON.stringify({
        type: clashBackendState.type,
        host: clashBackendState.host,
        port: clashBackendState.port,
        secret: clashBackendState.secret,
      }),
    )
  } catch {
    /* ignore */
  }
}

/** Re-read persisted Clash backend settings (after legacy storage migration). */
export function hydrateClashBackendFromStorage() {
  const stored = readStored()
  if (!stored) return

  const type = isClashBackendType(stored?.type) ? stored.type : DEFAULT_BACKEND_TYPE
  const port = Number(stored?.port) || DEFAULT_CLASH_PORT

  clashBackendState.type = type
  clashBackendState.host = String(stored?.host || '').trim()
  clashBackendState.port = Number.isFinite(port) && port > 0 ? port : DEFAULT_CLASH_PORT
  clashBackendState.secret = cleanSecret(stored?.secret)
}

export function setClashBackendConnected(connected, error = '') {
  clashBackendState.connected = Boolean(connected)
  clashBackendState.lastError = connected ? '' : String(error || '')
}

/** Dev / preview：让 Vite /mihomo 反代跟随当前连接配置 */
export function getClashProxyUpstreamHeader() {
  if (!shouldUseClashProxy()) return ''
  return resolveClashUpstreamBase()
}

export function applyClashProxyHeaders(headers = {}) {
  const next = { ...headers }
  const upstream = getClashProxyUpstreamHeader()
  if (upstream) next['X-OneBord-Clash-Upstream'] = upstream
  return next
}

export function getKernelDisplayName(meta = false) {
  const profile = clashBackendProfile.value
  if (profile.id === 'mihomo' && meta) return 'Mihomo Meta'
  return profile.label
}

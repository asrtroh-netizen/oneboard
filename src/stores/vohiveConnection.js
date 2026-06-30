import { reactive } from 'vue'
import { STORAGE_KEYS } from '../utils/storageKeys'
import {
  DEFAULT_VOHIVE_PORT,
  buildVoHiveUpstreamOrigin,
  normalizeVoHiveOrigin,
} from '../utils/vohiveEndpoint'
import { getActiveVoHiveInstance } from './vohiveInstances'

export { DEFAULT_VOHIVE_PORT, normalizeVoHiveOrigin }
export const VOHIVE_CONNECTION_STORAGE_KEY = STORAGE_KEYS.vohiveConnection
/** @deprecated 使用 DEFAULT_VOHIVE_PORT */
export const VOHIVE_PORT = DEFAULT_VOHIVE_PORT

function readStored() {
  try {
    const raw = localStorage.getItem(VOHIVE_CONNECTION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function parseStoredPort(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function loadInitialState() {
  const stored = readStored()
  const host = String(stored?.host || '').trim()
  const port = parseStoredPort(stored?.port)
  return {
    host,
    port,
    connected: false,
    lastError: '',
  }
}

export const vohiveConnectionState = reactive(loadInitialState())

/** 统一读取当前 active backend 的连接字段 */
export function resolveVoHiveBackend() {
  const active = getActiveVoHiveInstance()
  if (active?.host?.trim()) {
    const upstream = buildVoHiveUpstreamOrigin({ host: active.host, port: active.port })
    return {
      instanceId: active.id,
      host: active.host,
      port: active.port ?? null,
      upstream,
      token: active.token || '',
      username: active.username || '',
    }
  }

  const host = vohiveConnectionState.host.trim()
  if (!host) {
    return {
      instanceId: null,
      host: '',
      port: null,
      upstream: '',
      token: '',
      username: '',
    }
  }

  return {
    instanceId: null,
    host,
    port: vohiveConnectionState.port ?? null,
    upstream: buildVoHiveUpstreamOrigin({ host, port: vohiveConnectionState.port }),
    token: '',
    username: '',
  }
}

export function isVoHiveGlobalConfigured() {
  return Boolean(resolveVoHiveBackend().upstream)
}

/**
 * 根据 host/port 拼 VoHive 上游 origin（不含 /api）。
 * 主机留空时返回 ''，不自动回退到 LAN / .env。
 */
export function buildVoHiveUpstream(host = '', port = null) {
  return buildVoHiveUpstreamOrigin({ host, port })
}

/** 解析全局 VoHive 上游 — 仅使用 active backend 或已保存的主机。 */
export function resolveVoHiveUpstreamBase() {
  return resolveVoHiveBackend().upstream
}

export function shouldUseVoHiveProxy() {
  if (import.meta.env.VITE_VOHIVE_USE_PROXY === 'true') return true
  if (import.meta.env.VITE_VOHIVE_USE_PROXY === 'false') return false
  return import.meta.env.DEV || import.meta.env.MODE === 'preview'
}

export function resolveVoHiveApiBase() {
  if (shouldUseVoHiveProxy()) return '/vohive'
  const origin = resolveVoHiveUpstreamBase()
  return origin ? `${origin.replace(/\/api\/?$/i, '')}/api` : '/api'
}

export function getVoHiveApiBase() {
  return resolveVoHiveApiBase()
}

export function getVoHiveHostLabel() {
  return resolveVoHiveUpstreamBase()
}

/** @deprecated 使用 resolveVoHiveUpstreamBase */
export function getVoHiveUpstreamBase() {
  return resolveVoHiveUpstreamBase()
}

export function resolveVoHiveProxyTarget() {
  return resolveVoHiveUpstreamBase()
}

export function setVoHiveConnection({ host, port }) {
  if (host != null) vohiveConnectionState.host = String(host).trim()
  if (port !== undefined) {
    if (port === null || port === '') vohiveConnectionState.port = null
    else {
      const n = Number(port)
      vohiveConnectionState.port = Number.isFinite(n) && n > 0 ? n : null
    }
  }
  persistVoHiveConnection()
}

export function persistVoHiveConnection() {
  try {
    localStorage.setItem(
      VOHIVE_CONNECTION_STORAGE_KEY,
      JSON.stringify({
        host: vohiveConnectionState.host,
        port: vohiveConnectionState.port,
      }),
    )
  } catch {
    /* ignore */
  }
}

export function clearVoHiveConnectionState() {
  vohiveConnectionState.host = ''
  vohiveConnectionState.port = null
  vohiveConnectionState.connected = false
  vohiveConnectionState.lastError = ''
  persistVoHiveConnection()
}

export function setVoHiveConnected(connected, error = '') {
  vohiveConnectionState.connected = Boolean(connected)
  vohiveConnectionState.lastError = connected ? '' : String(error || '')
}

export function getVoHiveProxyUpstreamHeader(upstreamOverride = '') {
  if (!shouldUseVoHiveProxy()) return ''
  return upstreamOverride || resolveVoHiveUpstreamBase()
}

export function applyVoHiveProxyHeaders(headers = {}, upstreamOverride = '') {
  const next = { ...headers }
  const upstream = getVoHiveProxyUpstreamHeader(upstreamOverride)
  if (upstream) next['X-OneBord-VoHive-Upstream'] = upstream
  return next
}

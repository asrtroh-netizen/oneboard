import {
  resolveClashApiBase,
  resolveClashWsBase,
  resolveClashUpstreamBase,
  resolveClashProxyTarget,
  resolveClashSecret,
  applyClashProxyHeaders,
} from '../stores/clashBackend'

export const MIHOMO_API_PORT = 9090

/** @deprecated 使用 resolveClashSecret() */
export const MIHOMO_SECRET = String(import.meta.env.VITE_MIHOMO_SECRET || '').trim()

export const MIHOMO_POLL_MS = 5000
export const MIHOMO_FALLBACK_POLL_MS = 2000

export function getMihomoUpstreamBase() {
  return resolveClashUpstreamBase()
}

export function getMihomoApiBase() {
  return resolveClashApiBase()
}

export function getMihomoWsBase() {
  return resolveClashWsBase()
}

export function getMihomoHost() {
  return resolveClashUpstreamBase()
}

export function getMihomoAuthHeaders(extra = {}) {
  const headers = applyClashProxyHeaders({ Accept: 'application/json', ...extra })
  const secret = resolveClashSecret()
  if (secret) {
    headers.Authorization = `Bearer ${secret}`
  }
  return headers
}

export function resolveMihomoProxyTarget(pageHostHeader = '') {
  return resolveClashProxyTarget(pageHostHeader)
}

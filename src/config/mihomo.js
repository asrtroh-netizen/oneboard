import {
  resolveClashApiBase,
  resolveClashWsBase,
  resolveClashUpstreamBase,
  resolveClashProxyTarget,
  resolveClashSecret,
  applyClashProxyHeaders,
} from '../stores/clashBackend'
import { getClashAuthMode, setClashAuthMode } from '../stores/clashAuthMode'

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

/** @deprecated 内部请求统一改用 fetchClashAPI()（自动鉴权探测），此函数仅保留向后兼容 */
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

function authCacheKey() {
  return resolveClashUpstreamBase() || resolveClashApiBase()
}

function buildClashHeaders(extra, withAuth) {
  const headers = applyClashProxyHeaders({ Accept: 'application/json', ...extra })
  if (withAuth) {
    const secret = resolveClashSecret()
    if (secret) headers.Authorization = `Bearer ${secret}`
  }
  return headers
}

/**
 * 统一请求层 — 兼容所有 Clash API 实现（Mihomo / OpenClash / Nikki）。
 *
 * 不预设任何后端必须需要 secret：
 * - 未知（'unknown'）或缓存为 'no-auth' 时，先不带 Authorization 请求；
 *   - 200 → 缓存为 'no-auth'（该后端无需鉴权，例如多数 OpenClash 配置）
 *   - 401 且本地配置了 secret → 自动追加 `Authorization: Bearer {secret}` 重试一次
 *     - 重试 200 → 缓存为 'auth-required'（例如 Mihomo Meta / Nikki）
 *     - 重试仍失败 → 视为真实鉴权失败（secret 错误），原样返回 401 响应
 * - 缓存为 'auth-required' 时直接带上 Authorization，避免每次都试探一遍。
 *
 * 所有 backend（Mihomo / OpenClash / Nikki）必须走这一层，禁止各自处理鉴权。
 */
export async function fetchClashAPI(path, fetchOptions = {}) {
  const endpoint = path.startsWith('/') ? path : `/${path}`
  const url = `${resolveClashApiBase()}${endpoint}`
  const upstream = authCacheKey()
  const secret = resolveClashSecret()
  const cachedMode = getClashAuthMode(upstream)
  const startWithAuth = cachedMode === 'auth-required' && Boolean(secret)

  const attempt = (withAuth) => fetch(url, {
    ...fetchOptions,
    headers: buildClashHeaders(fetchOptions.headers, withAuth),
  })

  let res = await attempt(startWithAuth)

  if (res.status === 401 && !startWithAuth && secret) {
    res = await attempt(true)
    if (res.ok) setClashAuthMode(upstream, 'auth-required')
    return res
  }

  if (res.ok) setClashAuthMode(upstream, startWithAuth ? 'auth-required' : 'no-auth')
  return res
}

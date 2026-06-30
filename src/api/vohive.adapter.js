/**
 * VoHive API Adapter — 所有 VoHive 请求经此层，endpoint 集中管理。
 * 对接 VoHive 网关 REST API（/api/devices、/api/health 等）。
 */
import {
  getVoHiveApiBase,
  applyVoHiveProxyHeaders,
  shouldUseVoHiveProxy,
  resolveVoHiveBackend,
} from '../stores/vohiveConnection'
import { clearVoHiveSession, getVoHiveToken } from '../stores/vohiveAuth'
import { startLoading, stopLoading } from '../stores/globalLoading'

/** 相对 /api 的路径 */
export const VOHIVE_ENDPOINTS = Object.freeze({
  DEVICES: '/devices',
  HEALTH: '/health',
  TRAFFIC: '/traffic/analysis',
  LOGIN: '/auth/login',
})

const ALLOWED_EXACT = new Set([
  VOHIVE_ENDPOINTS.DEVICES,
  VOHIVE_ENDPOINTS.HEALTH,
  VOHIVE_ENDPOINTS.TRAFFIC,
  VOHIVE_ENDPOINTS.LOGIN,
  '/devices/actions/rescan',
  '/devices/discovered',
  '/rotateip',
])

const ALLOWED_PREFIXES = ['/devices/', '/cards/', '/sms/']

const FORBIDDEN_PATH_PATTERNS = [
  /^\/dashboard(?:\/|$)/i,
  /^\/status(?:\/|$)/i,
  /^\/events(?:\/|$)/i,
  /^\/stream(?:\/|$)/i,
  /^\/vohive\//i,
  /^\/api\/vohive\//i,
  /^\/proxy(?:\/|$)/i,
  /^\/settings(?:\/|$)/i,
  /^\/logs(?:\/|$)/i,
]

function splitPathAndQuery(path) {
  const raw = String(path || '').trim()
  const qIndex = raw.indexOf('?')
  if (qIndex === -1) return { pathname: raw, search: '' }
  return { pathname: raw.slice(0, qIndex), search: raw.slice(qIndex) }
}

export function assertVoHiveEndpointAllowed(path) {
  const { pathname, search } = splitPathAndQuery(path)
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`

  if (FORBIDDEN_PATH_PATTERNS.some((re) => re.test(normalized))) {
    throw new Error(`VoHive API 路径已禁用: ${normalized}`)
  }

  const allowed = ALLOWED_EXACT.has(normalized)
    || ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix))

  if (!allowed) {
    throw new Error(`VoHive API 未注册: ${normalized}`)
  }

  return `${normalized}${search}`
}

function buildUrl(path, upstreamOverride = '') {
  const safePath = assertVoHiveEndpointAllowed(path)
  // 多容器：非代理模式下直接拼实例上游；开发代理模式走 /vohive，上游由请求头区分。
  const base = (!shouldUseVoHiveProxy() && upstreamOverride)
    ? `${upstreamOverride.replace(/\/$/, '')}/api`
    : getVoHiveApiBase().replace(/\/$/, '')
  let url
  if (base.endsWith('/api')) {
    url = `${base}${safePath}`
  } else if (base === '/vohive' || base.endsWith('/vohive')) {
    url = `${base}${safePath}`
  } else {
    url = `${base}/api${safePath}`
  }
  if (shouldUseVoHiveProxy() && upstreamOverride) {
    const sep = url.includes('?') ? '&' : '?'
    url = `${url}${sep}__vohive_up=${encodeURIComponent(upstreamOverride.replace(/\/$/, ''))}`
  }
  if (/\/api\/api(?:\/|$)/i.test(url)) {
    throw new Error(
      'VoHive API 地址配置错误：出现了 /api/api。请将主机设为 http://<host>:7575（不要带 /api 后缀）',
    )
  }
  return url
}

function parseErrorPayload(text, status) {
  if (status === 502 || status === 503) {
    return `无法连接 VoHive 服务（HTTP ${status}），请检查主机与端口（如 http://<host>:7575）`
  }
  if (!text) return `VoHive HTTP ${status}`
  try {
    const json = JSON.parse(text)
    if (typeof json.message === 'string' && json.message) return json.message
    if (typeof json.error === 'string' && json.error) return json.error
    return text
  } catch {
    return text
  }
}

export function isVoHiveMissingApiError(err) {
  const msg = String(err?.message || err || '').trim()
  if (!msg) return false
  if (/api\s*不存在|api\s*未注册|路径已禁用|not\s*found|404/i.test(msg)) {
    return true
  }
  if (msg.startsWith('{')) {
    try {
      const json = JSON.parse(msg)
      return isVoHiveMissingApiError(json.message || json.error || '')
    } catch {
      return /api\s*不存在|"status"\s*:\s*"error"/i.test(msg)
    }
  }
  return false
}

function unwrapPayload(payload) {
  if (payload == null) return payload
  if (Array.isArray(payload)) return payload
  if (typeof payload !== 'object') return payload
  if (payload.status === 'error' || payload.ok === false) {
    throw new Error(payload.message || payload.error || 'VoHive 请求失败')
  }
  if (payload.data !== undefined) return payload.data
  if (payload.result !== undefined) return payload.result
  return payload
}

export async function vohiveAdapterRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    trackLoading = method !== 'GET',
    auth = true,
    upstream = '',
    token: tokenOverride = '',
    onUnauthorized,
  } = options

  let ticket = null
  if (trackLoading) ticket = startLoading()

  try {
    const reqHeaders = applyVoHiveProxyHeaders({
      Accept: 'application/json',
      ...headers,
    }, upstream)

    if (auth) {
      // 多容器：指定 upstream 时只用本实例 token，绝不回退全局 token
      const backendToken = resolveVoHiveBackend().token
      const token = upstream
        ? String(tokenOverride || '').trim()
        : String(tokenOverride || backendToken || getVoHiveToken() || '').trim()
      if (token) reqHeaders.Authorization = `Bearer ${token}`
    }

    let reqBody = body
    if (body != null && !(body instanceof FormData)) {
      reqHeaders['Content-Type'] = 'application/json'
      reqBody = JSON.stringify(body)
    }

    const res = await fetch(buildUrl(path, upstream), {
      method,
      headers: reqHeaders,
      body: reqBody,
      cache: 'no-store',
    })

    const text = await res.text()
    if (res.status === 401 && auth) {
      if (upstream && onUnauthorized) onUnauthorized()
      else clearVoHiveSession()
      throw new Error('VoHive 登录已失效，请重新登录')
    }
    if (!res.ok) {
      throw new Error(parseErrorPayload(text, res.status))
    }
    if (!text) return null
    try {
      return unwrapPayload(JSON.parse(text))
    } catch {
      return text
    }
  } catch (err) {
    if (err?.name === 'TypeError' && String(err.message).includes('fetch')) {
      throw new Error(`无法连接 VoHive（${getVoHiveApiBase()}）`)
    }
    throw err
  } finally {
    if (ticket != null) stopLoading(ticket)
  }
}

function devicePath(deviceId, suffix = '') {
  const id = encodeURIComponent(String(deviceId || '').trim())
  if (!id) throw new Error('缺少 deviceId')
  return `/devices/${id}${suffix}`
}

/** VoHive /overview 返回 { devices: [device] }，与官方前端一致取首项 */
function unwrapOverviewDevice(payload) {
  if (!payload) return null
  if (Array.isArray(payload.devices)) return payload.devices[0] || null
  if (payload.overview && typeof payload.overview === 'object') return payload.overview
  return payload
}

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return
    qs.set(key, String(value))
  })
  const q = qs.toString()
  return q ? `?${q}` : ''
}

// ── 设备列表 / 健康 ──

export function getDevices(ctx = {}) {
  return vohiveAdapterRequest(VOHIVE_ENDPOINTS.DEVICES, { trackLoading: false, ...ctx })
}

export function getHealth(ctx = {}) {
  return vohiveAdapterRequest(VOHIVE_ENDPOINTS.HEALTH, { trackLoading: false, ...ctx })
}

export function getTraffic(params = {}) {
  const { deviceId, range, ...ctx } = params
  const path = `${VOHIVE_ENDPOINTS.TRAFFIC}${buildQuery({
    device_id: deviceId,
    range,
  })}`
  return vohiveAdapterRequest(path, { trackLoading: false, ...ctx })
}

export async function login(username, password, options = {}) {
  const { upstream = '', ...ctx } = options
  const payload = await vohiveAdapterRequest(VOHIVE_ENDPOINTS.LOGIN, {
    method: 'POST',
    body: { username, password },
    auth: false,
    trackLoading: true,
    upstream,
    ...ctx,
  })
  const token = payload?.token || payload?.access_token || payload?.session_token
  if (!token) throw new Error('登录成功但未返回 token')
  return { token, username: payload?.username || username }
}

// ── 设备详情 / 操作 ──

export async function getDeviceOverview(deviceId, ctx = {}) {
  try {
    const payload = await vohiveAdapterRequest(devicePath(deviceId, '/overview'), {
      trackLoading: false,
      ...ctx,
    })
    const resolved = unwrapOverviewDevice(payload)
    if (resolved) return resolved
  } catch {
    /* fallback to device detail */
  }

  const detail = await vohiveAdapterRequest(devicePath(deviceId), {
    trackLoading: false,
    ...ctx,
  }).catch(() => null)

  return unwrapOverviewDevice(detail) || detail
}

export function getEsimProfiles(deviceId, options = {}) {
  const { refresh = false, ...ctx } = options
  const path = `${devicePath(deviceId, '/esim/profiles')}${buildQuery({
    refresh: refresh ? '1' : '',
  })}`
  return vohiveAdapterRequest(path, { trackLoading: false, ...ctx })
}

export function refreshDeviceInfo(deviceId, ctx = {}) {
  return vohiveAdapterRequest(devicePath(deviceId, '/actions/refresh'), {
    method: 'POST',
    trackLoading: true,
    ...ctx,
  })
}

export function rebootDevice(deviceId, ctx = {}) {
  return vohiveAdapterRequest(devicePath(deviceId, '/actions/reboot'), {
    method: 'POST',
    trackLoading: true,
    ...ctx,
  })
}

export function reconnectVowifi(deviceId, ctx = {}) {
  return vohiveAdapterRequest(devicePath(deviceId, '/vowifi/actions/reconnect'), {
    method: 'POST',
    trackLoading: true,
    ...ctx,
  })
}

export function sendAtCommand(deviceId, body, ctx = {}) {
  return vohiveAdapterRequest(devicePath(deviceId, '/actions/at'), {
    method: 'POST',
    body,
    trackLoading: true,
    ...ctx,
  })
}

export function switchEsimProfile(deviceId, body, ctx = {}) {
  return vohiveAdapterRequest(devicePath(deviceId, '/esim/actions/switch'), {
    method: 'POST',
    body,
    trackLoading: true,
    ...ctx,
  })
}

export function rescanDevices() {
  return vohiveAdapterRequest('/devices/actions/rescan', {
    method: 'POST',
    trackLoading: true,
  })
}

export function rotateDeviceIp(deviceId) {
  return vohiveAdapterRequest('/rotateip', {
    method: 'POST',
    body: { device_id: deviceId },
    trackLoading: true,
  })
}

// ── 卡策略 / 配置 ──

function cardPolicyPath(iccid) {
  const id = encodeURIComponent(String(iccid || '').trim())
  if (!id) throw new Error('缺少 ICCID')
  return `/cards/${id}/policy`
}

export function getCardPolicy(iccid, ctx = {}) {
  return vohiveAdapterRequest(cardPolicyPath(iccid), { trackLoading: false, ...ctx })
}

export function putCardPolicy(iccid, body, ctx = {}) {
  return vohiveAdapterRequest(cardPolicyPath(iccid), {
    method: 'PUT',
    body,
    trackLoading: true,
    ...ctx,
  })
}

export async function getDeviceConfig(deviceId, ctx = {}) {
  const payload = await vohiveAdapterRequest(devicePath(deviceId, '/config'), {
    trackLoading: false,
    ...ctx,
  })
  if (payload?.config && typeof payload.config === 'object') return payload.config
  return payload
}

export function updateDeviceConfig(deviceId, config, ctx = {}) {
  return vohiveAdapterRequest(devicePath(deviceId), {
    method: 'PUT',
    body: { config },
    trackLoading: true,
    ...ctx,
  })
}

export function setDeviceFlightMode(deviceId, enabled, ctx = {}) {
  return vohiveAdapterRequest(devicePath(deviceId, '/flight-mode'), {
    method: 'PATCH',
    body: { enabled: Boolean(enabled) },
    trackLoading: true,
    ...ctx,
  })
}

export function setDeviceNetwork(deviceId, enabled, ctx = {}) {
  return vohiveAdapterRequest(devicePath(deviceId, '/network'), {
    method: 'PATCH',
    body: { enabled: Boolean(enabled) },
    trackLoading: true,
    ...ctx,
  })
}

// ── 短信 ──

export function getSmsContacts(options = {}) {
  const { deviceId, limit = 200, ...ctx } = options
  const path = `/sms/contacts${buildQuery({
    limit,
    device_id: deviceId && deviceId !== 'all' ? deviceId : '',
  })}`
  return vohiveAdapterRequest(path, { trackLoading: false, ...ctx })
}

export function getSmsThread(params = {}, ctx = {}) {
  const path = `/sms/thread${buildQuery({
    peer: params.peer,
    imsi: params.imsi,
    device_id: params.deviceId ?? params.device_id,
    limit: params.limit ?? 80,
    before_ts: params.beforeTs ?? params.before_ts,
    before_id: params.beforeId ?? params.before_id,
  })}`
  return vohiveAdapterRequest(path, { trackLoading: false, ...ctx })
}

export function sendSms(body, ctx = {}) {
  return vohiveAdapterRequest('/sms/send', {
    method: 'POST',
    body,
    trackLoading: true,
    ...ctx,
  })
}

export function deleteSmsMessage(messageId, ctx = {}) {
  const id = encodeURIComponent(String(messageId || '').trim())
  if (!id) throw new Error('缺少短信 ID')
  return vohiveAdapterRequest(`/sms/messages/${id}`, {
    method: 'DELETE',
    trackLoading: true,
    ...ctx,
  })
}

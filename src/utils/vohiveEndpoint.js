/** VoHive 上游地址解析 — 支持 LAN / 公网 / HTTPS 反代 / 可选端口 */

export const DEFAULT_VOHIVE_PORT = 7575

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/
const IPV6_RE = /^\[[\da-f:]+\]$|^[\da-f:]+:[\da-f:]*[\da-f]$/i

function trimInput(value) {
  return String(value ?? '').trim()
}

function isIpAddress(host) {
  const h = trimInput(host).replace(/^\[/, '').replace(/\]$/, '')
  return IPV4_RE.test(h) || IPV6_RE.test(h) || h === 'localhost'
}

function isLikelyDomain(host) {
  const h = trimInput(host).split('/')[0].split(':')[0]
  if (!h || isIpAddress(h)) return false
  return h.includes('.') || /^[a-z0-9-]+$/i.test(h)
}

/** @returns {'http'|'https'} */
export function detectVoHiveProtocol(host, explicitPort = null) {
  const raw = trimInput(host)
  if (/^https:\/\//i.test(raw)) return 'https'
  if (/^http:\/\//i.test(raw)) return 'http'

  const bare = raw.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0]
  if (isLikelyDomain(bare) && (explicitPort == null || explicitPort === '')) return 'https'
  return 'http'
}

function formatHostForUrl(hostname) {
  const h = trimInput(hostname)
  if (IPV6_RE.test(h) && !h.startsWith('[')) return `[${h}]`
  return h
}

function buildOrigin(protocol, hostname, port) {
  const host = formatHostForUrl(hostname)
  const p = port == null || port === '' ? null : Number(port)
  if (p != null && Number.isFinite(p) && p > 0) {
    const isDefault = (protocol === 'https' && p === 443) || (protocol === 'http' && p === 80)
    if (!isDefault) return `${protocol}://${host}:${p}`
  }
  return `${protocol}://${host}`
}

function resolveImplicitPort(protocol, hostname, explicitPort) {
  if (explicitPort != null && explicitPort !== '') {
    const n = Number(explicitPort)
    if (Number.isFinite(n) && n > 0) return n
  }
  const bare = trimInput(hostname).replace(/^\[/, '').replace(/\]$/, '')
  if (protocol === 'https') return null
  if (isIpAddress(bare) || bare === 'localhost') return DEFAULT_VOHIVE_PORT
  if (isLikelyDomain(bare)) return null
  return DEFAULT_VOHIVE_PORT
}

/**
 * @param {{ host?: string, port?: string|number|null }} input
 * @returns {{
 *   host: string,
 *   port: number|null,
 *   protocol: 'http'|'https',
 *   origin: string,
 *   baseUrl: string,
 *   displayHost: string,
 * }}
 */
export function normalizeVoHiveEndpoint(input = {}) {
  let hostField = trimInput(input.host)
  let explicitPort = input.port
  if (explicitPort === '' || explicitPort === undefined) explicitPort = null
  else if (explicitPort != null) {
    const n = Number(explicitPort)
    explicitPort = Number.isFinite(n) && n > 0 ? n : null
  }

  if (!hostField) {
    return {
      host: '',
      port: null,
      protocol: 'http',
      origin: '',
      baseUrl: '',
      displayHost: '',
    }
  }

  if (/^https?:\/\//i.test(hostField)) {
    try {
      const url = new URL(hostField.includes('://') ? hostField : `http://${hostField}`)
      const protocol = url.protocol.replace(':', '')
      const hostname = url.hostname
      const urlPort = url.port ? Number(url.port) : null
      const port = explicitPort ?? urlPort
      const path = url.pathname.replace(/\/api\/?$/i, '').replace(/\/+$/, '')
      let origin = buildOrigin(protocol, hostname, port)
      if (path && path !== '/') origin += path
      origin = origin.replace(/\/+$/, '')
      return {
        host: hostField.replace(/\/+$/, ''),
        port,
        protocol,
        origin,
        baseUrl: `${origin.replace(/\/api$/i, '')}/api`,
        displayHost: hostField.replace(/\/+$/, ''),
      }
    } catch {
      return {
        host: hostField,
        port: explicitPort,
        protocol: detectVoHiveProtocol(hostField, explicitPort),
        origin: '',
        baseUrl: '',
        displayHost: hostField,
      }
    }
  }

  let hostname = hostField
  let embeddedPort = null
  const hostPortMatch = hostField.match(/^(\[[\da-f:]+\]|[^:/]+):(\d+)$/i)
  if (hostPortMatch) {
    hostname = hostPortMatch[1]
    embeddedPort = Number(hostPortMatch[2])
  }

  const protocol = detectVoHiveProtocol(hostname, explicitPort ?? embeddedPort)
  const port = explicitPort ?? embeddedPort ?? resolveImplicitPort(protocol, hostname, null)
  const origin = buildOrigin(protocol, hostname, port)

  return {
    host: hostField,
    port: port ?? null,
    protocol,
    origin,
    baseUrl: `${origin}/api`,
    displayHost: hostField,
  }
}

/** 去掉末尾 /api，避免拼出 /api/api/... */
export function normalizeVoHiveOrigin(host = '') {
  const norm = normalizeVoHiveEndpoint({ host })
  return norm.origin || trimInput(host).replace(/\/api\/?$/i, '').replace(/\/+$/, '')
}

/** @deprecated 使用 normalizeVoHiveEndpoint */
export function buildVoHiveBaseUrl(origin = '') {
  const base = normalizeVoHiveOrigin(origin)
  return base ? `${base}/api` : ''
}

export function buildVoHiveUpstreamOrigin(input = {}) {
  return normalizeVoHiveEndpoint(input).origin
}

/**
 * @param {string} host
 * @param {string|number|null} [port]
 * @returns {{ ok: true, value: ReturnType<typeof normalizeVoHiveEndpoint> } | { ok: false, error: string }}
 */
export function parseVoHiveEndpointInput(host, port = null) {
  const hostField = trimInput(host)
  if (!hostField) {
    return { ok: false, error: '请填写主机或 URL' }
  }

  if (/^https?:\/\//i.test(hostField)) {
    try {
      // eslint-disable-next-line no-new
      new URL(hostField)
    } catch {
      return { ok: false, error: 'URL 格式无效，请检查协议与地址' }
    }
  } else if (/^[\w.-]+:\/\//.test(hostField)) {
    return { ok: false, error: '仅支持 http:// 或 https:// 协议' }
  }

  const norm = normalizeVoHiveEndpoint({ host: hostField, port })
  if (!norm.origin) {
    return { ok: false, error: '无法解析 VoHive 地址，请检查主机或 URL' }
  }

  return { ok: true, value: norm }
}

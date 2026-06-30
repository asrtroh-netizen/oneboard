const MAX_ENTRIES = 500
const PENDING_TTL_MS = 15000

/** @typedef {{ time: string, domain: string, type: string, upstream: string, sourceIp: string, latency: number, status: 'success' | 'failed' }} DnsQueryEntry */

const RESOLVE_START = /^\[DNS\]\s+resolve\s+(\S+)\s+(\S+)\s+from\s+(.+)$/i
const RESOLVE_OK = /^\[DNS\]\s+(\S+)\s+-->\s+(.+?)\s+from\s+(.+)$/i
const RESOLVE_TUNNEL = /^\[DNS\]\s+(\S+)\s+-->\s+(\S+)$/i
const RESOLVE_ERROR = /^\[DNS\]\s+resolve\s+(\S+)\s+error:\s*(.+)$/i
const LOOKUP_FAIL = /^\[DNS\]\s+lookup\s+([^:]+):\s*(.+)$/i
const CACHE_HIT = /^\[DNS\]\s+cache hit\s+(\S+)\s+-->/i
const CONN_DNS = /^\[(?:UDP|TCP)\]\s+(\S+)\s+-->\s+(\S+)\s+match\s+DNS(?:\([^)]*\))?\s+using\s+(\S+)/i

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

function upstreamHost(raw) {
  const text = String(raw || '').trim()
  if (!text) return '—'
  const withoutScheme = text.replace(/^[a-z+]+:\/\//i, '')
  const host = withoutScheme.split(/[/:?#]/)[0]
  return host || text
}

function extractQueryType(middle) {
  const match = String(middle || '').trim().match(/\b(A|AAAA|CNAME|HTTPS|TXT|MX|SRV|NS|PTR)\b/i)
  return match ? match[1].toUpperCase() : 'A'
}

function normalizeDomain(domain) {
  return String(domain || '').replace(/\.$/, '').toLowerCase()
}

function parseEndpointHost(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const host = text.split(':')[0]
  if (!host || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return host
  return host.replace(/\.$/, '')
}

function parseSourceIpFromDetail(detail) {
  const text = String(detail || '').trim()
  if (!text) return ''
  return text.split(':')[0]
}

function isDnsConnection(conn) {
  const meta = conn?.metadata || {}
  const rule = String(conn?.rule || '').toUpperCase()
  const payload = String(conn?.rulePayload || '').toUpperCase()
  const port = Number(meta.destinationPort)
  const dnsMode = String(meta.dnsMode || meta.DNSMode || '').toLowerCase()

  if (rule === 'DNS' || payload === 'DNS') return true
  if (port === 53) return true
  if (dnsMode && dnsMode !== 'normal') return true
  return false
}

function connectionToDnsEntry(conn, at = Date.now()) {
  if (!isDnsConnection(conn)) return null

  const meta = conn.metadata || {}
  const domain = meta.host
    || parseEndpointHost(meta.destinationIP ? `${meta.destinationIP}:${meta.destinationPort || ''}` : '')
    || '—'
  const upstream = parseEndpointHost(
    meta.destinationIP
      ? `${meta.destinationIP}${meta.destinationPort ? `:${meta.destinationPort}` : ''}`
      : meta.destinationIP,
  ) || meta.destinationIP || '—'
  const sourceIp = meta.sourceIP || meta.sourceIp || ''
  const chain = Array.isArray(conn.chains) ? conn.chains[conn.chains.length - 1] : ''
  const started = conn.start ? new Date(conn.start) : new Date(at)

  return {
    time: formatTime(started),
    domain,
    type: String(meta.type || meta.network || 'A').toUpperCase().includes('AAAA') ? 'AAAA' : 'A',
    upstream: chain || upstream,
    sourceIp: sourceIp || '—',
    latency: 0,
    status: 'success',
    connId: conn.id || '',
  }
}

function resolveSourceIp(domain, connections) {
  const target = normalizeDomain(domain)
  if (!target) return ''

  for (const conn of connections || []) {
    const meta = conn.metadata || {}
    const host = normalizeDomain(meta.host)
    if (host && host === target && meta.sourceIP) {
      return meta.sourceIP
    }
  }

  for (const conn of connections || []) {
    const meta = conn.metadata || {}
    const rule = String(conn.rule || '').toUpperCase()
    const port = Number(meta.destinationPort)
    if (meta.sourceIP && (rule === 'DNS' || port === 53)) {
      return meta.sourceIP
    }
  }

  return ''
}

export class DnsLogCollector {
  constructor() {
    /** @type {DnsQueryEntry[]} */
    this.entries = []
    /** @type {Map<string, { type: string, upstream: string, startedAt: number }>} */
    this.pending = new Map()
    /** @type {Set<string>} */
    this.seenConnIds = new Set()
    /** @type {Set<string>} */
    this.recentLogKeys = new Set()
  }

  clear() {
    this.entries = []
    this.pending.clear()
    this.seenConnIds.clear()
    this.recentLogKeys.clear()
  }

  rememberLogKey(key) {
    if (this.recentLogKeys.has(key)) return false
    this.recentLogKeys.add(key)
    if (this.recentLogKeys.size > 2000) {
      const dropCount = this.recentLogKeys.size - 1500
      let remaining = dropCount
      for (const item of this.recentLogKeys) {
        this.recentLogKeys.delete(item)
        remaining -= 1
        if (remaining <= 0) break
      }
    }
    return true
  }

  /** @param {import('../api/mihomo').MihomoConnection[]} [connections] */
  ingestConnections(connections = [], at = Date.now()) {
    let added = 0
    for (const conn of connections || []) {
      if (!conn?.id || this.seenConnIds.has(conn.id)) continue
      const row = connectionToDnsEntry(conn, at)
      if (!row || row.domain === '—') continue
      this.seenConnIds.add(conn.id)
      this.pushEntry(row)
      added += 1
    }
    return added
  }

  /** @param {import('../api/mihomo').MihomoConnection[]} [connections] */
  ingest(message, connections = [], at = Date.now()) {
    const msg = String(message || '').trim()
    if (!msg) return null

    const connMatch = msg.match(CONN_DNS)
    if (connMatch) {
      const sourceIp = parseSourceIpFromDetail(connMatch[1])
      const dest = connMatch[2]
      const domain = parseEndpointHost(dest)
      const logKey = `conn:${sourceIp}:${dest}:${connMatch[3]}`
      if (!this.rememberLogKey(logKey)) return null
      return this.pushEntry({
        time: formatTime(new Date(at)),
        domain: domain || dest,
        type: 'A',
        upstream: parseEndpointHost(dest) || connMatch[3] || '—',
        sourceIp: sourceIp || resolveSourceIp(domain, connections) || '—',
        latency: 0,
        status: 'success',
      })
    }

    if (!msg.includes('[DNS]')) return null

    const now = new Date(at)
    this.prunePending(at)

    let entry = null

    const cacheHit = msg.match(CACHE_HIT)
    if (cacheHit) {
      entry = this.pushEntry({
        time: formatTime(now),
        domain: cacheHit[1],
        type: 'A',
        upstream: 'cache',
        sourceIp: resolveSourceIp(cacheHit[1], connections),
        latency: 0,
        status: 'success',
      })
      return entry
    }

    const fail = msg.match(LOOKUP_FAIL)
    if (fail) {
      this.pending.delete(normalizeDomain(fail[1]))
      entry = this.pushEntry({
        time: formatTime(now),
        domain: fail[1].trim(),
        type: 'A',
        upstream: '—',
        sourceIp: resolveSourceIp(fail[1], connections),
        latency: 0,
        status: 'failed',
      })
      return entry
    }

    const start = msg.match(RESOLVE_START)
    if (start) {
      const domain = start[1]
      const key = `${normalizeDomain(domain)}:${start[2].toUpperCase()}`
      this.pending.set(key, {
        type: start[2].toUpperCase(),
        upstream: upstreamHost(start[3]),
        startedAt: at,
      })
      return null
    }

    const tunnelOk = msg.match(RESOLVE_TUNNEL)
    if (tunnelOk && !msg.includes(' from ')) {
      const domain = tunnelOk[1]
      const logKey = `tunnel:${domain}:${tunnelOk[2]}`
      if (!this.rememberLogKey(logKey)) return null
      entry = this.pushEntry({
        time: formatTime(now),
        domain,
        type: 'A',
        upstream: tunnelOk[2],
        sourceIp: resolveSourceIp(domain, connections),
        latency: 0,
        status: 'success',
      })
      return entry
    }

    const resolveErr = msg.match(RESOLVE_ERROR)
    if (resolveErr) {
      const logKey = `err:${resolveErr[1]}:${resolveErr[2]}`
      if (!this.rememberLogKey(logKey)) return null
      entry = this.pushEntry({
        time: formatTime(now),
        domain: resolveErr[1],
        type: 'A',
        upstream: '—',
        sourceIp: resolveSourceIp(resolveErr[1], connections),
        latency: 0,
        status: 'failed',
      })
      return entry
    }

    const ok = msg.match(RESOLVE_OK)
    if (ok) {
      const domain = ok[1]
      const type = extractQueryType(ok[2])
      const upstream = upstreamHost(ok[3])
      const key = `${normalizeDomain(domain)}:${type}`
      const pending = this.pending.get(key)
      const latency = pending ? Math.max(1, at - pending.startedAt) : 0
      this.pending.delete(key)

      entry = this.pushEntry({
        time: formatTime(now),
        domain,
        type: pending?.type || type,
        upstream: pending?.upstream || upstream,
        sourceIp: resolveSourceIp(domain, connections),
        latency,
        status: 'success',
      })
      return entry
    }

    return null
  }

  prunePending(at = Date.now()) {
    for (const [key, value] of this.pending.entries()) {
      if (at - value.startedAt > PENDING_TTL_MS) {
        this.pending.delete(key)
      }
    }
  }

  /** @param {Omit<DnsQueryEntry, 'sourceIp'> & { sourceIp?: string }} row */
  pushEntry(row) {
    const entry = {
      ...row,
      sourceIp: row.sourceIp || '—',
    }
    this.entries.unshift(entry)
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.length = MAX_ENTRIES
    }
    return entry
  }

  getStats() {
    const successRows = this.entries.filter((row) => row.status === 'success')
    const failed = this.entries.filter((row) => row.status === 'failed').length
    const success = successRows.length
    const latencyRows = successRows.filter((row) => row.latency > 0)
    const avgLatency = latencyRows.length
      ? +(latencyRows.reduce((sum, row) => sum + row.latency, 0) / latencyRows.length).toFixed(2)
      : 0

    return {
      totalQueries: this.entries.length,
      successQueries: success,
      failedQueries: failed,
      avgLatency,
    }
  }

  getRankings(limit = 10) {
    const domainCounts = new Map()
    const ipCounts = new Map()

    for (const row of this.entries) {
      const domain = normalizeDomain(row.domain)
      if (domain) domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)

      const ip = row.sourceIp
      if (ip && ip !== '—' && ip !== 'Inner') {
        ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1)
      }
    }

    const toList = (map) => [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }))

    return {
      domainRanking: toList(domainCounts),
      ipRanking: toList(ipCounts),
    }
  }
}

export function applyDnsCollectorToState(collector, appState) {
  if (!appState?.dns || !collector) return
  const stats = collector.getStats()
  const ranks = collector.getRankings()

  appState.dns.queryLog = collector.entries
  appState.dns.totalQueries = stats.totalQueries
  appState.dns.successQueries = stats.successQueries
  appState.dns.failedQueries = stats.failedQueries
  appState.dns.avgLatency = stats.avgLatency
  appState.dns.domainRanking = ranks.domainRanking
  appState.dns.ipRanking = ranks.ipRanking
}

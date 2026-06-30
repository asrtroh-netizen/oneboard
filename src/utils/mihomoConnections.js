/** @typedef {import('../api/mihomo').MihomoConnection} MihomoConnection */

import { getProviderMemberNames } from './proxySections'

export function connectionKey(conn, mode) {
  const meta = conn.metadata || {}
  if (mode === 'host') {
    return meta.host || meta.destinationIP || meta.destinationPort || '—'
  }
  if (mode === 'rule') {
    const payload = conn.rulePayload ? `(${conn.rulePayload})` : ''
    return `${conn.rule || '—'}${payload}`
  }
  return meta.sourceIP || 'Inner'
}

export function aggregateConnections(connections, formatBytes, mode = 'sourceIP') {
  const map = new Map()

  for (const conn of connections) {
    const key = connectionKey(conn, mode)
    const prev = map.get(key) || {
      ip: key,
      downBytes: 0,
      upBytes: 0,
      connections: 0,
    }
    prev.downBytes += conn.download || 0
    prev.upBytes += conn.upload || 0
    prev.connections += 1
    map.set(key, prev)
  }

  return [...map.values()]
    .sort((a, b) => (b.downBytes + b.upBytes) - (a.downBytes + a.upBytes))
    .slice(0, 20)
    .map((row) => ({
      ip: row.ip,
      down: formatBytes(row.downBytes),
      up: formatBytes(row.upBytes),
      total: formatBytes(row.downBytes + row.upBytes),
      connections: row.connections,
    }))
}

export function buildTopologyFlowsFromConnections(connections) {
  const map = new Map()

  for (const conn of connections) {
    const source = conn.metadata?.sourceIP || 'Inner'
    const rule = conn.rulePayload
      ? `${conn.rule || 'Rule'}: ${conn.rulePayload}`
      : (conn.rule || '—')
    const group = conn.chains?.[0] || 'DIRECT'
    const exit = conn.chains?.[conn.chains.length - 1] || 'DIRECT'
    const key = `${source}\0${rule}\0${group}\0${exit}`
    map.set(key, (map.get(key) || 0) + 1)
  }

  return [...map.entries()]
    .map(([key, value]) => {
      const [source, rule, group, exit] = key.split('\0')
      return { source, rule, group, exit, value }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 16)
}

export function mapConnectionsToRows(connections, formatBytes) {
  return connections.map((conn) => {
    const meta = conn.metadata || {}
    const chains = conn.chains || []
    const started = conn.start ? new Date(conn.start) : null
    let time = '—'
    if (started && !Number.isNaN(started.getTime())) {
      const sec = Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000))
      const mm = String(Math.floor(sec / 60)).padStart(2, '0')
      const ss = String(sec % 60).padStart(2, '0')
      time = `${mm}:${ss}`
    }

    return {
      id: conn.id,
      type: (meta.network || meta.type || '—').toUpperCase(),
      source: meta.sourceIP || '—',
      host: meta.host || meta.destinationIP || '—',
      group: chains.join(' → ') || '—',
      downSpeed: `${formatBytes(conn.speed?.down || 0)}/s`,
      upSpeed: `${formatBytes(conn.speed?.up || 0)}/s`,
      remote: meta.destinationIP
        ? `${meta.destinationIP}:${meta.destinationPort || ''}`
        : '—',
      down: formatBytes(conn.download || 0),
      up: formatBytes(conn.upload || 0),
      time,
      rule: connectionKey(conn, 'rule'),
    }
  })
}

export function buildRuleHitsFromConnections(connections, hitMap = {}) {
  const merged = { ...hitMap }
  for (const conn of connections) {
    const name = conn.rulePayload || conn.rule || 'unknown'
    merged[name] = (merged[name] || 0) + 1
  }
  return Object.entries(merged)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, value]) => ({ name, value }))
}

export function buildNetworkTypeStats(connections) {
  const map = new Map()
  for (const conn of connections) {
    const net = (conn.metadata?.network || conn.metadata?.type || 'OTHER').toUpperCase()
    map.set(net, (map.get(net) || 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }))
}

export function sumProviderTraffic(connections, memberNames) {
  const members = new Set(memberNames || [])
  if (!members.size) return 0
  let total = 0
  for (const conn of connections) {
    const exit = conn.chains?.[conn.chains.length - 1]
    if (exit && members.has(exit)) {
      total += (conn.download || 0) + (conn.upload || 0)
    }
  }
  return total
}

export function buildProviderOverview(providersRaw, connections, formatBytes) {
  const providers = providersRaw?.providers || providersRaw || {}
  const entries = Object.entries(providers)
  if (!entries.length) return []

  const trafficByName = entries.map(([name, provider]) => {
    const members = getProviderMemberNames(provider)
    return {
      name,
      bytes: sumProviderTraffic(connections, members),
      nodeCount: members.length,
      updatedAt: provider?.updatedAt || '—',
    }
  })

  const maxBytes = Math.max(...trafficByName.map((p) => p.bytes), 1)

  return trafficByName
    .sort((a, b) => b.bytes - a.bytes)
    .map((p) => {
      const used = Math.round((p.bytes / maxBytes) * 100)
      const usedLabel = formatBytes(p.bytes)
      return {
        name: p.name,
        used,
        remaining: p.bytes > 0 ? '—' : '—',
        total: `${p.nodeCount} 节点`,
        usedLabel,
        updatedAt: p.updatedAt,
      }
    })
}

export function buildPingsFromNodes(nodes, limit = 6) {
  return [...nodes]
    .filter((n) => n.delay > 0)
    .sort((a, b) => a.delay - b.delay)
    .slice(0, limit)
    .map((n) => ({
      name: n.name.length > 24 ? `${n.name.slice(0, 22)}…` : n.name,
      ms: n.delay,
      status: n.delay > 300 ? 'bad' : n.delay > 150 ? 'warn' : 'good',
    }))
}

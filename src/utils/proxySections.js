import { isWifiProxyGroup, guessCountryCode, isNodeAvailable } from './countryNodes'

/** Proxy 页三大分区 */
export const PROXY_SECTION_IDS = ['strategy', 'nodes', 'subscriptions']

export const PROXY_SECTION_META = {
  strategy: {
    id: 'strategy',
    title: '策略区',
    subtitle: 'Selector · 路由 · Google / Apple / AI',
  },
  nodes: {
    id: 'nodes',
    title: '节点区',
    subtitle: 'HK / US / JP / DE · 延迟 / 状态',
  },
  subscriptions: {
    id: 'subscriptions',
    title: '订阅区',
    subtitle: '订阅源 · Provider · 更新时间',
  },
}

const STRATEGY_NAME_RE = [
  /^GLOBAL$/i,
  /节点选择/,
  /全球直连/,
  /漏网/,
  /链式/,
  /广告/,
  /特殊/,
  /Apple|苹果/i,
  /GOOGLE/i,
  /Ai/i,
  /奈飞|Netflix/i,
  /游戏/,
  /媒体/,
  /油管|YouTube/i,
  /电报|Telegram/i,
  /Emby/i,
]

const NODE_NAME_RE = [
  /节点/,
  /^🇨🇳|^🇭🇰|^🇯🇵|^🇰🇷|^🇸🇬|^🇺🇲|^🇺🇸|^🇩🇪|^🇬🇧|^🇳🇿|^🇹🇼/,
  /^(HK|US|JP|DE|SG|TW|KR|NZ|CN|GB|UK)[-\s]/i,
]

/** @deprecated 仅作节点名推断兜底 */
export const SUBSCRIPTION_PROVIDER_TAGS = [
  { key: 'Cyber', label: 'Cyber', match: /\bCyber\b/i },
  { key: 'MESL', label: 'MESL', match: /\bMESL\b/i },
  { key: 'TAG', label: 'TAG', match: /\bTAG\b/i },
  { key: 'DBB', label: 'DBB', match: /\bDBB\b/i },
]

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Mihomo proxy-provider：HTTP 类型 = 真实订阅源 */
export function isHttpProxyProvider(name, provider) {
  if (!name || name === 'default') return false
  const vehicle = provider?.vehicleType || provider?.type || ''
  return String(vehicle).toUpperCase() === 'HTTP'
}

/** Mihomo Meta：新版返回 proxies[]，旧版为 all[]（节点名） */
export function getProviderMemberNames(provider) {
  if (!provider || typeof provider !== 'object') return []

  if (Array.isArray(provider.all) && provider.all.length) {
    return provider.all
      .map((item) => (typeof item === 'string' ? item : item?.name))
      .filter(Boolean)
  }

  if (Array.isArray(provider.proxies) && provider.proxies.length) {
    return provider.proxies.map((proxy) => proxy?.name).filter(Boolean)
  }

  return []
}

export function nodeBelongsToProvider(nodeName, providerName) {
  const text = String(nodeName || '')
  const p = escapeRegExp(String(providerName || ''))
  if (!p) return false
  if (new RegExp(`(^|[\\s|])${p}([\\s|]|$)`, 'i').test(text)) return true
  return new RegExp(`\\b${p}\\b`, 'i').test(text)
}

function formatProviderUpdatedAt(raw) {
  if (!raw || raw === '—' || raw.startsWith('0001-01-01')) return '—'
  try {
    return new Date(raw).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return String(raw)
  }
}

function membersForProvider(name, entry, nodes) {
  const members = getProviderMemberNames(entry)
  if (members.length) return members
  return (nodes || [])
    .filter((n) => nodeBelongsToProvider(n.name, name))
    .map((n) => n.name)
}

/**
 * @param {object} group proxyGroups 项
 * @returns {'strategy'|'nodes'|null}
 */
export function classifyProxyGroup(group) {
  if (!group || isWifiProxyGroup(group.code)) return null

  const name = String(group.name || group.code || '')

  if (NODE_NAME_RE.some((re) => re.test(name))) return 'nodes'
  if (STRATEGY_NAME_RE.some((re) => re.test(name))) return 'strategy'

  if (group.region && group.region !== 'GLOBAL') return 'nodes'

  return 'strategy'
}

export function partitionProxyGroups(groups) {
  const result = { strategy: [], nodes: [] }

  for (const group of groups || []) {
    const section = classifyProxyGroup(group)
    if (!section) continue
    result[section].push(group)
  }

  for (const key of ['strategy', 'nodes']) {
    result[key].sort((a, b) => String(a.name).localeCompare(String(b.name)))
  }

  return result
}

function nodeMatchesProvider(nodeName, tag) {
  return tag.match.test(String(nodeName || ''))
}

function resolveProviderMemberNodes(name, entry, nodes) {
  const memberNames = membersForProvider(name, entry, nodes)
  const nodeByName = new Map((nodes || []).map((n) => [n.name, n]))
  const matched = memberNames
    .map((member) => nodeByName.get(typeof member === 'string' ? member : member?.name))
    .filter(Boolean)

  if (matched.length) return matched
  return (nodes || []).filter((n) => nodeBelongsToProvider(n.name, name))
}

function providerDelayStats(name, entry, nodes) {
  const memberNodes = resolveProviderMemberNodes(name, entry, nodes)
  const delays = memberNodes.map((n) => n.delay).filter((d) => d > 0)
  const online = memberNodes.filter((n) => isNodeAvailable(n)).length
  return {
    nodeCount: memberNodes.length,
    online,
    bestDelay: delays.length ? Math.min(...delays) : 0,
  }
}

/**
 * @param {Array} nodes
 * @param {object} providersRaw mihomoProviders
 * @param {Array} subscriptions appState.subscriptions
 */
export function buildSubscriptionItems(nodes, providersRaw = {}, subscriptions = []) {
  const httpProviders = Object.entries(providersRaw || {})
    .filter(([name, provider]) => isHttpProxyProvider(name, provider))
    .sort(([a], [b]) => a.localeCompare(b))

  if (httpProviders.length) {
    return httpProviders.map(([name, entry]) => {
      const stats = providerDelayStats(name, entry, nodes)
      const apiSub = subscriptions.find((s) => s.name === name)
      return {
        id: name,
        name,
        label: name,
        code: 'GLOBAL',
        nodeCount: stats.nodeCount,
        online: stats.online,
        bestDelay: stats.bestDelay,
        updatedAt: formatProviderUpdatedAt(entry.updatedAt || apiSub?.updatedAt),
        members: membersForProvider(name, entry, nodes),
      }
    })
  }

  return SUBSCRIPTION_PROVIDER_TAGS.map((tag) => {
    const memberNodes = (nodes || []).filter((n) => nodeMatchesProvider(n.name, tag))
    const delays = memberNodes.map((n) => n.delay).filter((d) => d > 0)
    return {
      id: tag.key,
      name: tag.label,
      label: tag.label,
      code: 'GLOBAL',
      nodeCount: memberNodes.length,
      online: memberNodes.filter((n) => isNodeAvailable(n)).length,
      bestDelay: delays.length ? Math.min(...delays) : 0,
      updatedAt: '—',
      members: memberNodes.map((n) => n.name),
    }
  }).filter((item) => item.nodeCount > 0)
}

export function resolveMemberList(group, nodes) {
  if (!group?.allMembers?.length) return []
  return group.allMembers
    .map((name) => nodes.find((n) => n.name === name) || {
      id: name,
      name,
      region: guessCountryCode(name),
      delay: 0,
      alive: true,
    })
}

export function resolveSubscriptionMembers(item, nodes) {
  const providerKey = item.id || item.name
  if (item.members?.length) {
    const names = item.members
    return names
      .map((name) => nodes.find((n) => n.name === name) || {
        id: name,
        name,
        region: guessCountryCode(name),
        delay: 0,
        alive: true,
      })
  }
  return (nodes || [])
    .filter((n) => nodeBelongsToProvider(n.name, providerKey))
    .map((n) => ({ ...n }))
}

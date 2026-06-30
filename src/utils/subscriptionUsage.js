import { isNodeAvailable } from './countryNodes'
import { getProviderMemberNames } from './proxySections'
import { sumProviderTraffic } from './mihomoConnections'

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

export function buildProviderOnlineMetrics({ memberNames = [], nodes = [], provider = null }) {
  const nodeByName = new Map((nodes || []).map((node) => [node.name, node]))
  const namesFromProvider = getProviderMemberNames(provider)
  const names = namesFromProvider.length
    ? namesFromProvider
    : (memberNames || [])
      .map((member) => (typeof member === 'string' ? member : member?.name))
      .filter(Boolean)

  const providerProxies = Array.isArray(provider?.proxies) ? provider.proxies : []
  const totalCount = names.length || providerProxies.length

  let onlineCount = 0
  if (providerProxies.length) {
    onlineCount = providerProxies.filter((proxy) => {
      const node = nodeByName.get(proxy.name)
      if (node) return isNodeAvailable(node)
      return proxy.alive !== false
    }).length
  } else if (totalCount > 0) {
    onlineCount = names.filter((name) => {
      const node = nodeByName.get(name)
      return node ? isNodeAvailable(node) : false
    }).length
  }

  const offlineCount = Math.max(0, totalCount - onlineCount)
  const percent = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0

  return {
    onlineCount,
    totalCount,
    offlineCount,
    percent,
  }
}

/** Mihomo Meta subscriptionInfo on provider runtime */
export function extractSubscriptionInfo(runtime) {
  const info = runtime?.subscriptionInfo || runtime?.subscription_info
  if (!info || typeof info !== 'object') return null

  const upload = Number(info.Upload ?? info.upload ?? 0)
  const download = Number(info.Download ?? info.download ?? 0)
  const total = Number(info.Total ?? info.total ?? 0)
  const expire = Number(info.Expire ?? info.expire ?? 0)
  const used = upload + download

  if (total <= 0 && used <= 0 && !expire) return null

  return { upload, download, total, expire, used }
}

export function buildProviderUsageMetrics({ runtime, connections, memberNames }) {
  const subInfo = extractSubscriptionInfo(runtime)
  const sessionBytes = sumProviderTraffic(connections, memberNames)

  if (subInfo?.total > 0) {
    const used = subInfo.used
    const total = subInfo.total
    const remaining = Math.max(0, total - used)
    const percent = Math.min(100, Math.round((used / total) * 100))

    return {
      usedBytes: used,
      totalBytes: total,
      remainingBytes: remaining,
      usedLabel: formatBytes(used),
      totalLabel: formatBytes(total),
      remainingLabel: formatBytes(remaining),
      percent,
      hasQuota: true,
      source: 'subscription',
    }
  }

  return {
    usedBytes: sessionBytes,
    totalBytes: 0,
    remainingBytes: 0,
    usedLabel: formatBytes(sessionBytes),
    totalLabel: '—',
    remainingLabel: sessionBytes > 0 ? '会话占用' : '暂无活跃',
    percent: 0,
    hasQuota: false,
    source: 'session',
  }
}

/** Relative session bar when provider has no subscription quota */
export function finalizeProviderUsagePercents(items) {
  const maxSession = Math.max(
    ...items.map((item) => (item.usage?.hasQuota ? 0 : item.usage?.usedBytes || 0)),
    1,
  )

  return items.map((item) => {
    if (!item.usage || item.usage.hasQuota) return item
    const used = item.usage.usedBytes || 0
    const percent = used > 0 ? Math.max(4, Math.round((used / maxSession) * 100)) : 0
    return {
      ...item,
      usage: {
        ...item.usage,
        percent,
      },
    }
  })
}

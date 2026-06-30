import { isWifiProxyGroup } from './countryNodes'
import { groupNamesMatch, parseProxyGroupsYaml } from './proxyGroupConfig'

const GROUP_TYPES = new Set([
  'Selector',
  'URLTest',
  'Fallback',
  'LoadBalance',
  'Relay',
])

export function listWifiProxyGroupNames(proxiesData) {
  const proxies = proxiesData?.proxies || {}
  return Object.entries(proxies)
    .filter(([name, proxy]) => isWifiProxyGroup(name) && GROUP_TYPES.has(proxy?.type))
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b))
}

export function listWifiGroupsFromYaml(yaml) {
  const parsed = parseProxyGroupsYaml(String(yaml || ''))
  return parsed.groups
    .map((group) => group.name)
    .filter((name) => isWifiProxyGroup(name))
    .sort((a, b) => a.localeCompare(b))
}

export function compareWifiGroupSync(runtimeNames, storageNames) {
  const runtime = [...new Set(runtimeNames || [])]
  const storage = [...new Set(storageNames || [])]

  const onlyRuntime = runtime.filter(
    (name) => !storage.some((item) => groupNamesMatch(item, name)),
  )
  const onlyStorage = storage.filter(
    (name) => !runtime.some((item) => groupNamesMatch(item, name)),
  )

  return {
    inSync: onlyRuntime.length === 0 && onlyStorage.length === 0,
    onlyRuntime,
    onlyStorage,
    runtimeCount: runtime.length,
    storageCount: storage.length,
  }
}

export function formatSyncUpdatedAt(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

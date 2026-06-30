import { getMihomoApiBase, getMihomoWsBase, fetchClashAPI } from '../config/mihomo'
import {
  resolveClashSecret,
  backendSupports,
  clashBackendProfile,
  getClashProxyUpstreamHeader,
  shouldUseClashProxy,
} from '../stores/clashBackend'
import { apiFetchJson } from './http'
import { startLoading, stopLoading } from '../stores/globalLoading'
import {
  guessCountryCode,
  regionDisplayName,
  isNodeAvailable,
  isWifiProxyGroup,
  buildCountryGroups,
  nodeLatencySortKey,
  countryCodeFromFlagEmoji,
  countryCodeFromChineseLabel,
} from '../utils/countryNodes'
import { persistWifiState } from '../utils/wifiState'

const GROUP_TYPES = new Set([
  'Selector',
  'URLTest',
  'Fallback',
  'LoadBalance',
  'Relay',
  'Direct',
  'Reject',
  'Compatible',
  'Pass',
  'PassRule',
  'RejectDrop',
  'DNS',
])

const DELAY_TEST_URL = 'http://www.gstatic.com/generate_204'
const DELAY_BATCH_SIZE = 18
const DELAY_TIMEOUT_MS = 4000
let delayTestOffset = 0

function mihomoWsUrl(path) {
  const endpoint = path.startsWith('/') ? path : `/${path}`
  return `${getMihomoWsBase()}${endpoint}`
}

function appendProxyRouting(url) {
  if (!shouldUseClashProxy()) return url
  const upstream = getClashProxyUpstreamHeader()
  if (!upstream) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}upstream=${encodeURIComponent(upstream)}`
}

function trafficWsUrl() {
  return appendProxyRouting(mihomoWsUrl('/traffic'))
}

function connectionsWsUrl() {
  return appendProxyRouting(mihomoWsUrl('/connections'))
}

function backendLabel() {
  return clashBackendProfile.value?.label || 'Clash'
}

function logsWsUrl(level = 'debug', structured = true) {
  const params = new URLSearchParams()
  params.set('level', level)
  if (structured) params.set('format', 'structured')
  const secret = resolveClashSecret()
  if (secret) params.set('token', secret)
  return appendProxyRouting(mihomoWsUrl(`/logs?${params.toString()}`))
}

async function mihomoFetch(path, options = {}) {
  const { trackLoading, ...fetchOptions } = options
  const method = fetchOptions.method || 'GET'
  const shouldTrack = trackLoading ?? (method !== 'GET')
  let ticket = null

  if (shouldTrack) ticket = startLoading()

  try {
    const res = await fetchClashAPI(path, { method, ...fetchOptions })
    const text = await res.text()
    if (!res.ok) {
      let message = text
      try {
        const json = JSON.parse(text)
        message = json.message || json.status || json.error || text
      } catch {
        /* plain text error from mihomo */
      }
      if (res.status === 401) {
        throw new Error(`Clash 后端鉴权失败（HTTP 401）：请检查设置页中的 Secret 是否与 ${backendLabel()} 的 external-controller secret 一致（已自动尝试免鉴权与带 Secret 两种方式）`)
      }
      throw new Error(message || `${backendLabel()} ${path} → ${res.status}（检查设置页中的 Clash 后端地址与 Secret）`)
    }
    if (res.status === 204 || !text) return null
    return JSON.parse(text)
  } catch (err) {
    if (err?.name === 'TypeError' && String(err.message).includes('fetch')) {
      throw new Error(`无法连接 ${backendLabel()}（${getMihomoApiBase()}${path}），请确认 external-controller 已开启`)
    }
    throw err
  } finally {
    if (ticket != null) stopLoading(ticket)
  }
}

export function getVersion() {
  return mihomoFetch('/version')
}

export function upgradeMihomo(channel = 'release') {
  if (!backendSupports('upgrade')) {
    return Promise.reject(new Error(`${backendLabel()} 不支持在线升级，请在对应平台手动更新`))
  }
  const qs = channel ? `?channel=${encodeURIComponent(channel)}` : ''
  return mihomoFetch(`/upgrade${qs}`, { method: 'POST' })
}

export async function getMihomoLatestVersion(channel = 'release') {
  if (!backendSupports('latestVersion')) return null
  const key = channel === 'alpha' ? 'alpha' : 'release'

  try {
    const data = await apiFetchJson(`/api/mihomo-latest?channel=${encodeURIComponent(key)}`, {
      headers: { Accept: 'application/json' },
      trackLoading: false,
    })
    if (data?.version) return data.version
  } catch {
    /* fall through to direct GitHub lookup */
  }

  return fetchMihomoLatestFromGitHub(key)
}

async function fetchMihomoLatestFromGitHub(channel = 'release') {
  const urls = channel === 'alpha'
    ? [
      'https://api.github.com/repos/MetaCubeX/mihomo/releases/tags/Prerelease-Alpha',
      'https://github.com/MetaCubeX/mihomo/releases/download/Prerelease-Alpha/version.txt',
    ]
    : [
      'https://api.github.com/repos/MetaCubeX/mihomo/releases/latest',
      'https://github.com/MetaCubeX/mihomo/releases/latest/download/version.txt',
    ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: url.includes('api.github.com')
          ? { Accept: 'application/vnd.github+json' }
          : undefined,
      })
      if (!res.ok) continue

      const text = await res.text()
      if (url.includes('api.github.com')) {
        const json = JSON.parse(text)
        const version = String(json.tag_name || json.name || '').trim()
        if (version) return version.startsWith('v') ? version : `v${version}`
        continue
      }

      const version = text.trim().split(/\s+/)[0]
      if (version) return version.startsWith('v') ? version : `v${version}`
    } catch {
      /* try next source */
    }
  }

  return ''
}

export function getProxies() {
  return mihomoFetch('/proxies')
}

export function getRules() {
  return mihomoFetch('/rules')
}

export function getProviders() {
  return mihomoFetch('/providers/proxies')
}

export function updateProxyProvider(name) {
  return mihomoFetch(`/providers/proxies/${encodeURIComponent(name)}`, { method: 'PUT' })
}

export function reloadMihomoConfig(configPath = '') {
  return mihomoFetch('/configs?force=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: configPath, payload: '' }),
  })
}

export { fetchMihomoConfigYamlText, saveMihomoConfigYaml, importMihomoConfigYaml } from './mihomoYaml'

export function getConnections() {
  return mihomoFetch('/connections')
}

/**
 * GET /memory 为流式推送，不能等 body 结束；读取首条 JSON 后中止。
 */
export async function getMemory() {
  if (!backendSupports('memory')) return null
  const controller = new AbortController()
  const readTimeoutMs = 3000
  const timeout = window.setTimeout(() => controller.abort(), readTimeoutMs)

  try {
    const res = await fetchClashAPI('/memory', { signal: controller.signal })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `${backendLabel()} /memory → ${res.status}`)
    }

    const reader = res.body?.getReader()
    if (!reader) return null

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      let chunk
      try {
        chunk = await reader.read()
      } catch (err) {
        if (buffer.trim()) break
        if (err?.name === 'AbortError') return null
        throw err
      }

      const { done, value } = chunk
      if (value) buffer += decoder.decode(value, { stream: true })

      const parsed = parseFirstJsonFromBuffer(buffer)
      if (parsed) {
        await reader.cancel().catch(() => {})
        return parsed
      }
      if (done) break
    }

    return parseFirstJsonFromBuffer(buffer)
  } catch (err) {
    if (err?.name === 'TypeError' && String(err.message).includes('fetch')) {
      throw new Error(`无法连接 ${backendLabel()}（${getMihomoApiBase()}/memory），请确认 external-controller 已开启`)
    }
    throw err
  } finally {
    window.clearTimeout(timeout)
  }
}

function parseFirstJsonFromBuffer(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return null

  for (const line of trimmed.split('\n')) {
    const piece = line.trim()
    if (!piece) continue
    try {
      return JSON.parse(piece)
    } catch {
      /* 可能是不完整的 JSON，继续读 */
    }
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

export function closeMihomoConnection(id) {
  return mihomoFetch(`/connections/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function closeAllMihomoConnections() {
  return mihomoFetch('/connections', { method: 'DELETE' })
}

export function restartMihomoCore() {
  return mihomoFetch('/restart', { method: 'POST' })
}

export function selectProxy(selectorName, proxyName) {
  return mihomoFetch(`/proxies/${encodeURIComponent(selectorName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: proxyName }),
    trackLoading: false,
  })
}

export function fetchProxyDelay(proxyName, timeout = DELAY_TIMEOUT_MS) {
  return mihomoFetch(
    `/proxies/${encodeURIComponent(proxyName)}/delay?timeout=${timeout}&url=${encodeURIComponent(DELAY_TEST_URL)}`,
    { trackLoading: false },
  )
}

/**
 * 并发批量测速（全栈测速用）
 * @param {string[]} proxyNames
 * @param {{ concurrency?: number, onProgress?: (done: number, total: number) => void }} options
 * @returns {Promise<Map<string, number>>}
 */
export async function testProxiesDelayBatch(proxyNames, { concurrency = 10, onProgress } = {}) {
  const names = [...new Set((proxyNames || []).filter(Boolean))]
  const results = new Map()
  if (!names.length) return results

  let cursor = 0
  let done = 0

  async function worker() {
    while (cursor < names.length) {
      const name = names[cursor]
      cursor += 1
      try {
        const result = await fetchProxyDelay(name)
        results.set(name, result?.delay ?? 0)
      } catch {
        results.set(name, 0)
      }
      done += 1
      onProgress?.(done, names.length)
    }
  }

  const workers = Math.min(concurrency, names.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

/**
 * 分批测速，避免一次请求过多节点导致卡顿
 */
export async function enrichProxiesWithDelayTests(proxiesData) {
  const proxies = proxiesData?.proxies
  if (!proxies) return proxiesData

  const leafNames = Object.entries(proxies)
    .filter(([, proxy]) => isLeafProxy(proxy))
    .map(([name]) => name)

  if (!leafNames.length) return proxiesData

  const batch = []
  for (let i = 0; i < DELAY_BATCH_SIZE; i += 1) {
    const idx = (delayTestOffset + i) % leafNames.length
    batch.push(leafNames[idx])
  }
  delayTestOffset = (delayTestOffset + DELAY_BATCH_SIZE) % leafNames.length

  await Promise.allSettled(batch.map(async (name) => {
    try {
      const result = await fetchProxyDelay(name)
      const delay = result?.delay ?? 0
      proxies[name].history = [{ delay, time: new Date().toISOString() }]
      proxies[name].alive = delay > 0
    } catch {
      proxies[name].history = [{ delay: 0 }]
      proxies[name].alive = false
    }
  }))

  return proxiesData
}

export const fetchVersion = getVersion
export const fetchProxies = getProxies
export const fetchRules = getRules
export const fetchProviders = getProviders

/** Mihomo 流量为 WebSocket；无 REST 端点时由 connectTraffic 负责 */
export function getTraffic() {
  return Promise.reject(new Error('traffic requires WebSocket'))
}

const WS_RETRY_BASE_MS = 3000
const WS_RETRY_MAX_MS = 30000

function createMihomoWebSocket(getUrl, { onMessage, onStatus, onReconnect } = {}) {
  let ws = null
  let closed = false
  let retryTimer = null
  let retryDelay = WS_RETRY_BASE_MS
  let hadConnected = false

  function connect() {
    if (closed) return
    ws = new WebSocket(getUrl())

    ws.onopen = () => {
      retryDelay = WS_RETRY_BASE_MS
      if (hadConnected) {
        onReconnect?.()
      }
      hadConnected = true
      onStatus?.({ connected: true, reconnected: hadConnected })
    }

    ws.onmessage = (event) => {
      try {
        onMessage?.(JSON.parse(event.data))
      } catch {
        /* ignore malformed frames */
      }
    }

    ws.onclose = () => {
      onStatus?.({ connected: false })
      if (closed) return
      retryTimer = window.setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, WS_RETRY_MAX_MS)
        connect()
      }, retryDelay)
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  connect()

  return () => {
    closed = true
    if (retryTimer) clearTimeout(retryTimer)
    ws?.close()
  }
}

export function connectTraffic(onTraffic, onStatus, onReconnect) {
  return createMihomoWebSocket(trafficWsUrl, {
    onStatus,
    onReconnect,
    onMessage: (data) => {
      if (typeof data.up === 'number' && typeof data.down === 'number') {
        onTraffic(data)
      }
    },
  })
}

export function connectConnections(onConnections, onStatus, onReconnect) {
  return createMihomoWebSocket(connectionsWsUrl, {
    onStatus,
    onReconnect,
    onMessage: (data) => {
      if (data && Array.isArray(data.connections)) {
        onConnections(data)
      }
    },
  })
}

function normalizeMihomoLogFrame(data) {
  if (!data || typeof data !== 'object') return null
  if (typeof data.message === 'string') {
    return {
      time: data.time || '',
      level: data.level || 'info',
      message: data.message,
    }
  }
  if (typeof data.payload === 'string') {
    return {
      time: '',
      level: data.type || 'info',
      message: data.payload,
    }
  }
  return null
}

export function connectLogs(onLog, onStatus, { level = 'info' } = {}) {
  return createMihomoWebSocket(
    () => logsWsUrl(level, true),
    {
      onStatus: ({ connected }) => {
        onStatus?.({ connected, error: null })
      },
      onMessage: (data) => {
        const frame = normalizeMihomoLogFrame(data)
        if (frame) onLog?.(frame)
      },
    },
  )
}

export function flushDnsCache() {
  return mihomoFetch('/cache/dns/flush', { method: 'POST' })
}

export function queryDns(name, type = 'A') {
  const params = new URLSearchParams({ name, type })
  return mihomoFetch(`/dns/query?${params.toString()}`)
}

function isLeafProxy(proxy) {
  return proxy && !GROUP_TYPES.has(proxy.type)
}

function buildGroupHints(proxies) {
  const hints = {}
  for (const [groupName, proxy] of Object.entries(proxies)) {
    if (!['Selector', 'URLTest', 'Fallback', 'LoadBalance'].includes(proxy?.type)) continue
    for (const member of proxy.all || []) {
      if (!hints[member]) hints[member] = []
      hints[member].push(groupName)
    }
  }
  return hints
}

function proxyDelay(proxy) {
  const history = proxy?.history
  if (Array.isArray(history) && history.length) {
    return history[0]?.delay ?? 0
  }
  return 0
}

function proxyStatus(proxy) {
  const delay = proxyDelay(proxy)
  if (proxy?.alive === false || delay === 0) return 'offline'
  if (delay > 300) return 'warning'
  return 'online'
}

function findParentSelector(proxies, groupName) {
  for (const [name, proxy] of Object.entries(proxies)) {
    if (proxy?.all?.includes(groupName)) return name
  }
  return 'GLOBAL'
}

const GROUP_SELECTOR_TYPES = new Set(['Selector', 'URLTest', 'Fallback', 'LoadBalance'])

function isGroupSelector(proxy) {
  return proxy && GROUP_SELECTOR_TYPES.has(proxy.type)
}

/** 递归展开策略组内全部叶子节点（含嵌套 Selector） */
function collectLeafMemberNames(proxies, names, visited = new Set()) {
  const leaves = []

  for (const name of names || []) {
    if (!name || visited.has(name)) continue
    visited.add(name)

    const proxy = proxies[name]
    if (!proxy) continue

    if (isLeafProxy(proxy)) {
      leaves.push(name)
      continue
    }

    if (isGroupSelector(proxy)) {
      leaves.push(...collectLeafMemberNames(proxies, proxy.all, visited))
    }
  }

  return leaves
}

/** 当前生效路径上的延迟：优先 proxy.now，否则取子树最小延迟 */
function resolveProxyEffectiveDelay(proxies, name, visited = new Set()) {
  if (!name || visited.has(name)) return 0
  visited.add(name)

  const proxy = proxies[name]
  if (!proxy) return 0

  if (isLeafProxy(proxy)) return proxyDelay(proxy)

  if (proxy.now) {
    const selectedDelay = resolveProxyEffectiveDelay(proxies, proxy.now, visited)
    if (selectedDelay > 0) return selectedDelay
  }

  const leaves = collectLeafMemberNames(proxies, proxy.all, new Set())
  const delays = leaves.map((member) => proxyDelay(proxies[member])).filter((d) => d > 0)
  return delays.length ? Math.min(...delays) : 0
}

function leafMemberStats(proxies, leafMembers) {
  const delays = leafMembers
    .map((member) => proxyDelay(proxies[member]))
    .filter((d) => d > 0)

  return {
    count: leafMembers.length,
    online: leafMembers.filter((member) => isNodeAvailable({
      delay: proxyDelay(proxies[member]),
      alive: proxies[member]?.alive,
    })).length,
    minDelay: delays.length ? Math.min(...delays) : 0,
  }
}

export function buildRegionGroupStats(nodes) {
  return buildCountryGroups(nodes)
}

export function applyProxiesToState(data, appState) {
  const proxies = data?.proxies || {}
  const groupHints = buildGroupHints(proxies)
  const nodes = []
  const proxyGroups = []
  let id = 1

  for (const [name, proxy] of Object.entries(proxies)) {
    if (['Selector', 'URLTest', 'Fallback', 'LoadBalance'].includes(proxy?.type)) {
      const allMembers = proxy.all || []
      const leafMembers = [...new Set(collectLeafMemberNames(proxies, allMembers))]
      const stats = leafMemberStats(proxies, leafMembers)
      const effectiveDelay = resolveProxyEffectiveDelay(proxies, name)
      const region = guessCountryCode(name)
      proxyGroups.push({
        code: name,
        name,
        type: proxy.type,
        region,
        regionName: regionDisplayName(region),
        members: leafMembers,
        allMembers,
        now: proxy.now || null,
        count: stats.count,
        online: stats.online,
        bestDelay: effectiveDelay || stats.minDelay,
        parentSelector: findParentSelector(proxies, name),
      })
      continue
    }

    if (!isLeafProxy(proxy)) continue

    const hint = (groupHints[name] || []).join(' ')
    const region = countryCodeFromFlagEmoji(name)
      || countryCodeFromChineseLabel(name)
      || guessCountryCode(name, hint)
    const delay = proxyDelay(proxy)
    const alive = proxy.alive !== false && delay > 0
    nodes.push({
      id: id++,
      name,
      region,
      regionName: regionDisplayName(region),
      groupHint: hint,
      type: proxy.type || '—',
      address: proxy.server || '',
      port: proxy.port || 0,
      delay,
      alive,
      status: proxyStatus(proxy),
      traffic: '—',
    })
  }

  nodes.sort((a, b) => {
    if (a.region !== b.region) return a.region.localeCompare(b.region)
    return nodeLatencySortKey(a) - nodeLatencySortKey(b)
  })

  const countryGroups = buildCountryGroups(nodes)

  appState.nodes = nodes
  appState.proxyGroups = proxyGroups
  appState.countryGroups = countryGroups
  appState.regionGroupStats = countryGroups
  appState.system.totalNodes = nodes.length
  appState.system.onlineNodes = nodes.filter(isNodeAvailable).length
  appState.system.filters = proxyGroups.length

  if (appState.wifi) {
    if (appState.wifi.groupActive && !isWifiProxyGroup(appState.wifi.groupActive)) {
      appState.wifi.groupActive = null
    }
    if (appState.wifi.selectedNodes) {
      for (const key of Object.keys(appState.wifi.selectedNodes)) {
        if (!isWifiProxyGroup(key)) delete appState.wifi.selectedNodes[key]
      }
    }
    persistWifiState(appState.wifi)
  }

  const selectorNow = proxies.GLOBAL?.now || proxies.Proxy?.now
  if (selectorNow) {
    const matchedGroup = proxyGroups.find((g) => g.code === selectorNow)
    if (matchedGroup && !isWifiProxyGroup(matchedGroup.code)) {
      appState.activeProxyGroup = selectorNow
    } else if (!matchedGroup) {
      const picked = nodes.find((n) => n.name === selectorNow)
      if (picked) {
        appState.activeNodeId = picked.id
        appState.activeProxyGroup = picked.region
      }
    }
  }
}

export function applyRulesToState(data, appState) {
  const rules = data?.rules || []
  appState.system.rulesCount = rules.length
  appState.rules = rules.map((rule, index) => ({
    id: index + 1,
    name: rule.payload || rule.type || `规则 ${index + 1}`,
    type: rule.type || '—',
    count: 1,
    matchMode: rule.type || '—',
    outbound: rule.proxy || '—',
    outboundTarget: rule.proxy || '',
    enabled: true,
    icon: 'rule',
    watermark: { type: 'emoji', value: '⚡' },
  }))
}

export function applyProvidersToState(data, appState) {
  const providers = data?.providers || {}
  const names = Object.keys(providers)
  appState.system.subscriptions = names.length
  appState.mihomoProviders = providers
  appState.subscriptions = names.map((name, index) => {
    const provider = providers[name]
    const nodeCount = Array.isArray(provider?.all) && provider.all.length
      ? provider.all.length
      : (provider?.proxies?.length || 0)
    return {
      id: index + 1,
      name,
      nodeCount,
      updatedAt: provider?.updatedAt || '—',
    }
  })
}

export function applyConnectionsToState(data, appState) {
  if (!appState.runtime) {
    appState.runtime = {
      connections: [],
      downloadTotal: 0,
      uploadTotal: 0,
      memoryBytes: 0,
      ruleHitMap: {},
    }
  }
  appState.runtime.connections = data?.connections || []
  appState.runtime.downloadTotal = data?.downloadTotal || 0
  appState.runtime.uploadTotal = data?.uploadTotal || 0
  appState.system.activeConnections = appState.runtime.connections.length
}

export function applyMemoryToState(data, appState) {
  if (!appState.runtime) {
    appState.runtime = { connections: [], downloadTotal: 0, uploadTotal: 0, memoryBytes: 0, ruleHitMap: {} }
  }
  appState.runtime.memoryBytes = data?.inuse || 0
}

export function applyVersionToState(data, appState) {
  if (!data?.version) return
  const ver = String(data.version)
  appState.system.kernelVersion = ver.startsWith('v') ? ver : `v${ver}`
  if (data.meta != null) {
    appState.system.kernelMeta = data.meta ? 'Meta' : 'Standard'
  }
}

let trafficLastTs = 0
let trafficUpTotal = 0
let trafficDownTotal = 0

export function resetTrafficTotals() {
  trafficLastTs = 0
  trafficUpTotal = 0
  trafficDownTotal = 0
}

export function applyTrafficToState({ up, down }, appState, formatBytes) {
  const now = Date.now()
  if (trafficLastTs > 0) {
    const dt = (now - trafficLastTs) / 1000
    trafficUpTotal += up * dt
    trafficDownTotal += down * dt
  }
  trafficLastTs = now

  appState.system.uploadSpeed = up
  appState.system.downloadSpeed = down
  if (formatBytes) {
    appState.system.uploadTotal = formatBytes(trafficUpTotal)
    appState.system.downloadTotal = formatBytes(trafficDownTotal)
  }
}

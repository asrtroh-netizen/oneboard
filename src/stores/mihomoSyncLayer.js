/**
 * Mihomo Sync Layer — WebSocket 优先 + polling fallback + API 补偿
 * 唯一允许主动拉取 Mihomo REST/WS 并写入 State Engine 的层。
 */
import { reactive } from 'vue'
import { MIHOMO_POLL_MS, MIHOMO_FALLBACK_POLL_MS } from '../config/mihomo'
import { setClashBackendConnected, isClashBackendConfigured } from './clashBackend'
import { resetLoading } from './globalLoading'
import { bindMihomoAppState, getMihomoAppState, mihomoSyncMeta } from './mihomoState'
import {
  getVersion,
  getProxies,
  getRules,
  getProviders,
  getConnections,
  getMemory,
  connectTraffic,
  connectConnections,
  enrichProxiesWithDelayTests,
  applyVersionToState,
  applyProxiesToState,
  applyRulesToState,
  applyProvidersToState,
  applyConnectionsToState,
  applyMemoryToState,
  applyTrafficToState,
  resetTrafficTotals,
} from '../api/mihomo'
import { getSystemInfo, applySystemInfoToState } from '../api/systemInfo'
import { connectHostAgent, getAgentSnapshot } from '../api/hostAgent'
import { ControlPlaneEvents, emit } from './controlPlane/eventBus'

const HISTORY_LEN = 48

function emptyHistory() {
  return Array(HISTORY_LEN).fill(0)
}

export const trafficHistory = reactive({
  down: emptyHistory(),
  up: emptyHistory(),
})

/** @deprecated 兼容旧 import，等同 mihomoSyncMeta */
export const mihomoSyncState = mihomoSyncMeta

function pushTrafficHistory(key, value) {
  trafficHistory[key].push(value)
  if (trafficHistory[key].length > HISTORY_LEN) trafficHistory[key].shift()
}

let pollTimer = null
let stopTraffic = null
let stopConnections = null
/** @type {((bytes: number) => string) | null} */
let formatBytesRef = null
let refreshInFlight = false
let proxiesRefreshInFlight = false
let delayTestInFlight = false
let pollIntervalMs = MIHOMO_POLL_MS
let reconnectHydrateTimer = null
let systemInfoThrottleAt = 0
let proxyMetaThrottleAt = 0
let stopHostAgent = null

function appState() {
  return getMihomoAppState()
}

function hasProxySnapshot() {
  const s = tryGetState()
  return Boolean(s?.proxyGroups?.length)
}

function tryGetState() {
  try {
    return getMihomoAppState()
  } catch {
    return null
  }
}

function markKernelOnline() {
  if (!mihomoSyncMeta.kernelStartTime) {
    mihomoSyncMeta.kernelStartTime = new Date().toLocaleString('zh-CN', { hour12: false })
    const s = tryGetState()
    if (s) s.system.kernelStartTime = mihomoSyncMeta.kernelStartTime
  }
}

function setPollMode(mode) {
  mihomoSyncMeta.pollMode = mode
}

function emitMihomoSyncStatus(extra = {}) {
  emit(ControlPlaneEvents.MIHOMO_SYNC, {
    connected: mihomoSyncMeta.connected,
    degraded: mihomoSyncMeta.degraded,
    trafficWsConnected: mihomoSyncMeta.trafficWsConnected,
    connectionsWsConnected: mihomoSyncMeta.connectionsWsConnected,
    pollMode: mihomoSyncMeta.pollMode,
    lastError: mihomoSyncMeta.lastError,
    lastSyncAt: mihomoSyncMeta.lastSyncAt,
    ...extra,
  })
}

function reschedulePollTimer() {
  const wsOk = mihomoSyncMeta.trafficWsConnected && mihomoSyncMeta.connectionsWsConnected
  setPollMode(wsOk ? 'ws-live' : 'rest-fallback')
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (wsOk) return
  const next = MIHOMO_FALLBACK_POLL_MS
  pollIntervalMs = next
  pollTimer = window.setInterval(refreshAll, pollIntervalMs)
  emitMihomoSyncStatus({ reason: 'poll-fallback' })
}

function onWsStatusChange() {
  reschedulePollTimer()
}

function hydrateAfterReconnect() {
  if (reconnectHydrateTimer) clearTimeout(reconnectHydrateTimer)
  reconnectHydrateTimer = window.setTimeout(() => {
    reconnectHydrateTimer = null
    void refreshMihomo({ reason: 'ws-reconnect' })
  }, 200)
}

async function refreshSystemInfo() {
  const s = tryGetState()
  if (!s) return
  try {
    const info = await getSystemInfo()
    applySystemInfoToState(info, s)
    mihomoSyncMeta.systemInfoOk = true
  } catch {
    mihomoSyncMeta.systemInfoOk = false
    if (typeof window !== 'undefined' && window.location?.hostname) {
      s.system.hostname = window.location.hostname
    }
  }
}

function applyAgentSnapshot(snapshot, { reason = 'agent-snapshot', trafficOnly = false } = {}) {
  const s = tryGetState()
  if (!s || !snapshot) return

  if (!trafficOnly && snapshot.system) {
    applySystemInfoToState(snapshot.system, s)
    mihomoSyncMeta.systemInfoOk = true
  }

  const mihomo = snapshot.mihomo
  if (!mihomo) return

  if (mihomo.traffic && formatBytesRef) {
    applyTrafficToState(mihomo.traffic, s, formatBytesRef)
    pushTrafficHistory('up', Number(mihomo.traffic.up || 0) / 1024)
    pushTrafficHistory('down', Number(mihomo.traffic.down || 0) / 1024)
    emit(ControlPlaneEvents.MIHOMO_TRAFFIC, {
      up: mihomo.traffic.up,
      down: mihomo.traffic.down,
      uploadSpeed: s.system.uploadSpeed,
      downloadSpeed: s.system.downloadSpeed,
      reason,
    })
  }

  if (trafficOnly) return

  if (mihomo.version) applyVersionToState(mihomo.version, s)
  if (mihomo.proxies) {
    applyProxiesToState(mihomo.proxies, s)
    mihomoSyncMeta.connected = Boolean(mihomo.ok)
    mihomoSyncMeta.degraded = false
    mihomoSyncMeta.lastError = mihomo.lastError || null
    mihomoSyncMeta.lastSyncAt = mihomo.updatedAt || Date.now()
    s.system.kernelStatus = mihomo.ok ? 'running' : 'offline'
    setClashBackendConnected(Boolean(mihomo.ok), mihomo.lastError)
    if (mihomo.ok) markKernelOnline()
  }
  if (mihomo.connections) applyConnectionsToState(mihomo.connections, s)
  if (mihomo.memory) applyMemoryToState(mihomo.memory, s)

  emit(ControlPlaneEvents.MIHOMO_NODES, {
    online: s.system.onlineNodes,
    total: s.system.totalNodes,
    activeConnections: s.system.activeConnections,
    reason,
  })
  emitMihomoSyncStatus({ reason })
}

function startHostAgentBridge() {
  void getAgentSnapshot()
    .then((snapshot) => applyAgentSnapshot(snapshot, { reason: 'agent-http' }))
    .catch(() => {})

  stopHostAgent = connectHostAgent({
    onEvent(event) {
      if (event?.type === 'mihomo.traffic') {
        applyAgentSnapshot(event.snapshot, { reason: 'agent-ws-traffic', trafficOnly: true })
        return
      }
      applyAgentSnapshot(event?.snapshot, { reason: event?.type || 'agent-ws' })
    },
    onStatus({ connected }) {
      mihomoSyncMeta.agentConnected = connected
      if (connected) {
        mihomoSyncMeta.trafficWsConnected = true
        setPollMode('agent-ws')
      } else {
        onWsStatusChange()
      }
      emitMihomoSyncStatus({ channel: 'agent', connected })
    },
  })
}

async function enrichDelayTestsInBackground(proxiesRaw) {
  if (!proxiesRaw || delayTestInFlight) return
  delayTestInFlight = true
  try {
    await enrichProxiesWithDelayTests(proxiesRaw)
    const s = tryGetState()
    if (!s) return
    applyProxiesToState(proxiesRaw, s)
  } catch {
    /* best-effort */
  } finally {
    delayTestInFlight = false
  }
}

/**
 * 核心：proxies 失败才标记离线；其余 API 失败保留已有 state。
 */
async function refreshMihomo({ reason = 'poll' } = {}) {
  if (refreshInFlight) return
  const s = tryGetState()
  if (!s) return

  if (!isClashBackendConfigured()) {
    mihomoSyncMeta.connected = false
    mihomoSyncMeta.degraded = false
    mihomoSyncMeta.lastError = null
    s.system.kernelStatus = 'offline'
    setClashBackendConnected(false)
    emitMihomoSyncStatus({ reason: 'unconfigured' })
    return
  }

  refreshInFlight = true
  try {
    let proxiesRaw = null

    try {
      proxiesRaw = await getProxies()
      applyProxiesToState(proxiesRaw, s)
      mihomoSyncMeta.connected = true
      mihomoSyncMeta.degraded = false
      mihomoSyncMeta.lastError = null
      mihomoSyncMeta.lastSyncAt = Date.now()
      s.system.kernelStatus = 'running'
      setClashBackendConnected(true)
      markKernelOnline()
      void enrichDelayTestsInBackground(proxiesRaw)
    } catch (err) {
      mihomoSyncMeta.lastError = err?.message || '代理同步失败'
      if (hasProxySnapshot()) {
        mihomoSyncMeta.connected = true
        mihomoSyncMeta.degraded = true
        s.system.kernelStatus = 'degraded'
      } else {
        mihomoSyncMeta.connected = false
        mihomoSyncMeta.degraded = false
        s.system.kernelStatus = 'offline'
        setClashBackendConnected(false, mihomoSyncMeta.lastError)
      }
      return
    }

    try {
      const version = await getVersion()
      applyVersionToState(version, s)
    } catch {
      /* 版本失败不影响 selector */
    }

    const [rulesR, providersR, connectionsR, memoryR] = await Promise.allSettled([
      getRules(),
      getProviders(),
      mihomoSyncMeta.connectionsWsConnected ? Promise.resolve(null) : getConnections(),
      getMemory(),
    ])

    if (rulesR.status === 'fulfilled') applyRulesToState(rulesR.value, s)
    if (providersR.status === 'fulfilled') applyProvidersToState(providersR.value, s)
    if (connectionsR.status === 'fulfilled' && connectionsR.value) {
      applyConnectionsToState(connectionsR.value, s)
    }
    if (memoryR.status === 'fulfilled' && memoryR.value) applyMemoryToState(memoryR.value, s)

    emit(ControlPlaneEvents.MIHOMO_NODES, {
      online: s.system.onlineNodes,
      total: s.system.totalNodes,
      reason,
    })
    mihomoSyncMeta.lastSyncAt = Date.now()
    if (reason === 'ws-reconnect') {
      mihomoSyncMeta.lastError = null
    }
    emitMihomoSyncStatus({ reason })
  } finally {
    refreshInFlight = false
  }
}

async function refreshProxiesOnly() {
  if (proxiesRefreshInFlight) return
  const s = tryGetState()
  if (!s) return

  proxiesRefreshInFlight = true
  try {
    const proxiesRaw = await getProxies()
    applyProxiesToState(proxiesRaw, s)
    mihomoSyncMeta.connected = true
    mihomoSyncMeta.degraded = false
    mihomoSyncMeta.lastError = null
    mihomoSyncMeta.lastSyncAt = Date.now()
    s.system.kernelStatus = 'running'
  } catch (err) {
    mihomoSyncMeta.lastError = err?.message || '代理刷新失败'
    if (hasProxySnapshot()) {
      mihomoSyncMeta.connected = true
      mihomoSyncMeta.degraded = true
    }
  } finally {
    proxiesRefreshInFlight = false
  }
}

async function refreshAll() {
  await Promise.all([refreshMihomo(), refreshSystemInfo()])
}

function onConnectionsPayload(data) {
  const s = tryGetState()
  if (!s) return
  applyConnectionsToState(data, s)
  emit(ControlPlaneEvents.MIHOMO_NODES, {
    online: s.system.onlineNodes,
    total: s.system.totalNodes,
    activeConnections: s.system.activeConnections,
    reason: 'ws-connections',
  })
}

async function maybeRefreshSystemInfo(force = false) {
  const now = Date.now()
  if (!force && now - systemInfoThrottleAt < 30000) return
  systemInfoThrottleAt = now
  await refreshSystemInfo()
}

async function maybeRefreshProxyMeta(force = false) {
  const wsOk = mihomoSyncMeta.trafficWsConnected && mihomoSyncMeta.connectionsWsConnected
  if (!wsOk && !force) return
  const now = Date.now()
  if (!force && now - proxyMetaThrottleAt < 60000) return
  proxyMetaThrottleAt = now
  await refreshMihomo({ reason: 'ws-meta' })
}

export function startMihomoSyncLayer(appState, formatBytes) {
  bindMihomoAppState(appState)
  formatBytesRef = formatBytes

  stopMihomoSyncLayer()
  resetLoading()
  resetTrafficTotals()
  pollIntervalMs = MIHOMO_POLL_MS
  setPollMode('starting')

  startHostAgentBridge()

  if (!isClashBackendConfigured()) {
    mihomoSyncMeta.connected = false
    setClashBackendConnected(false)
    emitMihomoSyncStatus({ reason: 'unconfigured' })
    return
  }

  void refreshAll()

  emitMihomoSyncStatus({ reason: 'start' })

  stopTraffic = connectTraffic(
    (traffic) => {
      const s = tryGetState()
      if (!s || !formatBytesRef) return
      applyTrafficToState(traffic, s, formatBytesRef)
      pushTrafficHistory('up', traffic.up / 1024)
      pushTrafficHistory('down', traffic.down / 1024)
      emit(ControlPlaneEvents.MIHOMO_TRAFFIC, {
        up: traffic.up,
        down: traffic.down,
        uploadSpeed: s.system.uploadSpeed,
        downloadSpeed: s.system.downloadSpeed,
      })
      void maybeRefreshSystemInfo()
      void maybeRefreshProxyMeta()
    },
    ({ connected }) => {
      mihomoSyncMeta.trafficWsConnected = connected
      onWsStatusChange()
      emitMihomoSyncStatus({ channel: 'traffic', connected })
    },
    hydrateAfterReconnect,
  )

  stopConnections = connectConnections(
    onConnectionsPayload,
    ({ connected }) => {
      mihomoSyncMeta.connectionsWsConnected = connected
      onWsStatusChange()
      emitMihomoSyncStatus({ channel: 'connections', connected })
    },
    hydrateAfterReconnect,
  )

  reschedulePollTimer()
}

export function stopMihomoSyncLayer() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (reconnectHydrateTimer) {
    clearTimeout(reconnectHydrateTimer)
    reconnectHydrateTimer = null
  }
  refreshInFlight = false
  proxiesRefreshInFlight = false
  delayTestInFlight = false
  if (stopTraffic) {
    stopTraffic()
    stopTraffic = null
  }
  if (stopConnections) {
    stopConnections()
    stopConnections = null
  }
  if (stopHostAgent) {
    stopHostAgent()
    stopHostAgent = null
  }
  mihomoSyncMeta.agentConnected = false
  mihomoSyncMeta.trafficWsConnected = false
  mihomoSyncMeta.connectionsWsConnected = false
  setPollMode('idle')
}

export function refreshMihomoNow() {
  return refreshAll()
}

export function refreshProxiesNow() {
  return refreshProxiesOnly()
}

/** 供 Engine 域动作使用的细粒度 refresh */
export async function fetchRulesSnapshot() {
  const data = await getRules()
  const s = tryGetState()
  if (s) applyRulesToState(data, s)
  return data
}

export async function fetchProvidersSnapshot() {
  const data = await getProviders()
  const s = tryGetState()
  if (s) applyProvidersToState(data, s)
  return data
}

export async function fetchProxiesSnapshot() {
  const data = await getProxies()
  const s = tryGetState()
  if (s) {
    applyProxiesToState(data, s)
    mihomoSyncMeta.connected = true
    mihomoSyncMeta.lastSyncAt = Date.now()
  }
  return data
}

/**
 * DNS Sync Layer — Mihomo /logs WebSocket + connections → DNS 查询统计
 */
import { reactive } from 'vue'
import { connectLogs, flushDnsCache, getConnections } from '../api/mihomo'
import { getMihomoAppState } from './mihomoState'
import { DnsLogCollector, applyDnsCollectorToState } from '../utils/dnsLogParser'
import { ControlPlaneEvents, on } from './controlPlane/eventBus'

export const dnsSyncMeta = reactive({
  connected: false,
  logInfoConnected: false,
  logDebugConnected: false,
  lastError: null,
  lastUpdateAt: 0,
})

let stopLogsInfo = null
let stopLogsDebug = null
let unsubConnections = null
let collector = null
let refreshing = false

function tryGetState() {
  try {
    return getMihomoAppState()
  } catch {
    return null
  }
}

function syncState() {
  const state = tryGetState()
  if (!state || !collector) return
  applyDnsCollectorToState(collector, state)
  dnsSyncMeta.lastUpdateAt = Date.now()
}

function ingestConnectionsFromState() {
  const state = tryGetState()
  if (!state || !collector) return
  collector.ingestConnections(state.runtime?.connections || [])
  syncState()
}

function handleLogFrame(frame) {
  if (!collector) return

  const message = frame?.message || frame?.payload
  if (!message) return

  const state = tryGetState()
  const connections = state?.runtime?.connections || []
  collector.ingest(message, connections, Date.now())
  syncState()
}

function updateConnectedFlag() {
  dnsSyncMeta.connected = dnsSyncMeta.logInfoConnected || dnsSyncMeta.logDebugConnected
}

export function startDnsSyncLayer() {
  stopDnsSyncLayer()
  collector = new DnsLogCollector()
  dnsSyncMeta.lastError = null

  stopLogsInfo = connectLogs(
    handleLogFrame,
    ({ connected }) => {
      dnsSyncMeta.logInfoConnected = connected
      updateConnectedFlag()
      if (connected) ingestConnectionsFromState()
    },
    { level: 'info' },
  )

  stopLogsDebug = connectLogs(
    handleLogFrame,
    ({ connected }) => {
      dnsSyncMeta.logDebugConnected = connected
      updateConnectedFlag()
    },
    { level: 'debug' },
  )

  unsubConnections = on(ControlPlaneEvents.MIHOMO_NODES, () => {
    ingestConnectionsFromState()
  })

  void getConnections()
    .then((data) => {
      const state = tryGetState()
      if (state && data?.connections) {
        state.runtime = state.runtime || {}
        state.runtime.connections = data.connections
      }
      ingestConnectionsFromState()
    })
    .catch(() => {
      ingestConnectionsFromState()
    })
}

export function stopDnsSyncLayer() {
  if (stopLogsInfo) {
    stopLogsInfo()
    stopLogsInfo = null
  }
  if (stopLogsDebug) {
    stopLogsDebug()
    stopLogsDebug = null
  }
  if (unsubConnections) {
    unsubConnections()
    unsubConnections = null
  }
  collector = null
  dnsSyncMeta.connected = false
  dnsSyncMeta.logInfoConnected = false
  dnsSyncMeta.logDebugConnected = false
}

export async function refreshDnsSyncLayer() {
  if (refreshing) return
  refreshing = true
  try {
    startDnsSyncLayer()
  } finally {
    refreshing = false
  }
}

export async function clearDnsMonitor({ flushCache = true } = {}) {
  if (flushCache) {
    try {
      await flushDnsCache()
    } catch (err) {
      dnsSyncMeta.lastError = err?.message || '清空 DNS 缓存失败'
      throw err
    }
  }
  collector?.clear()
  syncState()
}

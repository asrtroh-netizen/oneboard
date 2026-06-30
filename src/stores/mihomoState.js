/**
 * Mihomo State Engine — 单一状态源
 * UI 只读此模块暴露的 state / getters，不直接访问 API。
 */
import { computed, reactive } from 'vue'

/** @type {import('vue').Reactive<object> | null} */
let appStateRef = null

export const mihomoSyncMeta = reactive({
  connected: false,
  degraded: false,
  trafficWsConnected: false,
  connectionsWsConnected: false,
  systemInfoOk: false,
  lastError: null,
  lastSyncAt: null,
  kernelStartTime: null,
  pollMode: 'idle',
})

export function bindMihomoAppState(appState) {
  appStateRef = appState
}

export function getMihomoAppState() {
  if (!appStateRef) {
    throw new Error('Mihomo State Engine 未初始化')
  }
  return appStateRef
}

export function tryGetMihomoAppState() {
  return appStateRef
}

export function useMihomoState() {
  const state = computed(() => appStateRef)

  const proxy = computed(() => ({
    groups: appStateRef?.proxyGroups ?? [],
    nodes: appStateRef?.nodes ?? [],
    activeGroup: appStateRef?.activeProxyGroup ?? '',
    activeNodeId: appStateRef?.activeNodeId ?? null,
    wifi: appStateRef?.wifi ?? { groupActive: null, selectedNodes: {} },
    countryGroups: appStateRef?.countryGroups ?? [],
  }))

  const rules = computed(() => appStateRef?.rules ?? [])

  const traffic = computed(() => ({
    uploadSpeed: appStateRef?.system?.uploadSpeed ?? 0,
    downloadSpeed: appStateRef?.system?.downloadSpeed ?? 0,
    uploadTotal: appStateRef?.system?.uploadTotal ?? '0 B',
    downloadTotal: appStateRef?.system?.downloadTotal ?? '0 B',
    connections: appStateRef?.runtime?.connections ?? [],
    activeConnections: appStateRef?.system?.activeConnections ?? 0,
  }))

  const kernel = computed(() => ({
    version: appStateRef?.system?.kernelVersion ?? '—',
    meta: appStateRef?.system?.kernelMeta ?? '',
    status: appStateRef?.system?.kernelStatus ?? 'offline',
    startTime: appStateRef?.system?.kernelStartTime ?? '—',
  }))

  const providers = computed(() => ({
    map: appStateRef?.mihomoProviders ?? {},
    subscriptions: appStateRef?.subscriptions ?? [],
  }))

  const selectorsAvailable = computed(() =>
    (appStateRef?.proxyGroups?.length ?? 0) > 0,
  )

  return {
    state,
    sync: mihomoSyncMeta,
    proxy,
    rules,
    traffic,
    kernel,
    providers,
    selectorsAvailable,
  }
}

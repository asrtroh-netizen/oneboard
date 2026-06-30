import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { getConnections } from '../api/mihomo'
import { clashBackendLabel } from '../stores/clashBackend'
import { ControlPlaneEvents, on } from '../stores/controlPlane/eventBus'
import { useMihomoEngine } from '../stores/mihomoEngine'
import { tryGetMihomoAppState } from '../stores/mihomoState'
import { useClashBackendReload } from './useClashBackendReload'
import { getProviderMemberNames, isHttpProxyProvider } from '../utils/proxySections'
import {
  buildProviderOnlineMetrics,
  buildProviderUsageMetrics,
  finalizeProviderUsagePercents,
} from '../utils/subscriptionUsage'
import { normalizeProviderConfig } from '../utils/subscriptionConfig'

function formatProviderUpdatedAt(raw) {
  if (!raw || raw === '—' || String(raw).startsWith('0001-01-01')) return '—'
  try {
    return new Date(raw).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return String(raw)
  }
}

function buildProxyOptions(proxiesData) {
  const names = new Set(['DIRECT', 'REJECT'])
  const proxies = proxiesData?.proxies || {}
  for (const [name] of Object.entries(proxies)) {
    if (name === 'GLOBAL') continue
    names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

function mergeProviderItems(configData, runtimeData, connections = [], nodes = []) {
  const configProviders = configData?.providers || {}
  const configOrder = configData?.order || Object.keys(configProviders)
  const runtimeProviders = runtimeData?.providers || {}

  const httpNames = Object.entries(runtimeProviders)
    .filter(([name, provider]) => isHttpProxyProvider(name, provider))
    .map(([name]) => name)

  const orderedNames = configOrder.length
    ? configOrder.filter((name) => configProviders[name] || httpNames.includes(name))
    : [...httpNames]

  for (const name of httpNames) {
    if (!orderedNames.includes(name)) orderedNames.push(name)
  }

  const items = orderedNames.map((name) => {
    const runtime = runtimeProviders[name] || {}
    const config = normalizeProviderConfig(configProviders[name] || {})
    const members = getProviderMemberNames(runtime)
    const usage = buildProviderUsageMetrics({
      runtime,
      connections,
      memberNames: members,
    })
    const online = buildProviderOnlineMetrics({
      memberNames: members,
      nodes,
      provider: runtime,
    })
    return {
      id: name,
      name,
      config,
      nodeCount: members.length,
      updatedAt: formatProviderUpdatedAt(runtime.updatedAt),
      vehicleType: runtime.vehicleType || runtime.type || 'HTTP',
      configFromYaml: Boolean(configProviders[name]),
      usage,
      online,
    }
  })

  return finalizeProviderUsagePercents(items)
}

/** Subscription Providers — 远程 YAML proxy-providers + Mihomo runtime */
export function useSubscriptionsPageView() {
  const mihomo = useMihomoEngine()
  const items = ref([])
  const configPath = ref('')
  const yamlSource = ref('')
  const configSnapshot = ref({ providers: {}, order: [] })
  const configLoaded = ref(false)
  const loading = ref(true)
  const saving = ref(false)
  const error = ref(null)
  const configWarning = ref(null)
  const proxyOptions = ref(['DIRECT', 'REJECT'])
  let unsubRuntime = null

  const stats = computed(() => ({
    total: items.value.length,
    nodes: items.value.reduce((sum, item) => sum + (item.nodeCount || 0), 0),
  }))

  function applyMergedFromRuntimeState() {
    if (!configLoaded.value) return

    const state = tryGetMihomoAppState()
    const runtimeData = { providers: state?.mihomoProviders || {} }
    const connections = state?.runtime?.connections || []

    items.value = mergeProviderItems(
      configSnapshot.value,
      runtimeData,
      connections,
      state?.nodes || [],
    )
  }

  async function refresh() {
    loading.value = true
    error.value = null
    configWarning.value = null

    try {
      const bundle = await mihomo.loadSubscriptionsBundle()
      const runtimeData = bundle.providersRuntime
      const proxiesData = bundle.proxiesRaw
      const configData = bundle.configData
      configPath.value = bundle.pathInfo?.path || ''
      yamlSource.value = bundle.yamlSource || configData?.source || ''

      let connections = []
      try {
        const connData = await getConnections()
        connections = connData?.connections || []
      } catch {
        connections = []
      }

      if (!runtimeData?.providers) {
        throw new Error('无法连接后端 Providers API')
      }

      if (!configData?.providers || !Object.keys(configData.providers).length) {
        configWarning.value = `无法从 ${clashBackendLabel.value} 远程 YAML 读取 proxy-providers`
      }

      proxyOptions.value = buildProxyOptions(proxiesData)
      configSnapshot.value = {
        providers: configData?.providers || {},
        order: configData?.order || [],
      }
      configLoaded.value = true
      const state = tryGetMihomoAppState()
      items.value = mergeProviderItems(
        configSnapshot.value,
        runtimeData,
        connections,
        state?.nodes || [],
      )

      if (!items.value.length && configWarning.value) {
        error.value = configWarning.value
      } else if (configWarning.value) {
        configWarning.value = `${configWarning.value} · 已显示运行时订阅`
      }
    } catch (err) {
      error.value = err?.message || '无法加载订阅配置'
      items.value = []
      configLoaded.value = false
    } finally {
      loading.value = false
    }
  }

  watch(
    () => mihomo.providers.value.map,
    () => applyMergedFromRuntimeState(),
    { deep: true },
  )

  watch(
    () => mihomo.traffic.value.connections,
    () => applyMergedFromRuntimeState(),
    { deep: true },
  )

  onMounted(() => {
    unsubRuntime = on(ControlPlaneEvents.MIHOMO_NODES, () => {
      applyMergedFromRuntimeState()
    })
  })

  onUnmounted(() => {
    unsubRuntime?.()
    unsubRuntime = null
  })

  useClashBackendReload(() => refresh())

  function getProvider(name) {
    return items.value.find((item) => item.name === name) || null
  }

  async function saveProvider(name, config) {
    saving.value = true
    error.value = null
    try {
      await mihomo.saveSubscriptionProvider(name, config)
      await refresh()
      return true
    } catch (err) {
      error.value = err?.message || '保存失败'
      return false
    } finally {
      saving.value = false
    }
  }

  async function refreshProvider(name) {
    try {
      await mihomo.refreshProvider(name)
      applyMergedFromRuntimeState()
      return Boolean(getProvider(name))
    } catch (err) {
      error.value = err?.message || '刷新 Provider 失败'
      return false
    }
  }

  return {
    items,
    configPath,
    yamlSource,
    loading,
    saving,
    error,
    configWarning,
    stats,
    proxyOptions,
    refresh,
    getProvider,
    saveProvider,
    refreshProvider,
  }
}

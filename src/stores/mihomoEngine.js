/**
 * Mihomo Engine — UI 唯一入口
 *
 * UI → useMihomoEngine() → State Engine + Sync Layer → Mihomo API
 */
import {
  getVersion,
  upgradeMihomo,
  getMihomoLatestVersion,
  selectProxy,
  updateProxyProvider,
  restartMihomoCore,
  testProxiesDelayBatch,
} from '../api/mihomo'
import {
  applyStorageYamlToMihomo,
  fetchMihomoConfigYamlBundle,
  fetchMihomoConfigYamlText,
  importMihomoConfigYaml,
  reloadMihomoRuntimeFromFile,
  saveMihomoConfigYaml,
} from '../api/mihomoYaml'
import { applyProviderToYaml, parseProxyProvidersYaml } from '../utils/subscriptionConfig'
import { applyClashBackendSwitch } from './clashBackendHub'
import { getMihomoAppState, useMihomoState, mihomoSyncMeta } from './mihomoState'
import {
  trafficHistory,
  startMihomoSyncLayer,
  stopMihomoSyncLayer,
  refreshMihomoNow,
  refreshProxiesNow,
  fetchRulesSnapshot,
  fetchProvidersSnapshot,
  fetchProxiesSnapshot,
} from './mihomoSyncLayer'

export { trafficHistory, mihomoSyncMeta as mihomoSyncState }

export function initMihomoEngine(appState, formatBytes) {
  startMihomoSyncLayer(appState, formatBytes)
}

export function stopMihomoEngine() {
  stopMihomoSyncLayer()
}

export function reconnectClashBackend(appState, formatBytes) {
  applyClashBackendSwitch(appState, formatBytes)
}

export function useMihomoEngine() {
  const views = useMihomoState()

  return {
    ...views,
    trafficHistory,
    refresh: refreshMihomoNow,
    refreshProxies: refreshProxiesNow,
    reconnect: reconnectClashBackend,

    async fetchKernelVersion() {
      return getVersion()
    },

    async fetchLatestKernelVersion(channel = 'release') {
      return getMihomoLatestVersion(channel)
    },

    async upgradeKernel(channel = 'release') {
      await upgradeMihomo(channel)
      await refreshMihomoNow()
    },

    async restartKernel() {
      await restartMihomoCore()
      await refreshMihomoNow()
    },

    async switchProxy(selector, proxyName) {
      await selectProxy(selector, proxyName)
      await refreshProxiesNow()
    },

    async refreshProvider(name) {
      await updateProxyProvider(name)
      await fetchProvidersSnapshot()
      await refreshProxiesNow()
    },

    async refreshAllProviders(names) {
      await Promise.allSettled(names.map((name) => updateProxyProvider(name)))
      await fetchProvidersSnapshot()
      await refreshProxiesNow()
    },

    async runDelayTests(nodeNames, options) {
      return testProxiesDelayBatch(nodeNames, options)
    },

    /** Rules 页 — 经 Sync Layer 补偿 */
    async loadRulesRaw() {
      return fetchRulesSnapshot()
    },

    /** Subscriptions 页 — 远程 YAML proxy-providers */
    async loadSubscriptionsBundle() {
      const [providersRuntime, proxiesRaw, yamlBundle] = await Promise.all([
        fetchProvidersSnapshot(),
        fetchProxiesSnapshot(),
        fetchMihomoConfigYamlBundle({ retryReload: false }).catch(() => ({
          yaml: '',
          source: '',
          updatedAt: null,
        })),
      ])

      let configData = null
      if (yamlBundle?.yaml) {
        const parsed = parseProxyProvidersYaml(yamlBundle.yaml)
        configData = {
          providers: parsed.providers,
          order: parsed.order,
          source: yamlBundle.source || 'remote',
        }
      }

      return {
        providersRuntime,
        proxiesRaw,
        configData,
        pathInfo: {
          path: yamlBundle?.source ? `remote:${yamlBundle.source}` : '',
        },
        yamlSource: yamlBundle?.source || '',
      }
    },

    async saveSubscriptionProvider(name, config) {
      let yaml = await fetchMihomoConfigYamlText({ retryReload: true })
      if (!yaml) {
        yaml = (await fetchMihomoConfigYamlBundle({ retryReload: true }))?.yaml || ''
      }
      if (!yaml) {
        throw new Error('无法从远程后端读取 YAML，无法保存订阅')
      }

      const nextYaml = applyProviderToYaml(yaml, name, config)
      await saveMihomoConfigYaml(nextYaml)
      await updateProxyProvider(name)
      await refreshMihomoNow()
    },

    /** WIFICALL / Nodes YAML */
    async loadConfigYamlBundle(options = {}) {
      return fetchMihomoConfigYamlBundle(options)
    },

    async loadConfigYamlText(options = {}) {
      return fetchMihomoConfigYamlText(options)
    },

    async saveConfigYaml(yaml) {
      await saveMihomoConfigYaml(yaml)
      await refreshProxiesNow()
    },

    async importConfigYaml(yaml, { apply = true } = {}) {
      await importMihomoConfigYaml(yaml, { apply })
      if (apply) await refreshProxiesNow()
    },

    async reloadConfigFromFile(path) {
      await reloadMihomoRuntimeFromFile(path)
      await refreshMihomoNow()
    },

    async applyConfigYamlToRuntime(yaml) {
      await applyStorageYamlToMihomo(yaml)
      await refreshProxiesNow()
    },

    async fetchRuntimeProxies() {
      return fetchProxiesSnapshot()
    },

    getState() {
      return getMihomoAppState()
    },
  }
}

/** @deprecated 兼容旧代码 */
export function startMihomoSync(appState, formatBytes) {
  initMihomoEngine(appState, formatBytes)
}

/** @deprecated 兼容旧代码 */
export function stopMihomoSync() {
  stopMihomoEngine()
}

export { refreshMihomoNow, refreshProxiesNow }

export async function engineSwitchProxy(selector, proxyName) {
  await selectProxy(selector, proxyName)
  await refreshProxiesNow()
}

export async function engineRestartKernel() {
  await restartMihomoCore()
  await refreshMihomoNow()
}

export async function engineRefreshAllProviders(names) {
  await Promise.allSettled(names.map((name) => updateProxyProvider(name)))
  await fetchProvidersSnapshot()
  await refreshProxiesNow()
}

export async function engineRunDelayTests(nodeNames, options) {
  return testProxiesDelayBatch(nodeNames, options)
}

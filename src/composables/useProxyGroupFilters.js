import { ref } from 'vue'
import { clashBackendLabel } from '../stores/clashBackend'
import { useMihomoEngine } from '../stores/mihomoEngine'
import { useClashBackendReload } from './useClashBackendReload'
import {
  applyProxyGroupFilter,
  findProxyGroupConfig,
  parseProxyGroupsYaml,
  proxyGroupsToMap,
} from '../utils/proxyGroupConfig'
import {
  compareWifiGroupSync,
  formatSyncUpdatedAt,
  listWifiGroupsFromYaml,
  listWifiProxyGroupNames,
} from '../utils/mihomoConfigSync'
import { refreshProxiesNow } from '../stores/mihomoEngine'

function resolveMihomoConfigPath() {
  return String(import.meta.env.VITE_MIHOMO_CONFIG_PATH || '').trim()
}

export function useProxyGroupFilters() {
  const mihomo = useMihomoEngine()
  const proxyGroupsMap = ref({})
  const configYaml = ref('')
  const storageUpdatedAt = ref(null)
  const loading = ref(false)
  const saving = ref(false)
  const importing = ref(false)
  const syncing = ref(false)
  const error = ref(null)
  const configWarning = ref(null)
  const syncStatus = ref('missing')
  const syncHint = ref('')

  function applySyncCompare(compare, { hasYaml }) {
    if (!hasYaml) {
      syncStatus.value = 'missing'
      syncHint.value = '远程后端尚无 YAML · 请确认后端连接后点击「同步」'
      return
    }

    if (compare.inSync) {
      syncStatus.value = 'ok'
      syncHint.value = `${clashBackendLabel.value} 远程 YAML 与运行组一致`
      return
    }

    syncStatus.value = 'drift'
    const parts = []
    if (compare.onlyRuntime.length) {
      parts.push(`运行中多出 ${compare.onlyRuntime.length} 个 WIFI 组`)
    }
    if (compare.onlyStorage.length) {
      parts.push(`远程 YAML 多出 ${compare.onlyStorage.length} 个 WIFI 组`)
    }
    syncHint.value = `${parts.join(' · ') || 'WIFI 组不一致'} · 保存 filter 时将 PUT 到 ${clashBackendLabel.value}`
  }

  async function evaluateSyncDrift() {
    const proxiesData = await mihomo.fetchRuntimeProxies().catch(() => null)
    const runtimeNames = listWifiProxyGroupNames(proxiesData)
    const storageNames = configYaml.value ? listWifiGroupsFromYaml(configYaml.value) : []
    const compare = compareWifiGroupSync(runtimeNames, storageNames)
    applySyncCompare(compare, { hasYaml: Boolean(configYaml.value) })
    return compare
  }

  async function load(options = {}) {
    const { refresh = false } = options
    loading.value = true
    error.value = null
    configWarning.value = null

    try {
      let bundle = await mihomo.loadConfigYamlBundle({ retryReload: refresh })
      if (!bundle.yaml && !refresh) {
        bundle = await mihomo.loadConfigYamlBundle({ retryReload: true })
      }

      configYaml.value = bundle.yaml || ''
      storageUpdatedAt.value = bundle.updatedAt

      if (!bundle.yaml) {
        proxyGroupsMap.value = {}
        configWarning.value = '无法从远程后端读取 YAML · 请检查设置页中的后端地址与 Secret'
        await evaluateSyncDrift().catch(() => null)
        return
      }

      if (bundle.source === 'remote-runtime') {
        configWarning.value = '已从远程运行态拼装 YAML（不含历史 filter 字段）'
      } else if (bundle.source === 'remote-session-cache') {
        configWarning.value = '已使用上次远程同步的 YAML 缓存'
      } else {
        configWarning.value = null
      }

      const parsed = parseProxyGroupsYaml(bundle.yaml)
      proxyGroupsMap.value = proxyGroupsToMap(parsed.groups)

      const wifiFilterCount = parsed.groups.filter(
        (group) => /WIFI/i.test(group.name) && group.filter,
      ).length

      if (!parsed.groups.length) {
        configWarning.value = 'Mihomo YAML 中未找到 proxy-groups 段，保存时将自动创建'
      } else if (wifiFilterCount === 0) {
        configWarning.value = '已加载 proxy-groups，但未找到 WIFI 组的 filter 字段'
      }

      await evaluateSyncDrift()
    } catch (err) {
      error.value = err?.message || '无法从 Mihomo 加载 proxy-groups 配置'
      proxyGroupsMap.value = {}
      configYaml.value = ''
      syncStatus.value = 'missing'
      syncHint.value = ''
    } finally {
      loading.value = false
    }
  }

  function getFilterForGroup(groupCode) {
    return findProxyGroupConfig(proxyGroupsMap.value, groupCode)
  }

  async function save(groupCode, { filter, excludeFilter }) {
    saving.value = true
    error.value = null

    try {
      let yaml = configYaml.value || await mihomo.loadConfigYamlText()
      if (!yaml) {
        throw new Error('远程后端中尚无 YAML，无法写入 filter')
      }

      const nextYaml = applyProxyGroupFilter(yaml, groupCode, { filter, excludeFilter })
      await mihomo.saveConfigYaml(nextYaml)
      configYaml.value = nextYaml
      storageUpdatedAt.value = new Date().toISOString()
      await refreshProxiesNow().catch(() => null)
      await load()
      return true
    } catch (err) {
      error.value = err?.message || '保存 filter 失败'
      return false
    } finally {
      saving.value = false
    }
  }

  async function importYaml(yaml, { apply = true } = {}) {
    importing.value = true
    error.value = null

    try {
      await mihomo.importConfigYaml(yaml, { apply })
      await load()
      return true
    } catch (err) {
      error.value = err?.message || '导入 YAML 失败'
      return false
    } finally {
      importing.value = false
    }
  }

  /** 网关配置文件 → Mihomo 运行配置（外部改 config 后拉取） */
  async function pullFromMihomo() {
    syncing.value = true
    error.value = null

    try {
      await mihomo.reloadConfigFromFile(resolveMihomoConfigPath())
      await load()

      if (syncStatus.value === 'drift') {
        configWarning.value = '远程 YAML 与运行组不一致 · 保存 filter 后将 PUT 到后端并应用'
      }

      return { drift: syncStatus.value === 'drift' }
    } catch (err) {
      error.value = err?.message || '从 Mihomo 重载失败'
      return { drift: false, failed: true }
    } finally {
      syncing.value = false
    }
  }

  /** Storage YAML → Mihomo 运行配置（本页改 filter 后推送） */
  async function pushToMihomo() {
    syncing.value = true
    error.value = null

    try {
      const yaml = configYaml.value || await mihomo.loadConfigYamlText()
      if (!yaml) {
        throw new Error('远程后端中无 YAML，请先同步')
      }

      await mihomo.applyConfigYamlToRuntime(yaml)
      await evaluateSyncDrift()
      return true
    } catch (err) {
      error.value = err?.message || '应用到 Mihomo 失败'
      return false
    } finally {
      syncing.value = false
    }
  }

  const storageUpdatedLabel = () => formatSyncUpdatedAt(storageUpdatedAt.value)

  useClashBackendReload(() => load({ refresh: true }))

  return {
    proxyGroupsMap,
    configYaml,
    storageUpdatedAt,
    storageUpdatedLabel,
    loading,
    saving,
    importing,
    syncing,
    error,
    configWarning,
    syncStatus,
    syncHint,
    load,
    getFilterForGroup,
    save,
    importYaml,
    pullFromMihomo,
    pushToMihomo,
  }
}

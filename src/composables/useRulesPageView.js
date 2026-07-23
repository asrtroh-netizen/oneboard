import { ref, onMounted } from 'vue'
import { clashBackendLabel, isClashBackendConfigured } from '../stores/clashBackend'
import { useMihomoEngine } from '../stores/mihomoEngine'
import { useClashBackendReload } from './useClashBackendReload'
import {
  applyEditorStoreToView,
  applyGroupYamlEdit,
  buildRulesPageView,
  flattenBlocksToApiRules,
  loadRulesEditorStore,
  normalizeApiRule,
  saveRulesEditorStore,
} from '../utils/rulesDsl'
import { applyRulesSectionToConfigYaml, compareRulesSync } from '../utils/rulesConfig'
import { formatSyncUpdatedAt } from '../utils/mihomoConfigSync'
import rulesDslText from '../data/rules.dsl?raw'

/** Rules IDE — 编辑后同步至远程后端 YAML */
export function useRulesPageView() {
  const mihomo = useMihomoEngine()
  const blocks = ref([])
  const overflow = ref([])
  const configYaml = ref('')
  const yamlSource = ref('')
  const storageUpdatedAt = ref(null)
  const loading = ref(true)
  const saving = ref(false)
  const error = ref(null)
  const configWarning = ref(null)
  const syncStatus = ref('missing')
  const syncHint = ref('')
  const stats = ref({ totalApi: 0, mappedCount: 0, slotCount: 0 })
  const hasLocalEdits = ref(false)

  function applySyncCompare(compare, { hasYaml }) {
    if (!hasYaml) {
      syncStatus.value = 'missing'
      syncHint.value = '远程后端尚无 YAML · 保存规则前请先同步'
      return
    }

    if (compare.inSync) {
      syncStatus.value = 'ok'
      syncHint.value = `${clashBackendLabel.value} 远程 YAML 与运行规则一致`
      return
    }

    syncStatus.value = 'drift'
    const parts = []
    if (compare.onlyRuntime.length) {
      parts.push(`运行中多出 ${compare.onlyRuntime.length} 条`)
    }
    if (compare.onlyStorage.length) {
      parts.push(`远程 YAML 多出 ${compare.onlyStorage.length} 条`)
    }
    if (compare.runtimeCount !== compare.storageCount && !parts.length) {
      parts.push(`条数不一致 ${compare.storageCount} / ${compare.runtimeCount}`)
    }
    syncHint.value = `${parts.join(' · ') || '规则不一致'} · 点击「同步」将规则写入后端并应用`
  }

  async function evaluateSyncDrift(apiRules) {
    const compare = compareRulesSync(apiRules, configYaml.value)
    applySyncCompare(compare, { hasYaml: Boolean(configYaml.value) })
    return compare
  }

  async function loadBaseYaml({ reloadYaml = false } = {}) {
    let yaml = configYaml.value
    if (!yaml || reloadYaml) {
      yaml = await mihomo.loadConfigYamlText({ retryReload: reloadYaml })
    }
    return yaml || ''
  }

  function buildReconciledYaml(baseYaml) {
    return applyRulesSectionToConfigYaml(baseYaml, blocks.value, overflow.value)
  }

  async function persistRulesYaml(nextYaml) {
    await mihomo.saveConfigYaml(nextYaml)
    configYaml.value = nextYaml
    storageUpdatedAt.value = new Date().toISOString()
    saveRulesEditorStore(blocks.value, overflow.value)
  }

  async function reloadRulesState(options = {}) {
    const { reloadYaml = false } = options

    const [rulesData, yamlBundle] = await Promise.all([
      mihomo.loadRulesRaw(),
      mihomo.loadConfigYamlBundle({ retryReload: reloadYaml }),
    ])

    configYaml.value = yamlBundle?.yaml || configYaml.value || ''
    yamlSource.value = yamlBundle?.source || yamlSource.value || ''
    storageUpdatedAt.value = yamlBundle?.updatedAt || storageUpdatedAt.value

    if (!configYaml.value) {
      configWarning.value = reloadYaml
        ? '远程后端尚无完整 YAML，同步时将尝试写入 rules 段'
        : '无法从远程后端读取 YAML'
    } else if (yamlBundle?.source === 'remote-runtime') {
      configWarning.value = '当前为运行时快照（非完整配置文件）。请先在设置页导入完整 YAML，再同步规则'
    }

    const apiRules = (rulesData?.rules || []).map((r, i) => normalizeApiRule(r, i)).filter(Boolean)
    let merged = buildRulesPageView(rulesDslText, apiRules)

    const store = loadRulesEditorStore()
    if (store?.groupOverrides) {
      merged = applyEditorStoreToView(merged, store)
      hasLocalEdits.value = true
    } else {
      hasLocalEdits.value = false
    }

    blocks.value = merged.blocks
    overflow.value = merged.overflow
    stats.value = merged.stats

    await evaluateSyncDrift(apiRules)
    return apiRules
  }

  async function refresh(options = {}) {
    loading.value = true
    error.value = null
    if (!options.keepWarning) configWarning.value = null

    try {
      await reloadRulesState(options)
    } catch (err) {
      error.value = err?.message || '无法加载规则'
      blocks.value = []
      overflow.value = []
      syncStatus.value = 'missing'
      syncHint.value = ''
    } finally {
      loading.value = false
    }
  }

  async function fullSyncRules() {
    saving.value = true
    error.value = null
    configWarning.value = null

    try {
      if (!isClashBackendConfigured()) {
        throw new Error(
          'Clash 上游未配置：请到设置页「透明代理后端」填写 external-controller 主机与端口（通常 :9090），不要填 OneBoard 网关 :8866；保存并连接后再同步规则',
        )
      }

      const baseYaml = await loadBaseYaml({ reloadYaml: false })
      if (!baseYaml) {
        throw new Error('远程后端中无 YAML，请先同步配置')
      }
      if (yamlSource.value === 'remote-runtime' || !/(^|\n)\s*proxies\s*:/m.test(baseYaml)) {
        throw new Error(
          '当前只有运行时快照，没有完整配置 YAML（缺 proxies/订阅 URL）。OpenClash 无法经 API 导出完整文件；请先在设置页导入完整 YAML，再回规则页同步',
        )
      }

      const nextYaml = buildReconciledYaml(baseYaml)
      await persistRulesYaml(nextYaml)

      await reloadRulesState({ reloadYaml: false })

      return syncStatus.value === 'ok'
    } catch (err) {
      error.value = err?.message || '规则同步失败'
      return false
    } finally {
      saving.value = false
    }
  }

  async function syncRulesToMihomo(nextBlocks, nextOverflow) {
    const baseYaml = await loadBaseYaml({ reloadYaml: false })
    if (!baseYaml) {
      throw new Error('远程后端中无 YAML，请先同步配置')
    }

    const nextYaml = applyRulesSectionToConfigYaml(baseYaml, nextBlocks, nextOverflow)
    await persistRulesYaml(nextYaml)

    const rulesData = await mihomo.loadRulesRaw()
    const apiRules = (rulesData?.rules || []).map((r, i) => normalizeApiRule(r, i)).filter(Boolean)
    await evaluateSyncDrift(apiRules)
  }

  async function saveGroupYaml(groupId, yamlText) {
    const result = applyGroupYamlEdit(blocks.value, groupId, yamlText)
    if (!result.updated) return false

    blocks.value = result.blocks
    saveRulesEditorStore(blocks.value, overflow.value)
    hasLocalEdits.value = true

    stats.value = {
      ...stats.value,
      mappedCount: Math.min(
        flattenBlocksToApiRules(blocks.value, overflow.value).length - overflow.value.length,
        stats.value.slotCount || stats.value.totalApi,
      ),
    }

    saving.value = true
    error.value = null
    try {
      await syncRulesToMihomo(blocks.value, overflow.value)
      return true
    } catch (err) {
      error.value = err?.message || '规则同步到 Mihomo 失败'
      return false
    } finally {
      saving.value = false
    }
  }

  async function pushToMihomo() {
    return fullSyncRules()
  }

  const storageUpdatedLabel = () => formatSyncUpdatedAt(storageUpdatedAt.value)

  onMounted(() => {
    void refresh()
  })

  useClashBackendReload(() => refresh({ reloadYaml: true }))

  return {
    blocks,
    overflow,
    configYaml,
    storageUpdatedAt,
    storageUpdatedLabel,
    loading,
    saving,
    error,
    configWarning,
    syncStatus,
    syncHint,
    stats,
    hasLocalEdits,
    refresh,
    saveGroupYaml,
    pushToMihomo,
    fullSyncRules,
  }
}

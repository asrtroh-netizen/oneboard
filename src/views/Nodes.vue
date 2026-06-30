<script setup>
import { computed, onMounted, ref } from 'vue'
import CountryNodeCard from '../components/CountryNodeCard.vue'
import InlineDetailPanel from '../components/InlineDetailPanel.vue'
import InlineExpandGrid from '../components/InlineExpandGrid.vue'
import ProxySection from '../components/proxy/ProxySection.vue'
import ProxyGroupFilterEditor from '../components/proxy/ProxyGroupFilterEditor.vue'
import MIcon from '../components/MIcon.vue'
import { useProxyGroupFilters } from '../composables/useProxyGroupFilters'
import { useAppStore } from '../stores/app'
import { getWifiSelectedNode } from '../utils/wifiState'
import { guessCountryCode, isNodeAvailable, nodeLatencySortKey } from '../utils/countryNodes'

const {
  state,
  wifiGroups,
  activateWifiGroup,
  selectWifiNode,
  showToast,
} = useAppStore()

const {
  loading: filtersLoading,
  saving: filtersSaving,
  error: filtersError,
  configWarning: filtersConfigWarning,
  configYaml,
  storageUpdatedLabel,
  syncStatus,
  syncHint,
  load: loadProxyGroupFilters,
  getFilterForGroup,
  save: saveProxyGroupFilter,
} = useProxyGroupFilters()

const editorOpen = ref(false)
const editingGroupCode = ref('')
const editingGroupConfig = ref(null)
const syncing = ref(false)

const editingGroupName = computed(() => {
  const group = wifiGroups.value.find((g) => g.code === editingGroupCode.value)
  return group?.name || editingGroupCode.value
})

const syncBusy = computed(() => syncing.value || filtersLoading.value || filtersSaving.value)

const syncSubtitleBadgeClass = computed(() => {
  if (syncStatus.value === 'ok') return 'ob-info-badge--ready'
  if (syncStatus.value === 'drift') return 'ob-info-badge--warn'
  return 'ob-info-badge--neutral'
})

const syncSubtitle = computed(() => {
  let text = `${syncStatusLabel.value} · 配置更新 ${storageUpdatedLabel()}`
  if (syncHint.value) text += ` · ${syncHint.value}`
  return text
})

const syncStatusLabel = computed(() => {
  if (syncStatus.value === 'ok') return '已同步'
  if (syncStatus.value === 'drift') return '不一致'
  return '未加载'
})

function membersForGroup(group) {
  if (!group?.members?.length) return []
  return group.members
    .map((name) => state.nodes.find((n) => n.name === name))
    .filter(Boolean)
    .sort((a, b) => nodeLatencySortKey(a) - nodeLatencySortKey(b))
}

function groupOnlineRate(group) {
  if (!group.count) return 0
  return Math.round((group.online / group.count) * 100)
}

function groupEffectiveNode(groupCode) {
  return getWifiSelectedNode(state.wifi, groupCode)
}

function isNodeSelected(node, groupCode) {
  return state.wifi.selectedNodes?.[groupCode] === node.name
}

function nodeRegionCode(node) {
  return node.region || guessCountryCode(node.name)
}

function toggleWifiGroup(code) {
  activateWifiGroup(code)
}

function filterSummary(groupCode) {
  const config = getFilterForGroup(groupCode)
  if (!config?.filter) return ''
  const text = config.filter
  return text.length > 48 ? `${text.slice(0, 48)}…` : text
}

function expandSubtitle(item) {
  const count = membersForGroup(item).length
  const filterHint = filterSummary(item.code)
  const base = count
    ? `共 ${count} 个节点，点击节点生效`
    : '该组暂无节点'
  if (!filterHint) return base
  return `${base} · filter: ${filterHint}`
}

async function onSync() {
  if (syncBusy.value) return
  syncing.value = true
  try {
    await loadProxyGroupFilters({ refresh: true })
    if (filtersError.value) {
      showToast(filtersError.value, 'error')
      return
    }
    const label = syncStatus.value === 'ok'
      ? '已同步'
      : syncStatus.value === 'drift'
        ? '已刷新 · 配置与运行组不一致'
        : '已刷新 · 尚无 YAML'
    showToast(label, syncStatus.value === 'ok' ? 'success' : 'warning')
  } finally {
    syncing.value = false
  }
}

async function openFilterEditor(groupCode) {
  editingGroupCode.value = groupCode
  await loadProxyGroupFilters({ refresh: true })
  editingGroupConfig.value = getFilterForGroup(groupCode) || {
    filter: '',
    excludeFilter: '',
    use: [],
    type: 'select',
  }
  editorOpen.value = true
}

function closeFilterEditor() {
  editorOpen.value = false
  editingGroupCode.value = ''
  editingGroupConfig.value = null
}

async function onSaveFilter(payload) {
  const ok = await saveProxyGroupFilter(editingGroupCode.value, payload)
  if (ok) {
    closeFilterEditor()
    showToast('filter 已保存并应用到 Mihomo', 'success')
  } else {
    showToast(filtersError.value || '保存失败', 'error')
  }
}

onMounted(() => {
  void loadProxyGroupFilters()
})
</script>

<template>
  <div class="nodes-page">
    <header class="nodes-page__head panel-card panel-neutral section-card">
      <div class="nodes-page__head-row">
        <h1 class="page-title">WIFICALL节点选择</h1>
        <button
          type="button"
          class="ob-action-btn nodes-page__sync-btn"
          :disabled="syncBusy"
          title="从 Mihomo 刷新配置"
          @click="onSync"
        >
          <MIcon name="sync" size="sm" />
          {{ syncing ? '同步中…' : '同步' }}
        </button>
      </div>
      <div class="ob-info-badge ob-info-badge--ready nodes-page__desc">
        <span class="ob-info-badge__dot"></span>
        <span class="ob-info-badge__text">WiFi Calling · 各组独立选择 · 点击展开节点</span>
      </div>
    </header>

    <div v-if="filtersError" class="nodes-page__warn">{{ filtersError }}</div>
    <div v-else-if="filtersConfigWarning" class="nodes-page__warn nodes-page__warn--info">
      {{ filtersConfigWarning }}
    </div>

    <ProxySection
      section-id="wifi"
      title="WIFI 组"
      :subtitle="syncSubtitle"
      :subtitle-badge-class="syncSubtitleBadgeClass"
      :count="wifiGroups.length"
      :empty="!wifiGroups.length"
    >
      <InlineExpandGrid
        v-if="wifiGroups.length"
        :items="wifiGroups"
        item-key="code"
        :active-key="state.wifi.groupActive"
        :columns="2"
      >
        <template #card="{ item, expanded }">
          <CountryNodeCard
            variant="group"
            :code="item.region"
            :name="item.name"
            :effective-node="groupEffectiveNode(item.code)"
            :total="item.count"
            :available="item.online"
            :online-rate="groupOnlineRate(item)"
            :best-delay="item.bestDelay"
            selectable
            :editing="expanded"
            @click="toggleWifiGroup(item.code)"
          />
        </template>

        <template #expand="{ item }">
          <InlineDetailPanel
            :title="`编辑组 · ${item.name}`"
            :subtitle="expandSubtitle(item)"
          >
            <template #actions>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                :disabled="syncBusy"
                @click.stop="openFilterEditor(item.code)"
              >
                {{ filtersLoading && editingGroupCode === item.code ? '载入中…' : '编辑正则' }}
              </button>
            </template>

            <div v-if="membersForGroup(item).length" class="inline-detail-panel__grid">
              <CountryNodeCard
                v-for="node in membersForGroup(item)"
                :key="node.id"
                variant="node"
                compact
                flag-on-effective-only
                :code="nodeRegionCode(node)"
                :name="node.name"
                :total="1"
                :available="isNodeAvailable(node) ? 1 : 0"
                :online-rate="isNodeAvailable(node) ? 100 : 0"
                :best-delay="node.delay"
                selectable
                :active="isNodeSelected(node, item.code)"
                @click="selectWifiNode(item.code, node.name)"
              />
            </div>
            <div v-else class="empty-state">暂无可用节点</div>
          </InlineDetailPanel>
        </template>
      </InlineExpandGrid>
    </ProxySection>

    <ProxyGroupFilterEditor
      :open="editorOpen"
      :group-name="editingGroupName"
      :config="editingGroupConfig"
      :saving="filtersSaving"
      @close="closeFilterEditor"
      @save="onSaveFilter"
    />
  </div>
</template>

<style scoped>
.nodes-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.nodes-page__head {
  margin-bottom: 18px;
}

.nodes-page__head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.nodes-page__head .page-title {
  margin: 0;
}

.nodes-page__desc {
  margin-top: 10px;
  width: fit-content;
  max-width: 100%;
  flex: none;
}

.nodes-page__sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.nodes-page__warn {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(245, 166, 35, 0.12);
  color: var(--accent-warn, #f5a623);
  font-size: var(--fs-sm, 13px);
}

.nodes-page__warn--info {
  background: rgba(100, 149, 237, 0.12);
  color: var(--accent-info, #8eb5ff);
}

.btn-sm {
  min-height: 32px;
  padding: 0 12px;
  font-size: 12px;
}
</style>

<script setup>
import { computed, ref } from 'vue'
import RuleBlockSection from '../components/RuleBlockSection.vue'
import RuleGroupEditor from '../components/RuleGroupEditor.vue'
import { useRulesPageView } from '../composables/useRulesPageView'
import { useAppStore } from '../stores/app'

const { showToast } = useAppStore()
const {
  blocks,
  overflow,
  configYaml,
  loading,
  saving,
  error,
  configWarning,
  syncStatus,
  syncHint,
  storageUpdatedLabel,
  stats,
  hasLocalEdits,
  refresh,
  saveGroupYaml,
  fullSyncRules,
} = useRulesPageView()

const editorOpen = ref(false)
const editorTarget = ref(null)

const overflowBlock = computed(() => {
  if (!overflow.value.length) return null
  return {
    id: 'block-overflow',
    name: '未映射规则',
    groups: [{
      id: 'group-overflow',
      name: 'API 溢出',
      rules: overflow.value,
    }],
  }
})

const syncBadgeClass = computed(() => ({
  'ob-info-badge--ready': syncStatus.value === 'ok',
  'ob-info-badge--warn': syncStatus.value === 'drift',
  'ob-info-badge--neutral': syncStatus.value === 'missing',
}))

const syncStatusLabel = computed(() => {
  if (syncStatus.value === 'ok') return '已同步'
  if (syncStatus.value === 'drift') return '不一致'
  return '未导入'
})

function openEditor({ block, group }) {
  editorTarget.value = { block, group }
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  editorTarget.value = null
}

async function onSaveEditor(yamlText) {
  const group = editorTarget.value?.group
  if (!group) return

  const ok = await saveGroupYaml(group.id, yamlText)
  if (!ok) {
    showToast(error.value || '保存失败：未找到目标 Group', 'error')
    return
  }

  showToast(`「${group.name}」规则已保存并应用到 Mihomo`, 'success')
  closeEditor()
}

async function onSync() {
  if (loading.value || saving.value) return

  const ok = await fullSyncRules()
  if (!ok) {
    showToast(error.value || '规则同步失败', 'error')
    return
  }

  showToast(
    syncStatus.value === 'ok'
      ? '规则已写入 Storage 并应用到 Mihomo'
      : (syncHint.value || '同步完成，但仍有差异'),
    syncStatus.value === 'ok' ? 'success' : 'warning',
  )
}

async function onRefresh() {
  if (loading.value || saving.value) return
  await refresh({ reloadYaml: true })
  if (error.value) {
    showToast(error.value, 'error')
    return
  }
  showToast(
    syncStatus.value === 'ok'
      ? '已刷新，规则与 Storage 一致'
      : (syncHint.value || '已刷新'),
    syncStatus.value === 'ok' ? 'success' : 'warning',
  )
}

function toggleRule(rule) {
  rule.enabled = !rule.enabled
  showToast(`规则「${rule.name}」已${rule.enabled ? '启用' : '禁用'}`, 'info')
}

function editRule(rule) {
  showToast(`编辑规则「${rule.name}」请使用 Group 批量编辑`, 'info')
}

function copyRule(rule) {
  navigator.clipboard?.writeText(rule.raw || rule.name)
    .then(() => showToast(`已复制「${rule.name}」`, 'success'))
    .catch(() => showToast(`已复制规则「${rule.name}」`, 'success'))
}

function deleteRule(rule) {
  showToast(`删除规则「${rule.name}」请使用 Group 批量编辑`, 'warning')
}

function onAddRule(group) {
  const block = blocks.value.find((b) => b.groups.some((g) => g.id === group.id))
  if (block) {
    openEditor({ block, group })
    return
  }
  if (overflowBlock.value?.groups.some((g) => g.id === group.id)) {
    openEditor({ block: overflowBlock.value, group })
    return
  }
  showToast('请通过 Group 编辑添加规则', 'info')
}
</script>

<template>
  <div class="rules-page">
    <section class="rules-page__module panel-card panel-neutral section-card">
      <div class="rules-page-head">
        <h1 class="page-title">规则</h1>
        <div class="rules-meta">
          <button
            type="button"
            class="ob-action-btn rules-page__sync-btn"
            :disabled="loading || saving"
            @click="onSync"
          >
            {{ saving ? '同步中…' : '同步' }}
          </button>
          <button
            type="button"
            class="ob-action-btn"
            :disabled="loading || saving"
            @click="onRefresh"
          >
            {{ loading ? '加载中…' : '刷新' }}
          </button>
        </div>
      </div>

      <div class="ob-info-stack rules-page__info-stack">
        <div
          v-if="configYaml || syncHint"
          class="ob-info-badge rules-page__sync-meta"
          :class="syncBadgeClass"
        >
          <span class="ob-info-badge__dot"></span>
          <span class="ob-info-badge__text">
            {{ syncStatusLabel }} · Storage {{ storageUpdatedLabel() }}<template v-if="syncHint"> · {{ syncHint }}</template>
          </span>
        </div>
        <div v-if="hasLocalEdits" class="ob-info-badge ob-info-badge--warn rules-page__local-badge">
          <span class="ob-info-badge__dot"></span>
          <span class="ob-info-badge__text">本地已编辑</span>
        </div>
        <div v-if="!loading && !error" class="ob-info-badge ob-info-badge--ready rules-meta__stat">
          <span class="ob-info-badge__dot"></span>
          <span class="ob-info-badge__text">API {{ stats.totalApi }} 条 · DSL 槽位 {{ stats.slotCount }} · 已映射 {{ stats.mappedCount }}</span>
        </div>
      </div>
    </section>

    <div v-if="configWarning" class="rules-alert rules-alert--warn">{{ configWarning }}</div>

    <div v-if="error" class="rules-alert">{{ error }}</div>

    <div class="section-block">
      <div class="section-header">
        <div class="section-icon orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
        </div>
        <div>
          <div class="section-title">例外设备</div>
          <div class="section-desc">指定 IP 或设备绕过代理规则</div>
        </div>
      </div>
      <div class="card empty-card panel-card panel-neutral">
        <div class="empty-state"><span>暂无例外设备</span></div>
      </div>
    </div>

    <div v-if="loading && !blocks.length" class="rules-loading">
      正在从 Mihomo API 加载规则…
    </div>

    <div v-else class="rules-tree">
      <RuleBlockSection
        v-for="block in blocks"
        :key="block.id"
        :block="block"
        @edit-group="openEditor"
        @toggle-rule="toggleRule"
        @edit-rule="editRule"
        @copy-rule="copyRule"
        @delete-rule="deleteRule"
        @add-rule="onAddRule"
      />

      <RuleBlockSection
        v-if="overflowBlock"
        :key="overflowBlock.id"
        :block="overflowBlock"
        :default-open="false"
        @edit-group="openEditor"
        @toggle-rule="toggleRule"
        @edit-rule="editRule"
        @copy-rule="copyRule"
        @delete-rule="deleteRule"
        @add-rule="onAddRule"
      />
    </div>

    <RuleGroupEditor
      :open="editorOpen"
      :block-name="editorTarget?.block?.name || ''"
      :group="editorTarget?.group || null"
      @close="closeEditor"
      @save="onSaveEditor"
    />
  </div>
</template>

<style scoped>
.rules-page__module {
  margin-bottom: 14px;
}

.rules-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.rules-page__info-stack {
  /* spacing via global .ob-info-stack rules */
}

.rules-page__sync-meta,
.rules-meta__stat,
.rules-page__local-badge {
  width: fit-content;
  max-width: 100%;
  flex: none;
}

.rules-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.rules-alert--warn {
  color: #fcd34d;
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.28);
}

.rules-alert,
.rules-loading {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
}

.rules-alert {
  color: #fca5a5;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
}

.rules-loading {
  color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.section-block { margin-bottom: 20px; }
.section-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.empty-card { padding: 0; }
.empty-card .empty-state { padding: 24px; }

.rules-tree {
  display: flex;
  flex-direction: column;
  gap: var(--space-grid, 12px);
}
</style>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SubscriptionProviderAddCard from '../components/subscriptions/SubscriptionProviderAddCard.vue'
import SubscriptionProviderCard from '../components/subscriptions/SubscriptionProviderCard.vue'
import SubscriptionProviderEditor from '../components/subscriptions/SubscriptionProviderEditor.vue'
import { useSubscriptionsPageView } from '../composables/useSubscriptionsPageView'
import { useAppStore } from '../stores/app'
import { clashBackendLabel } from '../stores/clashBackend'
import { mihomoSyncState } from '../stores/mihomoSync'
import { defaultProviderConfig } from '../utils/subscriptionConfig'

const { showToast, refreshSubscription, runFullStackSpeedTest, state } = useAppStore()

const {
  items,
  configPath,
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
} = useSubscriptionsPageView()

const configPathLabel = computed(() => {
  const raw = String(configPath.value || '').trim()
  if (raw.startsWith('remote:')) {
    const source = raw.slice('remote:'.length) || 'yaml'
    return `${clashBackendLabel.value} · ${source}`
  }
  if (!raw) return `${clashBackendLabel.value} · 远程 YAML`
  const parts = raw.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || raw
})

const editorOpen = ref(false)
const editorCreating = ref(false)
const editorTarget = ref(null)
const refreshingProvider = ref('')

const existingNames = computed(() => items.value.map((item) => item.name))

function openEditor(name) {
  const item = getProvider(name)
  if (!item) return
  editorCreating.value = false
  editorTarget.value = item
  editorOpen.value = true
}

function openAddEditor() {
  editorCreating.value = true
  editorTarget.value = {
    name: '',
    config: defaultProviderConfig(),
  }
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  editorCreating.value = false
  editorTarget.value = null
}

async function onSaveEditor({ name, config }) {
  if (!name) return

  const ok = await saveProvider(name, config)
  if (!ok) {
    showToast(error.value || '保存失败', 'error')
    return
  }

  showToast(
    editorCreating.value ? `「${name}」已创建并写入 config.yaml` : `「${name}」已写入 config.yaml 并重载`,
    'success',
  )
  closeEditor()
}

async function onRefreshProvider(name) {
  refreshingProvider.value = name
  try {
    const ok = await refreshProvider(name)
    showToast(
      ok ? `「${name}」Provider 已刷新` : (error.value || '刷新失败'),
      ok ? 'success' : 'error',
    )
  } finally {
    refreshingProvider.value = ''
  }
}

async function onRefreshSubscriptions() {
  await refreshSubscription()
  await refresh()
}

function onFullStackSpeedTest() {
  runFullStackSpeedTest()
}

onMounted(refresh)
</script>

<template>
  <div class="subscriptions-page">
    <section class="subscriptions-page__head panel-card panel-neutral section-card">
      <div class="subscriptions-page__head-row">
        <div class="subscriptions-page__head-main">
          <h1 class="page-title">订阅配置</h1>
          <div
            class="ob-info-badge subscriptions-page__intro"
            :class="{
              'ob-info-badge--ready': mihomoSyncState.connected,
              'ob-info-badge--warn': !mihomoSyncState.connected,
            }"
            :title="configPath || 'config.yaml proxy-providers 段'"
          >
            <span class="ob-info-badge__dot"></span>
            <span class="ob-info-badge__text">
              {{ configPathLabel }} · {{ stats.total }} 源 · {{ stats.nodes }} 节点 ·
              API {{ mihomoSyncState.connected ? '已连接' : '离线' }}
              <template v-if="mihomoSyncState.lastSyncAt">
                · 同步 {{ new Date(mihomoSyncState.lastSyncAt).toLocaleTimeString('zh-CN', { hour12: false }) }}
              </template>
            </span>
          </div>
        </div>
        <div class="subscriptions-page__toolbar section-toolbar">
          <RouterLink to="/subscriptions" class="section-toolbar__link is-active">
            订阅配置
          </RouterLink>
          <button
            type="button"
            class="ob-action-btn section-toolbar__btn section-toolbar__btn--speed"
            :disabled="state.subscriptionSpeedTestRunning"
            @click="onFullStackSpeedTest"
          >
            {{ state.subscriptionSpeedTestRunning ? '测速中…' : '全栈测速' }}
          </button>
          <button
            type="button"
            class="ob-action-btn section-toolbar__btn"
            :disabled="loading || saving"
            @click="onRefreshSubscriptions"
          >
            {{ loading ? '加载中…' : '刷新订阅' }}
          </button>
        </div>
      </div>
    </section>

    <div v-if="error && !items.length" class="subscriptions-alert">{{ error }}</div>
    <div v-else-if="configWarning" class="subscriptions-warn">{{ configWarning }}</div>

    <div v-if="loading && !items.length" class="subscriptions-loading">
      正在加载 config.yaml 与 Mihomo Providers…
    </div>

    <div v-else class="subscriptions-grid">
      <SubscriptionProviderCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :refreshing="refreshingProvider === item.name"
        @edit="openEditor(item.name)"
        @refresh="onRefreshProvider(item.name)"
      />
      <SubscriptionProviderAddCard @add="openAddEditor" />
    </div>

    <div v-if="!loading && !items.length && !error" class="subscriptions-empty">
      暂无订阅源，点击添加框新建
    </div>

    <SubscriptionProviderEditor
      :open="editorOpen"
      :creating="editorCreating"
      :provider-name="editorTarget?.name || ''"
      :config="editorTarget?.config || null"
      :proxy-options="proxyOptions"
      :existing-names="existingNames"
      @close="closeEditor"
      @save="onSaveEditor"
    />
  </div>
</template>

<style scoped>
.subscriptions-page__head {
  margin-bottom: 14px;
}

.subscriptions-page__head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.subscriptions-page__head-main {
  min-width: 0;
}

.subscriptions-page__intro {
  margin-top: 10px;
  width: fit-content;
  max-width: 100%;
  flex: none;
}

.subscriptions-page__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.subscriptions-page__toolbar {
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.section-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.section-toolbar__link {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(96, 165, 250, 0.35);
  background: rgba(96, 165, 250, 0.08);
  color: #93c5fd;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.section-toolbar__link:hover {
  background: rgba(96, 165, 250, 0.14);
  border-color: rgba(96, 165, 250, 0.5);
}

.section-toolbar__link.is-active {
  color: #fff;
  background: rgba(96, 165, 250, 0.22);
  border-color: rgba(96, 165, 250, 0.45);
  pointer-events: none;
}

.section-toolbar__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.subscriptions-alert,
.subscriptions-warn,
.subscriptions-loading,
.subscriptions-empty {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
}

.subscriptions-alert {
  color: #fca5a5;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
}

.subscriptions-warn {
  color: #fcd34d;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.28);
}

.subscriptions-loading {
  color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.subscriptions-empty {
  text-align: center;
  color: var(--text-muted);
}

.subscriptions-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

@media (max-width: 1680px) {
  .subscriptions-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1320px) {
  .subscriptions-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .subscriptions-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .subscriptions-page__head-row {
    flex-direction: column;
  }
}
</style>

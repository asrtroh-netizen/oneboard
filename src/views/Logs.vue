<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAppStore } from '../stores/app'
import { connectLogs } from '../api/mihomo'

const { state, showToast } = useAppStore()

const activeTab = ref('panel')
const searchQuery = ref('')
const autoRefresh = ref(true)
const showLineNumbers = ref(true)
const memoryOnly = ref(false)
const refreshing = ref(false)
const mihomoConnected = ref(false)

const tabs = [
  { id: 'panel', label: 'OneBoard 日志', color: 'green' },
  { id: 'mihomo', label: 'Mihomo 错误日志', color: 'red' },
]

const currentLogs = computed(() => activeTab.value === 'panel' ? state.logs.panel : state.logs.mihomo)

const filteredLogs = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return currentLogs.value.filter((log) => !q || log.msg.toLowerCase().includes(q))
})

function levelLabel(level) {
  return { info: 'info', warning: 'warning', warn: 'warning', error: 'error', debug: 'debug', success: 'success' }[level] || level
}

function levelKind(level) {
  const label = levelLabel(level)
  if (label === 'error') return 'error'
  if (label === 'warning' || label === 'warn') return 'warn'
  if (label === 'success') return 'success'
  if (label === 'debug') return 'debug'
  return 'info'
}

function formatLogTime(time) {
  if (!time) return '—'
  return String(time).replace('T', ' ')
}

function clearLogs() {
  if (activeTab.value === 'panel') state.logs.panel.length = 0
  else state.logs.mihomo.length = 0
}

function nowISO() {
  return new Date().toISOString().slice(0, 19)
}

function pushPanelLog(level, msg) {
  state.logs.panel.unshift({ time: nowISO(), level, msg })
  if (state.logs.panel.length > 200) state.logs.panel.pop()
}

function pushMihomoLog(level, msg, time = '') {
  state.logs.mihomo.unshift({ time: time || nowISO(), level, msg })
  if (state.logs.mihomo.length > 500) state.logs.mihomo.pop()
}

let stopMihomoLogs = null

function stopMihomoStream() {
  if (stopMihomoLogs) {
    stopMihomoLogs()
    stopMihomoLogs = null
  }
  mihomoConnected.value = false
}

function startMihomoStream() {
  if (stopMihomoLogs) return
  stopMihomoLogs = connectLogs(
    (frame) => {
      const msg = String(frame?.message || '').trim()
      if (!msg) return
      pushMihomoLog(frame?.level || 'info', msg, frame?.time || '')
    },
    ({ connected }) => {
      const changed = mihomoConnected.value !== connected
      mihomoConnected.value = connected
      if (!changed) return
      if (connected) {
        pushPanelLog('success', 'Mihomo 日志流已连接')
      } else {
        pushPanelLog('warning', 'Mihomo 日志流已断开，正在自动重连')
      }
    },
    { level: 'debug' },
  )
}

async function onRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    if (activeTab.value === 'mihomo') {
      stopMihomoStream()
      startMihomoStream()
      showToast('Mihomo 日志连接已刷新', 'success')
    } else {
      pushPanelLog('info', '日志面板已手动刷新')
      showToast('日志面板已刷新', 'success')
    }
  } finally {
    refreshing.value = false
  }
}

watch(autoRefresh, (enabled) => {
  if (enabled) startMihomoStream()
  else stopMihomoStream()
})

onMounted(() => {
  if (autoRefresh.value) startMihomoStream()
})

onUnmounted(() => {
  stopMihomoStream()
})
</script>

<template>
  <div class="logs-page">
    <h1 class="page-title">日志</h1>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id, [tab.color]: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-dot" :class="tab.color"></span>
        {{ tab.label }}
      </button>
    </div>

    <div class="card control-card">
      <div class="search-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input v-model="searchQuery" placeholder="搜索日志内容..." />
      </div>
      <div class="control-row">
        <span class="refresh-hint">每 2 秒自动刷新</span>
        <div class="toggles">
          <label class="toggle-item"><input v-model="memoryOnly" type="checkbox" /><span>仅内存</span></label>
          <label class="toggle-item active-toggle"><input v-model="autoRefresh" type="checkbox" /><span>自动刷新</span></label>
          <label class="toggle-item line-toggle"><input v-model="showLineNumbers" type="checkbox" /><span>行号</span></label>
        </div>
        <div class="control-actions">
          <button class="btn btn-ghost" :disabled="refreshing" @click="onRefresh">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/></svg>
            {{ refreshing ? '刷新中…' : '刷新' }}
          </button>
          <button class="btn btn-danger" @click="clearLogs"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/></svg>清空</button>
        </div>
      </div>
    </div>

    <section class="glass-log-console" aria-label="日志面板">
      <header class="glass-log-console__head">
        <div class="glass-log-console__title-wrap">
          <span class="glass-log-console__dot"></span>
          <span class="glass-log-console__title">日志流</span>
        </div>
        <span class="glass-log-console__count">{{ filteredLogs.length }} 条</span>
      </header>

      <div class="glass-log-console__body">
        <div v-if="!filteredLogs.length" class="glass-log-console__empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h16M4 12h10M4 18h7"/></svg>
          <span>暂无日志</span>
        </div>

        <article
          v-for="(log, i) in filteredLogs"
          :key="`${log.time}-${i}-${log.msg}`"
          class="log-entry"
          :class="[
            `log-entry--${levelKind(log.level)}`,
            { 'log-entry--numbered': showLineNumbers },
          ]"
        >
          <span class="log-entry__stripe" aria-hidden="true"></span>

          <span class="log-entry__icon" aria-hidden="true">
            <svg v-if="levelKind(log.level) === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            <svg v-else-if="levelKind(log.level) === 'warn'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            <svg v-else-if="levelKind(log.level) === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
            <svg v-else-if="levelKind(log.level) === 'debug'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4M12 16h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          </span>

          <span v-if="showLineNumbers" class="log-entry__line">{{ i + 1 }}</span>

          <div class="log-entry__main">
            <p class="log-entry__msg">{{ log.msg }}</p>
            <span class="log-entry__level">{{ levelLabel(log.level) }}</span>
          </div>

          <time class="log-entry__time" :datetime="log.time">{{ formatLogTime(log.time) }}</time>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  font-size: var(--fs-base);
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}
.tab-btn.active { color: var(--text-primary); border-color: var(--border-field); }
.tab-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-disabled); }
.tab-dot.green { background: var(--green); }
.tab-dot.red { background: var(--danger); }
.tab-btn.active.green { border-color: rgba(82,196,26,0.3); }
.tab-btn.active.red { border-color: rgba(255,77,79,0.3); }

.control-card { padding: 16px; margin-bottom: 12px; }
.search-row {
  display: flex; align-items: center; gap: 10px;
  padding: 0 12px; height: 38px;
  background: var(--bg-input); border: 1px solid var(--border-field);
  border-radius: var(--radius-sm); margin-bottom: 12px;
}
.search-row svg { width: 16px; height: 16px; color: var(--text-muted); flex-shrink: 0; }
.search-row input { flex: 1; border: none; background: transparent; color: var(--text-primary); font-size: var(--fs-base); outline: none; }
.control-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.refresh-hint { font-size: var(--fs-sm); color: var(--text-muted); }
.toggles { display: flex; gap: 12px; flex-wrap: wrap; }
.toggle-item { display: flex; align-items: center; gap: 6px; font-size: var(--fs-sm); color: var(--text-muted); cursor: pointer; padding: 4px 10px; border-radius: 20px; background: var(--bg-input); border: 1px solid var(--border-subtle); }
.control-actions { margin-left: auto; display: flex; gap: 8px; }

.glass-log-console {
  --log-glass-bg: rgba(255, 255, 255, 0.06);
  --log-glass-border: rgba(255, 255, 255, 0.08);
  --log-entry-bg: transparent;
  --log-entry-bg-hover: rgba(255, 255, 255, 0.04);
  --log-info: #60a5fa;
  --log-success: #34d399;
  --log-warn: #fbbf24;
  --log-error: #f87171;
  --log-debug: #94a3b8;

  position: relative;
  overflow: hidden;
  background: var(--log-glass-bg);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid var(--log-glass-border);
  border-radius: 16px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.12);
}

.glass-log-console__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--log-glass-border);
}

.glass-log-console__title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.glass-log-console__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--log-info);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.18);
}

.glass-log-console__title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--text-primary);
}

.glass-log-console__count {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--log-glass-border);
}

.glass-log-console__body {
  min-height: 400px;
  max-height: calc(100vh - 320px);
  overflow-y: auto;
  padding: 8px;
}

.glass-log-console__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 320px;
  color: var(--text-muted);
  font-size: var(--fs-sm);
}

.glass-log-console__empty svg {
  width: 36px;
  height: 36px;
  opacity: 0.45;
}

.log-entry {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
  padding: 10px 12px 10px 14px;
  margin-bottom: 4px;
  border-radius: 12px;
  background: var(--log-entry-bg);
  transition: background 0.18s ease, box-shadow 0.18s ease;
}

.log-entry--numbered {
  grid-template-columns: auto auto minmax(0, 1fr) auto;
}

.log-entry:hover {
  background: var(--log-entry-bg-hover);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.log-entry__stripe {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: var(--log-info);
  opacity: 0.85;
}

.log-entry--success .log-entry__stripe { background: var(--log-success); }
.log-entry--warn .log-entry__stripe { background: var(--log-warn); }
.log-entry--error .log-entry__stripe { background: var(--log-error); }
.log-entry--debug .log-entry__stripe { background: var(--log-debug); }

.log-entry__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 8px;
  flex-shrink: 0;
  color: var(--log-info);
  background: rgba(96, 165, 250, 0.12);
}

.log-entry__icon svg {
  width: 14px;
  height: 14px;
}

.log-entry--success .log-entry__icon {
  color: var(--log-success);
  background: rgba(52, 211, 153, 0.12);
}

.log-entry--warn .log-entry__icon {
  color: var(--log-warn);
  background: rgba(251, 191, 36, 0.14);
}

.log-entry--error .log-entry__icon {
  color: var(--log-error);
  background: rgba(248, 113, 113, 0.14);
}

.log-entry--debug .log-entry__icon {
  color: var(--log-debug);
  background: rgba(148, 163, 184, 0.14);
}

.log-entry__line {
  min-width: 24px;
  margin-top: 3px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  text-align: right;
  color: var(--text-disabled);
  user-select: none;
}

.log-entry__main {
  min-width: 0;
}

.log-entry__msg {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-primary);
  word-break: break-word;
}

.log-entry__level {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--log-info);
  background: rgba(96, 165, 250, 0.1);
}

.log-entry--success .log-entry__level {
  color: var(--log-success);
  background: rgba(52, 211, 153, 0.1);
}

.log-entry--warn .log-entry__level {
  color: var(--log-warn);
  background: rgba(251, 191, 36, 0.12);
}

.log-entry--error .log-entry__level {
  color: var(--log-error);
  background: rgba(248, 113, 113, 0.12);
}

.log-entry--debug .log-entry__level {
  color: var(--log-debug);
  background: rgba(148, 163, 184, 0.12);
}

.log-entry__time {
  flex-shrink: 0;
  margin-top: 2px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  opacity: 0.72;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .log-entry {
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto;
  }

  .log-entry__line {
    display: none;
  }

  .log-entry__time {
    grid-column: 2;
    margin-top: 0;
  }
}
</style>

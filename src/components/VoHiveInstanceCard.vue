<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import SoftLabelCard from './SoftLabelCard.vue'
import RuntimeStatusDetails from './RuntimeStatusDetails.vue'
import VoHiveOverviewPolicyCard from './VoHiveOverviewPolicyCard.vue'
import { useVoHiveInstance } from '../composables/useVoHiveInstance'
import { updateInstance, getActiveInstanceId } from '../stores/vohiveInstances'
import { useAppStore } from '../stores/app'
import { maskSecret } from '../utils/vohiveDevice'

const props = defineProps({
  instance: { type: Object, required: true },
})
const emit = defineEmits(['remove'])

const { showToast } = useAppStore()

const {
  upstream,
  configured,
  connected,
  meta,
  loading,
  loggingIn,
  deviceAction,
  esimSwitching,
  atSending,
  devices,
  overviews,
  esimProfiles,
  cardPolicy,
  policyIccid,
  policyLoading,
  policySaving,
  onlineCount,
  offlineCount,
  selectedDevice,
  selectedOverview,
  lastUpdated,
  start,
  refresh,
  selectDevice,
  loginInstance,
  applyConfig,
  switchEsim,
  reconnectVowifi,
  rebootModule,
  sendAtCommand,
  patchCardPolicy,
} = useVoHiveInstance(props.instance)

const draftLabel = ref(props.instance.label)
const draftHost = ref(props.instance.host)
const draftPort = ref(
  props.instance.port != null && props.instance.port !== ''
    ? String(props.instance.port)
    : '',
)

const isActiveBackend = computed(() => getActiveInstanceId() === props.instance.id)
const draftUsername = ref(props.instance.username || '')
const draftPassword = ref('')
const atCommand = ref('')

const deviceGridRef = ref(null)
const collapsed = computed({
  get: () => Boolean(props.instance.collapsed),
  set: (value) => updateInstance(props.instance.id, { collapsed: Boolean(value) }),
})

const actionBusy = computed(
  () => Boolean(deviceAction.value || esimSwitching.value || atSending.value || policySaving.value),
)
const applying = computed(() => loading.value || meta.hydrating)
const statusLabel = computed(() => {
  if (applying.value || loggingIn.value) return '连接中'
  if (connected.value) return '已连接'
  if (meta.lastError) return '连接失败'
  if (!String(props.instance.host || '').trim()) return '未配置'
  if (!configured.value) return '未登录'
  return '离线'
})

const statusPillOffline = computed(
  () => !applying.value && !loggingIn.value && !connected.value,
)

function toggleCollapsed() {
  collapsed.value = !collapsed.value
}

function formatRefreshTime(date) {
  if (!date) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
function deviceOverview(device) {
  return overviews.value[device.id] || null
}
function wificallTag(device) {
  const overview = deviceOverview(device)
  if (overview?.wificallReady) return '全部就绪'
  if (overview?.wificallLabel && overview.wificallLabel !== '—') {
    const label = overview.wificallLabel.replace(/^WiFi-Calling\s*·?\s*/i, '').trim()
    if (/全部就绪|ready/i.test(label)) return '全部就绪'
    return label || 'Wi-Fi Calling'
  }
  return 'Wi-Fi Calling'
}
function formatPublicIp(value) {
  const text = String(value || '').trim()
  if (!text || text === '—') return '--'
  return text
}
function scrollDeviceRowNext() {
  deviceGridRef.value?.scrollBy({ left: 196, behavior: 'smooth' })
}
function yesNo(value) {
  if (value == null) return '—'
  return value ? '是' : '否'
}
function isDeviceSelected(device) {
  return selectedDevice.value?.id === device.id
}
function esimBadgeClass(profile) {
  if (profile.active) return 'current'
  if (/启用|enabled/i.test(profile.stateText || '')) return 'enabled'
  if (/禁用|disabled/i.test(profile.stateText || '')) return 'disabled'
  return ''
}

watch(draftLabel, (value) => updateInstance(props.instance.id, { label: value.trim() || 'VoHive' }))

async function onLogin() {
  if (!draftHost.value.trim()) {
    showToast('请先填写 VoHive 主机或 URL', 'warning')
    return
  }
  updateInstance(props.instance.id, { host: draftHost.value.trim(), port: draftPort.value })
  const ok = await loginInstance(draftUsername.value, draftPassword.value)
  if (ok) {
    draftUsername.value = props.instance.username
    draftPassword.value = ''
    showToast(`已登录 ${upstream.value}`, 'success')
  } else if (meta.lastError) {
    showToast(meta.lastError, 'error')
  }
}

async function onApply() {
  if (!draftHost.value.trim()) {
    showToast('请先填写 VoHive 主机或 URL', 'warning')
    return
  }
  await applyConfig({ host: draftHost.value.trim(), port: draftPort.value })
  if (meta.lastError) showToast(meta.lastError, 'error')
  else showToast(`已连接 ${upstream.value}`, 'success')
}

async function onRefresh() {
  await refresh({ silent: false })
  if (meta.lastError) showToast(meta.lastError, 'error')
}

function onRemove() {
  if (!window.confirm(`确定删除「${props.instance.label}」容器？`)) return
  emit('remove', props.instance.id)
}

async function onSendAt() {
  const text = atCommand.value.trim()
  if (!text) return
  const ok = await sendAtCommand(text)
  if (ok) {
    showToast('AT 指令已发送', 'success')
    atCommand.value = ''
  } else if (meta.lastError) {
    showToast(meta.lastError, 'error')
  }
}

async function onSwitchEsim(profile) {
  if (profile.active || esimSwitching.value) return
  const ok = await switchEsim(profile.iccid)
  if (ok) showToast(`已切换至「${profile.name}」`, 'success')
  else if (meta.lastError) showToast(meta.lastError, 'error')
}

async function onReconnectVowifi() {
  if (!selectedDevice.value || actionBusy.value) return
  const ok = await reconnectVowifi()
  if (ok) showToast('VoWiFi 重连指令已发送', 'success')
  else if (meta.lastError) showToast(meta.lastError, 'error')
}

async function onRebootModule() {
  if (!selectedDevice.value || actionBusy.value) return
  const name = selectedDevice.value.name || selectedDevice.value.id
  if (!window.confirm(`确定重启模组「${name}」？设备将短暂离线。`)) return
  const ok = await rebootModule()
  if (ok) showToast('模组重启指令已发送', 'success')
  else if (meta.lastError) showToast(meta.lastError, 'error')
}

async function onPatchCardPolicy(patch) {
  const ok = await patchCardPolicy(patch)
  if (ok) showToast('卡策略已更新', 'success')
  else if (meta.lastError) showToast(meta.lastError, 'error')
}

onMounted(() => start())
</script>

<template>
  <article class="vohive-instance glass-frame" :class="{ 'is-collapsed': collapsed, 'is-active-backend': isActiveBackend }">
    <!-- 横向配置 + 操作头 -->
    <header class="vhi-head">
      <div class="vhi-head__row vhi-head__row--top">
        <div class="vhi-title">
          <button
            type="button"
            class="vhi-collapse-btn"
            :aria-expanded="!collapsed"
            :aria-label="collapsed ? '展开容器' : '折叠容器'"
            @click="toggleCollapsed"
          >
            <span class="vhi-collapse-btn__icon" :class="{ 'is-open': !collapsed }">
              <MIcon name="expand_more" size="sm" />
            </span>
          </button>
          <input v-model="draftLabel" class="vhi-title__input" type="text" aria-label="容器名称" />
          <span class="status-pill" :class="{ offline: statusPillOffline }">
            <span class="dot" aria-hidden="true"></span>
            {{ statusLabel }}
          </span>
          <span v-if="isActiveBackend" class="vhi-active-badge">当前后端</span>
          <span v-if="draftHost.trim() && !collapsed" class="vhi-title__upstream">{{ upstream }}</span>
        </div>

        <div v-show="!collapsed" class="vhi-head__actions">
          <input
            v-model="atCommand"
            type="text"
            class="vohive-at-input"
            placeholder="AT 指令"
            :disabled="!selectedDevice || atSending"
            @keyup.enter="onSendAt"
          />
          <button type="button" class="vhi-btn" :disabled="loading || meta.hydrating" @click="onRefresh">
            <MIcon name="sync" size="sm" />
            {{ loading || meta.hydrating ? '刷新中…' : '刷新' }}
          </button>
          <button type="button" class="vhi-btn vhi-btn--danger" @click="onRemove">
            <MIcon name="delete" size="sm" />
            删除
          </button>
        </div>
      </div>

      <div v-show="!collapsed" class="vhi-head__row vhi-head__row--config">
        <label class="vhi-field">
          <span>主机 / URL</span>
          <input
            v-model="draftHost"
            type="text"
            placeholder="192.168.1.10 或 https://vohive.example.com"
            @keyup.enter="onApply"
          />
        </label>
        <label class="vhi-field vhi-field--port">
          <span>端口（可选）</span>
          <input
            v-model="draftPort"
            type="text"
            inputmode="numeric"
            placeholder="7575，反代域名可留空"
          />
        </label>
        <label class="vhi-field">
          <span>用户名</span>
          <input v-model="draftUsername" type="text" autocomplete="off" placeholder="VoHive 账号" />
        </label>
        <label class="vhi-field">
          <span>密码</span>
          <input
            v-model="draftPassword"
            type="password"
            autocomplete="off"
            placeholder="登录密码"
            @keyup.enter="onLogin"
          />
        </label>
        <button type="button" class="vhi-btn vhi-btn--login" :disabled="loggingIn || applying" @click="onLogin">
          <MIcon name="login" size="sm" />
          {{ loggingIn ? '登录中…' : '登录' }}
        </button>
        <button type="button" class="vhi-btn vhi-btn--primary" :disabled="applying" @click="onApply">
          <MIcon name="link" size="sm" />
          {{ applying ? '连接中…' : '保存并连接' }}
        </button>
      </div>
    </header>

    <!-- 设备展示体 -->
    <section v-show="!collapsed" class="vohive-console vhi-body">
      <div v-if="!configured" class="vohive-empty-hint">
        请填写主机并 <strong>登录</strong> 后同步设备状态
      </div>

      <template v-else>
        <div v-if="meta.lastError && !meta.streamWarning" class="vohive-region-warn">{{ meta.lastError }}</div>
        <div v-else-if="meta.streamWarning" class="vohive-region-warn vohive-region-warn--soft">{{ meta.streamWarning }}</div>

        <div class="metric-row">
          <div class="metric-card glass-frame metric-card--blue">
            <div class="metric-card__icon"><MIcon name="devices" size="md" /></div>
            <div class="metric-card__body">
              <div class="metric-card__label">设备总数</div>
              <div class="metric-card__value">{{ devices.length }}</div>
              <div class="metric-card__sub">已注册模组</div>
            </div>
          </div>
          <div class="metric-card glass-frame metric-card--green">
            <div class="metric-card__icon"><MIcon name="monitor_heart" size="md" /></div>
            <div class="metric-card__body">
              <div class="metric-card__label">在线设备</div>
              <div class="metric-card__value">{{ onlineCount }}</div>
              <div class="metric-card__sub">控制面板在线</div>
            </div>
          </div>
          <div class="metric-card glass-frame metric-card--purple">
            <div class="metric-card__icon"><MIcon name="wifi_off" size="md" /></div>
            <div class="metric-card__body">
              <div class="metric-card__label">离线设备</div>
              <div class="metric-card__value">{{ offlineCount }}</div>
              <div class="metric-card__sub">暂无设备离线</div>
            </div>
          </div>
          <div class="metric-card glass-frame metric-card--amber">
            <div class="metric-card__icon"><MIcon name="update" size="md" /></div>
            <div class="metric-card__body">
              <div class="metric-card__label">最近刷新</div>
              <div class="metric-card__value">{{ connected ? '自动轮询' : '—' }}</div>
              <div class="metric-card__sub">上次 {{ formatRefreshTime(lastUpdated) }}</div>
            </div>
          </div>
        </div>

        <div v-if="devices.length" class="device-scroll-wrap">
          <div ref="deviceGridRef" class="device-grid">
            <button
              v-for="device in devices"
              :key="device.id"
              type="button"
              class="device-card"
              :class="{ 'is-active': isDeviceSelected(device), 'is-glow-green': isDeviceSelected(device) }"
              @click="selectDevice(device.id)"
            >
              <div class="device-card__lens" aria-hidden="true"></div>
              <div class="device-card__head">
                <div class="device-card__title">
                  <span class="device-card__icon"><MIcon name="smartphone" size="sm" /></span>
                  <span class="device-card__name">{{ device.name || device.id }}</span>
                </div>
                <span class="device-card__status" :class="{ online: device.online }">
                  <span class="status-dot"></span>{{ device.online ? '在线' : '离线' }}
                </span>
              </div>
              <div class="device-card__tag overview-badge ready">
                <span class="overview-badge__dot"></span>
                {{ wificallTag(device) }}
              </div>
              <div class="device-card__ip">
                <span class="device-card__ip-label"># 公网 IP</span>
                <span class="device-card__ip-value">{{ formatPublicIp(device.publicIp) }}</span>
              </div>
            </button>
          </div>
          <button type="button" class="device-scroll-btn" aria-label="向右滚动" @click="scrollDeviceRowNext">
            <MIcon name="chevron_right" />
          </button>
        </div>

        <div v-else-if="!meta.lastError" class="vohive-empty-hint">暂无设备</div>

        <div v-if="selectedDevice && selectedOverview" class="overview-grid">
          <div class="overview-card overview-card--runtime glass-frame">
            <div class="panel-title-row panel-title-row--runtime">
              <span class="panel-title-icon panel-title-icon--teal"><MIcon name="insights" size="sm" /></span>
              <h3 class="overview-card__title">运行状态</h3>
              <div class="runtime-actions">
                <button type="button" class="runtime-action-btn glass-frame glass-frame--compact glass-frame--pill" :disabled="actionBusy" @click="onReconnectVowifi">
                  <MIcon name="sync" size="sm" />
                  {{ deviceAction === 'vowifi-reconnect' ? '重连中…' : '重连 VoWiFi' }}
                </button>
              </div>
            </div>
            <div class="runtime-status-center">
              <div class="runtime-status-block">
                <div class="runtime-status-hero">
                  <div class="overview-badge overview-badge--hero glass-frame glass-frame--compact glass-frame--pill" :class="{ 'glass-frame--tone-green': selectedOverview.wificallReady }">
                    <span class="overview-badge__dot"></span>
                    {{ selectedOverview.wificallLabel }}
                  </div>
                </div>
                <div class="stage-row" :style="{ '--stage-cols': selectedOverview.stages.length }">
                  <div v-for="stage in selectedOverview.stages" :key="stage.key" class="stage-item">
                    <div class="stage-bar" :class="{ ready: stage.ready }"></div>
                    <span class="stage-label">{{ stage.label }}</span>
                  </div>
                </div>
              </div>
            </div>
            <RuntimeStatusDetails
              :data-plane="selectedOverview.dataPlane"
              :last-reason="selectedOverview.lastReason"
              :error-category="selectedOverview.errorCategory"
            />
          </div>

          <div class="overview-card overview-card--sim glass-frame">
            <div class="panel-title-row panel-title-row--sim">
              <span class="panel-title-icon panel-title-icon--purple"><MIcon name="sim_card" size="sm" /></span>
              <h3 class="overview-card__title">SIM / 设备</h3>
              <div class="runtime-actions">
                <button type="button" class="runtime-action-btn glass-frame glass-frame--compact glass-frame--pill" :disabled="actionBusy" @click="onRebootModule">
                  <MIcon name="power_settings_new" size="sm" />
                  {{ deviceAction === 'reboot' ? '重启中…' : '重启模组' }}
                </button>
              </div>
            </div>
            <div class="carrier-banner">
              <div class="sim-visual" aria-hidden="true">
                <div class="sim-visual__glow"></div>
                <div class="sim-visual__chip">
                  <span class="sim-visual__corner"></span>
                  <span class="sim-visual__lines"></span>
                </div>
              </div>
            </div>
            <div class="soft-label-grid kv-list">
              <SoftLabelCard title="IMEI" :value="maskSecret(selectedOverview.imei)" mono />
              <SoftLabelCard title="ICCID" :value="maskSecret(selectedOverview.iccid)" mono />
              <SoftLabelCard title="IMSI" :value="maskSecret(selectedOverview.imsi)" mono />
              <SoftLabelCard title="本机号码" :value="maskSecret(selectedOverview.phone)" mono />
              <SoftLabelCard title="当前 eSIM" :value="selectedOverview.esimProfile" />
              <SoftLabelCard title="原运营商" :value="selectedOverview.operator" />
              <SoftLabelCard title="固件版本" :value="selectedOverview.firmware" mono />
              <SoftLabelCard title="飞行模式">
                <span>
                  {{ yesNo(selectedOverview.flightMode) }}
                  <em v-if="selectedOverview.vowifiActive"> · VoWiFi 接管中</em>
                </span>
              </SoftLabelCard>
              <SoftLabelCard title="运行模式" :value="selectedOverview.runningMode" />
            </div>
          </div>

          <div class="overview-card overview-card--esim glass-frame">
            <div class="panel-title-row panel-title-row--esim">
              <span class="panel-title-icon panel-title-icon--amber"><MIcon name="swap_horiz" size="sm" /></span>
              <h3 class="overview-card__title">切卡</h3>
            </div>
            <div v-if="!esimProfiles.length" class="vohive-panel-empty">暂无 eSIM 配置</div>
            <div v-else class="esim-list">
              <button
                v-for="profile in esimProfiles"
                :key="profile.iccid"
                type="button"
                class="esim-item glass-frame glass-frame--selectable"
                :class="{ 'is-active': profile.active, 'is-glow-green': profile.active, 'is-switching': esimSwitching === profile.iccid }"
                :disabled="profile.active || Boolean(esimSwitching)"
                @click="onSwitchEsim(profile)"
              >
                <div class="esim-item__head">
                  <span class="esim-item__name">{{ profile.name }}</span>
                  <span v-if="profile.active" class="esim-item__badges">
                    <span class="esim-item__badge current">当前</span>
                    <span class="esim-item__badge enabled">已启用</span>
                  </span>
                  <span v-else-if="esimSwitching === profile.iccid" class="esim-item__badge pending">切换中</span>
                  <span v-else class="esim-item__badge" :class="esimBadgeClass(profile)">{{ profile.stateText }}</span>
                </div>
                <div class="esim-item__provider">{{ profile.provider }}</div>
                <div class="esim-item__meta"><span class="mono">{{ maskSecret(profile.iccid) }}</span></div>
              </button>
            </div>
          </div>

          <VoHiveOverviewPolicyCard
            :iccid="policyIccid"
            :policy="cardPolicy"
            :loading="policyLoading"
            :saving="policySaving"
            @patch="onPatchCardPolicy"
          />
        </div>
      </template>
    </section>
  </article>
</template>

<style scoped>
.vohive-instance {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border-radius: 20px;
  transition: gap 0.22s ease, padding 0.22s ease;
}

.vohive-instance.is-collapsed {
  gap: 0;
  padding-bottom: 14px;
}

.vhi-head {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vhi-head__row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.vhi-head__row--top {
  justify-content: space-between;
}

.vhi-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.vhi-collapse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(148, 163, 184, 0.95);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.18s ease, color 0.18s ease;
}

.vhi-collapse-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.vhi-collapse-btn__icon {
  transition: transform 0.22s ease;
}

.vhi-collapse-btn__icon.is-open {
  transform: rotate(180deg);
}

.vhi-title__input {
  width: 120px;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 700;
  color: inherit;
  outline: none;
  border-bottom: 1px solid transparent;
}

.vhi-title__input:focus {
  border-bottom-color: rgba(148, 163, 184, 0.5);
}

.vhi-title .status-pill {
  flex-shrink: 0;
}

.vhi-title__upstream {
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: rgba(148, 163, 184, 0.85);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vhi-active-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #34d399;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.28);
}

.vohive-instance.is-active-backend {
  border-color: rgba(52, 211, 153, 0.28);
}

.vhi-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.vhi-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: rgba(148, 163, 184, 0.9);
}

.vhi-field--port {
  width: 84px;
}

.vhi-field input {
  width: 150px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  font-size: 13px;
  outline: none;
}

.vhi-field--port input {
  width: 100%;
}

.vhi-field input:focus {
  border-color: rgba(34, 197, 94, 0.5);
}

.vhi-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-end;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.15s ease;
}

.vhi-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.vhi-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.vhi-btn--primary {
  border-color: rgba(34, 197, 94, 0.45);
  background: rgba(34, 197, 94, 0.16);
  color: #22c55e;
}

.vhi-btn--login {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.14);
  color: #60a5fa;
}

.vhi-btn--danger {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
}

.vhi-body {
  margin: 0;
  padding: 0;
}

[data-theme='light'] .vhi-field input,
[data-theme='light'] .vhi-btn {
  background: rgba(15, 23, 42, 0.03);
  border-color: rgba(15, 23, 42, 0.12);
}
</style>

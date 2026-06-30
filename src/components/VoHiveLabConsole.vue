<script setup>
import { computed, ref } from 'vue'
import MIcon from './MIcon.vue'
import SoftLabelCard from './SoftLabelCard.vue'
import RuntimeStatusDetails from './RuntimeStatusDetails.vue'
import VoHiveOverviewPolicyCard from './VoHiveOverviewPolicyCard.vue'
import { useVoHiveDashboard } from '../composables/useVoHiveDashboard'
import { useAppStore } from '../stores/app'
import { maskSecret } from '../utils/vohiveDevice'

const {
  hostLabel,
  configured,
  connected,
  error,
  devices,
  overviews,
  esimProfiles,
  esimLoading,
  cardPolicy,
  policyIccid,
  policyLoading,
  policySaving,
  esimSwitching,
  deviceAction,
  atSending,
  selectedId,
  selectedDevice,
  selectedOverview,
  onlineCount,
  offlineCount,
  lastUpdated,
  loading,
  streamWarning,
  selectDevice,
  switchEsim,
  reconnectVowifi,
  rebootModule,
  sendAtCommand,
  refresh,
  patchCardPolicy,
} = useVoHiveDashboard()

const deviceGridRef = ref(null)
const { showToast } = useAppStore()
const atCommand = ref('')

const actionBusy = computed(
  () => Boolean(deviceAction.value || esimSwitching.value || atSending.value || policySaving.value),
)

const syncModeLabel = computed(() => (connected.value ? '自动轮询' : '—'))

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
  if (/wifi|calling|vowifi/i.test(device.statusText || '')) return 'Wi-Fi Calling'
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
  if (selectedId.value) return selectedId.value === device.id
  return selectedDevice.value?.id === device.id
}

function esimBadgeClass(profile) {
  if (profile.active) return 'current'
  if (/启用|enabled/i.test(profile.stateText || '')) return 'enabled'
  if (/禁用|disabled/i.test(profile.stateText || '')) return 'disabled'
  return ''
}

async function onRefresh() {
  await refresh({ silent: false })
  if (error.value) showToast(error.value, 'error')
}

async function onSendAt() {
  const text = atCommand.value.trim()
  if (!text) return
  const ok = await sendAtCommand(text)
  if (ok) {
    showToast('AT 指令已发送', 'success')
    atCommand.value = ''
    return
  }
  if (error.value) showToast(error.value, 'error')
}

async function onSwitchEsim(profile) {
  if (profile.active || esimSwitching.value) return
  const ok = await switchEsim(profile.iccid)
  if (ok) {
    showToast(`已切换至「${profile.name}」`, 'success')
  } else if (error.value) {
    showToast(error.value, 'error')
  }
}

async function onReconnectVowifi() {
  if (!selectedDevice.value || actionBusy.value) return
  const ok = await reconnectVowifi()
  if (ok) {
    showToast('VoWiFi 重连指令已发送', 'success')
    return
  }
  if (error.value) showToast(error.value, 'error')
}

async function onRebootModule() {
  if (!selectedDevice.value || actionBusy.value) return
  const name = selectedDevice.value.name || selectedDevice.value.id
  if (!window.confirm(`确定重启模组「${name}」？设备将短暂离线。`)) return
  const ok = await rebootModule()
  if (ok) {
    showToast('模组重启指令已发送', 'success')
    return
  }
  if (error.value) showToast(error.value, 'error')
}
async function onPatchCardPolicy(patch) {
  const ok = await patchCardPolicy(patch)
  if (ok) showToast('卡策略已更新', 'success')
  else if (error.value) showToast(error.value, 'error')
}
</script>

<template>
  <section class="vohive-lab-console vohive-console">
    <header class="vohive-head">
      <div class="vohive-head__main">
        <div
          v-if="configured"
          class="vohive-head__chip glass-frame glass-frame--compact"
          :class="{ 'is-glow-green': connected }"
        >
          <div class="vohive-chip__line vohive-chip__line--address">
            <span class="vohive-chip__icon" aria-hidden="true">
              <MIcon name="link" size="sm" />
            </span>
            <span class="vohive-chip__text vohive-chip__text--mono">{{ hostLabel }}</span>
            <span class="vohive-chip__status" :class="{ online: connected }">
              <span class="status-dot" aria-hidden="true"></span>
              {{ connected ? '在线' : '离线' }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="configured" class="vohive-head__actions">
        <input
          v-model="atCommand"
          type="text"
          class="vohive-at-input"
          placeholder="AT 指令"
          :disabled="!selectedDevice || atSending"
          @keyup.enter="onSendAt"
        />
        <button
          type="button"
          class="runtime-action-btn glass-frame glass-frame--compact glass-frame--pill"
          :disabled="loading"
          @click="onRefresh"
        >
          <MIcon name="sync" size="sm" />
          {{ loading ? '刷新中…' : '刷新' }}
        </button>
      </div>
    </header>

    <div v-if="!configured" class="vohive-empty-hint">
      请在 <strong>设置</strong> 页登录 VoHive，或配置 <code>VITE_VOHIVE_TOKEN</code> 后自动同步设备状态
    </div>

    <template v-else>
      <div v-if="error && !streamWarning" class="vohive-region-warn">{{ error }}</div>
      <div v-else-if="streamWarning" class="vohive-region-warn vohive-region-warn--soft">{{ streamWarning }}</div>

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
            <div class="metric-card__value">{{ syncModeLabel }}</div>
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
            :class="{
              'is-active': isDeviceSelected(device),
              'is-glow-green': isDeviceSelected(device),
            }"
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

        <button
          type="button"
          class="device-scroll-btn"
          aria-label="向右滚动"
          @click="scrollDeviceRowNext"
        >
          <MIcon name="chevron_right" />
        </button>
      </div>

      <div v-else-if="!error" class="vohive-empty-hint">暂无设备</div>

      <div v-if="selectedDevice && selectedOverview" class="overview-grid">
        <div class="overview-card overview-card--runtime glass-frame">
          <div class="panel-title-row panel-title-row--runtime">
            <span class="panel-title-icon panel-title-icon--teal">
              <MIcon name="insights" size="sm" />
            </span>
            <h3 class="overview-card__title">运行状态</h3>
            <div class="runtime-actions">
              <button
                type="button"
                class="runtime-action-btn glass-frame glass-frame--compact glass-frame--pill"
                :disabled="actionBusy"
                @click="onReconnectVowifi"
              >
                <MIcon name="sync" size="sm" />
                {{ deviceAction === 'vowifi-reconnect' ? '重连中…' : '重连 VoWiFi' }}
              </button>
            </div>
          </div>

          <div class="runtime-status-center">
            <div class="runtime-status-block">
              <div class="runtime-status-hero">
                <div
                  class="overview-badge overview-badge--hero glass-frame glass-frame--compact glass-frame--pill"
                  :class="{ 'glass-frame--tone-green': selectedOverview.wificallReady }"
                >
                  <span class="overview-badge__dot"></span>
                  {{ selectedOverview.wificallLabel }}
                </div>
              </div>

              <div class="stage-row" :style="{ '--stage-cols': selectedOverview.stages.length }">
                <div
                  v-for="stage in selectedOverview.stages"
                  :key="stage.key"
                  class="stage-item"
                >
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
            <span class="panel-title-icon panel-title-icon--purple">
              <MIcon name="sim_card" size="sm" />
            </span>
            <h3 class="overview-card__title">SIM / 设备</h3>
            <div class="runtime-actions">
              <button
                type="button"
                class="runtime-action-btn glass-frame glass-frame--compact glass-frame--pill"
                :disabled="actionBusy"
                @click="onRebootModule"
              >
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
            <span class="panel-title-icon panel-title-icon--amber">
              <MIcon name="swap_horiz" size="sm" />
            </span>
            <h3 class="overview-card__title">切卡</h3>
          </div>
          <div v-if="esimLoading" class="vohive-panel-empty">加载 eSIM 配置…</div>
          <div v-else-if="!esimProfiles.length" class="vohive-panel-empty">暂无 eSIM 配置</div>
          <div v-else class="esim-list">
            <button
              v-for="profile in esimProfiles"
              :key="profile.iccid"
              type="button"
              class="esim-item glass-frame glass-frame--selectable"
              :class="{
                'is-active': profile.active,
                'is-glow-green': profile.active,
                'is-switching': esimSwitching === profile.iccid,
              }"
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
                <span v-else class="esim-item__badge" :class="esimBadgeClass(profile)">
                  {{ profile.stateText }}
                </span>
              </div>
              <div class="esim-item__provider">{{ profile.provider }}</div>
              <div class="esim-item__meta">
                <span class="mono">{{ maskSecret(profile.iccid) }}</span>
              </div>
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
</template>

<style scoped>
.vohive-empty-hint,
.vohive-panel-empty {
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.vohive-region-warn {
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 12px;
  color: #fecaca;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.28);
}

.vohive-region-warn--soft {
  color: rgba(251, 191, 36, 0.92);
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.22);
}

.esim-item__badge.pending {
  color: #fde68a;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.22);
}
</style>

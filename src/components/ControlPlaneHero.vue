<script setup>
import { computed } from 'vue'
import { useAnimatedNumber, usePulseOnEvent } from '../composables/useControlPlaneMotion'
import { useAppStore } from '../stores/app'
import { ControlPlaneEvents, on } from '../stores/controlPlane/eventBus'
import { useControlPlaneState } from '../stores/controlPlane/controlPlaneState'
import { clashBackendProfile, getKernelDisplayName } from '../stores/clashBackend'

const { state, onlineCount } = useAppStore()
const { meta, systemStatus, mihomoStatus, mihomoSync, vohive } = useControlPlaneState()

const nodesDisplay = useAnimatedNumber(computed(() => onlineCount.value))
const vohiveOnlineDisplay = useAnimatedNumber(
  computed(() => vohive.devices.filter((d) => d.online).length),
)
const vohiveTotal = computed(() => vohive.devices.length)

const esimPercent = computed(() => {
  const devices = vohive.devices
  if (!devices.length) return 0
  const ready = devices.filter((d) => d.iccid && d.iccid !== '—').length
  return Math.round((ready / devices.length) * 100)
})

const esimDisplay = useAnimatedNumber(computed(() => esimPercent.value))
const esimPercentLabel = computed(() => `${Math.round(esimDisplay.value)}%`)

const mihomoPulse = usePulseOnEvent(ControlPlaneEvents.MIHOMO_SYNC, on)
const nodePulse = usePulseOnEvent(ControlPlaneEvents.MIHOMO_NODES, on)
const vohivePulse = usePulseOnEvent(ControlPlaneEvents.VOHIVE_DEVICE, on)

const runStateLabel = computed(() => {
  if (systemStatus.value === 'running') return '运行正常'
  if (systemStatus.value === 'warning') return '连接中'
  return '系统离线'
})

const linkStateLabel = computed(() => {
  if (systemStatus.value === 'running') return '已连接'
  if (systemStatus.value === 'warning') return '同步中'
  return '未连接'
})

const mihomoStatusText = computed(() => {
  if (mihomoStatus.value === 'running') return '运行中'
  if (mihomoStatus.value === 'warning') return '降级'
  if (mihomoStatus.value === 'offline') return '离线'
  return '连接中'
})

const wsStatusLabel = computed(() => {
  if (mihomoSync.trafficWsConnected && mihomoSync.connectionsWsConnected) return '实时 WS'
  if (mihomoSync.trafficWsConnected || mihomoSync.connectionsWsConnected) return 'WS 单通道'
  if (mihomoSync.connected) return 'REST 同步'
  return '离线'
})

const syncBadgeReady = computed(() =>
  mihomoSync.connected || mihomoSync.trafficWsConnected || mihomoSync.connectionsWsConnected,
)

const hasKernelVersion = computed(() => {
  const version = state.system.kernelVersion
  return Boolean(version && version !== '—')
})

const kernelBadgeLabel = computed(() => {
  const name = getKernelDisplayName(
    Boolean(state.system.kernelMeta) && clashBackendProfile.value.id === 'mihomo',
  )
  if (!hasKernelVersion.value) return name
  return `${name} ${state.system.kernelVersion}`
})

const kernelBadgeReady = computed(
  () =>
    hasKernelVersion.value ||
    mihomoStatus.value === 'running' ||
    mihomoStatus.value === 'warning',
)
</script>

<template>
  <section
    class="status-hero panel-card panel-neutral"
    :class="{ 'is-alive': meta.lastEventAt || systemStatus !== 'offline' }"
  >
    <div class="status-hero__cosmos" aria-hidden="true">
      <div class="status-hero__pcb-grid" />
      <div class="status-hero__nebula" />
      <div class="status-hero__orbit status-hero__orbit--a" />
      <div class="status-hero__orbit status-hero__orbit--b" />
      <div class="status-hero__spark-field" />
    </div>
    <div class="status-hero__glow" aria-hidden="true" />
    <div class="status-hero__glass" aria-hidden="true" />

    <div class="status-hero__content">
      <div class="status-hero__layout">
        <div class="status-hero__left">
          <header class="status-hero__layer status-hero__layer--status">
            <h1 class="status-hero__title status-hero__title--display">
              <span class="status-hero__title-row">
                <span class="status-hero__title-chunk status-hero__title-chunk--lg">ONE</span>
              </span>
              <span class="status-hero__title-row status-hero__title-row--split">
                <span class="status-hero__title-chunk status-hero__title-chunk--lg">BOARD</span>
              </span>
            </h1>
            <h1 class="status-hero__title status-hero__title--simple">OneBoard</h1>
            <p class="status-hero__tagline">Host-Aware Control Plane · 实时指挥面</p>
            <div class="status-hero__pills">
              <span
                class="status-pill"
                :class="{
                  offline: systemStatus === 'offline',
                  'status-pill--warn': systemStatus === 'warning',
                }"
              >
                <span class="dot" />{{ runStateLabel }}
              </span>
              <span
                class="status-pill status-pill--muted"
                :class="{
                  offline: systemStatus === 'offline',
                  'status-pill--warn': systemStatus === 'warning',
                }"
              >
                <span class="dot" />{{ linkStateLabel }}
              </span>
            </div>
          </header>

          <div class="status-hero__layer status-hero__layer--metrics">
            <div
              class="hero-metric panel-card panel-green glass-frame glass-frame--compact glass-frame--static"
              :class="{ 'is-pulse': mihomoPulse }"
            >
              <span class="hero-metric__label">内核状态</span>
              <span class="hero-metric__value">{{ mihomoStatusText }}</span>
            </div>
            <div
              class="hero-metric panel-card panel-blue glass-frame glass-frame--compact glass-frame--static"
              :class="{ 'is-pulse': nodePulse }"
            >
              <span class="hero-metric__label">在线节点</span>
              <span class="hero-metric__value">{{ Math.round(nodesDisplay) }}</span>
            </div>
            <div
              class="hero-metric panel-card panel-purple glass-frame glass-frame--compact glass-frame--static"
              :class="{ 'is-pulse': vohivePulse }"
            >
              <span class="hero-metric__label">VoHive 设备</span>
              <span class="hero-metric__value">
                <span class="hero-metric__value-main">{{ Math.round(vohiveOnlineDisplay) }}</span><span class="hero-metric__value-sub"> / {{ vohiveTotal }}</span>
              </span>
            </div>
          </div>

          <footer class="status-hero__layer status-hero__layer--meta">
            <span
              class="hero-meta-chip"
              :class="{ 'hero-meta-chip--live': kernelBadgeReady }"
            >{{ kernelBadgeLabel }}</span>
            <span
              class="hero-meta-chip"
              :class="{ 'hero-meta-chip--live': syncBadgeReady }"
            >{{ wsStatusLabel }}</span>
          </footer>
        </div>

        <div class="status-hero__visual" aria-hidden="true">
          <div class="hero-circuit">
            <svg class="hero-circuit__traces" viewBox="0 0 200 200" fill="none" aria-hidden="true">
              <path class="hero-circuit__trace" d="M20 100H76M124 100H180" />
              <path class="hero-circuit__trace hero-circuit__trace--delay" d="M100 20V76M100 124V180" />
              <path class="hero-circuit__trace hero-circuit__trace--delay-2" d="M32 56H64M136 144H168" />
              <path class="hero-circuit__trace hero-circuit__trace--delay-2" d="M56 32V64M144 136V168" />
              <path class="hero-circuit__trace hero-circuit__trace--delay" d="M48 48H72V72M128 128H152V152" />
              <circle class="hero-circuit__node" cx="76" cy="100" r="2.2" />
              <circle class="hero-circuit__node" cx="124" cy="100" r="2.2" />
              <circle class="hero-circuit__node" cx="100" cy="76" r="2.2" />
              <circle class="hero-circuit__node" cx="100" cy="124" r="2.2" />
              <circle class="hero-circuit__node" cx="64" cy="64" r="1.6" />
              <circle class="hero-circuit__node" cx="136" cy="136" r="1.6" />
            </svg>
            <svg class="hero-circuit__chip" viewBox="0 0 100 100" fill="none" aria-hidden="true">
              <g class="hero-circuit__chip-lines">
                <g class="hero-circuit__pins">
                  <line x1="34" y1="10" x2="34" y2="22" />
                  <line x1="50" y1="10" x2="50" y2="22" />
                  <line x1="66" y1="10" x2="66" y2="22" />
                  <line x1="34" y1="78" x2="34" y2="90" />
                  <line x1="50" y1="78" x2="50" y2="90" />
                  <line x1="66" y1="78" x2="66" y2="90" />
                  <line x1="10" y1="34" x2="22" y2="34" />
                  <line x1="10" y1="50" x2="22" y2="50" />
                  <line x1="10" y1="66" x2="22" y2="66" />
                  <line x1="78" y1="34" x2="90" y2="34" />
                  <line x1="78" y1="50" x2="90" y2="50" />
                  <line x1="78" y1="66" x2="90" y2="66" />
                </g>
                <rect class="hero-circuit__chip-body" x="22" y="22" width="56" height="56" rx="6" />
                <rect class="hero-circuit__chip-die" x="36" y="36" width="28" height="28" rx="3" />
                <path class="hero-circuit__chip-mark" d="M42 50H58M50 42V58" />
              </g>
            </svg>
            <div class="hero-circuit__readout hero-circuit__readout--esim">
              <span class="hero-circuit__readout-line">
                <span class="hero-circuit__readout-value">{{ esimPercentLabel }}</span>
                <span class="hero-circuit__readout-label">ESIM</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

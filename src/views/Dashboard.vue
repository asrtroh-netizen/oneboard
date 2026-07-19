<script setup>
import MIcon from '../components/MIcon.vue'
import StatMini from '../components/StatMini.vue'
import CountryNodesSection from '../components/CountryNodesSection.vue'
import Sparkline from '../components/Sparkline.vue'
import ControlPlaneHero from '../components/ControlPlaneHero.vue'
import SoftLabelCard from '../components/SoftLabelCard.vue'
import { useAppStore } from '../stores/app'
import { useAccessHost } from '../composables/useAccessHost'
import { mihomoSyncState, trafficHistory } from '../stores/mihomoSync'
import { clashBackendProfile, getKernelDisplayName } from '../stores/clashBackend'

const { state, onlineCount, countryGroups, globalNodeStats, formatBytes, restartMihomo } = useAppStore()
const { accessAddress } = useAccessHost()

const kernelPanelTitle = () =>
  getKernelDisplayName(Boolean(state.system.kernelMeta) && clashBackendProfile.value.id === 'mihomo')

function kernelStatusLabel() {
  if (mihomoSyncState.connected) return '运行中'
  if (mihomoSyncState.lastError) return '离线'
  return '连接中'
}
</script>

<template>
  <div class="dashboard dashboard--stream">
    <div class="dashboard-shell">
      <ControlPlaneHero />

      <div class="dashboard-body">
      <div class="page-head dashboard-page-head">
        <h1 class="page-title">仪表盘</h1>
      </div>

      <div class="stat-row">
        <StatMini label="CPU 使用率" sub="处理器负载" :wave-level="state.system.cpu">
          {{ state.system.cpu.toFixed(1) }}%
        </StatMini>
        <StatMini label="内存使用率" sub="系统内存" :wave-level="state.system.memory">
          {{ state.system.memory.toFixed(1) }}%
        </StatMini>
        <StatMini
          label="上传"
          sub="实时速度"
          :wave-level="Math.min(100, state.system.uploadSpeed / 1024)"
        >
          {{ formatBytes(state.system.uploadSpeed) }}/s
        </StatMini>
        <StatMini
          label="下载"
          sub="实时速度"
          :wave-level="Math.min(100, state.system.downloadSpeed / 1024)"
        >
          {{ formatBytes(state.system.downloadSpeed) }}/s
        </StatMini>
      </div>

      <div class="stat-row">
        <StatMini :wave="false" label="总节点数" sub="全部节点">
          {{ state.system.totalNodes }}
        </StatMini>
        <StatMini :wave="false" label="在线节点" sub="可用节点">
          {{ state.system.onlineNodes }}
        </StatMini>
        <StatMini :wave="false" label="订阅数" sub="订阅源">
          {{ state.system.subscriptions }}
        </StatMini>
        <StatMini :wave="false" label="规则" sub="分流规则">
          {{ state.system.rulesCount }}
        </StatMini>
      </div>

      <div class="panel-card panel-neutral section-card traffic-card">
        <div class="section-head">
          <div>
            <div class="panel-title-lg">实时流量</div>
            <div class="panel-sub">
              WebSocket {{ mihomoSyncState.trafficWsConnected ? '已连接' : '未连接' }}
              · 累计 ↓ {{ state.system.downloadTotal }} · ↑ {{ state.system.uploadTotal }}
            </div>
          </div>
        </div>
        <div class="traffic-charts">
          <div class="traffic-chart-item glass-frame glass-frame--compact glass-frame--static">
            <div class="traffic-chart-label">下载</div>
            <div class="traffic-chart-body">
              <Sparkline :data="trafficHistory.down" color="rgba(96, 165, 250, 0.88)" :height="56" />
            </div>
          </div>
          <div class="traffic-chart-item glass-frame glass-frame--compact glass-frame--static">
            <div class="traffic-chart-label">上传</div>
            <div class="traffic-chart-body">
              <Sparkline :data="trafficHistory.up" color="rgba(96, 165, 250, 0.72)" :height="56" />
            </div>
          </div>
        </div>
      </div>

      <div class="info-row">
        <div class="panel-card panel-blue">
          <div class="panel-head">
            <div class="panel-icon"><MIcon name="devices" /></div>
            <div>
              <div class="panel-title">设备信息</div>
            </div>
          </div>
          <div class="soft-label-stack">
            <SoftLabelCard title="系统" :value="state.system.os" />
            <SoftLabelCard title="主机名" :value="state.system.hostname" />
            <SoftLabelCard title="访问地址" :value="accessAddress" mono />
            <SoftLabelCard title="CPU" :value="state.system.cpuModel" />
          </div>
        </div>

        <div class="panel-card panel-purple">
          <div class="panel-head">
            <div class="panel-icon"><MIcon name="memory_alt" /></div>
            <div>
              <div class="panel-title">硬件信息</div>
            </div>
          </div>
          <div class="soft-label-stack">
            <SoftLabelCard title="内存总量" :value="`${state.system.memoryTotal} GB`" />
            <SoftLabelCard title="CPU" :value="`${state.system.cpu.toFixed(1)}%`">
              <template #aux>
                <div class="progress-bar"><div class="progress-fill fill-purple" :style="{ width: state.system.cpu + '%' }" /></div>
              </template>
            </SoftLabelCard>
            <SoftLabelCard title="内存" :value="`${state.system.memory.toFixed(1)}%`">
              <template #aux>
                <div class="progress-bar"><div class="progress-fill fill-teal" :style="{ width: state.system.memory + '%' }" /></div>
              </template>
            </SoftLabelCard>
            <SoftLabelCard title="磁盘" :value="`${state.system.disk}%`">
              <template #aux>
                <div class="progress-bar"><div class="progress-fill fill-pink" :style="{ width: state.system.disk + '%' }" /></div>
              </template>
            </SoftLabelCard>
          </div>
        </div>

        <div class="panel-card" :class="clashBackendProfile.panelClass">
          <div class="panel-head panel-head-between">
            <div class="panel-head-left">
              <div class="panel-icon"><MIcon :name="clashBackendProfile.icon" /></div>
              <div>
                <div class="panel-title">{{ kernelPanelTitle() }}</div>
              </div>
            </div>
            <span class="status-pill" :class="{ offline: !mihomoSyncState.connected }">
              <span class="dot" />{{ kernelStatusLabel() }}
            </span>
          </div>
          <div class="soft-label-stack">
            <SoftLabelCard title="内核版本" :value="state.system.kernelVersion" />
            <SoftLabelCard
              v-if="state.system.kernelMeta"
              title="内核信息"
              :value="state.system.kernelMeta"
            />
            <SoftLabelCard
              title="连接时间"
              :value="mihomoSyncState.kernelStartTime || '—'"
            />
            <SoftLabelCard
              title="在线节点"
              :value="`${onlineCount} / ${state.nodes.length}`"
            />
            <SoftLabelCard
              v-if="mihomoSyncState.lastError"
              title="错误"
              tone="danger"
              :value="mihomoSyncState.lastError"
            />
          </div>
          <button class="panel-btn glass-frame glass-frame--compact glass-frame--pill" @click="restartMihomo">
            <MIcon name="refresh" size="sm" /> 重启服务
          </button>
        </div>
      </div>

      <CountryNodesSection
        :country-groups="countryGroups"
        :global-stats="globalNodeStats"
      />
    </div>
    </div>
  </div>
</template>

<style scoped>
.stream-hero__greet {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  max-width: min(100%, 640px);
}

.stream-hero__stream {
  display: none;
}

.stream-hero__title--greet {
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 400;
  letter-spacing: -0.02em;
  text-shadow: none;
}

.stream-hero__hostname {
  font-weight: 700;
  font-size: clamp(26px, 3.4vw, 34px);
  letter-spacing: -0.01em;
}

.stream-hero__sys-badge {
  max-width: 100%;
}

.stream-hero__mascot {
  position: absolute;
  right: -24px;
  top: 50%;
  transform: translateY(-46%);
  width: 240px;
  height: 210px;
  pointer-events: none;
  z-index: 1;
  opacity: 0.75;
  -webkit-mask-image: linear-gradient(105deg, transparent 0%, #000 28%, #000 92%, transparent 100%);
  mask-image: linear-gradient(105deg, transparent 0%, #000 28%, #000 92%, transparent 100%);
}

.stream-hero__mascot svg {
  width: 100%;
  height: 100%;
  display: block;
}

.hero-mascot-shape :is(rect, path) {
  fill: rgba(255, 255, 255, 0.32);
}

.hero-mascot-eye {
  fill: rgba(0, 0, 0, 0.25);
}

.hero-mascot-nose {
  fill: rgba(255, 255, 255, 0.9);
}

.hero-mascot-mouth {
  stroke: rgba(255, 255, 255, 0.85);
  fill: none;
}

[data-theme='light'] .stream-hero__greet {
  display: none;
}

[data-theme='light'] .stream-hero__stream {
  display: block;
}

[data-theme='light'] .stream-hero__mascot .hero-mascot-shape :is(rect, path) {
  fill: rgba(15, 23, 42, 0.12);
}

[data-theme='light'] .stream-hero__mascot .hero-mascot-eye {
  fill: rgba(15, 23, 42, 0.55);
}

[data-theme='light'] .stream-hero__mascot .hero-mascot-nose {
  fill: rgba(15, 23, 42, 0.35);
}

[data-theme='light'] .stream-hero__mascot .hero-mascot-mouth {
  stroke: rgba(15, 23, 42, 0.35);
}

[data-theme='light'] .stream-hero__title--greet {
  color: rgba(15, 23, 42, 0.96);
}

[data-theme='light'] .dashboard-page-head {
  display: none;
}

[data-theme='light'] .stream-hero__featured {
  gap: 8px;
}

[data-theme='light'] .stream-hero__body {
  z-index: 3;
}

[data-theme='light'] .stream-hero__speed {
  display: block;
  position: relative;
  z-index: 3;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: #4F8CFF;
  font-size: clamp(32px, 4.5vw, 44px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  line-height: 1;
  text-shadow: none;
  box-shadow: none;
  filter: none;
}

[data-theme='light'] .stream-hero__speed-sub {
  color: rgba(15, 23, 42, 0.48);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

[data-theme='light'] .stream-hero__top {
  position: absolute;
  top: 20px;
  right: 24px;
  z-index: 3;
}

[data-theme='light'] .stream-hero__top :deep(.theme-toggle) {
  padding: 7px 12px 7px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42) !important;
  border-color: rgba(255, 255, 255, 0.48) !important;
  box-shadow: var(--ob-glass-shadow) !important;
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-grid);
  margin-bottom: 0;
}

.info-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-grid);
  margin-top: 0;
  margin-bottom: 0;
}

/* 与全局移动断点对齐：小屏每个卡片独占一行，避免被挤成 1/4 宽 */
@media (max-width: 900px) {
  .stat-row,
  .info-row,
  .traffic-charts {
    grid-template-columns: 1fr;
  }
}

.status-pill.offline .dot {
  background: var(--text-muted);
  box-shadow: none;
}

.info-block { align-items: flex-start; }

.error-text { color: var(--red, #f87171); }

.soft-label-stack .progress-bar {
  margin-top: 2px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}

.section-head .panel-title-lg { margin-bottom: 0; }

.traffic-card { margin-bottom: 0; }

.traffic-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-grid);
}

.traffic-chart-item {
  padding: 12px 14px;
  border-radius: var(--radius-card-sm);
}

.traffic-chart-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.traffic-chart-body {
  height: 56px;
}

.stream-hero {
  position: relative;
  min-height: clamp(168px, 24vh, 220px);
  margin: 0 0 20px;
  border-radius: 24px;
  overflow: hidden;
}

[data-theme='light'] .stream-hero {
  min-height: clamp(280px, 38vh, 380px);
}

[data-theme='light'] .stream-hero__media,
[data-theme='light'] .stream-hero__scrim {
  display: none;
}

[data-theme='light'] .stream-hero__light {
  display: none;
}

.stream-hero__media {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 75% at 18% 100%, rgba(110, 181, 255, 0.2) 0%, transparent 62%),
    radial-gradient(ellipse 45% 40% at 88% 12%, rgba(255, 255, 255, 0.06) 0%, transparent 58%),
    linear-gradient(125deg, #2a3548 0%, #1e2635 52%, #171c28 100%);
}

.stream-hero__scrim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.42) 0%, rgba(0, 0, 0, 0.12) 48%, transparent 100%),
    linear-gradient(0deg, rgba(0, 0, 0, 0.35) 0%, transparent 55%);
}

.stream-hero__light {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 50% 60% at 88% 22%, rgba(255, 255, 255, 0.14) 0%, transparent 62%);
  pointer-events: none;
}

.stream-hero__top {
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 3;
}

.stream-hero__body {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: clamp(168px, 24vh, 220px);
  padding: 28px 220px 28px 28px;
  max-width: 100%;
}

[data-theme='light'] .stream-hero__body {
  justify-content: flex-end;
  min-height: clamp(340px, 48vh, 480px);
  padding: 32px 32px 28px;
  max-width: 720px;
}

.stream-hero__eyebrow {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.stream-hero__title {
  margin: 0;
  font-size: clamp(32px, 4.5vw, 48px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: rgba(255, 255, 255, 0.98);
  text-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
}

.stream-hero__desc {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.68);
  max-width: 38em;
}

.stream-hero__featured {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 24px;
}

.stream-hero__speed {
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  color: #ffd84d;
  text-shadow: 0 0 28px rgba(255, 216, 77, 0.32);
  line-height: 1;
}

.stream-hero__speed-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.52);
  font-variant-numeric: tabular-nums;
}

.stream-hero__spark {
  margin-top: 16px;
  max-width: 280px;
  opacity: 0.72;
  mask-image: linear-gradient(90deg, #000 0%, #000 72%, transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 72%, transparent 100%);
}

.stream-hero__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 20px;
}

.stream-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stream-btn--primary {
  color: #0f1419;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}

[data-theme='light'] .stream-btn--primary {
  color: inherit;
  background: transparent;
  box-shadow: none;
}

.stream-btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);
}

.stream-hero__meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.48);
}

@media (max-width: 768px) {
  .stream-hero {
    margin-left: -4px;
    margin-right: -4px;
  }

  .stream-hero__body {
    padding: 22px 160px 22px 18px;
  }

  [data-theme='light'] .stream-hero__body {
    padding: 22px 18px 18px;
  }

  .stream-hero__mascot {
    width: 180px;
    height: 158px;
    right: -18px;
  }

  .traffic-charts { grid-template-columns: 1fr; }
}
</style>

<script setup>
import DashboardCountryCard from './DashboardCountryCard.vue'
import { mihomoSyncState } from '../stores/mihomoSync'

defineProps({
  countryGroups: { type: Array, default: () => [] },
  globalStats: {
    type: Object,
    default: () => ({ total: 0, available: 0, onlineRate: 0 }),
  },
})
</script>

<template>
  <div class="country-nodes-section">
    <div class="section-head">
      <div>
        <div class="panel-title-lg">智能节点系统</div>
        <div class="panel-sub">
          自动识别国家 · 前三行实时排序 · 其余固定 · 数据自动刷新
        </div>
      </div>
    </div>

    <div class="global-stats">
      <div class="global-stat panel-card panel-blue glass-frame glass-frame--compact glass-frame--static">
        <span class="global-label">总节点</span>
        <span class="global-value">{{ globalStats.total }}</span>
      </div>
      <div class="global-stat panel-card panel-green glass-frame glass-frame--compact glass-frame--static">
        <span class="global-label">可用节点</span>
        <span class="global-value accent-green">{{ globalStats.available }}</span>
      </div>
      <div class="global-stat panel-card panel-purple glass-frame glass-frame--compact glass-frame--static">
        <span class="global-label">全局在线率</span>
        <span class="global-value accent-blue">{{ globalStats.onlineRate }}%</span>
      </div>
      <div class="global-stat panel-card panel-green glass-frame glass-frame--compact glass-frame--static">
        <span class="global-label">API 状态</span>
        <span class="global-value" :class="mihomoSyncState.connected ? 'accent-green' : 'accent-red'">
          {{ mihomoSyncState.connected ? '已连接' : '离线' }}
        </span>
      </div>
    </div>

    <div v-if="countryGroups.length" class="country-grid">
      <DashboardCountryCard
        v-for="(group, index) in countryGroups"
        :key="group.code"
        :index="index"
        :code="group.code"
        :name="group.name"
        :total="group.total"
        :available="group.available"
        :online-rate="group.onlineRate"
        :best-delay="group.bestDelay"
      />
    </div>
    <div v-else class="empty-hint">
      <template v-if="mihomoSyncState.connected">暂无节点数据</template>
      <template v-else>
        <span>等待 Mihomo API 返回节点数据…</span>
        <span v-if="mihomoSyncState.lastError" class="empty-error">{{ mihomoSyncState.lastError }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.country-nodes-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-head .panel-title-lg {
  margin-bottom: 4px;
}

.sync-hint {
  opacity: 0.7;
}

.global-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-grid, 12px);
}

.global-stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: var(--radius-card-sm, 12px);
}

.global-stat .global-label,
.global-stat .global-value {
  position: relative;
  z-index: 4;
}

.global-label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.global-value {
  font-size: 22px;
  font-weight: 400;
  line-height: 1;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}

.accent-green { color: #34d399; }
.accent-blue { color: #60a5fa; }
.accent-red { color: #f87171; }

.country-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-grid, 14px);
  align-items: start;
}

@media (max-width: 1200px) {
  .country-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .country-grid { grid-template-columns: 1fr; }
}

.empty-hint {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: var(--fs-sm, 13px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-error {
  color: var(--danger, #f87171);
  font-family: var(--mono);
  font-size: 12px;
  word-break: break-all;
}

@media (max-width: 900px) {
  .global-stats { grid-template-columns: repeat(2, 1fr); }
}
</style>

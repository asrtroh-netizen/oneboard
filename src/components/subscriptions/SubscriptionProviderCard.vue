<script setup>
import { computed } from 'vue'
import MIcon from '../MIcon.vue'

const props = defineProps({
  item: { type: Object, required: true },
  refreshing: { type: Boolean, default: false },
})

defineEmits(['edit', 'refresh'])

const usage = computed(() => props.item.usage || {
  usedLabel: '0 B',
  totalLabel: '—',
  remainingLabel: '—',
  percent: 0,
  hasQuota: false,
})

const online = computed(() => props.item.online || {
  onlineCount: 0,
  totalCount: props.item.nodeCount || 0,
  offlineCount: props.item.nodeCount || 0,
  percent: 0,
})

const statusKind = computed(() => {
  if (props.refreshing) return 'updating'
  if (!props.item.config?.url) return 'error'
  if (props.item.nodeCount > 0) return 'enabled'
  return 'empty'
})

const statusLabel = computed(() => {
  if (statusKind.value === 'updating') return '更新中'
  if (statusKind.value === 'error') return '未配置'
  if (statusKind.value === 'enabled') return '已启用'
  if (props.item.config?.url) return '待拉取'
  return '未启用'
})

const providerType = computed(() => {
  const type = props.item.config?.type || props.item.vehicleType || 'http'
  return String(type).toUpperCase()
})

const intervalLabel = computed(() => {
  const sec = props.item.config?.interval
  if (!sec && sec !== 0) return '—'
  if (sec >= 3600) return `${Math.round(sec / 3600)}h`
  if (sec >= 60) return `${Math.round(sec / 60)}m`
  return `${sec}s`
})

const healthLabel = computed(() =>
  props.item.config?.healthCheck?.enable ? '健康检查' : '无检查',
)

const progressPercent = computed(() => Math.min(100, Math.max(0, usage.value.percent || 0)))

const onlinePercent = computed(() => Math.min(100, Math.max(0, online.value.percent || 0)))

const metaText = computed(() =>
  `${providerType.value} · ${intervalLabel.value} 间隔 · ${props.item.nodeCount} 节点 · ${healthLabel.value} · 更新 ${props.item.updatedAt}`,
)

const metaBadgeClass = computed(() => {
  if (statusKind.value === 'updating') return 'ob-info-badge--info'
  if (statusKind.value === 'error') return 'ob-info-badge--warn'
  if (statusKind.value === 'enabled') return 'ob-info-badge--ready'
  return 'ob-info-badge--neutral'
})
</script>

<template>
  <article class="sub-resource-card panel-card panel-neutral section-card">
    <header class="sub-resource-card__head">
      <div class="sub-resource-card__title-block">
        <h3 class="sub-resource-card__name">{{ item.name }}</h3>
        <p
          v-if="item.config?.url"
          class="sub-resource-card__url"
          :title="item.config.url"
        >
          {{ item.config.url }}
        </p>
        <p v-else class="sub-resource-card__url is-empty">未配置 URL</p>
      </div>
      <span
        class="sub-resource-card__status"
        :class="`is-${statusKind}`"
      >
        <span class="sub-resource-card__status-dot"></span>
        {{ statusLabel }}
      </span>
    </header>

    <div
      class="ob-info-badge sub-resource-card__meta"
      :class="metaBadgeClass"
    >
      <span class="ob-info-badge__dot"></span>
      <span class="ob-info-badge__text">{{ metaText }}</span>
    </div>

    <div class="sub-resource-card__metrics">
      <section class="sub-resource-card__online">
        <div class="sub-resource-card__online-head">
          <span class="sub-resource-card__online-label">在线率</span>
          <span class="sub-resource-card__online-percent">{{ onlinePercent }}%</span>
        </div>
        <div class="sub-resource-card__online-values">
          <span class="sub-resource-card__online-main">
            {{ online.onlineCount }}
            <span class="sub-resource-card__online-divider">/</span>
            {{ online.totalCount }}
          </span>
          <span class="sub-resource-card__online-remaining">
            离线 {{ online.offlineCount }}
          </span>
        </div>
        <div
          class="sub-resource-card__progress"
          role="progressbar"
          :aria-valuenow="onlinePercent"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="在线率"
        >
          <div
            class="sub-resource-card__progress-fill sub-resource-card__progress-fill--online"
            :style="{ width: `${onlinePercent}%` }"
          ></div>
        </div>
      </section>

      <section class="sub-resource-card__usage">
        <div class="sub-resource-card__usage-head">
          <span class="sub-resource-card__usage-label">流量使用</span>
          <span class="sub-resource-card__usage-percent">{{ progressPercent }}%</span>
        </div>
        <div class="sub-resource-card__usage-values">
          <span class="sub-resource-card__usage-main">
            {{ usage.usedLabel }}
            <span class="sub-resource-card__usage-divider">/</span>
            {{ usage.totalLabel }}
          </span>
          <span class="sub-resource-card__usage-remaining">
            剩余 {{ usage.remainingLabel }}
          </span>
        </div>
        <div
          class="sub-resource-card__progress"
          role="progressbar"
          :aria-valuenow="progressPercent"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="流量使用"
        >
          <div
            class="sub-resource-card__progress-fill"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
      </section>
    </div>

    <footer class="sub-resource-card__actions">
      <button
        type="button"
        class="ob-action-btn sub-resource-card__action"
        title="刷新 Provider"
        :disabled="refreshing"
        @click="$emit('refresh')"
      >
        <MIcon name="sync" size="sm" />
        {{ refreshing ? '刷新中…' : '刷新' }}
      </button>
      <button
        type="button"
        class="ob-action-btn sub-resource-card__action"
        title="编辑"
        @click="$emit('edit')"
      >
        <MIcon name="edit" size="sm" />
        编辑
      </button>
    </footer>
  </article>
</template>

<style scoped>
.sub-resource-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  min-height: 280px;
  height: 100%;
}

.sub-resource-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.sub-resource-card__title-block {
  flex: 1;
  min-width: 0;
}

.sub-resource-card__name {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.sub-resource-card__url {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub-resource-card__url.is-empty {
  font-style: italic;
}

.sub-resource-card__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.sub-resource-card__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 10px currentColor;
}

.sub-resource-card__status.is-enabled {
  color: #6ee7b7;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.28);
}

.sub-resource-card__status.is-empty {
  color: rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.sub-resource-card__status.is-error {
  color: #fca5a5;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.28);
}

.sub-resource-card__status.is-updating {
  color: #93c5fd;
  background: rgba(96, 165, 250, 0.12);
  border: 1px solid rgba(96, 165, 250, 0.28);
}

.sub-resource-card__meta {
  align-self: flex-start;
  max-width: 100%;
}

.sub-resource-card__metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-resource-card__online,
.sub-resource-card__usage {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.sub-resource-card__online-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sub-resource-card__online-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.sub-resource-card__online-percent {
  font-size: 13px;
  font-weight: 700;
  color: #6ee7b7;
}

.sub-resource-card__online-values {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.sub-resource-card__online-main {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgba(255, 255, 255, 0.92);
}

.sub-resource-card__online-divider {
  margin: 0 4px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.28);
}

.sub-resource-card__online-remaining {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.42);
}

.sub-resource-card__usage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sub-resource-card__usage-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.sub-resource-card__usage-percent {
  font-size: 13px;
  font-weight: 700;
  color: #7dd3fc;
}

.sub-resource-card__usage-values {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.sub-resource-card__usage-main {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgba(255, 255, 255, 0.92);
}

.sub-resource-card__usage-divider {
  margin: 0 4px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.28);
}

.sub-resource-card__usage-remaining {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.42);
}

.sub-resource-card__progress {
  position: relative;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}

.sub-resource-card__progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #3b82f6 0%, #22d3ee 100%);
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.35);
  transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.sub-resource-card__progress-fill--online {
  background: linear-gradient(90deg, rgba(45, 212, 191, 0.9), rgba(52, 211, 153, 0.9));
  box-shadow: 0 0 16px rgba(52, 211, 153, 0.35);
}

.sub-resource-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}

.sub-resource-card__action {
  flex: 1;
  min-width: 0;
}
</style>

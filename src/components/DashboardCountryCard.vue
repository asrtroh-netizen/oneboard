<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import SoftLabelCard from './SoftLabelCard.vue'

const props = defineProps({
  code: { type: String, required: true },
  name: { type: String, required: true },
  total: { type: Number, default: 0 },
  available: { type: Number, default: 0 },
  onlineRate: { type: Number, default: 0 },
  bestDelay: { type: Number, default: 0 },
  index: { type: Number, default: 0 },
})

const PANEL_ACCENTS = ['panel-blue', 'panel-purple', 'panel-green']

const isOnline = computed(() => props.available > 0)

const accentClass = computed(() => PANEL_ACCENTS[props.index % PANEL_ACCENTS.length])

const displayCode = computed(() => {
  const c = String(props.code || '').toUpperCase()
  if (c && c !== 'GLOBAL') return c === 'GB' ? 'UK' : c
  return 'GLOBAL'
})

const availabilityLabel = computed(() => `${props.available} / ${props.total}`)

const delayValue = computed(() => {
  if (props.bestDelay > 0) return `${props.bestDelay} ms`
  return '—'
})

const delayBarWidth = computed(() => {
  if (!props.bestDelay || props.bestDelay <= 0) return 0
  return Math.max(0, Math.min(100, 100 - (props.bestDelay / 500) * 100))
})

const delayFillClass = computed(() => {
  const delay = props.bestDelay
  if (!delay || delay <= 0) return 'fill-purple'
  if (delay < 100) return 'fill-teal'
  if (delay <= 300) return 'fill-purple'
  return 'fill-pink'
})
</script>

<template>
  <div class="panel-card dashboard-country-card" :class="accentClass">
    <div class="panel-head panel-head-between">
      <div class="panel-head-left">
        <div class="panel-icon"><MIcon name="public" /></div>
        <div>
          <div class="panel-title">{{ name }}</div>
          <div class="panel-sub">{{ displayCode }} · {{ total }} 节点</div>
        </div>
      </div>
      <span class="status-pill" :class="{ offline: !isOnline }">
        <span class="dot" />{{ isOnline ? '在线' : '离线' }}
      </span>
    </div>

    <div class="soft-label-stack">
      <SoftLabelCard title="在线率" :value="`${onlineRate}%`">
        <template #aux>
          <div class="progress-bar">
            <div class="progress-fill fill-teal" :style="{ width: `${onlineRate}%` }" />
          </div>
        </template>
      </SoftLabelCard>

      <SoftLabelCard title="可用节点" :value="availabilityLabel">
        <template #aux>
          <div class="progress-bar">
            <div class="progress-fill fill-pink" :style="{ width: `${onlineRate}%` }" />
          </div>
        </template>
      </SoftLabelCard>

      <SoftLabelCard title="延迟" :value="delayValue">
        <template #aux>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :class="delayFillClass"
              :style="{ width: `${delayBarWidth}%` }"
            />
          </div>
        </template>
      </SoftLabelCard>
    </div>
  </div>
</template>

<style scoped>
.dashboard-country-card {
  min-width: 0;
}

.soft-label-stack .progress-bar {
  margin-top: 2px;
}
</style>

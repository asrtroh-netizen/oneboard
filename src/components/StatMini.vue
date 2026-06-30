<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  sub: { type: String, default: '' },
  waveLevel: { type: Number, default: 50 },
  wave: { type: Boolean, default: true },
})

const level = computed(() => Math.min(100, Math.max(0, props.waveLevel)))
const waveFillId = `stat-wave-fill-${useId()}`

const waveLine = computed(() => {
  const base = 30 - level.value * 0.16
  return [
    `M0,${base + 4}`,
    `C42,${base - 9} 88,${base + 11} 132,${base - 2}`,
    `S218,${base - 13} 268,${base + 7}`,
    `S348,${base - 5} 400,${base + 2}`,
  ].join(' ')
})

const waveArea = computed(() => `${waveLine.value} L400,44 L0,44 Z`)
</script>

<template>
  <div class="factory-card glass glass-stat" :class="{ 'no-wave': !wave }" :style="{ '--wave-level': level }">
    <div class="factory-head">
      <span class="factory-label">{{ label }}</span>
      <div class="factory-value">
        <slot />
      </div>
    </div>
    <div v-if="sub" class="factory-sub">{{ sub }}</div>

    <svg v-if="wave" class="factory-chart" viewBox="0 0 400 44" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient :id="waveFillId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--stat-wave-fill-top, rgba(90, 200, 250, 0.2))" />
          <stop offset="100%" stop-color="var(--stat-wave-fill-bottom, rgba(90, 200, 250, 0))" />
        </linearGradient>
      </defs>
      <path class="wave-area" :d="waveArea" :style="{ fill: `url(#${waveFillId})` }" />
      <path class="wave-line" :d="waveLine" />
    </svg>
  </div>
</template>

<style scoped>
.factory-card {
  position: relative;
  border-radius: var(--ob-glass-radius, var(--radius-card-sm));
  padding: 11px 14px 30px;
  min-height: 68px;
  overflow: hidden;
  transition: box-shadow 0.3s ease, border-color 0.25s ease, background 0.25s ease;
}

.factory-head,
.factory-sub,
.factory-chart {
  position: relative;
  z-index: 4;
}

.factory-card.no-wave {
  padding-bottom: 14px;
  min-height: auto;
}

.factory-card:hover {
  box-shadow: var(--cine-panel-hover-glow), var(--cine-inner-shadow);
}

[data-theme="light"] .factory-card:hover {
  box-shadow: var(--stat-card-shadow-hover) !important;
}

.factory-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.factory-label {
  font-size: 11px;
  font-weight: 400;
  color: var(--stat-label-color);
  line-height: 1.3;
}

.factory-value {
  font-size: var(--fs-stat);
  font-weight: 400;
  color: var(--stat-value-color);
  line-height: 1.1;
  letter-spacing: -0.3px;
  white-space: nowrap;
}

.factory-sub {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 400;
  color: var(--stat-sub-color);
  position: relative;
  z-index: 1;
}

.factory-chart {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px;
  pointer-events: none;
}

.wave-area {
  opacity: 0.9;
}

.wave-line {
  fill: none;
  stroke: var(--stat-wave-stroke);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  filter: none;
  transition: d 0.55s ease;
}
</style>

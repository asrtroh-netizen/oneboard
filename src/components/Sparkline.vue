<script setup>
const props = defineProps({
  data: { type: Array, default: () => [] },
  color: { type: String, default: 'var(--accent)' },
  height: { type: Number, default: 56 },
})

function buildPath(values) {
  if (!values.length) return ''
  const w = 100
  const h = props.height
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const step = w / Math.max(values.length - 1, 1)
  return values
    .map((v, i) => {
      const x = i * step
      const y = h - ((v - min) / range) * (h - 4) - 2
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
</script>

<template>
  <svg class="sparkline" viewBox="0 0 100 56" preserveAspectRatio="none">
    <path
      :d="buildPath(data)"
      fill="none"
      :stroke="color"
      stroke-width="1.5"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<style scoped>
.sparkline {
  width: 100%;
  height: 100%;
  display: block;
}
</style>

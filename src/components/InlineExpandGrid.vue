<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  /** Field name or resolver `(item) => key` */
  itemKey: { type: [String, Function], default: 'id' },
  activeKey: { type: [String, Number, null], default: null },
  columns: { type: Number, default: 2 },
})

function resolveKey(item) {
  if (typeof props.itemKey === 'function') return props.itemKey(item)
  return item?.[props.itemKey]
}

function isExpanded(item) {
  return props.activeKey != null && resolveKey(item) === props.activeKey
}

const gridStyle = computed(() => ({
  '--ieg-cols': String(Math.max(1, props.columns)),
}))
</script>

<template>
  <div class="inline-expand-grid" :style="gridStyle">
    <template v-for="item in items" :key="resolveKey(item)">
      <div class="inline-expand-grid__cell">
        <slot
          name="card"
          :item="item"
          :expanded="isExpanded(item)"
          :key-value="resolveKey(item)"
        />
      </div>

      <div
        v-if="isExpanded(item)"
        class="inline-expand-grid__expand"
      >
        <slot name="expand" :item="item" :key-value="resolveKey(item)" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.inline-expand-grid {
  display: grid;
  grid-template-columns: repeat(var(--ieg-cols, 2), minmax(0, 1fr));
  gap: 8px;
  align-items: stretch;
}

.inline-expand-grid__cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.inline-expand-grid__expand {
  grid-column: 1 / -1;
  min-width: 0;
}

@media (max-width: 900px) {
  .inline-expand-grid {
    grid-template-columns: 1fr;
  }
}
</style>

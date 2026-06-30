<script setup>
import { computed } from 'vue'
import CountryNodeCard from '../CountryNodeCard.vue'

const props = defineProps({
  item: { type: Object, required: true },
  active: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
})

defineEmits(['click'])

const onlineCount = computed(() => {
  if (typeof props.item.online === 'number') return props.item.online
  return props.item.nodeCount
})

const onlineRate = computed(() => {
  if (!props.item.nodeCount) return 0
  return Math.round((onlineCount.value / props.item.nodeCount) * 100)
})

const bestDelay = computed(() => props.item.bestDelay ?? 0)
</script>

<template>
  <CountryNodeCard
    variant="group"
    :code="item.code || 'GLOBAL'"
    :name="item.label || item.name"
    :effective-node="item.updatedAt !== '—' ? `更新 ${item.updatedAt}` : `${item.nodeCount} 节点`"
    :total="item.nodeCount"
    :available="onlineCount"
    :online-rate="onlineRate"
    :best-delay="bestDelay"
    :selectable="selectable"
    :editing="selectable && active"
    @click="selectable && $emit('click')"
  />
</template>

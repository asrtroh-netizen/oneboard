<script setup>
/**
 * @deprecated 请使用 DashboardCountryCard.vue
 */
import DashboardCountryCard from './DashboardCountryCard.vue'

const props = defineProps({
  code: { type: String, required: true },
  name: { type: String, required: true },
  count: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  tint: { type: Number, default: 0 },
})
</script>

<template>
  <DashboardCountryCard
    :code="code"
    :name="name"
    :total="total || count"
    :available="count"
    :online-rate="total ? Math.round((count / total) * 100) : (count > 0 ? 100 : 0)"
  />
</template>

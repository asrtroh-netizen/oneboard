<script setup>
defineProps({
  visual: { type: Object, required: true },
  alt: { type: String, default: '' },
})
</script>

<template>
  <span
    class="semantic-card-logo"
    :class="{
      'is-flag': visual.kind === 'flag',
      'is-brand': visual.kind === 'semantic',
    }"
  >
    <img :src="visual.logo" :alt="alt" loading="lazy" />
  </span>
</template>

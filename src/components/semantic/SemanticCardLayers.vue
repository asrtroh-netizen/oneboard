<script setup>
/**
 * 语义视觉卡片 — 四层结构：LOGO(内容区) + BACKGROUND + OVERLAY + CONTENT(slot)
 */
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  visual: { type: Object, required: true },
  rootTag: { type: String, default: 'article' },
  /** Dashboard 国家卡片：全幅 cover + 氛围渐变 + 噪点层 */
  atmospheric: { type: Boolean, default: false },
  /** 节点页 WIFI 组卡片：独立复刻 Dashboard 氛围（不与 atmospheric 联动） */
  nodeAtmospheric: { type: Boolean, default: false },
})

const overlayClass = computed(() => 'cine-flag-blend')
</script>

<template>
  <component
    :is="rootTag"
    class="semantic-card-layers has-semantic-bg"
    :class="[
      `semantic-${visual.category}`,
      visual.kind === 'flag' ? 'is-flag' : 'is-semantic',
      { 'is-atmospheric': atmospheric, 'is-node-atmo': nodeAtmospheric },
    ]"
    :data-semantic-theme="visual.theme"
    :data-semantic-category="visual.category"
    v-bind="$attrs"
  >
    <img
      class="semantic-card-layers__bg cine-bg-flag"
      :src="visual.background"
      alt=""
      loading="lazy"
      aria-hidden="true"
    />
    <div
      class="semantic-card-layers__overlay"
      :class="overlayClass"
      aria-hidden="true"
    />
    <div class="semantic-card-layers__noise" aria-hidden="true" />
    <div class="semantic-card-layers__rim" aria-hidden="true" />
    <div class="semantic-card-layers__content">
      <slot />
    </div>
  </component>
</template>

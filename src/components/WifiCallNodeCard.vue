<script setup>
import { computed } from 'vue'
import { proxyVisualSrc } from '../utils/proxyVisual'

const props = defineProps({
  code: { type: String, required: true },
  name: { type: String, required: true },
  count: { type: Number, default: 0 },
  tint: { type: Number, default: 0 },
  active: { type: Boolean, default: false },
  delay: { type: Number, default: null },
})

const visualSrc = computed(() => proxyVisualSrc(props.code))

defineEmits(['click'])

const statusText = computed(() => {
  if (props.active) return '当前调度'
  if (props.count > 0) return '点击选择'
  return '暂无节点'
})
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="sub-card subscription-card"
    :class="[`tint-${tint % 4}`, { active }]"
    :data-region="code === 'GLOBAL' ? 'GLOBAL' : code"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
  >
    <div class="sub-scrim" aria-hidden="true"></div>

    <div class="sub-icon">
      <img class="sub-icon-flag" :src="visualSrc" :alt="name" loading="lazy" />
    </div>

    <div class="sub-body">
      <div class="sub-title-row">
        <span class="sub-name">{{ name }}</span>
        <span class="sub-count">
          {{ count }}
          <span class="sub-unit">节点</span>
        </span>
      </div>
      <div class="sub-meta">
        <span class="sub-code">{{ code === 'GLOBAL' ? '通用' : code }}</span>
        <span class="meta-dot">·</span>
        <span>{{ statusText }}</span>
      </div>
    </div>

    <span v-if="delay != null && count > 0" class="sub-delay">{{ delay }} ms</span>

    <img
      class="sub-watermark"
      :class="{ 'sub-watermark-global-img': !flagSrc }"
      :src="visualSrc"
      :alt="name"
      loading="lazy"
    />
  </div>
</template>

<style scoped>
.sub-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 96px 14px 14px;
  border-radius: 16px;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  backdrop-filter: blur(16px) saturate(var(--glass-saturate, 112%));
  -webkit-backdrop-filter: blur(16px) saturate(var(--glass-saturate, 112%));
  border: 1px solid rgba(255, 255, 255, 0.05);
  min-height: 76px;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}

.sub-card:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.08);
}

.sub-card.active {
  border-color: rgba(96, 165, 250, 0.35);
}

.tint-0,
.tint-1,
.tint-2,
.tint-3 {
  /* 底色与光感由 polish.css .subscription-card 控制 */
}

/* 左侧 scrim 由 polish.css .subscription-card 控制 */
.sub-scrim {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 46%;
  z-index: 2;
  pointer-events: none;
}

.sub-icon {
  position: relative;
  z-index: 2;
  height: 44px;
  width: calc(44px * 3 / 2);
  aspect-ratio: 3 / 2;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.sub-icon-flag {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.sub-body {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 2;
}

.sub-title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.sub-name {
  min-width: 0;
}

.sub-count {
  line-height: 1;
}

.sub-unit {
  padding: 2px 7px;
  margin-left: 4px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
}

.sub-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.sub-code {
  padding: 2px 8px;
  border-radius: 6px;
  font-family: var(--mono);
  background: rgba(255, 255, 255, 0.06);
}

.meta-dot { opacity: 0.4; }

/* 延迟放大 100%，独立定位到右侧 */
.sub-delay {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  line-height: 1;
  pointer-events: none;
}

.sub-watermark {
  position: absolute;
  right: -60px;
  top: 50%;
  width: 540px;
  height: auto;
  transform: translateY(-50%) rotate(-14deg);
  opacity: 0.46;
  pointer-events: none;
  z-index: 1;
  filter: saturate(1.12) brightness(1.18);
  -webkit-mask-image: radial-gradient(
    ellipse 88% 120% at 72% 50%,
    #000 0%,
    rgba(0, 0, 0, 0.85) 35%,
    rgba(0, 0, 0, 0.45) 58%,
    transparent 78%
  );
  mask-image: radial-gradient(
    ellipse 88% 120% at 72% 50%,
    #000 0%,
    rgba(0, 0, 0, 0.85) 35%,
    rgba(0, 0, 0, 0.45) 58%,
    transparent 78%
  );
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.sub-watermark-global-img {
  width: 280px;
  right: -20px;
  opacity: 0.32;
  filter: saturate(1.1) brightness(1.15);
}

.sub-watermark-global {
  position: absolute;
  right: -50px;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 320px;
  line-height: 1;
  width: auto;
  opacity: 0.2;
  transform: translateY(-50%) rotate(-8deg);
  pointer-events: none;
  z-index: 0;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.3) 12%,
    #000 28%,
    #000 72%,
    rgba(0, 0, 0, 0.3) 88%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.3) 12%,
    #000 28%,
    #000 72%,
    rgba(0, 0, 0, 0.3) 88%,
    transparent 100%
  );
}

@media (max-width: 640px) {
  .sub-card { padding-right: 84px; }
  .sub-delay { right: 14px; }
  .sub-watermark { width: 360px; right: -40px; }
  .sub-watermark-global { font-size: 220px; right: -30px; }
}
</style>

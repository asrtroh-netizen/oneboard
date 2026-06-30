<script setup>
import { computed } from 'vue'
import { getFlagAssetPath } from '../utils/countryRegistry'
import MIcon from './MIcon.vue'

const props = defineProps({
  rule: { type: Object, required: true },
  tint: { type: Number, default: 0 },
})

defineEmits(['toggle', 'edit', 'copy', 'delete'])

const flagImageSrc = computed(() => {
  const w = props.rule.watermark
  if (w?.type === 'flag' && w.code) {
    return getFlagAssetPath(w.code)
  }
  return null
})

const flagRegion = computed(() => {
  const w = props.rule.watermark
  if (w?.type === 'flag' && w.code) return w.code.toUpperCase()
  return undefined
})

const outboundLabel = computed(() => {
  const r = props.rule
  if (r.outbound === '直连') return '直连'
  if (r.outbound === 'REJECT') return '拒绝'
  if (r.outboundTarget) return `节点组 · ${r.outboundTarget}`
  return r.outbound
})
</script>

<template>
  <article
    class="rule-card"
    :class="[`tint-${tint % 4}`, { disabled: !rule.enabled }]"
    :data-region="flagRegion"
  >
    <div class="sub-scrim" aria-hidden="true"></div>

    <div class="sub-icon">
      <img
        v-if="flagImageSrc"
        class="sub-icon-flag"
        :src="flagImageSrc"
        :alt="rule.name"
        loading="lazy"
      />
      <MIcon v-else-if="rule.icon" :name="rule.icon" size="sm" />
      <MIcon v-else name="rule" size="sm" />
    </div>

    <div class="sub-body">
      <div class="sub-title-row">
        <span class="sub-name">{{ rule.name }}</span>
        <span class="sub-count">
          {{ rule.count }}
          <span class="sub-unit">规则</span>
        </span>
      </div>
      <div class="sub-meta">
        <span class="sub-code">{{ rule.matchMode }}</span>
        <span class="meta-dot">·</span>
        <span class="meta-outbound">{{ outboundLabel }}</span>
      </div>
    </div>

    <div class="rule-actions">
      <button
        type="button"
        class="action-btn warn"
        :title="rule.enabled ? '暂停' : '启用'"
        @click="$emit('toggle', rule)"
      >
        <svg v-if="rule.enabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
      <button type="button" class="action-btn" title="编辑" @click="$emit('edit', rule)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button type="button" class="action-btn success" title="复制" @click="$emit('copy', rule)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      </button>
      <button type="button" class="action-btn danger" title="删除" @click="$emit('delete', rule)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2"/></svg>
      </button>
    </div>

    <img
      v-if="flagImageSrc"
      class="sub-watermark"
      :src="flagImageSrc"
      :alt="rule.name"
      loading="lazy"
    />
    <div v-else-if="watermarkEmoji" class="sub-watermark sub-watermark-emoji" aria-hidden="true">
      {{ watermarkEmoji }}
    </div>
  </article>
</template>

<style scoped>
.rule-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 130px 14px 14px;
  border-radius: 16px;
  overflow: hidden;
  min-height: 76px;
  backdrop-filter: blur(16px) saturate(var(--glass-saturate, 112%));
  -webkit-backdrop-filter: blur(16px) saturate(var(--glass-saturate, 112%));
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: var(--glass-shadow, 0 10px 40px rgba(0, 0, 0, 0.52)), var(--glass-shadow-inset);
  transition: border-color 0.2s, transform 0.15s;
}

.rule-card:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 44px rgba(0, 0, 0, 0.58), var(--glass-shadow-inset);
}

.rule-card.disabled { opacity: 0.72; }

.tint-0 {
  background:
    radial-gradient(ellipse 80% 100% at 0% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 60%),
    linear-gradient(165deg, rgba(14, 15, 22, 0.94) 0%, rgba(8, 9, 14, 0.97) 100%);
}

.tint-1 {
  background:
    radial-gradient(ellipse 80% 100% at 0% 50%, rgba(167, 139, 250, 0.09) 0%, transparent 60%),
    linear-gradient(165deg, rgba(18, 15, 24, 0.94) 0%, rgba(10, 8, 14, 0.97) 100%);
}

.tint-2 {
  background:
    radial-gradient(ellipse 80% 100% at 0% 50%, rgba(52, 211, 153, 0.08) 0%, transparent 60%),
    linear-gradient(165deg, rgba(12, 18, 16, 0.94) 0%, rgba(7, 11, 10, 0.97) 100%);
}

.tint-3 {
  background:
    radial-gradient(ellipse 80% 100% at 0% 50%, rgba(251, 146, 60, 0.08) 0%, transparent 60%),
    linear-gradient(165deg, rgba(22, 18, 14, 0.94) 0%, rgba(12, 10, 8, 0.97) 100%);
}

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
  z-index: 3;
  height: 44px;
  width: calc(44px * 3 / 2);
  aspect-ratio: 3 / 2;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: var(--orange);
}

.sub-icon-flag {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.icon-emoji { font-size: 22px; line-height: 1; }

.icon-emoji-fill {
  font-size: 28px;
  line-height: 1;
  transform: scale(1.05);
}

.sub-body {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 3;
}

.sub-title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.sub-name {
  max-width: 100%;
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

.meta-outbound {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-actions {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  backdrop-filter: blur(4px);
}

.action-btn svg { width: 13px; height: 13px; }
.action-btn:hover { background: rgba(255, 255, 255, 0.12); color: var(--text-primary); }
.action-btn.warn { color: var(--warning); }
.action-btn.success { color: var(--green); }
.action-btn.danger { color: var(--danger); }

.sub-watermark {
  position: absolute;
  right: -60px;
  top: 50%;
  width: 540px;
  height: auto;
  transform: translateY(-50%) rotate(-14deg);
  opacity: 0.64;
  pointer-events: none;
  z-index: 1;
  filter: saturate(1.14) brightness(0.9);
  -webkit-mask-image: radial-gradient(
    ellipse 92% 130% at 72% 50%,
    #000 0%,
    rgba(0, 0, 0, 0.88) 32%,
    rgba(0, 0, 0, 0.42) 56%,
    transparent 82%
  );
  mask-image: radial-gradient(
    ellipse 92% 130% at 72% 50%,
    #000 0%,
    rgba(0, 0, 0, 0.88) 32%,
    rgba(0, 0, 0, 0.42) 56%,
    transparent 82%
  );
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.sub-watermark-emoji {
  position: absolute;
  right: -50px;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 320px;
  line-height: 1;
  width: auto;
  opacity: 0.32;
  transform: translateY(-50%) rotate(-8deg);
  pointer-events: none;
  z-index: 1;
  filter: saturate(1.1) brightness(1.15);
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
}

@media (max-width: 640px) {
  .rule-card { padding-right: 118px; }
  .sub-watermark { width: 360px; right: -40px; }
  .sub-watermark-emoji { font-size: 220px; right: -30px; }
}
</style>

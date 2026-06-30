<script setup>
import { computed } from 'vue'

const props = defineProps({
  bucket: { type: Object, required: true },
  tint: { type: Number, default: 0 },
})

defineEmits(['edit'])
</script>

<template>
  <article class="semantic-bucket-card" :class="[`tint-${tint % 4}`]">
    <div class="bucket-icon">{{ bucket.emoji }}</div>
    <div class="bucket-body">
      <div class="bucket-title-row">
        <span class="bucket-title">{{ bucket.title }}</span>
        <span class="bucket-count">{{ bucket.count }}<span class="bucket-unit">条</span></span>
      </div>
      <p class="bucket-desc">{{ bucket.description }}</p>
      <p v-if="bucket.hint" class="bucket-hint">{{ bucket.hint }}</p>
      <div class="bucket-meta">
        <span class="bucket-tag">策略聚合</span>
        <span class="meta-dot">·</span>
        <span class="bucket-outbound">{{ bucket.outbound }}</span>
      </div>
    </div>
    <button type="button" class="bucket-edit" title="批量编辑" @click="$emit('edit', bucket)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </button>
  </article>
</template>

<style scoped>
.semantic-bucket-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 44px 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 72px;
  overflow: hidden;
  backdrop-filter: blur(12px);
  box-shadow: var(--cine-inner-shadow);
  transition:
    border-color 0.25s ease,
    box-shadow 0.3s ease;
}

.semantic-bucket-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: var(--cine-semantic-gradient);
}

.semantic-bucket-card:hover {
  box-shadow: var(--cine-panel-hover-glow), var(--cine-inner-shadow);
}

.bucket-icon,
.bucket-body,
.bucket-edit {
  position: relative;
  z-index: 4;
}

.tint-0 {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(14, 15, 22, 0.92) 100%);
}
.tint-1 {
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(14, 15, 22, 0.92) 100%);
}
.tint-2 {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(14, 15, 22, 0.92) 100%);
}
.tint-3 {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(14, 15, 22, 0.92) 100%);
}

.bucket-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 22px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.bucket-body {
  flex: 1;
  min-width: 0;
}

.bucket-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.bucket-title {
  min-width: 0;
}

.bucket-count {
  line-height: 1;
}

.bucket-unit {
  margin-left: 2px;
}

.bucket-desc {
  margin: 4px 0 0;
  line-height: 1.4;
}

.bucket-hint {
  margin: 3px 0 0;
}

.bucket-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.bucket-tag {
  padding: 1px 7px;
  border-radius: 5px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.25);
}

.meta-dot { opacity: 0.35; }

.bucket-outbound {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bucket-edit {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.bucket-edit svg { width: 13px; height: 13px; }
.bucket-edit:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
</style>

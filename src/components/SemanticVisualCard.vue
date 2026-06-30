<script setup>
import { computed } from 'vue'
import { resolveSemanticVisual } from '../utils/semanticVisual'
import SemanticCardLayers from './semantic/SemanticCardLayers.vue'

const props = defineProps({
  code: { type: String, default: '' },
  label: { type: String, default: '' },
  selectable: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
  editing: { type: Boolean, default: false },
  muted: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  row: { type: Boolean, default: false },
  theme: { type: String, default: '' },
})

defineEmits(['click'])

const visual = computed(() => resolveSemanticVisual(props.code, props.label))

const rootClass = computed(() => ({
  'is-selectable': props.selectable,
  'is-active': props.active,
  'is-editing': props.editing,
  'is-muted': props.muted,
  'is-compact': props.compact,
  'is-row': props.row,
  'has-semantic-bg': true,
  'is-flag': visual.value.kind === 'flag',
  'is-semantic': visual.value.kind === 'semantic',
  [`semantic-${visual.value.category}`]: true,
  [`svc-theme-${visual.value.theme}`]: true,
}))
</script>

<template>
  <SemanticCardLayers
    :visual="visual"
    :root-tag="selectable ? 'button' : 'article'"
    class="semantic-visual-card"
    :class="rootClass"
    :data-bg-theme="visual.theme"
    :type="selectable ? 'button' : undefined"
    :tabindex="selectable ? 0 : undefined"
    @click="selectable && $emit('click')"
    @keydown.enter="selectable && $emit('click')"
  >
    <div class="svc-body">
      <div class="svc-info">
        <slot name="info" />
      </div>
      <div v-if="$slots.aside" class="svc-aside">
        <slot name="aside" />
      </div>
    </div>

    <div v-if="$slots.footer" class="svc-footer">
      <slot name="footer" />
    </div>
  </SemanticCardLayers>
</template>

<style scoped>
.semantic-visual-card {
  position: relative;
  display: block;
  width: 100%;
  min-height: 72px;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(96, 165, 250, 0.22);
  border-radius: var(--radius-card-sm, 14px);
  overflow: hidden;
  background: #0a0c10;
  text-align: left;
  color: inherit;
  font: inherit;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.2s ease;
}

.semantic-visual-card.is-selectable {
  cursor: pointer;
  user-select: none;
}

.semantic-visual-card.is-selectable:focus-visible {
  outline: 2px solid rgba(96, 165, 250, 0.65);
  outline-offset: 2px;
}

.semantic-visual-card:hover {
  border-color: rgba(96, 165, 250, 0.45);
  box-shadow: var(--cine-hover-glow);
  transform: translateY(-1px);
}

.semantic-visual-card.is-active {
  border-color: rgba(52, 211, 153, 0.65);
  box-shadow: var(--cine-active-glow);
}

.semantic-visual-card.is-editing {
  border-color: rgba(96, 165, 250, 0.5);
}

.svc-body {
  position: relative;
  z-index: 4;
  display: grid;
  grid-template-columns: minmax(0, 38%) minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 72px;
  padding: 10px 14px;
}

.svc-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.svc-aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.svc-footer {
  position: relative;
  z-index: 3;
}

/* ── Shared badge tokens (deep slots) ── */
.semantic-visual-card :deep(.svc-thumb) {
  flex-shrink: 0;
  width: 36px;
  aspect-ratio: 3 / 2;
  border-radius: 7px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.24);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  background: rgba(0, 0, 0, 0.25);
}

.semantic-visual-card :deep(.svc-thumb img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.semantic-visual-card :deep(.svc-title) {
  min-width: 0;
}

.semantic-visual-card :deep(.svc-code) {
  display: inline-flex;
  align-self: flex-start;
  padding: 1px 7px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.semantic-visual-card :deep(.svc-status) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  backdrop-filter: blur(6px);
}

.semantic-visual-card :deep(.svc-status.on) {
  background: rgba(52, 211, 153, 0.14);
  border-color: rgba(52, 211, 153, 0.35);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.18);
}

.semantic-visual-card :deep(.svc-status.off) {
  background: rgba(248, 113, 113, 0.14);
  border-color: rgba(248, 113, 113, 0.35);
}

.semantic-visual-card :deep(.svc-status.effective) {
  background: rgba(52, 211, 153, 0.24);
  border-color: rgba(52, 211, 153, 0.55);
  box-shadow: 0 0 14px rgba(52, 211, 153, 0.32);
}

.semantic-visual-card :deep(.svc-status-dot) {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.semantic-visual-card :deep(.svc-action) {
  padding: 4px 12px;
  border-radius: 7px;
  background: rgba(52, 211, 153, 0.16);
  border: 1px solid rgba(52, 211, 153, 0.38);
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.15s ease;
}

.semantic-visual-card :deep(.svc-action:hover) {
  background: rgba(52, 211, 153, 0.28);
}

.semantic-visual-card :deep(.svc-info-row) {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.semantic-visual-card :deep(.svc-stat) {
  font-variant-numeric: tabular-nums;
}

/* ── Compact ── */
.semantic-visual-card.is-compact {
  min-height: 62px;
  border-radius: 10px;
}

.semantic-visual-card.is-compact:hover {
  transform: none;
}

.semantic-visual-card.is-compact .svc-body {
  min-height: 62px;
  padding: 8px 10px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.semantic-visual-card.is-compact :deep(.svc-thumb) {
  width: 32px;
  border-radius: 6px;
}

.semantic-visual-card.is-compact :deep(.svc-delay) {
  padding: 2px 8px;
}

/* ── Row variant (Rules group) ── */
.semantic-visual-card.is-row {
  min-height: 44px;
  border-radius: 10px;
}

.semantic-visual-card.is-row .svc-body {
  min-height: 44px;
  padding: 6px 10px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.semantic-visual-card.is-row :deep(.svc-thumb) {
  width: 30px;
  border-radius: 5px;
}
</style>

<script setup>
/**
 * Rules GROUP 行 — 语义四层视觉资产（独立组件）
 */
import { computed } from 'vue'
import { resolveSemanticVisual } from '../utils/semanticVisual'
import SemanticCardLayers from './semantic/SemanticCardLayers.vue'
import SemanticCardLogo from './semantic/SemanticCardLogo.vue'

const props = defineProps({
  label: { type: String, required: true },
  groupName: { type: String, default: '' },
  blockName: { type: String, default: '' },
  ruleCount: { type: Number, default: 0 },
  active: { type: Boolean, default: false },
})

defineEmits(['toggle'])

const visual = computed(() => resolveSemanticVisual('', props.groupName || props.label, props.blockName))
</script>

<template>
  <SemanticCardLayers
    :visual="visual"
    class="rule-group-card"
    :class="{ 'is-active': active }"
  >
    <div class="rgc-body">
      <div class="rgc-info">
        <button
          type="button"
          class="rgc-toggle"
          :aria-expanded="active"
          @click="$emit('toggle')"
        >
          <span class="rgc-chevron" :class="{ open: active }">›</span>
          <SemanticCardLogo :visual="visual" :alt="label" />
          <div class="rgc-meta">
            <span class="rgc-title">{{ label }}</span>
            <span class="rgc-count">{{ ruleCount }} 条</span>
          </div>
        </button>
      </div>

      <div v-if="active" class="rgc-aside">
        <span class="rgc-status">
          <span class="rgc-status-dot" />展开中
        </span>
      </div>
    </div>
  </SemanticCardLayers>
</template>

<style scoped>
.rule-group-card {
  display: block;
  width: 100%;
  min-height: 84px;
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

.rule-group-card:hover {
  border-color: rgba(96, 165, 250, 0.45);
  box-shadow: var(--cine-hover-glow);
  transform: translateY(-1px);
}

.rule-group-card.is-active {
  border-color: rgba(52, 211, 153, 0.65);
  box-shadow: var(--cine-active-glow);
}

.rgc-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 84px;
  padding: 10px 14px;
}

.rgc-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.rgc-chevron {
  flex-shrink: 0;
  width: 14px;
  text-align: center;
  line-height: 1;
  transition: transform 0.2s ease, color 0.2s ease;
}

.rgc-chevron.open {
  transform: rotate(90deg);
}

.rgc-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rgc-title {
  min-width: 0;
}

.rgc-count {
  display: inline-flex;
  align-self: flex-start;
  padding: 1px 7px;
  border-radius: 5px;
  font-variant-numeric: tabular-nums;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.rgc-aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
}

.rgc-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.14);
  border: 1px solid rgba(52, 211, 153, 0.35);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.18);
  backdrop-filter: blur(6px);
}

.rgc-status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
</style>

<script setup>
import { computed } from 'vue'
import { resolveSemanticVisual } from '../utils/semanticVisual'
import { proxyFlagWatermarkStyle } from '../utils/proxyVisual'
import { formatNodeDisplayName, delayTierClass } from '../utils/countryNodes'
import SemanticCardLayers from './semantic/SemanticCardLayers.vue'
import SemanticCardLogo from './semantic/SemanticCardLogo.vue'

const props = defineProps({
  code: { type: String, required: true },
  name: { type: String, required: true },
  total: { type: Number, default: 0 },
  available: { type: Number, default: 0 },
  onlineRate: { type: Number, default: 0 },
  bestDelay: { type: Number, default: 0 },
  variant: { type: String, default: 'stats' },
  selectable: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
  editing: { type: Boolean, default: false },
  flagOnEffectiveOnly: { type: Boolean, default: false },
  effectiveNode: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})

defineEmits(['click'])

const isOnline = computed(() => props.available > 0)

const visual = computed(() => resolveSemanticVisual(props.code, props.name))
const flagStyle = computed(() => proxyFlagWatermarkStyle(props.code))

const showMetaInline = computed(() => props.variant === 'node' || props.flagOnEffectiveOnly)

const statusEffective = computed(() =>
  (props.variant === 'node' || props.flagOnEffectiveOnly) && props.active,
)

const statusClass = computed(() => {
  if (props.editing && props.variant === 'group') return 'active'
  if (statusEffective.value) return 'success'
  if (props.variant === 'group' && props.effectiveNode) return 'success'
  if (isOnline.value) return 'success'
  if (props.variant === 'group' && !props.effectiveNode) return 'fallback'
  return 'error'
})

const delayClass = computed(() => delayTierClass(props.bestDelay))

const statusLabel = computed(() => {
  if (statusEffective.value) return '生效中'
  if (props.variant === 'group' && props.editing) return '编辑中'
  if (props.variant === 'group' && props.effectiveNode) return '已生效'
  return isOnline.value ? '在线' : '离线'
})

const displayCode = computed(() => {
  const c = String(props.code || '').toUpperCase()
  if (c && c !== 'GLOBAL') return c === 'GB' ? 'UK' : c
  return 'GLOBAL'
})

const showAsideStats = computed(() =>
  !props.compact && (props.variant === 'stats' || props.variant === 'group') && !showMetaInline.value,
)

const rootTag = computed(() => (props.selectable ? 'button' : 'article'))

const cardActive = computed(() =>
  props.active && (props.variant === 'node' || props.flagOnEffectiveOnly),
)

const nodeAtmosphericEnabled = computed(() => {
  if (props.flagOnEffectiveOnly) return props.active
  return !props.compact
})

const displayName = computed(() => formatNodeDisplayName(props.name))
const displayEffectiveNode = computed(() => formatNodeDisplayName(props.effectiveNode))
</script>

<template>
  <SemanticCardLayers
    :visual="visual"
    :root-tag="rootTag"
    :node-atmospheric="nodeAtmosphericEnabled"
    class="country-node-card"
    :class="{
      'is-selectable': selectable,
      'is-active': cardActive,
      'is-editing': editing && variant === 'group',
      'is-muted': flagOnEffectiveOnly && !active,
      'is-compact': compact,
      [`variant-${variant}`]: true,
    }"
    :data-region="code"
    :style="flagStyle"
    :type="selectable ? 'button' : undefined"
    :tabindex="selectable ? 0 : undefined"
    @click="selectable && $emit('click')"
    @keydown.enter="selectable && $emit('click')"
  >
    <div class="cnc-body">
      <div class="cnc-info">
        <div class="cnc-info-row">
          <SemanticCardLogo :visual="visual" :alt="name" />
          <div class="cnc-meta">
            <span class="cnc-title">{{ displayName }}</span>
            <span
              v-if="variant === 'group' && effectiveNode"
              class="cnc-effective"
            >→ {{ displayEffectiveNode }}</span>
            <span
              v-else-if="variant === 'group'"
              class="cnc-effective empty"
            >未选择节点</span>
            <span v-else class="cnc-code">{{ displayCode }}</span>

            <div v-if="showAsideStats" class="cnc-meta-delay">
              <span
                v-if="bestDelay > 0"
                class="cnc-delay"
                :class="delayClass"
              >{{ bestDelay }} ms</span>
              <span v-else class="cnc-delay cnc-delay--ghost" aria-hidden="true">0 ms</span>
            </div>

            <div v-if="showMetaInline" class="cnc-badges-inline">
              <span class="cnc-status" :class="statusClass">
                <span class="cnc-status-dot" />{{ statusLabel }}
              </span>
              <span v-if="bestDelay > 0" class="cnc-delay" :class="delayClass">{{ bestDelay }} ms</span>
            </div>
          </div>
        </div>
      </div>

      <div class="cnc-aside">
        <template v-if="showAsideStats">
          <span class="cnc-status" :class="statusClass">
            <span class="cnc-status-dot" />{{ statusLabel }}
          </span>
          <div class="cnc-aside-stat">
            <span class="cnc-stat">
              <span class="avail">{{ available }}</span><span class="sep">/</span>{{ total }}
            </span>
            <span class="cnc-sub">可用 / 全部 · {{ onlineRate }}%</span>
          </div>
        </template>
        <template v-else>
          <span v-if="bestDelay > 0 && !showMetaInline" class="cnc-delay" :class="delayClass">{{ bestDelay }} ms</span>
          <span v-if="!showMetaInline" class="cnc-status" :class="statusClass">
            <span class="cnc-status-dot" />{{ statusLabel }}
          </span>
        </template>
      </div>
    </div>
  </SemanticCardLayers>
</template>

<style scoped>
.country-node-card {
  position: relative;
  display: block;
  width: 100%;
  min-height: 56px;
  height: 100%;
  margin: 0;
  padding: 0;
  border-radius: var(--radius-card-sm, 14px);
  overflow: hidden;
  background: var(--ob-card-bg);
  text-align: left;
  color: inherit;
  font: inherit;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.2s ease;
}

.country-node-card.is-selectable {
  cursor: pointer;
  user-select: none;
}

.country-node-card.is-selectable:focus-visible {
  outline: 2px solid rgba(96, 165, 250, 0.65);
  outline-offset: 2px;
}

.country-node-card.is-compact:hover {
  transform: none;
}

.country-node-card.is-compact.is-muted:hover {
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: none;
}

.country-node-card.is-compact:not(.is-muted):hover {
  border-color: rgba(255, 255, 255, 0.1);
}

.cnc-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 56px;
  padding: 6px 12px;
}

.cnc-info {
  min-width: 0;
}

.cnc-aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 14px;
  min-width: 88px;
  flex-shrink: 0;
  padding-left: 4px;
}

.country-node-card:not(.is-compact) .cnc-title {
  line-height: 1.25;
}

.country-node-card:not(.is-compact) {
  min-height: 100px;
  background: var(--ob-card-bg);
}

.country-node-card:not(.is-compact) .cnc-body {
  min-height: 100px;
  padding: 12px 14px;
  gap: 12px;
  align-items: stretch;
}

.country-node-card:not(.is-compact) .cnc-meta {
  gap: 6px;
  justify-content: center;
}

.country-node-card:not(.is-compact) .cnc-effective {
  padding: 2px 8px;
  margin-top: 1px;
}

.cnc-meta-delay {
  display: flex;
  align-items: center;
  min-height: 24px;
  margin-top: 4px;
}

.cnc-delay--ghost {
  visibility: hidden;
  pointer-events: none;
}

.cnc-aside-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  line-height: 1.45;
}

.cnc-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.cnc-sub {
  line-height: 1.5;
  margin-top: 1px;
}

.cnc-stat {
  line-height: 1.35;
}

.cnc-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cnc-title {
  min-width: 0;
}

.cnc-code {
  display: inline-flex;
  align-self: flex-start;
  padding: 1px 7px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.cnc-effective {
  display: inline-flex;
  align-self: flex-start;
  max-width: 100%;
  padding: 0 6px;
  border-radius: 4px;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cnc-effective.empty {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.cnc-badges-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* compact — WIFICALL 节点列表 */
.country-node-card.is-compact {
  min-height: 48px;
  border-radius: 10px;
  background: #000;
  border-color: rgba(255, 255, 255, 0.07);
  box-shadow: none;
}

.country-node-card.is-compact .cnc-body {
  min-height: 48px;
  padding: 5px 8px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.country-node-card.is-compact .cnc-aside {
  gap: 6px;
}

.country-node-card.is-compact .cnc-delay {
  padding: 1px 6px;
}
</style>

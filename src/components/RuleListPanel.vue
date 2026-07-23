<script setup>
import RuleSubCard from './RuleSubCard.vue'
import WifiCallAddRuleCard from './WifiCallAddRuleCard.vue'
import { clashBackendLabel } from '../stores/clashBackend'

defineProps({
  rules: { type: Array, default: () => [] },
  group: { type: Object, default: null },
})

defineEmits(['toggle-rule', 'edit-rule', 'copy-rule', 'delete-rule', 'add-rule'])

const backendLabel = clashBackendLabel
</script>

<template>
  <div class="rule-list-panel">
    <div class="rule-list-panel-label">
      <span class="layer-tag layer-tag-rule">RULE</span>
      <span class="rule-list-panel-title">规则列表</span>
      <span class="rule-list-panel-count">{{ rules.length }} 条</span>
    </div>

    <div v-if="rules.length" class="rule-list" role="list">
      <div
        v-for="(rule, i) in rules"
        :key="rule.id"
        class="rule-list-item"
        role="listitem"
      >
        <RuleSubCard
          :rule="rule"
          :tint="rule.index ?? i"
          @toggle="$emit('toggle-rule', rule)"
          @edit="$emit('edit-rule', rule)"
          @copy="$emit('copy-rule', rule)"
          @delete="$emit('delete-rule', rule)"
        />
      </div>
      <div class="rule-list-item rule-list-item-add">
        <WifiCallAddRuleCard
          :tint="rules.length % 4"
          @click="$emit('add-rule', group)"
        />
      </div>
    </div>

    <div v-else class="rule-list-empty">
      等待 {{ backendLabel }} API 返回规则…
    </div>
  </div>
</template>

<style scoped>
.rule-list-panel {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.rule-list-panel-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.layer-tag {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  font-family: var(--mono, ui-monospace, monospace);
}

.layer-tag-rule {
  color: #fcd34d;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.28);
}

.rule-list-panel-title {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rule-list-panel-count {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  font-variant-numeric: tabular-nums;
}

.rule-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  list-style: none;
  margin: 0;
}

.rule-list-item {
  min-width: 0;
}

.rule-list-item-add {
  display: flex;
}

.rule-list-empty {
  padding: 20px 12px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

@media (max-width: 900px) {
  .rule-list {
    grid-template-columns: 1fr;
  }
}
</style>

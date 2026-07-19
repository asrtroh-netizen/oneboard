<script setup>
import { computed, ref, watch } from 'vue'
import RuleGroupRow from './RuleGroupRow.vue'

const props = defineProps({
  block: { type: Object, required: true },
  defaultOpen: { type: Boolean, default: true },
})

defineEmits([
  'edit-group',
  'toggle-rule',
  'edit-rule',
  'copy-rule',
  'delete-rule',
  'add-rule',
])

const open = ref(props.defaultOpen)

watch(() => props.block.id, () => {
  open.value = props.defaultOpen
})

const ruleCount = computed(() =>
  (props.block.groups || []).reduce((sum, group) => sum + (group.rules?.length || 0), 0),
)
</script>

<template>
  <article
    class="block-container panel-card panel-neutral section-card"
    :class="{ 'is-collapsed': !open }"
    :data-block-id="block.id"
  >
    <header class="block-container-header section-head">
      <button
        type="button"
        class="block-container-toggle"
        :aria-expanded="open"
        @click="open = !open"
      >
        <span class="block-container-chevron" :class="{ open }">›</span>
        <span class="layer-tag">BLOCK</span>
        <div class="block-container-title-wrap">
          <h2 class="panel-title-lg block-container-title">{{ block.name }}</h2>
          <p class="panel-sub block-container-meta">
            {{ block.groups.length }} 个 Group · {{ ruleCount }} 条 Rule
          </p>
        </div>
      </button>
    </header>

    <div v-show="open" class="block-container-content">
      <ul class="group-list" role="list">
        <RuleGroupRow
          v-for="group in block.groups"
          :key="group.id"
          :group="group"
          :block-name="block.name"
          @edit-group="$emit('edit-group', { block, group: $event })"
          @toggle-rule="$emit('toggle-rule', $event)"
          @edit-rule="$emit('edit-rule', $event)"
          @copy-rule="$emit('copy-rule', $event)"
          @delete-rule="$emit('delete-rule', $event)"
          @add-rule="$emit('add-rule', $event)"
        />
      </ul>

      <div v-if="!block.groups.length" class="block-empty">
        未定义 Group（==）
      </div>
    </div>
  </article>
</template>

<style scoped>
.block-container {
  overflow: hidden;
}

.block-container-header {
  padding: 0;
  margin-bottom: 14px;
  border: none;
  background: transparent;
}

.block-container.is-collapsed .block-container-header {
  margin-bottom: 0;
}

.block-container-toggle {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 2px 4px;
  margin: -2px -4px;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
}

.block-container-toggle:hover {
  background: rgba(255, 255, 255, 0.04);
}

.block-container-chevron {
  flex-shrink: 0;
  width: 16px;
  margin-top: 2px;
  text-align: center;
  font-size: 16px;
  color: var(--text-muted, rgba(255, 255, 255, 0.45));
  transition: transform 0.2s ease;
}

.block-container-chevron.open {
  transform: rotate(90deg);
}

.layer-tag {
  flex-shrink: 0;
  margin-top: 2px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  font-family: var(--mono, ui-monospace, monospace);
  color: var(--accent, #5ac8fa);
  background: var(--accent-soft, rgba(90, 200, 250, 0.14));
  border: 1px solid rgba(90, 200, 250, 0.22);
}

.block-container-title-wrap {
  flex: 1;
  min-width: 0;
}

.block-container-title {
  margin: 0 0 2px;
  line-height: 1.25;
}

.block-container-meta {
  margin: 0;
}

.block-container-content {
  padding: 0;
}

.group-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  align-items: start;
}

@media (max-width: 1200px) {
  .group-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 900px) {
  .group-list { grid-template-columns: 1fr; }
}

.block-empty {
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted, rgba(255, 255, 255, 0.45));
  border-radius: var(--radius-card-sm, 12px);
  background: var(--glass-inner, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--border-glass, rgba(255, 255, 255, 0.08));
}
</style>

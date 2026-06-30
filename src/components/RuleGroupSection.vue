<script setup>
import { ref, watch } from 'vue'
import RuleListPanel from './RuleListPanel.vue'

const props = defineProps({
  group: { type: Object, required: true },
  defaultOpen: { type: Boolean, default: true },
  index: { type: Number, default: 0 },
})

defineEmits(['toggle-rule', 'edit-rule', 'copy-rule', 'delete-rule', 'add-rule', 'edit-group'])

const open = ref(props.defaultOpen)

watch(() => props.group.id, () => {
  open.value = props.defaultOpen
})
</script>

<template>
  <div
    class="group-section"
    :class="{ 'is-collapsed': !open }"
    :data-group-id="group.id"
    role="region"
    :aria-label="`分组 ${group.name}`"
  >
    <header class="group-section-header">
      <button
        type="button"
        class="group-section-toggle"
        :aria-expanded="open"
        @click="open = !open"
      >
        <span class="group-section-chevron" :class="{ open }">›</span>
        <span class="layer-tag layer-tag-group">GROUP</span>
        <h3 class="group-section-title">{{ group.name }}</h3>
        <span class="group-section-count">{{ group.rules.length }} 条</span>
      </button>
      <button type="button" class="btn btn-ghost btn-sm" @click="$emit('edit-group', group)">
        编辑
      </button>
    </header>

    <div v-show="open" class="group-section-body">
      <RuleListPanel
        :rules="group.rules"
        :group="group"
        @toggle-rule="$emit('toggle-rule', $event)"
        @edit-rule="$emit('edit-rule', $event)"
        @copy-rule="$emit('copy-rule', $event)"
        @delete-rule="$emit('delete-rule', $event)"
        @add-rule="$emit('add-rule', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.group-section {
  position: relative;
  margin-left: 12px;
  padding-left: 14px;
  border-left: 2px solid rgba(52, 211, 153, 0.45);
  border-radius: 0 12px 12px 0;
  background: rgba(52, 211, 153, 0.04);
  overflow: hidden;
  transition: background 0.2s ease;
}

.group-section::before {
  content: '';
  position: absolute;
  left: -2px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, rgba(52, 211, 153, 0.7), rgba(52, 211, 153, 0.15));
  pointer-events: none;
}

.group-section + .group-section {
  margin-top: 12px;
}

.group-section.is-collapsed {
  background: rgba(52, 211, 153, 0.02);
}

.group-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 10px 4px;
}

.group-section-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
  min-width: 0;
}

.group-section-toggle:hover {
  background: rgba(52, 211, 153, 0.08);
}

.group-section-chevron {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
  font-size: 16px;
  line-height: 1;
  color: rgba(52, 211, 153, 0.75);
  transform: rotate(0deg);
  transition: transform 0.2s ease;
}

.group-section-chevron.open {
  transform: rotate(90deg);
}

.layer-tag {
  flex-shrink: 0;
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  font-family: var(--mono, ui-monospace, monospace);
}

.layer-tag-group {
  color: #6ee7b7;
  background: rgba(52, 211, 153, 0.14);
  border: 1px solid rgba(52, 211, 153, 0.32);
}

.group-section-title {
  flex: 1;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.94);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-section-count {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-variant-numeric: tabular-nums;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 11px;
}

.group-section-body {
  padding: 0 12px 12px 4px;
}
</style>

<script setup>
import { computed, ref, watch } from 'vue'
import RuleGroupCard from './RuleGroupCard.vue'
import RuleSemanticPanel from './RuleSemanticPanel.vue'
import { shortGroupLabel } from '../utils/rulesDsl'

const props = defineProps({
  group: { type: Object, required: true },
  blockName: { type: String, default: '' },
  defaultOpen: { type: Boolean, default: false },
})

defineEmits(['edit-group'])

const open = ref(props.defaultOpen)

watch(() => props.group.id, () => {
  open.value = props.defaultOpen
})

const label = computed(() => shortGroupLabel(props.group.name))
const ruleCount = computed(() => props.group.rules?.length || 0)
</script>

<template>
  <li
    class="group-list-item"
    :class="{ 'is-expanded': open }"
    role="listitem"
  >
    <div class="group-row-wrap">
      <RuleGroupCard
        :label="label"
        :group-name="group.name"
        :block-name="blockName"
        :rule-count="ruleCount"
        :active="open"
        @toggle="open = !open"
      />

      <div v-show="open" class="group-rules-panel">
        <RuleSemanticPanel
          :rules="group.rules"
          :group="group"
          @edit-group="$emit('edit-group', group)"
        />
      </div>
    </div>
  </li>
</template>

<style scoped>
.group-list-item {
  list-style: none;
  min-width: 0;
}

.group-list-item.is-expanded {
  grid-column: 1 / -1;
}

.group-row-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}

.group-rules-panel {
  padding: 0 2px;
}
</style>

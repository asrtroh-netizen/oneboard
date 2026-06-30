<script setup>
import MIcon from '../MIcon.vue'

defineEmits(['add'])
</script>

<template>
  <button type="button" class="sub-add-card panel-card panel-neutral section-card" @click="$emit('add')">
    <span class="sub-add-card__icon">
      <MIcon name="add" size="lg" />
    </span>
    <span class="sub-add-card__label">添加订阅</span>
    <span class="sub-add-card__hint">新建 proxy-provider</span>
  </button>
</template>

<style scoped>
.sub-add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 248px;
  height: 100%;
  padding: 20px;
  border: 1px dashed rgba(252, 211, 77, 0.32);
  border-radius: var(--radius-card, 14px);
  background: rgba(252, 211, 77, 0.03);
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.sub-add-card:hover {
  border-color: rgba(252, 211, 77, 0.55);
  background: rgba(252, 211, 77, 0.08);
  color: #fcd34d;
  transform: translateY(-1px);
}

.sub-add-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(252, 211, 77, 0.28);
  background: rgba(252, 211, 77, 0.1);
  color: #fcd34d;
}

.sub-add-card:hover .sub-add-card__hint {
  color: rgba(252, 211, 77, 0.72);
}
</style>

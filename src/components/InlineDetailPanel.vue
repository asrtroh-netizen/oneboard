<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div class="inline-detail-panel panel-card panel-neutral">
    <div class="inline-detail-panel__head">
      <div class="inline-detail-panel__head-row">
        <div class="inline-detail-panel__head-main">
          <div class="panel-title">{{ title }}</div>
          <p v-if="subtitle" class="panel-sub">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.actions" class="inline-detail-panel__actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.inline-detail-panel {
  padding: 14px;
}

.inline-detail-panel__head {
  margin-bottom: 12px;
}

.inline-detail-panel__head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.inline-detail-panel__head-main {
  min-width: 0;
  flex: 1;
}

.inline-detail-panel__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.inline-detail-panel__head .panel-title {
  margin-bottom: 4px;
}
</style>

<style>
/* 供 slot 内成员网格使用（slot 内容继承父组件 scope） */
.inline-detail-panel__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  align-items: start;
}

@media (max-width: 1100px) {
  .inline-detail-panel__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .inline-detail-panel__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .inline-detail-panel__grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup>
import MIcon from '../components/MIcon.vue'
import VoHiveInstanceCard from '../components/VoHiveInstanceCard.vue'
import { addInstance, vohiveInstances } from '../stores/vohiveInstances'
import { removeVoHiveInstanceWithSync } from '../stores/vohiveHub'

function onAdd() {
  addInstance()
}

function onRemove(id) {
  void removeVoHiveInstanceWithSync(id)
}
</script>

<template>
  <div class="vohive-lab-shell">
    <div class="vohive-instances">
      <VoHiveInstanceCard
        v-for="instance in vohiveInstances"
        :key="instance.id"
        :instance="instance"
        @remove="onRemove"
      />
    </div>

    <button type="button" class="vohive-add-btn" @click="onAdd">
      <MIcon name="add" size="sm" />
      增加设备
    </button>
  </div>
</template>

<style scoped>
.vohive-instances {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.vohive-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 22px;
  padding: 16px;
  border-radius: 16px;
  border: 1.5px dashed rgba(148, 163, 184, 0.4);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(148, 163, 184, 0.95);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.vohive-add-btn:hover {
  border-color: rgba(34, 197, 94, 0.55);
  background: rgba(34, 197, 94, 0.08);
  color: #22c55e;
}

[data-theme='light'] .vohive-add-btn {
  border-color: rgba(15, 23, 42, 0.18);
  background: rgba(15, 23, 42, 0.02);
  color: rgba(15, 23, 42, 0.6);
}
</style>

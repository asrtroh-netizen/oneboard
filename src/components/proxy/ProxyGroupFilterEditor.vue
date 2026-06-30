<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  groupName: { type: String, default: '' },
  config: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const filter = ref('')
const excludeFilter = ref('')
const parseError = ref('')

const title = computed(() => `编辑 filter · ${props.groupName || 'Proxy Group'}`)

const isDirty = computed(() => {
  const baseFilter = props.config?.filter || ''
  const baseExclude = props.config?.excludeFilter || ''
  return filter.value !== baseFilter || excludeFilter.value !== baseExclude
})

watch(
  () => [props.open, props.groupName, props.config],
  () => {
    if (!props.open) return
    filter.value = props.config?.filter || ''
    excludeFilter.value = props.config?.excludeFilter || ''
    parseError.value = ''
  },
  { immediate: true, deep: true },
)

function onReset() {
  filter.value = props.config?.filter || ''
  excludeFilter.value = props.config?.excludeFilter || ''
  parseError.value = ''
}

function onSave() {
  parseError.value = ''
  if (!String(filter.value || '').trim()) {
    parseError.value = 'filter 正则不能为空'
    return
  }
  emit('save', {
    filter: filter.value.trim(),
    excludeFilter: excludeFilter.value.trim(),
  })
}

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (!props.saving) onSave()
  }
  if (e.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="pg-filter-overlay" @click.self="$emit('close')">
        <div
          class="pg-filter panel-card glass-blue"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          @keydown="onKeydown"
        >
          <header class="pg-filter__head">
            <div class="pg-filter__head-main">
              <h2 class="pg-filter__title">{{ title }}</h2>
              <p class="pg-filter__sub">
                proxy-groups · filter / exclude-filter · Ctrl+S 保存 · 保存后自动应用到 Mihomo
                <span v-if="isDirty" class="pg-filter__dirty">· 有未保存修改</span>
              </p>
            </div>
            <button type="button" class="pg-filter__close" aria-label="关闭" @click="$emit('close')">
              ×
            </button>
          </header>

          <div class="pg-filter__body">
            <div v-if="config?.use?.length" class="pg-filter__meta">
              <span class="pg-filter__meta-label">use</span>
              <span class="pg-filter__meta-value">{{ config.use.join(', ') }}</span>
            </div>

            <label class="pg-field pg-field--full">
              <span class="pg-field__label">filter（正则）</span>
              <textarea
                v-model="filter"
                class="pg-field__textarea"
                rows="6"
                spellcheck="false"
                placeholder="^(?:(?:HK\s*)?MESL|..."
              />
            </label>

            <label class="pg-field pg-field--full">
              <span class="pg-field__label">exclude-filter（可选）</span>
              <input
                v-model="excludeFilter"
                class="pg-field__input"
                type="text"
                spellcheck="false"
                placeholder="(?i)tuic"
              >
            </label>

            <p v-if="parseError" class="pg-filter__error">{{ parseError }}</p>
            <p v-else-if="!config?.filter" class="pg-filter__hint">
              Mihomo Storage 中尚无该组 filter，保存后将写入 YAML 并自动应用到 Mihomo。
            </p>
          </div>

          <footer class="pg-filter__foot">
            <button type="button" class="btn btn-ghost" :disabled="saving" @click="$emit('close')">
              取消
            </button>
            <button type="button" class="btn btn-ghost" :disabled="!isDirty || saving" @click="onReset">
              重置
            </button>
            <button type="button" class="btn btn-primary" :disabled="saving" @click="onSave">
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pg-filter-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

.pg-filter {
  width: min(720px, 100%);
  max-height: min(90vh, 820px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pg-filter__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
}

.pg-filter__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.pg-filter__sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.pg-filter__dirty {
  color: var(--accent-warn, #f5a623);
}

.pg-filter__close {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}

.pg-filter__body {
  padding: 16px 18px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pg-filter__meta {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  color: var(--text-muted);
}

.pg-filter__meta-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.pg-filter__meta-value {
  font-family: var(--font-mono, ui-monospace, monospace);
  word-break: break-all;
}

.pg-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pg-field__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.pg-field__input,
.pg-field__textarea {
  width: 100%;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  padding: 10px 12px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 13px;
  line-height: 1.45;
}

.pg-field__textarea {
  resize: vertical;
  min-height: 120px;
}

.pg-filter__error {
  margin: 0;
  color: var(--accent-danger, #ff6b6b);
  font-size: 13px;
}

.pg-filter__hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.pg-filter__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
}
</style>

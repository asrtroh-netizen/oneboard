<script setup>
import { computed, ref, watch } from 'vue'
import { getMihomoConfigYamlStorageKey } from '../../api/mihomoYaml'

const props = defineProps({
  open: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  initialYaml: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save'])

const draft = ref('')
const applyToMihomo = ref(true)
const parseError = ref('')

const storageKey = computed(() => getMihomoConfigYamlStorageKey())

const lineCount = computed(() =>
  draft.value.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).length,
)

const sizeLabel = computed(() => {
  const bytes = new TextEncoder().encode(draft.value).length
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
})

watch(
  () => [props.open, props.initialYaml],
  () => {
    if (!props.open) return
    draft.value = props.initialYaml || ''
    applyToMihomo.value = true
    parseError.value = ''
  },
  { immediate: true },
)

function validateYaml(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return 'YAML 内容不能为空'

  const bytes = new TextEncoder().encode(trimmed).length
  if (bytes > 1024 * 1024) return 'YAML 超过 Mihomo Storage 1MB 限制'

  const hasSection = /^(proxy-groups|rules|proxies|proxy-providers):/m.test(trimmed)
  if (!hasSection) {
    return '内容需包含 proxy-groups / rules / proxies 等 Mihomo 配置段'
  }

  return ''
}

function onFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    draft.value = String(reader.result || '')
    parseError.value = ''
  }
  reader.onerror = () => {
    parseError.value = '读取文件失败'
  }
  reader.readAsText(file, 'utf-8')
  event.target.value = ''
}

function onSave() {
  parseError.value = validateYaml(draft.value)
  if (parseError.value) return

  emit('save', {
    yaml: draft.value.trim(),
    apply: applyToMihomo.value,
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
      <div v-if="open" class="yaml-import-overlay" @click.self="$emit('close')">
        <div
          class="yaml-import panel-card glass-blue"
          role="dialog"
          aria-modal="true"
          aria-label="导入 YAML 到 Mihomo Storage"
          @keydown="onKeydown"
        >
          <header class="yaml-import__head">
            <div class="yaml-import__head-main">
              <h2 class="yaml-import__title">导入 YAML 到 Mihomo Storage</h2>
              <p class="yaml-import__sub">
                写入 <code>{{ storageKey }}</code> · {{ lineCount }} 行 · {{ sizeLabel }} · Ctrl+S 导入
              </p>
            </div>
            <button type="button" class="yaml-import__close" aria-label="关闭" @click="$emit('close')">
              ×
            </button>
          </header>

          <div class="yaml-import__body">
            <div class="yaml-import__toolbar">
              <label class="yaml-import__file-btn">
                选择 .yaml 文件
                <input type="file" accept=".yaml,.yml,text/yaml" hidden @change="onFileChange">
              </label>
              <label class="yaml-import__apply">
                <input v-model="applyToMihomo" type="checkbox">
                导入后立即通过 Mihomo API 重载配置
              </label>
            </div>

            <textarea
              v-model="draft"
              class="yaml-import__textarea"
              rows="18"
              spellcheck="false"
              placeholder="粘贴完整 Mihomo config YAML（需含 proxy-groups 段）…"
            />

            <p v-if="parseError" class="yaml-import__error">{{ parseError }}</p>
            <p v-else class="yaml-import__hint">
              仅通过 Mihomo API 写入 Storage；勾选重载后会调用 PUT /configs?force=true 应用 payload。
            </p>
          </div>

          <footer class="yaml-import__foot">
            <button type="button" class="btn btn-ghost" :disabled="saving" @click="$emit('close')">
              取消
            </button>
            <button type="button" class="btn btn-primary" :disabled="saving || !draft.trim()" @click="onSave">
              {{ saving ? '导入中…' : '导入' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.yaml-import-overlay {
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

.yaml-import {
  width: min(860px, 100%);
  max-height: min(92vh, 900px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.yaml-import__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
}

.yaml-import__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.yaml-import__sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.yaml-import__sub code {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 11px;
}

.yaml-import__close {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}

.yaml-import__body {
  padding: 16px 18px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.yaml-import__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.yaml-import__file-btn {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  font-size: 12px;
  cursor: pointer;
  color: var(--text-secondary);
}

.yaml-import__file-btn:hover {
  background: rgba(255, 255, 255, 0.04);
}

.yaml-import__apply {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
}

.yaml-import__textarea {
  width: 100%;
  min-height: 360px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  padding: 12px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  line-height: 1.5;
  resize: vertical;
}

.yaml-import__error {
  margin: 0;
  color: var(--accent-danger, #ff6b6b);
  font-size: 13px;
}

.yaml-import__hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.yaml-import__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
}
</style>

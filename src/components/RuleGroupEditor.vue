<script setup>
import { computed, ref, watch } from 'vue'
import { rulesToYaml, shortGroupLabel } from '../utils/rulesDsl'

const props = defineProps({
  open: { type: Boolean, default: false },
  blockName: { type: String, default: '' },
  group: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const draft = ref('')
const parseError = ref('')

const title = computed(() => {
  if (!props.group) return 'Edit Group'
  return `Edit Group: ${shortGroupLabel(props.group.name)}`
})

const lineCount = computed(() =>
  draft.value.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).length,
)

watch(
  () => [props.open, props.group?.id],
  () => {
    if (props.open && props.group) {
      draft.value = rulesToYaml(props.group.rules)
      parseError.value = ''
    }
  },
  { immediate: true },
)

function onSave() {
  parseError.value = ''
  const lines = draft.value.split('\n').filter((l) => {
    const t = l.trim()
    return t && !t.startsWith('#')
  })

  for (const line of lines) {
    const t = line.trim()
    if (!t.startsWith('-')) {
      parseError.value = '每行规则必须以 `-` 开头（Clash YAML 格式）'
      return
    }
    const body = t.slice(1).trim()
    if (!body.includes(',')) {
      parseError.value = `无效规则行：${t}`
      return
    }
  }

  emit('save', draft.value)
}

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    onSave()
  }
  if (e.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="rule-modal-overlay" @click.self="$emit('close')">
        <div
          class="rule-modal panel-card glass-blue"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          @keydown="onKeydown"
        >
          <header class="rule-modal-head">
            <div class="rule-modal-head-main">
              <h2 class="rule-modal-title">{{ title }}</h2>
              <p v-if="blockName" class="rule-modal-sub">
                {{ blockName }} · {{ lineCount }} 条规则 · Ctrl+S 保存
              </p>
            </div>
            <button type="button" class="rule-modal-close" aria-label="关闭" @click="$emit('close')">
              ×
            </button>
          </header>

          <div class="rule-modal-body">
            <textarea
              v-model="draft"
              class="rule-modal-textarea"
              spellcheck="false"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              placeholder="- DOMAIN-SUFFIX,example.com,DIRECT"
            />
            <p v-if="parseError" class="rule-modal-error">{{ parseError }}</p>
          </div>

          <footer class="rule-modal-foot">
            <button type="button" class="btn btn-ghost" @click="$emit('close')">
              取消
            </button>
            <button type="button" class="btn btn-primary" @click="onSave">
              保存
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rule-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.rule-modal {
  display: flex;
  flex-direction: column;
  width: min(680px, 100%);
  max-height: min(82vh, 760px);
  padding: 0;
  border-radius: var(--radius-panel, 16px);
  overflow: hidden;
  box-shadow:
    var(--glass-shadow, 0 12px 48px rgba(0, 0, 0, 0.55)),
    0 0 0 1px rgba(96, 165, 250, 0.18),
    0 0 32px rgba(96, 165, 250, 0.12);
}

.rule-modal-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(96, 165, 250, 0.14);
  background: rgba(96, 165, 250, 0.05);
}

.rule-modal-head-main {
  flex: 1;
  min-width: 0;
}

.rule-modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.01em;
}

.rule-modal-sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.48);
}

.rule-modal-close {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.72);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.rule-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(96, 165, 250, 0.35);
  color: #fff;
}

.rule-modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px 20px;
}

.rule-modal-textarea {
  flex: 1;
  width: 100%;
  min-height: 280px;
  max-height: 52vh;
  padding: 14px 16px;
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: var(--radius-card-sm, 12px);
  background: rgba(0, 0, 0, 0.35);
  color: #e2e8f0;
  font-family: var(--mono, ui-monospace, 'Cascadia Code', monospace);
  font-size: 13px;
  line-height: 1.55;
  resize: vertical;
  tab-size: 2;
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.rule-modal-textarea:focus {
  border-color: rgba(96, 165, 250, 0.48);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 0 0 3px rgba(96, 165, 250, 0.14);
}

.rule-modal-error {
  margin: 10px 0 0;
  font-size: 12px;
  color: #fca5a5;
}

.rule-modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.18);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .rule-modal,
.modal-fade-leave-active .rule-modal {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .rule-modal,
.modal-fade-leave-to .rule-modal {
  transform: scale(0.96) translateY(8px);
  opacity: 0;
}
</style>

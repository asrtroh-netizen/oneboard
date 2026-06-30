<script setup>
import { computed, ref, watch } from 'vue'
import {
  defaultProviderConfig,
  formFromProviderConfig,
  providerConfigFromForm,
  providerConfigEquals,
  validateProviderConfig,
} from '../../utils/subscriptionConfig'

const props = defineProps({
  open: { type: Boolean, default: false },
  creating: { type: Boolean, default: false },
  providerName: { type: String, default: '' },
  config: { type: Object, default: null },
  proxyOptions: { type: Array, default: () => [] },
  existingNames: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'save'])

const form = ref(formFromProviderConfig(defaultProviderConfig()))
const baseline = ref(formFromProviderConfig(defaultProviderConfig()))
const draftName = ref('')
const parseError = ref('')

const title = computed(() =>
  props.creating ? '新建订阅' : `编辑订阅 · ${props.providerName || 'Provider'}`,
)

const isDirty = computed(() =>
  !providerConfigEquals(providerConfigFromForm(form.value), providerConfigFromForm(baseline.value)),
)

watch(
  () => draftName.value,
  (name) => {
    if (!props.creating || !props.open) return
    const trimmed = String(name || '').trim()
    if (trimmed) {
      form.value.path = `./providers/${trimmed}.yaml`
    }
  },
)

watch(
  () => [props.open, props.creating, props.providerName, props.config],
  () => {
    if (!props.open) return
    draftName.value = props.creating ? '' : props.providerName
    const next = formFromProviderConfig(
      props.config || defaultProviderConfig(props.providerName),
    )
    form.value = { ...next }
    baseline.value = { ...next }
    parseError.value = ''
  },
  { immediate: true, deep: true },
)

function onReset() {
  form.value = { ...baseline.value }
  parseError.value = ''
}

function onSave() {
  parseError.value = ''
  const name = props.creating ? draftName.value.trim() : props.providerName
  if (!name) {
    parseError.value = '请填写 Provider 名称'
    return
  }
  if (!/^[A-Za-z0-9_-]+$/.test(name)) {
    parseError.value = '名称仅支持字母、数字、下划线、连字符'
    return
  }
  if (props.creating && props.existingNames.includes(name)) {
    parseError.value = `「${name}」已存在`
    return
  }

  const config = providerConfigFromForm(form.value)
  const err = validateProviderConfig(config)
  if (err) {
    parseError.value = err
    return
  }
  emit('save', { name, config })
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
      <div v-if="open" class="sub-editor-overlay" @click.self="$emit('close')">
        <div
          class="sub-editor panel-card glass-blue"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          @keydown="onKeydown"
        >
          <header class="sub-editor__head">
            <div class="sub-editor__head-main">
              <h2 class="sub-editor__title">{{ title }}</h2>
              <p class="sub-editor__sub">
                可视化编辑 proxy-providers · Ctrl+S 保存
                <span v-if="isDirty" class="sub-editor__dirty">· 有未保存修改</span>
              </p>
            </div>
            <button type="button" class="sub-editor__close" aria-label="关闭" @click="$emit('close')">
              ×
            </button>
          </header>

          <div class="sub-editor__body">
            <div class="sub-editor__grid">
              <label v-if="creating" class="sub-field">
                <span class="sub-field__label">name</span>
                <input
                  v-model="draftName"
                  class="sub-field__input"
                  type="text"
                  placeholder="例如 NewSub"
                  spellcheck="false"
                >
              </label>

              <label class="sub-field sub-field--full">
                <span class="sub-field__label">url</span>
                <input
                  v-model="form.url"
                  class="sub-field__input"
                  type="url"
                  placeholder="http://..."
                  spellcheck="false"
                >
              </label>

              <label class="sub-field">
                <span class="sub-field__label">type</span>
                <input
                  v-model="form.type"
                  class="sub-field__input sub-field__input--readonly"
                  type="text"
                  readonly
                >
              </label>

              <label class="sub-field">
                <span class="sub-field__label">path</span>
                <input
                  v-model="form.path"
                  class="sub-field__input"
                  type="text"
                  spellcheck="false"
                >
              </label>

              <label class="sub-field">
                <span class="sub-field__label">interval（秒）</span>
                <input
                  v-model.number="form.interval"
                  class="sub-field__input"
                  type="number"
                  min="60"
                  step="60"
                >
                <input
                  v-model.number="form.interval"
                  class="sub-field__range"
                  type="range"
                  min="3600"
                  max="86400"
                  step="3600"
                >
              </label>

              <label class="sub-field">
                <span class="sub-field__label">proxy</span>
                <select v-model="form.proxy" class="sub-field__input">
                  <option v-for="opt in proxyOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </label>

              <div class="sub-field sub-field--toggle">
                <span class="sub-field__label">health-check.enable</span>
                <button
                  type="button"
                  class="sub-toggle"
                  :class="{ 'sub-toggle--on': form.healthCheckEnable }"
                  @click="form.healthCheckEnable = !form.healthCheckEnable"
                >
                  <span class="sub-toggle__thumb" />
                  <span class="sub-toggle__text">{{ form.healthCheckEnable ? '开启' : '关闭' }}</span>
                </button>
              </div>

              <label class="sub-field">
                <span class="sub-field__label">health-check.interval（秒）</span>
                <input
                  v-model.number="form.healthCheckInterval"
                  class="sub-field__input"
                  type="number"
                  min="30"
                  step="30"
                >
              </label>

              <label class="sub-field sub-field--full">
                <span class="sub-field__label">health-check.url</span>
                <input
                  v-model="form.healthCheckUrl"
                  class="sub-field__input"
                  type="url"
                  spellcheck="false"
                >
              </label>
            </div>

            <p v-if="parseError" class="sub-editor__error">{{ parseError }}</p>
          </div>

          <footer class="sub-editor__foot">
            <button type="button" class="btn btn-ghost" @click="$emit('close')">
              取消
            </button>
            <button type="button" class="btn btn-ghost" :disabled="!isDirty" @click="onReset">
              重置
            </button>
            <button type="button" class="btn btn-primary" @click="onSave">
              保存到 config.yaml
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sub-editor-overlay {
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

.sub-editor {
  display: flex;
  flex-direction: column;
  width: min(720px, 100%);
  max-height: min(86vh, 820px);
  padding: 0;
  border-radius: var(--radius-panel, 16px);
  overflow: hidden;
  box-shadow:
    var(--glass-shadow, 0 12px 48px rgba(0, 0, 0, 0.55)),
    0 0 0 1px rgba(252, 211, 77, 0.18),
    0 0 32px rgba(252, 211, 77, 0.1);
}

.sub-editor__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(252, 211, 77, 0.14);
  background: rgba(252, 211, 77, 0.05);
}

.sub-editor__head-main {
  flex: 1;
  min-width: 0;
}

.sub-editor__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
}

.sub-editor__sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.48);
}

.sub-editor__dirty {
  color: #fcd34d;
}

.sub-editor__close {
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
}

.sub-editor__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 20px;
}

.sub-editor__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.sub-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sub-field--full {
  grid-column: 1 / -1;
}

.sub-field--toggle {
  justify-content: flex-end;
}

.sub-field__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.48);
}

.sub-field__input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(252, 211, 77, 0.22);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.35);
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
}

.sub-field__input:focus {
  border-color: rgba(252, 211, 77, 0.48);
  box-shadow: 0 0 0 3px rgba(252, 211, 77, 0.12);
}

.sub-field__input--readonly {
  opacity: 0.72;
  cursor: not-allowed;
}

.sub-field__range {
  width: 100%;
  accent-color: #fcd34d;
}

.sub-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
}

.sub-toggle--on {
  background: rgba(16, 185, 129, 0.16);
  border-color: rgba(16, 185, 129, 0.35);
}

.sub-toggle__thumb {
  width: 28px;
  height: 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  position: relative;
}

.sub-toggle--on .sub-toggle__thumb {
  background: rgba(16, 185, 129, 0.85);
}

.sub-toggle__text {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.78);
  padding-right: 4px;
}

.sub-editor__error {
  margin: 12px 0 0;
  font-size: 12px;
  color: #fca5a5;
}

.sub-editor__foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.18);
}

@media (max-width: 640px) {
  .sub-editor__grid {
    grid-template-columns: 1fr;
  }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

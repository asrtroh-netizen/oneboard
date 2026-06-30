<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import GlassSelect from './GlassSelect.vue'
import { maskSecret } from '../utils/vohiveDevice'

const IP_VERSION_OPTIONS = [
  { value: 'v4', label: 'IPv4' },
  { value: 'v6', label: 'IPv6' },
  { value: 'v4v6', label: 'IPv4+IPv6' },
]

const props = defineProps({
  iccid: { type: String, default: '' },
  policy: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['patch'])

const disabled = computed(() => props.loading || props.saving || !props.policy)

function onPatch(patch) {
  if (disabled.value) return
  emit('patch', patch)
}

function onIpVersion(value) {
  onPatch({ ipVersion: value })
}

function onApnBlur(event) {
  const apn = String(event.target.value || '').trim()
  if (!props.policy || apn === props.policy.apn) return
  onPatch({ apn })
}
</script>

<template>
  <div class="overview-card overview-card--policy glass-frame">
    <div class="panel-title-row panel-title-row--policy">
      <span class="panel-title-icon panel-title-icon--blue">
        <MIcon name="tune" size="sm" />
      </span>
      <h3 class="overview-card__title">卡策略</h3>
    </div>

    <div v-if="!iccid" class="vohive-panel-empty">设备尚未识别 ICCID</div>
    <div v-else-if="loading && !policy" class="vohive-panel-empty">加载卡策略…</div>
    <template v-else-if="policy">
      <div class="policy-iccid glass-frame glass-frame--compact">
        <span class="policy-iccid__label">当前卡 ICCID</span>
        <span class="policy-iccid__value mono">{{ maskSecret(iccid) }}</span>
      </div>

      <div class="policy-grid">
        <label class="policy-field">
          <span class="policy-field__label">IP 版本</span>
          <GlassSelect
            class="policy-field__select"
            :model-value="policy.ipVersion"
            :options="IP_VERSION_OPTIONS"
            :disabled="disabled"
            aria-label="IP 版本"
            @update:model-value="onIpVersion"
          />
          <span class="policy-field__hint">下次开启网络时生效</span>
        </label>

        <label class="policy-field">
          <span class="policy-field__label">APN（可选）</span>
          <input
            class="policy-field__input ob-field-input"
            type="text"
            :value="policy.apn"
            placeholder="留空自动识别"
            :disabled="disabled"
            @blur="onApnBlur"
          />
          <span class="policy-field__hint">下次开启网络时生效</span>
        </label>

        <div class="policy-field">
          <span class="policy-field__label">开启网络</span>
          <button
            type="button"
            class="policy-toggle"
            :class="{ 'is-on': policy.networkEnabled }"
            :disabled="disabled || policy.vowifiEnabled || policy.airplaneEnabled"
            :aria-pressed="policy.networkEnabled"
            @click="onPatch({ networkEnabled: !policy.networkEnabled })"
          >
            <span class="policy-toggle__thumb" />
          </button>
          <span class="policy-field__hint">VoWiFi/飞行开启时不可用</span>
        </div>

        <div class="policy-field">
          <span class="policy-field__label">VoWiFi</span>
          <button
            type="button"
            class="policy-toggle"
            :class="{ 'is-on': policy.vowifiEnabled }"
            :disabled="disabled"
            :aria-pressed="policy.vowifiEnabled"
            @click="onPatch({ vowifiEnabled: !policy.vowifiEnabled })"
          >
            <span class="policy-toggle__thumb" />
          </button>
          <span class="policy-field__hint">启用后进飞行模式</span>
        </div>

        <div class="policy-field policy-field--full">
          <span class="policy-field__label">飞行模式</span>
          <button
            type="button"
            class="policy-toggle"
            :class="{ 'is-on': policy.airplaneEnabled }"
            :disabled="disabled || policy.vowifiEnabled"
            :aria-pressed="policy.airplaneEnabled"
            @click="onPatch({ airplaneEnabled: !policy.airplaneEnabled })"
          >
            <span class="policy-toggle__thumb" />
          </button>
          <span class="policy-field__hint">VoWiFi 开启时由其接管</span>
        </div>
      </div>

      <p v-if="saving" class="policy-saving">保存中…</p>
    </template>
    <div v-else class="vohive-panel-empty">暂无卡策略</div>
  </div>
</template>

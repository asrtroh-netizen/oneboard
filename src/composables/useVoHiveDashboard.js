import { computed, onMounted, ref } from 'vue'
import {
  reconnectVoHiveVowifi,
  rebootVoHiveDevice,
  sendVoHiveAtCommand,
  switchVoHiveEsimProfile,
} from '../api/vohive'
import { getVoHiveHostLabel } from '../config/vohive'
import { isVoHiveAuthenticated } from '../stores/vohiveAuth'
import {
  hydrateVoHive,
  patchVoHiveCardPolicy,
  reloadVoHiveSelection,
  selectVoHiveDevice,
  vohiveSyncMeta,
  vohiveSyncState,
} from '../stores/vohiveSyncLayer'
import { useVoHiveSessionReload } from './useVoHiveSessionReload'

export function useVoHiveDashboard() {
  const esimSwitching = ref('')
  const deviceAction = ref('')
  const atSending = ref(false)
  const loading = ref(false)
  const esimLoading = ref(false)

  const configured = computed(() => isVoHiveAuthenticated())
  const connected = computed(() => {
    if (!configured.value) return false
    return Boolean(vohiveSyncMeta.lastHydrateAt && (vohiveSyncMeta.healthOk || vohiveSyncState.devices.length))
  })
  const streamWarning = computed(() => vohiveSyncMeta.streamWarning)
  const devices = computed(() => vohiveSyncState.devices)
  const overviews = computed(() => vohiveSyncState.overviews)
  const esimProfiles = computed(() => vohiveSyncState.esimProfiles)
  const cardPolicy = computed(() => vohiveSyncState.cardPolicy)
  const policyIccid = computed(() => vohiveSyncState.policyIccid)
  const policyLoading = computed(() => vohiveSyncMeta.policyLoading)
  const policySaving = computed(() => vohiveSyncMeta.policySaving)
  const selectedId = computed({
    get: () => vohiveSyncState.selectedId,
    set: (id) => selectVoHiveDevice(id),
  })
  const lastUpdated = computed(() =>
    vohiveSyncMeta.lastHydrateAt ? new Date(vohiveSyncMeta.lastHydrateAt) : null,
  )
  const error = computed({
    get: () => vohiveSyncMeta.lastError,
    set: (value) => {
      vohiveSyncMeta.lastError = value
    },
  })

  const onlineCount = computed(() => devices.value.filter((d) => d.online).length)
  const offlineCount = computed(() => devices.value.length - onlineCount.value)

  const selectedDevice = computed(() =>
    devices.value.find((d) => d.id === selectedId.value) || devices.value[0] || null,
  )

  const selectedOverview = computed(() => {
    const id = selectedDevice.value?.id
    return id ? overviews.value[id] || null : null
  })

  async function reconnectVowifi() {
    const deviceId = selectedDevice.value?.id
    if (!deviceId || deviceAction.value) return false

    deviceAction.value = 'vowifi-reconnect'
    try {
      await reconnectVoHiveVowifi(deviceId)
      await refresh({ silent: true })
      error.value = ''
      return true
    } catch (err) {
      error.value = err?.message || '重连 VoWiFi 失败'
      return false
    } finally {
      deviceAction.value = ''
    }
  }

  async function rebootModule() {
    const deviceId = selectedDevice.value?.id
    if (!deviceId || deviceAction.value) return false

    deviceAction.value = 'reboot'
    try {
      await rebootVoHiveDevice(deviceId)
      await refresh({ silent: true })
      error.value = ''
      return true
    } catch (err) {
      error.value = err?.message || '重启模组失败'
      return false
    } finally {
      deviceAction.value = ''
    }
  }

  async function sendAtCommand(command) {
    const deviceId = selectedDevice.value?.id
    const text = String(command || '').trim()
    if (!deviceId || !text || atSending.value) return false

    atSending.value = true
    try {
      await sendVoHiveAtCommand(deviceId, text)
      await refresh({ silent: true })
      error.value = ''
      return true
    } catch (err) {
      error.value = err?.message || 'AT 指令发送失败'
      return false
    } finally {
      atSending.value = false
    }
  }

  async function switchEsim(iccid) {
    const deviceId = selectedDevice.value?.id
    if (!deviceId || !iccid || esimSwitching.value) return false
    esimSwitching.value = iccid
    try {
      await switchVoHiveEsimProfile(deviceId, iccid)
      await reloadVoHiveSelection()
      await refresh({ silent: true })
      return true
    } catch (err) {
      error.value = err?.message || '切卡失败'
      return false
    } finally {
      esimSwitching.value = ''
    }
  }

  async function refresh({ silent = true } = {}) {
    if (!configured.value) return
    if (!silent) loading.value = true
    try {
      await hydrateVoHive({ reason: silent ? 'manual-silent' : 'manual' })
    } finally {
      if (!silent) loading.value = false
    }
  }

  function selectDevice(id) {
    selectVoHiveDevice(id)
  }

  async function patchCardPolicy(patch) {
    const ok = await patchVoHiveCardPolicy(patch)
    if (!ok && vohiveSyncMeta.lastError) {
      error.value = vohiveSyncMeta.lastError
    }
    return ok
  }

  onMounted(() => {
    if (configured.value) {
      void refresh({ silent: true })
    }
  })

  useVoHiveSessionReload(() => {
    void refresh({ silent: false })
  })

  return {
    hostLabel: computed(() => getVoHiveHostLabel()),
    devices,
    overviews,
    esimProfiles,
    cardPolicy,
    policyIccid,
    policyLoading,
    policySaving,
    esimLoading,
    esimSwitching,
    deviceAction,
    atSending,
    selectedId,
    selectedDevice,
    selectedOverview,
    loading,
    error,
    lastUpdated,
    configured,
    connected,
    streamWarning,
    onlineCount,
    offlineCount,
    streamConnected: computed(() => vohiveSyncMeta.streamConnected),
    selectDevice,
    switchEsim,
    reconnectVowifi,
    rebootModule,
    sendAtCommand,
    refresh,
    patchCardPolicy,
  }
}

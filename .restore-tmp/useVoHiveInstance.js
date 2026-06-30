/**
 * 单个 VoHive 容器实例的状态 / 轮询 / 操作。
 * 与全局 sync layer 无关：每个实例用自己的 upstream + token 独立请求，互不冲突。
 */
import { computed, onUnmounted, reactive, ref } from 'vue'
import {
  getDevices,
  getDeviceOverview,
  getEsimProfiles,
  getHealth,
  isVoHiveMissingApiError,
  login as apiLogin,
  rebootDevice,
  reconnectVowifi as apiReconnectVowifi,
  refreshDeviceInfo,
  sendAtCommand as apiSendAtCommand,
  switchEsimProfile,
} from '../api/vohive.adapter'
import { buildVoHiveUpstream } from '../stores/vohiveConnection'
import { updateInstance } from '../stores/vohiveInstances'
import {
  normalizeDeviceList,
  normalizeDeviceOverview,
  normalizeEsimProfiles,
  normalizeSmsList,
} from '../utils/vohiveDevice'

const POLL_INTERVAL_MS = 15000

export function useVoHiveInstance(instance) {
  const state = reactive({
    devices: [],
    overviews: {},
    esimProfiles: [],
    smsMessages: [],
    selectedId: '',
  })
  const meta = reactive({
    hydrating: false,
    lastError: null,
    streamWarning: null,
    lastHydrateAt: null,
    healthOk: false,
  })

  const loading = ref(false)
  const loggingIn = ref(false)
  const deviceAction = ref('')
  const esimSwitching = ref('')
  const atSending = ref(false)

  let pollTimer = null
  let activeUpstream = ''

  const upstream = computed(() => buildVoHiveUpstream(instance.host, instance.port))
  const token = computed(() => instance.token || '')
  const configured = computed(() => Boolean(token.value))
  const connected = computed(
    () => configured.value
      && Boolean(meta.lastHydrateAt && (meta.healthOk || state.devices.length)),
  )

  function ctx() {
    return {
      upstream: upstream.value,
      token: token.value,
      onUnauthorized: () => updateInstance(instance.id, { token: '' }),
    }
  }

  const devices = computed(() => state.devices)
  const overviews = computed(() => state.overviews)
  const esimProfiles = computed(() => state.esimProfiles)
  const smsMessages = computed(() => state.smsMessages)
  const onlineCount = computed(() => state.devices.filter((d) => d.online).length)
  const offlineCount = computed(() => state.devices.length - onlineCount.value)

  const selectedId = computed({
    get: () => state.selectedId,
    set: (id) => selectDevice(id),
  })
  const selectedDevice = computed(
    () => state.devices.find((d) => d.id === state.selectedId) || state.devices[0] || null,
  )
  const selectedOverview = computed(() => {
    const id = selectedDevice.value?.id
    return id ? state.overviews[id] || null : null
  })
  const lastUpdated = computed(() => (meta.lastHydrateAt ? new Date(meta.lastHydrateAt) : null))

  function clearRuntime() {
    state.devices = []
    state.overviews = {}
    state.esimProfiles = []
    state.smsMessages = []
    state.selectedId = ''
  }

  function extractEsim(device) {
    if (!device) return []
    return normalizeEsimProfiles(
      device.esim_profiles || device.esimProfiles || device.esim || device.profiles || [],
    )
  }

  function extractSms(device) {
    if (!device) return []
    return normalizeSmsList(
      device.sms_messages || device.smsMessages || device.sms || device.messages || [],
    )
  }

  async function loadSelectedExtras({ refreshEsim = false } = {}) {
    const id = state.selectedId
    if (!id) {
      state.esimProfiles = []
      state.smsMessages = []
      return
    }
    const device = state.devices.find((d) => d.id === id)
    try {
      const esimPayload = await getEsimProfiles(id, { refresh: refreshEsim, ...ctx() })
      state.esimProfiles = normalizeEsimProfiles(esimPayload)
    } catch {
      state.esimProfiles = extractEsim(device)
    }
    state.smsMessages = extractSms(device)
  }

  async function hydrate({ silent = true, refreshRuntime = false } = {}) {
    const target = upstream.value
    if (activeUpstream && activeUpstream !== target) clearRuntime()
    activeUpstream = target

    if (!configured.value) {
      clearRuntime()
      meta.lastError = null
      meta.healthOk = false
      meta.lastHydrateAt = null
      return
    }

    if (!silent) loading.value = true
    meta.hydrating = true
    try {
      const [healthOk, devicesPayload] = await Promise.all([
        getHealth(ctx()).then(() => true).catch(() => false),
        getDevices(ctx()),
      ])

      const list = normalizeDeviceList(devicesPayload)
      meta.healthOk = healthOk || list.length > 0
      meta.streamWarning = null

      if (refreshRuntime && list.length) {
        await Promise.allSettled(list.map((d) => refreshDeviceInfo(d.id, ctx())))
      }

      const results = await Promise.allSettled(list.map((d) => getDeviceOverview(d.id, ctx())))
      const nextOverviews = {}
      list.forEach((device, index) => {
        const payload = results[index].status === 'fulfilled' ? results[index].value : null
        nextOverviews[device.id] = normalizeDeviceOverview(payload || device, device)
      })
      state.overviews = nextOverviews

      state.devices = list.map((device) => {
        const overview = nextOverviews[device.id]
        const ipRow = overview?.networkRows?.find((row) => row.label === '公网 IP')
        const publicIp = device.publicIp && device.publicIp !== '—' ? device.publicIp : ipRow?.value
        return publicIp && publicIp !== '—' ? { ...device, publicIp } : device
      })

      if (!state.selectedId || !list.some((d) => d.id === state.selectedId)) {
        state.selectedId = list[0]?.id || ''
      }

      await loadSelectedExtras({ refreshEsim: !silent })

      meta.lastError = null
      meta.lastHydrateAt = Date.now()
    } catch (err) {
      meta.healthOk = false
      if (isVoHiveMissingApiError(err)) {
        meta.streamWarning = 'VoHive API 地址或路径错误：请检查主机与端口（勿带 /api 后缀）'
        meta.lastError = null
      } else {
        meta.lastError = err?.message || 'VoHive 连接失败'
      }
    } finally {
      meta.hydrating = false
      loading.value = false
    }
  }

  async function refresh({ silent = false } = {}) {
    await hydrate({ silent, refreshRuntime: true })
  }

  function selectDevice(id) {
    state.selectedId = id
    void reloadSelection()
  }

  async function reloadSelection() {
    const id = state.selectedId
    if (!id) {
      state.esimProfiles = []
      state.smsMessages = []
      return
    }
    const device = state.devices.find((d) => d.id === id)
    try {
      const [overviewPayload, esimPayload] = await Promise.all([
        getDeviceOverview(id, ctx()),
        getEsimProfiles(id, { refresh: true, ...ctx() }),
      ])
      if (overviewPayload) {
        state.overviews = {
          ...state.overviews,
          [id]: normalizeDeviceOverview(overviewPayload, device),
        }
      }
      state.esimProfiles = normalizeEsimProfiles(esimPayload)
      state.smsMessages = extractSms(device)
    } catch {
      await loadSelectedExtras()
    }
  }

  async function loginInstance(username, password) {
    const user = String(username || '').trim()
    if (!user || !password || loggingIn.value) return false
    loggingIn.value = true
    try {
      const result = await apiLogin(user, password, { upstream: upstream.value })
      updateInstance(instance.id, { token: result.token, username: result.username || user })
      meta.lastError = null
      clearRuntime()
      await hydrate({ silent: false, refreshRuntime: true })
      return true
    } catch (err) {
      meta.lastError = err?.message || 'VoHive 登录失败'
      return false
    } finally {
      loggingIn.value = false
    }
  }

  async function applyConfig({ host, port } = {}) {
    updateInstance(instance.id, { host, port })
    clearRuntime()
    meta.lastHydrateAt = null
    await hydrate({ silent: false, refreshRuntime: true })
  }

  async function switchEsim(iccid) {
    const deviceId = selectedDevice.value?.id
    if (!deviceId || !iccid || esimSwitching.value) return false
    esimSwitching.value = iccid
    try {
      await switchEsimProfile(deviceId, { iccid: String(iccid).trim() }, ctx())
      await reloadSelection()
      await refresh({ silent: true })
      return true
    } catch (err) {
      meta.lastError = err?.message || '切卡失败'
      return false
    } finally {
      esimSwitching.value = ''
    }
  }

  async function reconnectVowifi() {
    const deviceId = selectedDevice.value?.id
    if (!deviceId || deviceAction.value) return false
    deviceAction.value = 'vowifi-reconnect'
    try {
      await apiReconnectVowifi(deviceId, ctx())
      await refresh({ silent: true })
      meta.lastError = null
      return true
    } catch (err) {
      meta.lastError = err?.message || '重连 VoWiFi 失败'
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
      await rebootDevice(deviceId, ctx())
      await refresh({ silent: true })
      meta.lastError = null
      return true
    } catch (err) {
      meta.lastError = err?.message || '重启模组失败'
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
      await apiSendAtCommand(deviceId, { cmd: text, timeout_ms: 10000 }, ctx())
      await refresh({ silent: true })
      meta.lastError = null
      return true
    } catch (err) {
      meta.lastError = err?.message || 'AT 指令发送失败'
      return false
    } finally {
      atSending.value = false
    }
  }

  function startPolling() {
    if (pollTimer) return
    pollTimer = window.setInterval(() => {
      if (configured.value && !meta.hydrating) void hydrate({ silent: true })
    }, POLL_INTERVAL_MS)
  }

  function stop() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function start() {
    if (configured.value) void hydrate({ silent: true, refreshRuntime: true })
    startPolling()
  }

  onUnmounted(stop)

  return {
    upstream,
    configured,
    connected,
    meta,
    loading,
    loggingIn,
    deviceAction,
    esimSwitching,
    atSending,
    devices,
    overviews,
    esimProfiles,
    smsMessages,
    onlineCount,
    offlineCount,
    selectedId,
    selectedDevice,
    selectedOverview,
    lastUpdated,
    start,
    stop,
    refresh,
    selectDevice,
    loginInstance,
    applyConfig,
    switchEsim,
    reconnectVowifi,
    rebootModule,
    sendAtCommand,
  }
}

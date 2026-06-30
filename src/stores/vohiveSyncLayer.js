/**
 * VoHive Sync Layer — 通过 VoHive REST API 轮询同步设备状态。
 */
import { reactive } from 'vue'
import {
  getDeviceOverview,
  getDevices,
  getEsimProfiles,
  getCardPolicy,
  putCardPolicy,
  getHealth,
  isVoHiveMissingApiError,
  refreshDeviceInfo,
} from '../api/vohive.adapter'
import { isVoHiveAuthenticated } from '../stores/vohiveAuth'
import { resolveVoHiveUpstreamBase, setVoHiveConnected } from '../stores/vohiveConnection'
import {
  normalizeDeviceList,
  normalizeDeviceOverview,
  normalizeEsimProfiles,
  normalizeCardPolicy,
  cardPolicyToPayload,
  resolveActiveIccid,
} from '../utils/vohiveDevice'
import { ControlPlaneEvents, emit } from './controlPlane/eventBus'

const POLL_INTERVAL_MS = 15000

export const vohiveSyncMeta = reactive({
  configured: false,
  streamConnected: false,
  hydrating: false,
  lastError: null,
  streamWarning: null,
  lastEventAt: null,
  lastHydrateAt: null,
  streamPath: '',
  healthOk: false,
  activeUpstream: '',
  policyLoading: false,
  policySaving: false,
})

export const vohiveSyncState = reactive({
  devices: [],
  overviews: {},
  esimProfiles: [],
  cardPolicy: null,
  policyIccid: '',
  selectedId: '',
})

let pollTimer = null
let visibilityHandler = null

const RESET_REASONS = new Set([
  'start',
  'login',
  'settings',
  'connection',
  'logout',
])

export function clearVoHiveRuntimeState() {
  vohiveSyncState.devices = []
  vohiveSyncState.overviews = {}
  vohiveSyncState.esimProfiles = []
  vohiveSyncState.cardPolicy = null
  vohiveSyncState.policyIccid = ''
  vohiveSyncState.selectedId = ''
}

function shouldResetBeforeHydrate(reason, upstreamChanged = false) {
  return upstreamChanged || RESET_REASONS.has(reason)
}

function shouldRefreshRuntime(reason) {
  return RESET_REASONS.has(reason) || reason === 'manual' || reason === 'manual-silent'
}

function setConfigured() {
  vohiveSyncMeta.configured = isVoHiveAuthenticated()
}

function emitDeviceEvent(type = 'update') {
  const online = vohiveSyncState.devices.filter((d) => d.online).length
  emit(ControlPlaneEvents.VOHIVE_DEVICE, {
    type,
    online,
    total: vohiveSyncState.devices.length,
    devices: vohiveSyncState.devices,
  })
}

function emitSyncStatus() {
  emit(ControlPlaneEvents.VOHIVE_SYNC, {
    streamConnected: vohiveSyncMeta.streamConnected,
    configured: vohiveSyncMeta.configured,
    lastError: vohiveSyncMeta.lastError,
    lastHydrateAt: vohiveSyncMeta.lastHydrateAt,
    healthOk: vohiveSyncMeta.healthOk,
  })
}

function extractEsimFromDevice(device) {
  if (!device) return []
  const source =
    device.esim_profiles
    || device.esimProfiles
    || device.esim
    || device.profiles
    || []
  return normalizeEsimProfiles(source)
}

async function loadCardPolicyForSelection() {
  const overview = vohiveSyncState.selectedId
    ? vohiveSyncState.overviews[vohiveSyncState.selectedId]
    : null
  const iccid = resolveActiveIccid(overview, vohiveSyncState.esimProfiles)
  vohiveSyncState.policyIccid = iccid
  if (!iccid) {
    vohiveSyncState.cardPolicy = null
    return
  }
  vohiveSyncMeta.policyLoading = true
  try {
    const payload = await getCardPolicy(iccid)
    vohiveSyncState.cardPolicy = normalizeCardPolicy(payload)
  } catch {
    vohiveSyncState.cardPolicy = null
  } finally {
    vohiveSyncMeta.policyLoading = false
  }
}

function applyOverview(device, overviewPayload) {
  return normalizeDeviceOverview(overviewPayload || device.overview || device, device)
}

async function loadOverviewsForDevices(list, { refreshRuntime = false } = {}) {
  if (refreshRuntime && list.length) {
    await Promise.allSettled(list.map((device) => refreshDeviceInfo(device.id)))
  }

  const results = await Promise.allSettled(
    list.map((device) => getDeviceOverview(device.id)),
  )

  const next = {}
  list.forEach((device, index) => {
    const result = results[index]
    const payload = result.status === 'fulfilled' ? result.value : null
    next[device.id] = applyOverview(device, payload)
  })
  vohiveSyncState.overviews = next

  vohiveSyncState.devices = list.map((device) => {
    const overview = next[device.id]
    const ipRow = overview?.networkRows?.find((row) => row.label === '公网 IP')
    const publicIp = device.publicIp && device.publicIp !== '—'
      ? device.publicIp
      : ipRow?.value
    return publicIp && publicIp !== '—' ? { ...device, publicIp } : device
  })
}

async function loadSelectedExtras({ refreshEsim = false } = {}) {
  const id = vohiveSyncState.selectedId
  if (!id) {
    vohiveSyncState.esimProfiles = []
    vohiveSyncState.cardPolicy = null
    vohiveSyncState.policyIccid = ''
    return
  }

  const device = vohiveSyncState.devices.find((d) => d.id === id)

  try {
    const esimPayload = await getEsimProfiles(id, { refresh: refreshEsim })
    vohiveSyncState.esimProfiles = normalizeEsimProfiles(esimPayload)
  } catch {
    vohiveSyncState.esimProfiles = extractEsimFromDevice(device)
  }

  await loadCardPolicyForSelection()
}

async function probeHealth() {
  try {
    await getHealth()
    return true
  } catch {
    return false
  }
}

export async function hydrateVoHive({ reason = 'init', upstreamChanged = false } = {}) {
  const upstream = resolveVoHiveUpstreamBase()
  const upstreamSwitched = Boolean(
    vohiveSyncMeta.activeUpstream && vohiveSyncMeta.activeUpstream !== upstream,
  ) || upstreamChanged

  setConfigured()

  if (shouldResetBeforeHydrate(reason, upstreamSwitched)) {
    clearVoHiveRuntimeState()
    vohiveSyncMeta.lastHydrateAt = null
    vohiveSyncMeta.healthOk = false
  }

  vohiveSyncMeta.activeUpstream = upstream

  if (!vohiveSyncMeta.configured || !upstream) {
    clearVoHiveRuntimeState()
    vohiveSyncMeta.lastError = null
    vohiveSyncMeta.healthOk = false
    setVoHiveConnected(false, upstream ? '' : '未配置 VoHive 后端')
    emitSyncStatus()
    return
  }

  vohiveSyncMeta.hydrating = true
  try {
    const [healthOk, devicesPayload] = await Promise.all([
      probeHealth(),
      getDevices(),
    ])

    const list = normalizeDeviceList(devicesPayload)
    vohiveSyncMeta.healthOk = healthOk || list.length > 0
    vohiveSyncMeta.streamWarning = null
    const prevOnline = new Set(vohiveSyncState.devices.filter((d) => d.online).map((d) => d.id))

    await loadOverviewsForDevices(list, {
      refreshRuntime: shouldRefreshRuntime(reason),
    })

    if (!vohiveSyncState.selectedId || !list.some((d) => d.id === vohiveSyncState.selectedId)) {
      vohiveSyncState.selectedId = list[0]?.id || ''
    }

    await loadSelectedExtras({ refreshEsim: reason === 'manual' || reason === 'manual-silent' })

    vohiveSyncMeta.lastError = null
    vohiveSyncMeta.lastHydrateAt = Date.now()
    vohiveSyncMeta.lastEventAt = Date.now()
    vohiveSyncMeta.streamConnected = false

    list.forEach((device) => {
      const wasOnline = prevOnline.has(device.id)
      if (device.online && !wasOnline) {
        emit(ControlPlaneEvents.VOHIVE_DEVICE, { type: 'online', deviceId: device.id, device })
      } else if (!device.online && wasOnline) {
        emit(ControlPlaneEvents.VOHIVE_DEVICE, { type: 'offline', deviceId: device.id, device })
      }
    })
    emitDeviceEvent(reason)
    emitSyncStatus()
    setVoHiveConnected(true)
  } catch (err) {
    const message = err?.message || 'VoHive 连接失败'
    vohiveSyncMeta.healthOk = false
    if (shouldResetBeforeHydrate(reason, upstreamSwitched)) {
      clearVoHiveRuntimeState()
      vohiveSyncMeta.lastHydrateAt = null
    }
    if (isVoHiveMissingApiError(err)) {
      vohiveSyncMeta.streamWarning = 'VoHive API 地址或路径错误：请在设置中填写正确的主机与端口（勿带 /api 后缀）'
      vohiveSyncMeta.lastError = null
      setVoHiveConnected(false, vohiveSyncMeta.streamWarning)
    } else {
      vohiveSyncMeta.lastError = message
      setVoHiveConnected(false, message)
    }
    emitSyncStatus()
  } finally {
    vohiveSyncMeta.hydrating = false
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = window.setInterval(() => {
    if (!vohiveSyncMeta.configured) return
    void hydrateVoHive({ reason: 'poll' })
  }, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && vohiveSyncMeta.configured) {
    void hydrateVoHive({ reason: 'visibility' })
  }
}

export function selectVoHiveDevice(id) {
  vohiveSyncState.selectedId = id
  void reloadVoHiveSelection()
}

export function startVoHiveSyncLayer({ reason = 'start', upstreamChanged = false } = {}) {
  stopVoHiveSyncLayer()
  setConfigured()
  vohiveSyncMeta.streamWarning = null
  const hydratePromise = hydrateVoHive({ reason, upstreamChanged })
  startPolling()

  visibilityHandler = onVisibilityChange
  document.addEventListener('visibilitychange', visibilityHandler)

  return hydratePromise
}

export function stopVoHiveSyncLayer() {
  stopPolling()
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }
  vohiveSyncMeta.streamConnected = false
  vohiveSyncMeta.streamPath = ''
}

export function refreshVoHiveNow(options) {
  return hydrateVoHive(options)
}

export async function reloadVoHiveSelection() {
  const id = vohiveSyncState.selectedId
  if (!id) {
    vohiveSyncState.esimProfiles = []
    vohiveSyncState.cardPolicy = null
    vohiveSyncState.policyIccid = ''
    return
  }

  const device = vohiveSyncState.devices.find((d) => d.id === id)

  try {
    const [overviewPayload, esimPayload] = await Promise.all([
      getDeviceOverview(id),
      getEsimProfiles(id, { refresh: true }),
    ])

    if (overviewPayload) {
      vohiveSyncState.overviews = {
        ...vohiveSyncState.overviews,
        [id]: applyOverview(device, overviewPayload),
      }
    }

    vohiveSyncState.esimProfiles = normalizeEsimProfiles(esimPayload)
    await loadCardPolicyForSelection()
  } catch {
    await loadSelectedExtras()
  }
}

export async function patchVoHiveCardPolicy(patch) {
  const iccid = vohiveSyncState.policyIccid
    || resolveActiveIccid(
      vohiveSyncState.overviews[vohiveSyncState.selectedId],
      vohiveSyncState.esimProfiles,
    )
  if (!iccid || !vohiveSyncState.cardPolicy || vohiveSyncMeta.policySaving) return false

  const next = { ...vohiveSyncState.cardPolicy, ...patch }
  vohiveSyncMeta.policySaving = true
  try {
    await putCardPolicy(iccid, cardPolicyToPayload(next))
    const payload = await getCardPolicy(iccid)
    vohiveSyncState.cardPolicy = normalizeCardPolicy(payload || next)
    await hydrateVoHive({ reason: 'manual-silent' })
    vohiveSyncMeta.lastError = null
    return true
  } catch (err) {
    vohiveSyncMeta.lastError = err?.message || '卡策略保存失败'
    return false
  } finally {
    vohiveSyncMeta.policySaving = false
  }
}

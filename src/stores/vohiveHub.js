/**
 * VoHive 连接 / 会话切换 — active backend 与全局 sync layer 统一入口。
 */
import { isVoHiveAuthenticated, clearVoHiveSession, setVoHiveSession } from './vohiveAuth'
import {
  clearVoHiveConnectionState,
  resolveVoHiveUpstreamBase,
  setVoHiveConnection,
  setVoHiveConnected,
  vohiveConnectionState,
} from './vohiveConnection'
import {
  getActiveInstanceId,
  getActiveVoHiveInstance,
  reconcileActiveInstanceId,
  removeInstance,
  setActiveInstanceId,
  vohiveInstances,
} from './vohiveInstances'
import { ControlPlaneEvents, emit } from './controlPlane/eventBus'
import {
  clearVoHiveRuntimeState,
  hydrateVoHive,
  startVoHiveSyncLayer,
  stopVoHiveSyncLayer,
  vohiveSyncMeta,
} from './vohiveSyncLayer'

let lastAppliedUpstream = ''

function emitVoHiveConnectionChanged(reason, extra = {}) {
  const payload = {
    reason,
    upstream: resolveVoHiveUpstreamBase(),
    host: vohiveConnectionState.host,
    port: vohiveConnectionState.port,
    activeInstanceId: getActiveInstanceId(),
    authenticated: isVoHiveAuthenticated(),
    at: Date.now(),
    ...extra,
  }
  emit(ControlPlaneEvents.VOHIVE_CONNECTION_CHANGED, payload)
}

function resetVoHiveSyncMeta(upstream) {
  vohiveSyncMeta.activeUpstream = upstream
  vohiveSyncMeta.lastHydrateAt = null
  vohiveSyncMeta.lastEventAt = null
  vohiveSyncMeta.healthOk = false
  vohiveSyncMeta.lastError = null
  vohiveSyncMeta.streamWarning = null
  vohiveSyncMeta.streamConnected = false
}

function syncGlobalFromInstance(inst) {
  if (!inst?.host?.trim()) return false
  setVoHiveConnection({ host: inst.host, port: inst.port })
  if (inst.token) setVoHiveSession(inst.token, inst.username || '')
  else clearVoHiveSession()
  return true
}

/**
 * @param {{ host?: string, port?: string|number|null, reason?: string }} options
 */
export async function applyVoHiveConnectionSwitch({
  host,
  port,
  reason = 'connection',
} = {}) {
  if (host != null || port !== undefined) {
    setVoHiveConnection({ host, port })
  }

  const upstream = resolveVoHiveUpstreamBase()
  const upstreamChanged = Boolean(lastAppliedUpstream && lastAppliedUpstream !== upstream)

  clearVoHiveRuntimeState()
  resetVoHiveSyncMeta(upstream)
  stopVoHiveSyncLayer()

  lastAppliedUpstream = upstream

  if (!upstream) {
    setVoHiveConnected(false, '')
    await hydrateVoHive({ reason: 'logout' })
    emitVoHiveConnectionChanged(reason, { upstreamChanged, needsLogin: true, cleared: true })
    return
  }

  if (!isVoHiveAuthenticated()) {
    setVoHiveConnected(false, '')
    await hydrateVoHive({ reason: 'logout' })
    emitVoHiveConnectionChanged(reason, { upstreamChanged, needsLogin: true })
    return
  }

  await startVoHiveSyncLayer({ reason, upstreamChanged: true })
  emitVoHiveConnectionChanged(reason, { upstreamChanged })
}

/**
 * 将指定实例设为 active backend，并同步全局 connection/auth/sync。
 * @param {object|string} instanceOrId
 */
export async function activateVoHiveInstance(instanceOrId, { reason = 'activate' } = {}) {
  const inst = typeof instanceOrId === 'string'
    ? vohiveInstances.find((item) => item.id === instanceOrId)
    : instanceOrId

  if (!inst?.host?.trim()) {
    await clearActiveVoHiveBackend({ reason: `${reason}-invalid` })
    return false
  }

  setActiveInstanceId(inst.id)
  syncGlobalFromInstance(inst)
  await applyVoHiveConnectionSwitch({ reason })
  return true
}

/** 清空 active backend 与全局连接状态，不回退旧地址 */
export async function clearActiveVoHiveBackend({ reason = 'clear' } = {}) {
  setActiveInstanceId('')
  clearVoHiveConnectionState()
  clearVoHiveSession()
  setVoHiveConnected(false, '')
  await applyVoHiveConnectionSwitch({ reason })
}

/** 删除实例并同步 active backend */
export async function removeVoHiveInstanceWithSync(id) {
  const wasActive = getActiveInstanceId() === id
  removeInstance(id)

  if (!wasActive) return

  const fallback = vohiveInstances.find((item) => item.host?.trim() && item.token)
  if (fallback) {
    await activateVoHiveInstance(fallback, { reason: 'remove-fallback' })
    return
  }

  await clearActiveVoHiveBackend({ reason: 'remove' })
}

/** 应用启动：校验 active backend，无效则清空全局残留 */
export async function initializeVoHiveActiveBackend() {
  const inst = reconcileActiveInstanceId()
  if (inst?.host?.trim()) {
    syncGlobalFromInstance(inst)
    lastAppliedUpstream = resolveVoHiveUpstreamBase()
    if (inst.token && isVoHiveAuthenticated()) {
      await startVoHiveSyncLayer({ reason: 'init', upstreamChanged: false })
    }
    return
  }

  if (getActiveInstanceId()) setActiveInstanceId('')
  clearVoHiveConnectionState()
  clearVoHiveSession()
  setVoHiveConnected(false, '')
  lastAppliedUpstream = ''
  clearVoHiveRuntimeState()
  resetVoHiveSyncMeta('')
}

export { getActiveVoHiveInstance }

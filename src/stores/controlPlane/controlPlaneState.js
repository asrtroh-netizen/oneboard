/**
 * Realtime Control Plane — stable status snapshot for Hero / status UI.
 *
 * Principle: REST sync success = healthy. WS is an enhancement, not a requirement.
 */
import { computed, reactive } from 'vue'
import { mihomoSyncMeta } from '../mihomoState'
import { vohiveSyncMeta, vohiveSyncState } from '../vohiveSyncLayer'

export const controlPlaneMeta = reactive({
  lastEventAt: null,
  lastEventType: null,
  heartbeatPhase: 0,
  initialized: false,
})

function resolveMihomoStatus() {
  if (mihomoSyncMeta.connected && !mihomoSyncMeta.lastError) {
    if (mihomoSyncMeta.degraded) return 'warning'
    return 'running'
  }
  if (mihomoSyncMeta.lastError) return 'offline'
  return 'connecting'
}

function resolveVoHiveStatus() {
  if (!vohiveSyncMeta.configured) return 'idle'
  if (vohiveSyncMeta.streamConnected) return 'running'
  if (vohiveSyncMeta.lastHydrateAt) return 'running'
  if (vohiveSyncMeta.lastError) return 'offline'
  if (vohiveSyncMeta.hydrating) return 'connecting'
  return 'offline'
}

/** Unified cover status: running | warning | offline */
function resolveSystemStatus() {
  const mihomo = resolveMihomoStatus()
  if (mihomo === 'offline') return 'offline'
  if (mihomo === 'connecting') return 'warning'
  if (mihomo === 'warning') return 'warning'
  return 'running'
}

export function useControlPlaneState() {
  const mihomoStatus = computed(() => resolveMihomoStatus())
  const vohiveStatus = computed(() => resolveVoHiveStatus())
  const systemStatus = computed(() => resolveSystemStatus())

  const mihomoLive = computed(() =>
    mihomoSyncMeta.trafficWsConnected || mihomoSyncMeta.connectionsWsConnected,
  )

  const vohiveLive = computed(() =>
    vohiveSyncMeta.streamConnected || Boolean(vohiveSyncMeta.lastHydrateAt),
  )

  return {
    meta: controlPlaneMeta,
    mihomoSync: mihomoSyncMeta,
    vohiveSync: vohiveSyncMeta,
    vohive: vohiveSyncState,
    mihomoStatus,
    vohiveStatus,
    systemStatus,
    mihomoLive,
    vohiveLive,
  }
}

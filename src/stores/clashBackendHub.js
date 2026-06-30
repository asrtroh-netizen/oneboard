/**
 * 全局 Clash 后端切换 — 重启同步层并通知各页面重载远程 YAML。
 */
import { clearAllRemoteYamlCaches } from '../api/mihomoYaml'
import {
  clashBackendState,
  clashBackendProfile,
  resolveClashUpstreamBase,
} from './clashBackend'
import { clearAllClashAuthModes } from './clashAuthMode'
import { ControlPlaneEvents, emit } from './controlPlane/eventBus'
import { refreshDnsSyncLayer } from './dnsSyncLayer'
import { startMihomoSyncLayer, stopMihomoSyncLayer } from './mihomoSyncLayer'

export function applyClashBackendSwitch(appState, formatBytes) {
  clearAllRemoteYamlCaches()
  // 每次手动切换/重连后端都重新探测鉴权模式，避免沿用旧后端或旧 secret 的缓存判断。
  clearAllClashAuthModes()
  stopMihomoSyncLayer()
  startMihomoSyncLayer(appState, formatBytes)
  refreshDnsSyncLayer()

  emit(ControlPlaneEvents.CLASH_BACKEND_CHANGED, {
    type: clashBackendState.type,
    host: clashBackendState.host,
    port: clashBackendState.port,
    label: clashBackendProfile.value.label,
    upstream: resolveClashUpstreamBase(),
    at: Date.now(),
  })
}

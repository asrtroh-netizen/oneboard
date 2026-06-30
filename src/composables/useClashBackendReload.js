import { onMounted, onUnmounted } from 'vue'
import { ControlPlaneEvents, on } from '../stores/controlPlane/eventBus'

/**
 * 设置页切换 Clash / Mihomo / Nikki 后，订阅页自动重载远程 YAML 与运行时数据。
 * @param {(payload?: object) => void | Promise<void>} reloadFn
 */
export function useClashBackendReload(reloadFn) {
  let unsub = null

  onMounted(() => {
    unsub = on(ControlPlaneEvents.CLASH_BACKEND_CHANGED, (payload) => {
      void reloadFn(payload)
    })
  })

  onUnmounted(() => {
    unsub?.()
    unsub = null
  })
}

import { onMounted, onUnmounted } from 'vue'
import { ControlPlaneEvents, on } from '../stores/controlPlane/eventBus'

/**
 * 设置页 VoHive 连接/登录变更后，设备页与 Hero 自动重载。
 * @param {(payload?: object) => void | Promise<void>} reloadFn
 */
export function useVoHiveSessionReload(reloadFn) {
  let unsub = null

  onMounted(() => {
    unsub = on(ControlPlaneEvents.VOHIVE_CONNECTION_CHANGED, (payload) => {
      void reloadFn(payload)
    })
  })

  onUnmounted(() => {
    unsub?.()
    unsub = null
  })
}

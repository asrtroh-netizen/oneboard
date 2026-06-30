/**
 * Control Plane Event Bus — event-driven UI updates (no polling renderer).
 */

const listeners = new Map()

export const ControlPlaneEvents = {
  MIHOMO_TRAFFIC: 'mihomo.traffic.change',
  MIHOMO_NODES: 'mihomo.node.update',
  MIHOMO_SYNC: 'mihomo.sync.status',
  CLASH_BACKEND_CHANGED: 'clash.backend.changed',
  VOHIVE_CONNECTION_CHANGED: 'vohive.connection.changed',
  VOHIVE_DEVICE: 'vohive.device.online',
  VOHIVE_SYNC: 'vohive.sync.status',
  HEARTBEAT: 'controlplane.heartbeat',
}

function dispatch(event, payload) {
  listeners.get(event)?.forEach((handler) => {
    try {
      handler(payload)
    } catch (err) {
      console.error(`[controlPlane] handler error (${event}):`, err)
    }
  })
}

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event).add(handler)
  return () => off(event, handler)
}

export function off(event, handler) {
  listeners.get(event)?.delete(handler)
}

export function emit(event, payload) {
  dispatch(event, payload)
  if (event !== ControlPlaneEvents.HEARTBEAT) {
    dispatch(ControlPlaneEvents.HEARTBEAT, { event, at: Date.now() })
  }
}

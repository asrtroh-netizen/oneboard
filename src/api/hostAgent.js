const AGENT_BASE = import.meta.env.VITE_ONEBORD_AGENT_URL || ''

function normalizeBase(base = '') {
  return String(base || '').trim().replace(/\/$/, '')
}

function agentHttpBase() {
  return normalizeBase(AGENT_BASE)
}

function agentWsUrl(path = '/api/control-plane/ws') {
  const base = agentHttpBase()
  if (base) {
    const url = new URL(path, base)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return url.toString()
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${path}`
}

export async function getAgentSnapshot() {
  const base = agentHttpBase()
  const res = await fetch(`${base}/api/control-plane/snapshot`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`agent snapshot failed: ${res.status}`)
  return res.json()
}

export function connectHostAgent({ onEvent, onStatus } = {}) {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return () => {}
  let stopped = false
  let reconnectTimer = null
  let ws = null
  let retry = 0

  const connect = () => {
    if (stopped) return
    ws = new WebSocket(agentWsUrl())
    ws.onopen = () => {
      retry = 0
      onStatus?.({ connected: true })
    }
    ws.onmessage = (event) => {
      try {
        onEvent?.(JSON.parse(event.data))
      } catch {
        /* ignore malformed agent event */
      }
    }
    ws.onclose = () => {
      onStatus?.({ connected: false })
      if (stopped) return
      const delay = Math.min(10000, 1000 * 2 ** retry)
      retry += 1
      reconnectTimer = window.setTimeout(connect, delay)
    }
    ws.onerror = () => {
      try { ws?.close() } catch { /* noop */ }
    }
  }

  connect()

  return () => {
    stopped = true
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    try { ws?.close() } catch { /* noop */ }
  }
}

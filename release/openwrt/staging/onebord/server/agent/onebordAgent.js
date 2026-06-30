import { EventEmitter } from 'events'
import fs from 'fs'
import { WebSocket } from 'ws'
import { getSystemInfo } from '../systemInfo.js'

const DEFAULT_INTERVALS = {
  system: 2000,
  mihomo: 5000,
  vohive: 10000,
}

function trimSlash(value = '') {
  return String(value || '').trim().replace(/\/$/, '')
}

function resolveRuntimeMode() {
  const explicit = String(process.env.ONEBORD_RUNTIME || process.env.ONEBORD_MODE || '').toLowerCase()
  if (explicit === 'docker' || explicit === 'openwrt') return explicit
  if (fs.existsSync('/etc/openwrt_release')) return 'openwrt'
  if (fs.existsSync('/.dockerenv')) return 'docker'
  return 'docker'
}

function resolveMihomoUpstream() {
  return trimSlash(
    process.env.ONEBORD_MIHOMO_UPSTREAM
      || process.env.MIHOMO_UPSTREAM
      || process.env.VITE_MIHOMO_HOST
      || 'http://127.0.0.1:9090',
  )
}

function resolveVoHiveUpstream() {
  return trimSlash(
    process.env.ONEBORD_VOHIVE_UPSTREAM
      || process.env.VOHIVE_UPSTREAM
      || process.env.VITE_VOHIVE_HOST
      || 'http://127.0.0.1:7575',
  )
}

function timeoutSignal(ms = 4500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cancel: () => clearTimeout(timer) }
}

async function fetchJson(url, { headers = {}, timeoutMs = 4500 } = {}) {
  const timeout = timeoutSignal(timeoutMs)
  try {
    const res = await fetch(url, { headers, signal: timeout.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return await res.json()
  } finally {
    timeout.cancel()
  }
}

function wsUrlFromHttp(base, path) {
  const url = new URL(path, `${base}/`)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

export class OneBordAgent extends EventEmitter {
  constructor(options = {}) {
    super()
    this.mode = options.mode || resolveRuntimeMode()
    this.mihomoUpstream = trimSlash(options.mihomoUpstream || resolveMihomoUpstream())
    this.mihomoSecret = String(options.mihomoSecret ?? process.env.ONEBORD_MIHOMO_SECRET ?? process.env.VITE_MIHOMO_SECRET ?? '').trim()
    this.vohiveUpstream = trimSlash(options.vohiveUpstream || resolveVoHiveUpstream())
    this.vohiveToken = String(options.vohiveToken ?? process.env.ONEBORD_VOHIVE_TOKEN ?? process.env.VITE_VOHIVE_TOKEN ?? '').trim()
    this.intervals = { ...DEFAULT_INTERVALS, ...(options.intervals || {}) }
    this.timers = new Set()
    this.trafficWs = null
    this.trafficReconnectTimer = null
    this.started = false
    this.snapshot = {
      schemaVersion: 1,
      mode: this.mode,
      agent: {
        id: process.env.ONEBORD_AGENT_ID || 'local',
        startedAt: null,
        updatedAt: null,
      },
      system: null,
      mihomo: {
        ok: false,
        upstream: this.mihomoUpstream,
        version: null,
        proxies: null,
        connections: null,
        memory: null,
        traffic: { up: 0, down: 0 },
        lastError: null,
        updatedAt: null,
      },
      vohive: {
        ok: false,
        upstream: this.vohiveUpstream,
        health: null,
        devices: [],
        syncStatus: 'idle',
        lastError: null,
        updatedAt: null,
      },
    }
  }

  start() {
    if (this.started) return
    this.started = true
    this.snapshot.agent.startedAt = Date.now()
    void this.collectSystem()
    void this.collectMihomo()
    void this.collectVoHive()
    this.connectTrafficWs()
    this.addInterval(() => void this.collectSystem(), this.intervals.system)
    this.addInterval(() => void this.collectMihomo(), this.intervals.mihomo)
    this.addInterval(() => void this.collectVoHive(), this.intervals.vohive)
  }

  stop() {
    this.started = false
    for (const timer of this.timers) clearInterval(timer)
    this.timers.clear()
    if (this.trafficReconnectTimer) clearTimeout(this.trafficReconnectTimer)
    this.trafficReconnectTimer = null
    this.trafficWs?.close()
    this.trafficWs = null
  }

  addInterval(fn, ms) {
    const timer = setInterval(fn, ms)
    this.timers.add(timer)
  }

  getSnapshot() {
    return this.snapshot
  }

  publish(type, payload = {}) {
    this.snapshot.agent.updatedAt = Date.now()
    const event = {
      type,
      ts: Date.now(),
      mode: this.mode,
      payload,
      snapshot: this.snapshot,
    }
    this.emit('event', event)
  }

  async collectSystem() {
    try {
      const system = getSystemInfo()
      this.snapshot.system = system
      this.publish('system.snapshot', { system })
    } catch (err) {
      this.publish('system.error', { error: err?.message || 'system collection failed' })
    }
  }

  mihomoHeaders() {
    return this.mihomoSecret ? { Authorization: `Bearer ${this.mihomoSecret}` } : {}
  }

  async collectMihomo() {
    const base = this.mihomoUpstream
    if (!base) return
    try {
      const [version, proxies, connections, memory] = await Promise.allSettled([
        fetchJson(`${base}/version`, { headers: this.mihomoHeaders() }),
        fetchJson(`${base}/proxies`, { headers: this.mihomoHeaders() }),
        fetchJson(`${base}/connections`, { headers: this.mihomoHeaders() }),
        fetchJson(`${base}/memory`, { headers: this.mihomoHeaders(), timeoutMs: 2500 }),
      ])

      if (proxies.status !== 'fulfilled') throw proxies.reason

      this.snapshot.mihomo.ok = true
      this.snapshot.mihomo.lastError = null
      this.snapshot.mihomo.updatedAt = Date.now()
      this.snapshot.mihomo.version = version.status === 'fulfilled' ? version.value : this.snapshot.mihomo.version
      this.snapshot.mihomo.proxies = proxies.value
      this.snapshot.mihomo.connections = connections.status === 'fulfilled' ? connections.value : this.snapshot.mihomo.connections
      this.snapshot.mihomo.memory = memory.status === 'fulfilled' ? memory.value : this.snapshot.mihomo.memory
      this.publish('mihomo.snapshot', { mihomo: this.snapshot.mihomo })
    } catch (err) {
      this.snapshot.mihomo.ok = false
      this.snapshot.mihomo.lastError = err?.message || 'mihomo collection failed'
      this.snapshot.mihomo.updatedAt = Date.now()
      this.publish('mihomo.error', { error: this.snapshot.mihomo.lastError })
    }
  }

  vohiveHeaders() {
    return this.vohiveToken ? { Authorization: `Bearer ${this.vohiveToken}` } : {}
  }

  async collectVoHive() {
    const base = this.vohiveUpstream
    if (!base) return
    try {
      const [health, devices] = await Promise.allSettled([
        fetchJson(`${base}/api/health`, { headers: this.vohiveHeaders() }),
        fetchJson(`${base}/api/devices`, { headers: this.vohiveHeaders() }),
      ])
      if (health.status !== 'fulfilled' && devices.status !== 'fulfilled') {
        throw health.reason || devices.reason
      }
      this.snapshot.vohive.ok = true
      this.snapshot.vohive.syncStatus = 'running'
      this.snapshot.vohive.lastError = null
      this.snapshot.vohive.updatedAt = Date.now()
      this.snapshot.vohive.health = health.status === 'fulfilled' ? health.value : this.snapshot.vohive.health
      const rawDevices = devices.status === 'fulfilled' ? devices.value : []
      this.snapshot.vohive.devices = Array.isArray(rawDevices) ? rawDevices : (rawDevices?.devices || [])
      this.publish('vohive.snapshot', { vohive: this.snapshot.vohive })
    } catch (err) {
      this.snapshot.vohive.ok = false
      this.snapshot.vohive.syncStatus = 'offline'
      this.snapshot.vohive.lastError = err?.message || 'vohive collection failed'
      this.snapshot.vohive.updatedAt = Date.now()
      this.publish('vohive.error', { error: this.snapshot.vohive.lastError })
    }
  }

  connectTrafficWs() {
    if (!this.mihomoUpstream || this.trafficWs) return
    const headers = this.mihomoHeaders()
    const ws = new WebSocket(wsUrlFromHttp(this.mihomoUpstream, '/traffic'), { headers })
    this.trafficWs = ws

    ws.on('message', (raw) => {
      try {
        const traffic = JSON.parse(String(raw))
        this.snapshot.mihomo.traffic = {
          up: Number(traffic.up || 0),
          down: Number(traffic.down || 0),
        }
        this.snapshot.mihomo.ok = true
        this.publish('mihomo.traffic', { traffic: this.snapshot.mihomo.traffic })
      } catch {
        /* ignore malformed traffic frame */
      }
    })

    const reconnect = () => {
      if (this.trafficWs !== ws) return
      this.trafficWs = null
      if (!this.started) return
      if (this.trafficReconnectTimer) clearTimeout(this.trafficReconnectTimer)
      this.trafficReconnectTimer = setTimeout(() => {
        this.trafficReconnectTimer = null
        this.connectTrafficWs()
      }, 2000)
    }

    ws.on('close', reconnect)
    ws.on('error', reconnect)
  }
}

export function createOneBordAgent(options = {}) {
  return new OneBordAgent(options)
}

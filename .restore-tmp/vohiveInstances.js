/**
 * VoHive 多容器实例 — 每个实例 = 一个独立后端连接（主机/端口/账号/token）。
 * 设备页为每个实例渲染一个独立容器框，互不冲突。持久化到 localStorage。
 */
import { reactive } from 'vue'
import { DEFAULT_VOHIVE_PORT } from './vohiveConnection'

const STORAGE_KEY = 'onebord:vohive:instances'

function genId() {
  return `vh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function normalizeInstance(raw = {}) {
  const port = Number(raw.port)
  return {
    id: raw.id || genId(),
    label: String(raw.label || 'VoHive').trim() || 'VoHive',
    host: String(raw.host || '').trim(),
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_VOHIVE_PORT,
    token: String(raw.token || ''),
    username: String(raw.username || ''),
  }
}

export function createInstance(overrides = {}) {
  return normalizeInstance({ id: genId(), ...overrides })
}

function loadInstances() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((item) => normalizeInstance(item))
      }
    }
  } catch {
    /* ignore */
  }
  // 默认两个空白容器，主机留空由用户填写
  return [
    createInstance({ label: '容器 1' }),
    createInstance({ label: '容器 2' }),
  ]
}

export const vohiveInstances = reactive(loadInstances())

export function persistInstances() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(vohiveInstances.map((item) => ({ ...item }))),
    )
  } catch {
    /* ignore */
  }
}

export function addInstance(overrides = {}) {
  const inst = createInstance({
    label: `容器 ${vohiveInstances.length + 1}`,
    ...overrides,
  })
  vohiveInstances.push(inst)
  persistInstances()
  return inst
}

export function removeInstance(id) {
  const idx = vohiveInstances.findIndex((item) => item.id === id)
  if (idx !== -1) {
    vohiveInstances.splice(idx, 1)
    persistInstances()
  }
}

export function updateInstance(id, patch = {}) {
  const inst = vohiveInstances.find((item) => item.id === id)
  if (!inst) return
  if (patch.port != null) {
    const n = Number(patch.port)
    patch = { ...patch, port: Number.isFinite(n) && n > 0 ? n : DEFAULT_VOHIVE_PORT }
  }
  Object.assign(inst, patch)
  persistInstances()
}

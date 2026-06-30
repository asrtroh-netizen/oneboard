/**
 * VoHive 多容器实例 — 每个实例 = 一个独立后端连接（主机/端口/账号/token）。
 * active instance 决定全局 VoHive API 使用的 upstream + token。
 */
import { reactive } from 'vue'
import { DEFAULT_VOHIVE_PORT } from '../utils/vohiveEndpoint'
import { STORAGE_KEYS } from '../utils/storageKeys'

const STORAGE_KEY = STORAGE_KEYS.vohiveInstances
const ACTIVE_KEY = STORAGE_KEYS.vohiveActiveInstance

function genId() {
  return `vh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function parsePort(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function normalizeInstance(raw = {}) {
  return {
    id: raw.id || genId(),
    label: String(raw.label || 'VoHive').trim() || 'VoHive',
    host: String(raw.host || '').trim(),
    port: parsePort(raw.port),
    token: String(raw.token || ''),
    username: String(raw.username || ''),
    collapsed: Boolean(raw.collapsed),
  }
}

function readActiveInstanceId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || ''
  } catch {
    return ''
  }
}

let activeInstanceId = readActiveInstanceId()

export function getActiveInstanceId() {
  return activeInstanceId
}

export function setActiveInstanceId(id) {
  activeInstanceId = String(id || '').trim()
  try {
    if (activeInstanceId) localStorage.setItem(ACTIVE_KEY, activeInstanceId)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* ignore */
  }
}

export function getActiveVoHiveInstance() {
  if (!activeInstanceId) return null
  return vohiveInstances.find((item) => item.id === activeInstanceId) || null
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
  if ('port' in patch) {
    patch = { ...patch, port: parsePort(patch.port) }
  }
  Object.assign(inst, patch)
  persistInstances()
}

/** 启动时校验 active id 是否仍指向有效实例 */
export function reconcileActiveInstanceId() {
  if (!activeInstanceId) return null
  const inst = vohiveInstances.find((item) => item.id === activeInstanceId)
  if (!inst) {
    setActiveInstanceId('')
    return null
  }
  return inst
}

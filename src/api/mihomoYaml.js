import { getMihomoApiBase, getMihomoAuthHeaders } from '../config/mihomo'
import {
  clashBackendState,
  resolveClashUpstreamBase,
} from '../stores/clashBackend'
import { startLoading, stopLoading } from '../stores/globalLoading'
import { buildYamlFromRemoteSnapshot } from '../utils/mihomoRuntimeYaml'
import { STORAGE_KEYS } from '../utils/storageKeys'

const REMOTE_YAML_CACHE_PREFIX = STORAGE_KEYS.remoteYamlPrefix
const DEFAULT_STORAGE_KEY = STORAGE_KEYS.configYaml
const FALLBACK_STORAGE_KEYS = [
  STORAGE_KEYS.configYaml,
  'onebord:config-yaml',
  'config-yaml',
  'mihomo:config-yaml',
]

function configYamlStorageKeys() {
  const fromEnv = String(import.meta.env.VITE_MIHOMO_CONFIG_STORAGE_KEY || '').trim()
  const keys = fromEnv ? [fromEnv, ...FALLBACK_STORAGE_KEYS] : [...FALLBACK_STORAGE_KEYS]
  return [...new Set(keys.filter(Boolean))]
}

function storageApiUrl(key) {
  return `${getMihomoApiBase()}/storage/${encodeURIComponent(key)}`
}

function remoteYamlCacheKey() {
  return `${REMOTE_YAML_CACHE_PREFIX}:${clashBackendState.type}:${resolveClashUpstreamBase()}`
}

function readRemoteYamlCache() {
  try {
    const raw = localStorage.getItem(remoteYamlCacheKey())
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const yaml = extractYamlFromStoragePayload(parsed)
    return yaml ? { yaml, updatedAt: parsed?.updatedAt || null } : null
  } catch {
    return null
  }
}

function writeRemoteYamlCache(yaml, updatedAt = new Date().toISOString()) {
  try {
    localStorage.setItem(remoteYamlCacheKey(), JSON.stringify({ yaml, updatedAt }))
  } catch {
    /* ignore */
  }
}

/** 切换后端时清空所有远程 YAML 会话缓存，避免页面短暂显示旧后端配置 */
export function clearAllRemoteYamlCaches() {
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key?.startsWith(`${REMOTE_YAML_CACHE_PREFIX}:`)) keys.push(key)
    }
    keys.forEach((key) => localStorage.removeItem(key))
  } catch {
    /* ignore */
  }
}

async function mihomoApiRequest(path, options = {}) {
  const { trackLoading, ...fetchOptions } = options
  const method = fetchOptions.method || 'GET'
  const shouldTrack = trackLoading ?? (method !== 'GET')
  let ticket = null

  if (shouldTrack) ticket = startLoading()

  try {
    const res = await fetch(`${getMihomoApiBase()}${path.startsWith('/') ? path : `/${path}`}`, {
      headers: getMihomoAuthHeaders(fetchOptions.headers),
      method,
      ...fetchOptions,
    })
    const text = await res.text()
    if (!res.ok) {
      let message = text
      try {
        const json = JSON.parse(text)
        message = json.message || json.status || json.error || text
      } catch {
        /* plain text */
      }
      throw new Error(message || `后端 ${path} → ${res.status}`)
    }
    return text
  } catch (err) {
    if (err?.name === 'TypeError' && String(err.message).includes('fetch')) {
      throw new Error(`无法连接后端（${getMihomoApiBase()}${path}），请确认 external-controller 已开启`)
    }
    throw err
  } finally {
    if (ticket != null) stopLoading(ticket)
  }
}

function extractYamlFromStoragePayload(payload) {
  if (payload == null) return null
  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    if (!trimmed || trimmed === 'null') return null
    if (looksLikeMihomoYaml(trimmed)) return trimmed
    try {
      return extractYamlFromStoragePayload(JSON.parse(trimmed))
    } catch {
      return null
    }
  }
  if (typeof payload === 'object') {
    if (typeof payload.yaml === 'string' && payload.yaml.trim()) return payload.yaml
    if (typeof payload.content === 'string' && payload.content.trim()) return payload.content
  }
  return null
}

function looksLikeMihomoYaml(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return false
  return trimmed.includes('proxy-groups:')
    || trimmed.includes('proxy-providers:')
    || (trimmed.includes('rules:') && trimmed.includes(':'))
}

export async function getMihomoStorageValue(key) {
  const text = await mihomoApiRequest(`/storage/${encodeURIComponent(key)}`, {
    trackLoading: false,
  }).catch(() => null)
  if (!text || text.trim() === 'null') return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function putMihomoStorageValue(key, value) {
  try {
    await mihomoApiRequest(`/storage/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
      trackLoading: true,
    })
    return true
  } catch {
    return false
  }
}

async function tryFetchYamlFromRemoteStorage() {
  for (const key of configYamlStorageKeys()) {
    const payload = await getMihomoStorageValue(key).catch(() => null)
    const yaml = extractYamlFromStoragePayload(payload)
    if (yaml) return { yaml, updatedAt: payload?.updatedAt || null, source: 'remote-storage' }
  }
  return null
}

async function tryFetchYamlFromConfigsAcceptHeader() {
  const acceptHeaders = [
    'text/yaml, application/yaml, text/plain, */*',
    'application/vnd.clash.config+yaml, text/yaml, */*',
    'application/yaml, text/yaml, */*',
  ]

  for (const accept of acceptHeaders) {
    try {
      const res = await fetch(`${getMihomoApiBase()}/configs`, {
        headers: getMihomoAuthHeaders({ Accept: accept }),
      })
      const text = await res.text()
      if (!res.ok) continue
      if (looksLikeMihomoYaml(text)) {
        return { yaml: text.trim(), updatedAt: new Date().toISOString(), source: 'remote-configs' }
      }
    } catch {
      /* try next accept header */
    }
  }
  return null
}

async function tryFetchYamlFromConfigsJson() {
  try {
    const text = await mihomoApiRequest('/configs', { trackLoading: false })
    const json = JSON.parse(text)
    if (looksLikeMihomoYaml(json?.payload)) {
      return {
        yaml: String(json.payload).trim(),
        updatedAt: new Date().toISOString(),
        source: 'remote-configs-payload',
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

async function tryFetchYamlFromRemoteRuntimeSnapshot() {
  try {
    const [proxiesText, rulesText, providersText] = await Promise.all([
      mihomoApiRequest('/proxies', { trackLoading: false }).catch(() => null),
      mihomoApiRequest('/rules', { trackLoading: false }).catch(() => null),
      mihomoApiRequest('/providers/proxies', { trackLoading: false }).catch(() => null),
    ])
    const proxies = proxiesText ? JSON.parse(proxiesText) : null
    const rules = rulesText ? JSON.parse(rulesText) : null
    const providers = providersText ? JSON.parse(providersText) : null
    const yaml = buildYamlFromRemoteSnapshot({ proxies, rules, providers })
    if (!looksLikeMihomoYaml(yaml)) return null
    return {
      yaml,
      updatedAt: new Date().toISOString(),
      source: 'remote-runtime',
    }
  } catch {
    return null
  }
}

function tryFetchYamlFromRemoteSessionCache() {
  const cached = readRemoteYamlCache()
  if (!cached?.yaml) return null
  return { ...cached, source: 'remote-session-cache' }
}

async function resolveRemoteConfigYaml({ retryReload = true } = {}) {
  const resolvers = [
    tryFetchYamlFromRemoteStorage,
    tryFetchYamlFromConfigsAcceptHeader,
    tryFetchYamlFromConfigsJson,
    tryFetchYamlFromRemoteSessionCache,
    tryFetchYamlFromRemoteRuntimeSnapshot,
  ]

  for (const resolver of resolvers) {
    const result = await resolver()
    if (result?.yaml) return result
  }

  if (!retryReload) return null

  await reloadMihomoRuntimeFromFile('').catch(() => null)

  for (const resolver of [
    tryFetchYamlFromRemoteStorage,
    tryFetchYamlFromConfigsAcceptHeader,
    tryFetchYamlFromConfigsJson,
    tryFetchYamlFromRemoteRuntimeSnapshot,
  ]) {
    const result = await resolver()
    if (result?.yaml) return result
  }

  return null
}

export async function fetchMihomoConfigYamlText(options = {}) {
  const result = await resolveRemoteConfigYaml(options)
  if (!result?.yaml) return null

  writeRemoteYamlCache(result.yaml, result.updatedAt)
  await cacheMihomoConfigYamlText(result.yaml).catch(() => false)
  return result.yaml
}

export async function fetchMihomoConfigYamlBundle(options = {}) {
  const result = await resolveRemoteConfigYaml(options)

  return {
    yaml: result?.yaml || '',
    updatedAt: result?.updatedAt || null,
    source: result?.source || '',
    storageKey: configYamlStorageKeys()[0],
  }
}

export async function reloadMihomoRuntimeFromFile(configPath = '') {
  await mihomoApiRequest('/configs?force=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: configPath, payload: '' }),
    trackLoading: true,
  })
}

export async function applyStorageYamlToMihomo(yaml) {
  const text = String(yaml || '').trim()
  if (!text) throw new Error('远程后端中无 YAML 可应用')
  await applyMihomoConfigYaml(text)
}

export async function cacheMihomoConfigYamlText(yaml) {
  const key = configYamlStorageKeys()[0]
  return putMihomoStorageValue(key, {
    yaml,
    updatedAt: new Date().toISOString(),
  })
}

export async function applyMihomoConfigYaml(yaml) {
  await mihomoApiRequest('/configs?force=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '', payload: yaml }),
    trackLoading: true,
  })
}

export async function saveMihomoConfigYaml(yaml) {
  const text = String(yaml || '').trim()
  if (!text) throw new Error('YAML 内容不能为空')

  await applyMihomoConfigYaml(text)
  await cacheMihomoConfigYamlText(text).catch(() => false)
  writeRemoteYamlCache(text)
}

export async function importMihomoConfigYaml(yaml, { apply = true } = {}) {
  const text = String(yaml || '').trim()
  if (!text) throw new Error('YAML 内容不能为空')
  if (apply) {
    await saveMihomoConfigYaml(text)
  } else {
    writeRemoteYamlCache(text)
    await cacheMihomoConfigYamlText(text).catch(() => false)
  }
  return text
}

export function getMihomoConfigYamlStorageKey() {
  return configYamlStorageKeys()[0]
}

export function getMihomoConfigYamlStorageUrl() {
  return storageApiUrl(getMihomoConfigYamlStorageKey())
}

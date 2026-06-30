import { apiFetchJson } from './http'
import { authHeaders } from '../stores/auth'

export function fetchMihomoConfigProviders() {
  return apiFetchJson('/api/mihomo-config', {
    headers: authHeaders(),
    trackLoading: false,
  })
}

export function saveMihomoProviderConfig(name, config) {
  return apiFetchJson('/api/mihomo-config', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, config }),
  })
}

export function fetchMihomoConfigPath() {
  return apiFetchJson('/api/mihomo-config-path', {
    headers: authHeaders(),
    trackLoading: false,
  })
}

export function fetchMihomoConfigYamlFromDisk() {
  return apiFetchJson('/api/mihomo-config-yaml', {
    headers: authHeaders(),
    trackLoading: false,
  })
}

export function saveMihomoConfigYamlToDisk(yaml) {
  return apiFetchJson('/api/mihomo-config-yaml', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ yaml }),
  })
}

import { apiFetchJson } from './http'

export async function getSystemInfo() {
  return apiFetchJson('/api/system-info', {
    headers: { Accept: 'application/json' },
    trackLoading: false,
  })
}

export function applySystemInfoToState(data, appState) {
  if (!data) return
  if (data.hostname) appState.system.hostname = data.hostname
  if (data.cpuModel) appState.system.cpuModel = data.cpuModel
  if (typeof data.cpu === 'number') appState.system.cpu = data.cpu
  if (typeof data.memory === 'number') appState.system.memory = data.memory
  if (typeof data.memoryTotal === 'number') appState.system.memoryTotal = data.memoryTotal
  if (typeof data.disk === 'number') appState.system.disk = data.disk
  if (data.os) appState.system.os = data.os
}

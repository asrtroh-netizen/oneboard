/**
 * VoHive 公共 API — re-export adapter，并提供页面/旧命名兼容层。
 */
export {
  VOHIVE_ENDPOINTS,
  assertVoHiveEndpointAllowed,
  getDevices,
  getDeviceOverview,
  getEsimProfiles,
  getCardPolicy,
  putCardPolicy,
  getHealth,
  getTraffic,
  isVoHiveMissingApiError,
  login as vohiveLogin,
  rebootDevice,
  reconnectVowifi,
  refreshDeviceInfo,
  rescanDevices,
  rotateDeviceIp,
  sendAtCommand,
  switchEsimProfile,
  getSmsContacts,
  getSmsThread,
  sendSms,
  deleteSmsMessage,
  vohiveAdapterRequest,
} from './vohive.adapter'

import {
  getDeviceOverview,
  getDevices,
  getEsimProfiles,
  getHealth,
  getTraffic,
  rebootDevice,
  reconnectVowifi,
  refreshDeviceInfo,
  rescanDevices,
  rotateDeviceIp,
  sendAtCommand,
  switchEsimProfile,
  vohiveAdapterRequest,
} from './vohive.adapter'

// ── 兼容旧命名 ──

export function listVoHiveDevices() {
  return getDevices()
}

export function getVoHiveTrafficAnalysis(params) {
  return getTraffic(params)
}

export function getVoHiveDeviceOverview(deviceId) {
  return getDeviceOverview(deviceId)
}

export function getVoHiveDevice(deviceId) {
  return getDeviceOverview(deviceId)
}

export function refreshVoHiveDevice(deviceId) {
  return refreshDeviceInfo(deviceId)
}

export function rebootVoHiveDevice(deviceId) {
  return rebootDevice(deviceId)
}

export function reconnectVoHiveVowifi(deviceId) {
  return reconnectVowifi(deviceId)
}

export function rotateVoHiveDeviceIp(deviceId) {
  return rotateDeviceIp(deviceId)
}

export function rescanVoHiveDevices() {
  return rescanDevices()
}

export function sendVoHiveAtCommand(deviceId, command, timeoutMs = 10000) {
  const cmd = String(command || '').trim()
  if (!cmd) return Promise.reject(new Error('AT 指令不能为空'))
  return sendAtCommand(deviceId, { cmd, timeout_ms: timeoutMs })
}

export function getVoHiveEsimProfiles(deviceId, options) {
  return getEsimProfiles(deviceId, options)
}

export function switchVoHiveEsimProfile(deviceId, iccid, aidHex) {
  const body = { iccid: String(iccid || '').trim() }
  if (aidHex) body.aid_hex = String(aidHex).trim()
  if (!body.iccid) return Promise.reject(new Error('缺少 ICCID'))
  return switchEsimProfile(deviceId, body)
}

export function listDiscoveredDevices() {
  return vohiveAdapterRequest('/devices/discovered', { trackLoading: false })
}

/** @deprecated VoHive 网关无 SSE，请使用 sync layer 轮询 */
export function createVoHiveEventSource() {
  throw new Error('VoHive 网关不支持 SSE，请使用 sync layer 轮询')
}

/** @deprecated VoHive 网关无 SSE，请使用 sync layer 轮询 */
export function openVoHiveEventStream(_path, { onError } = {}) {
  onError?.(new Error('VoHive 网关不支持 SSE，请使用 sync layer 轮询'))
  return { abort() {} }
}

/** @deprecated 请使用 vohiveAdapterRequest + VOHIVE_ENDPOINTS */
export { vohiveAdapterRequest as vohiveRequest } from './vohive.adapter'

export { getHealth as checkVoHiveHealth }

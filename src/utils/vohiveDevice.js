/** VoHive 设备 / 状态归一化 */

export function normalizeDeviceList(payload) {
  if (Array.isArray(payload)) return payload.map(normalizeDevice)
  if (Array.isArray(payload?.devices)) return payload.devices.map(normalizeDevice)
  if (Array.isArray(payload?.items)) return payload.items.map(normalizeDevice)
  return []
}

export function normalizeDevice(raw = {}) {
  const id = raw.id || raw.device_id || raw.deviceId || raw.name || ''
  const name = raw.name || raw.label || raw.display_name || id
  const code = raw.code || raw.short_name || raw.alias || ''
  const iface = raw.interface || raw.iface || raw.net_device || raw.wwan || ''
  const online = raw.control_online ?? raw.healthy ?? raw.running ?? raw.online
  const signal = raw.signal ?? raw.rsrp ?? raw.metrics?.rsrp ?? raw.modem?.signal_dbm ?? 0
  const statusText = raw.status_text || raw.statusText || raw.state_label || raw.state || raw.lifecycle_phase || ''
  const publicIp = raw.public_ip || raw.publicIp || raw.wan_ip || raw.ip || ''
  const iccid = raw.iccid || raw.modem?.iccid || raw.sim?.iccid || '—'
  const imei = raw.imei || raw.modem?.imei || raw.sim?.imei || '—'
  const phone = raw.phone || raw.msisdn || raw.number || '—'
  const dataEnabled = raw.data_enabled ?? raw.dataEnabled ?? raw.mobile_data
  const flightMode = raw.flight_mode ?? raw.flightMode ?? raw.airplane_mode

  return {
    ...raw,
    id,
    name,
    code,
    interface: iface,
    online: Boolean(online),
    signal: Number(signal) || 0,
    statusText: String(statusText || (online ? '在线' : '离线')),
    publicIp: String(publicIp || '—'),
    iccid: String(iccid || '—'),
    imei: String(imei || '—'),
    phone: String(phone || '—'),
    dataEnabled,
    flightMode: Boolean(flightMode),
  }
}

export function normalizeSmsList(payload) {
  let list = []
  if (Array.isArray(payload)) list = payload
  else if (Array.isArray(payload?.messages)) list = payload.messages
  else if (Array.isArray(payload?.items)) list = payload.items

  return sortSmsMessagesAsc(
    list
      .map(normalizeSmsMessage)
      .filter((item) => item.body),
  )
}

function smsTimestamp(raw = {}) {
  return raw.created_at || raw.timestamp || raw.time || raw.received_at || raw.sent_at || ''
}

export function normalizeSmsContact(raw = {}) {
  const time = smsTimestamp({ timestamp: raw.last_timestamp })
  const date = time ? new Date(time) : null
  const validDate = date && !Number.isNaN(date.getTime())
  const imsi = String(raw.imsi || '').trim()
  const peer = String(raw.peer || '').trim()

  return {
    key: `${imsi}|${peer}`,
    imsi,
    peer,
    deviceId: String(raw.device_id || raw.deviceId || '').trim(),
    deviceName: String(raw.device_name || raw.deviceName || '').trim(),
    localPhone: String(raw.local_phone || raw.localPhone || '').trim(),
    lastMessage: String(raw.last_content || raw.last_message || raw.preview || '').slice(0, 120),
    lastSmsId: Number(raw.last_sms_id || raw.lastSmsId || 0) || 0,
    lastTs: validDate ? date.getTime() : 0,
    lastTimeLabel: formatSmsTime(validDate ? date : null),
  }
}

export function normalizeSmsContacts(payload) {
  let list = []
  if (Array.isArray(payload)) list = payload
  else if (Array.isArray(payload?.contacts)) list = payload.contacts
  else if (Array.isArray(payload?.items)) list = payload.items

  return list
    .map(normalizeSmsContact)
    .filter((item) => item.peer)
    .sort((a, b) => b.lastTs - a.lastTs)
}

export function normalizeSmsMessage(raw = {}) {
  const timeRaw = smsTimestamp(raw)
  const date = timeRaw ? new Date(timeRaw) : null
  const validDate = date && !Number.isNaN(date.getTime())
  const numericId = Number(raw.id ?? raw.message_id ?? raw.sms_id ?? 0) || 0

  return {
    id: String(raw.id || raw.message_id || raw.sms_id || `${raw.peer || raw.from || raw.sender}-${timeRaw || Math.random()}`),
    numericId,
    imsi: String(raw.imsi || '').trim(),
    peer: String(raw.peer || raw.from || raw.sender || '').trim(),
    deviceId: String(raw.device_id || raw.deviceId || '').trim(),
    deviceName: String(raw.device_name || raw.deviceName || '').trim(),
    sender: String(raw.sender || raw.from_name || raw.from || raw.peer || raw.contact || '未知'),
    body: String(raw.body || raw.text || raw.message || raw.content || ''),
    phone: String(raw.local_phone || raw.to || raw.phone || raw.recipient || raw.local_number || ''),
    timestamp: timeRaw ? String(timeRaw) : '',
    time: validDate ? date.toISOString() : '',
    dateKey: validDate ? date.toISOString().slice(0, 10) : '未知日期',
    timeLabel: formatSmsTime(validDate ? date : null),
  }
}

export function sortSmsMessagesAsc(messages = []) {
  return [...messages].sort((a, b) => {
    const ta = a.time ? new Date(a.time).getTime() : 0
    const tb = b.time ? new Date(b.time).getTime() : 0
    if (ta !== tb) return ta - tb
    return (a.numericId || 0) - (b.numericId || 0)
  })
}

export function formatSmsTime(date) {
  if (!date) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function groupSmsByDate(messages = []) {
  const groups = []
  for (const message of messages) {
    const last = groups[groups.length - 1]
    if (!last || last.date !== message.dateKey) {
      groups.push({ date: message.dateKey, items: [message] })
    } else {
      last.items.push(message)
    }
  }
  return groups
}

export function normalizeEsimProfiles(payload) {
  const slots = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.profiles)
      ? [{ eid: '', profiles: payload.profiles }]
      : Array.isArray(payload?.items)
        ? payload.items
        : []

  return slots.flatMap((slot, slotIndex) =>
    (slot.profiles || []).map((profile) => {
      const state = profile.state
      const active = state === 1 || state === 'enabled' || profile.active === true
      return {
        slotIndex,
        eid: slot.eid || '',
        iccid: String(profile.iccid || ''),
        name: String(profile.name || profile.service_provider_name || profile.iccid || '未命名'),
        provider: String(profile.service_provider_name || profile.provider || '—'),
        active,
        stateText: String(profile.state_text || (active ? '已启用' : '已禁用')),
        classText: String(profile.class_text || ''),
      }
    }),
  )
}

export function deviceStatusTone(device) {
  if (!device?.online) return 'danger'
  if (/启动|连接|注册/.test(device.statusText || '')) return 'warning'
  return 'success'
}

export function signalLabel(dbm) {
  const n = Number(dbm) || 0
  if (n >= -80) return { label: '强', tone: 'success' }
  if (n >= -95) return { label: '中', tone: 'warning' }
  if (n === 0) return { label: '—', tone: 'neutral' }
  return { label: '弱', tone: 'danger' }
}

export function formatVoHiveTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function maskSecret(value) {
  const text = String(value || '').trim()
  if (!text || text === '—') return '—'
  if (text.length <= 6) return text
  return `${text.slice(0, 3)}***${text.slice(-2)}`
}

function pickBool(...values) {
  for (const value of values) {
    if (value === true || value === false) return value
    if (value === 1 || value === 0) return Boolean(value)
    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      if (['ready', 'ok', 'true', 'yes', 'online', 'up', 'connected'].includes(lower)) return true
      if (['fail', 'false', 'no', 'offline', 'down', 'error'].includes(lower)) return false
    }
  }
  return false
}

function pickText(...values) {
  for (const value of values) {
    if (value == null || value === '') continue
    return String(value)
  }
  return '—'
}

function formatRunningMode(...values) {
  for (const value of values) {
    if (value == null || value === '') continue
    const text = String(value).trim()
    if (!text || text === '—') continue
    if (/^at$/i.test(text)) return 'QMI'
    if (/qmi/i.test(text)) return 'QMI'
    return text
  }
  return 'QMI'
}

function stageReady(source, keys) {
  for (const key of keys) {
    const direct = source?.[key]
    if (direct != null) return pickBool(direct)
  }
  return false
}

function unwrapOverviewRoot(raw = {}) {
  if (Array.isArray(raw?.devices) && raw.devices.length) return raw.devices[0]
  if (raw?.overview && typeof raw.overview === 'object') return raw.overview
  if (raw?.data && typeof raw.data === 'object') {
    if (Array.isArray(raw.data.devices) && raw.data.devices.length) return raw.data.devices[0]
    return raw.data
  }
  return raw
}

function plmnFromMccMnc(source = {}) {
  const mcc = String(source.native_mcc ?? source.mcc ?? '').trim()
  const mnc = String(source.native_mnc ?? source.mnc ?? '').trim()
  return mcc && mnc ? `${mcc}${mnc}` : ''
}

function pickNameRecord(record) {
  if (!record || typeof record !== 'object') return ''
  const name = record.full_name ?? record.fullName ?? record.short_name ?? record.shortName
  if (name == null || name === '') return ''
  return String(name).trim()
}

function plmnMatches(pattern, plmn) {
  const a = String(pattern ?? '').trim().toLowerCase()
  const b = String(plmn ?? '').trim().toLowerCase()
  if (!a || !b) return false
  if (a === b) return true
  if (!a.includes('x')) return a.length < b.length && b.startsWith(a)
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== 'x' && a[i] !== b[i]) return false
  }
  return true
}

/** 与 VoHive 官方前端一致：native_spn → opl/pnn → pnn → modem.operator */
function resolveOperatorFromModem(modem = {}) {
  const spn = String(modem.native_spn ?? modem.nativeSpn ?? '').trim()
  if (spn) return spn

  const plmn = plmnFromMccMnc(modem)
  const { opl, pnn } = modem
  if (plmn && Array.isArray(opl) && Array.isArray(pnn)) {
    for (const entry of opl) {
      if (!plmnMatches(entry?.plmn, plmn)) continue
      const recordId = Number(entry?.pnn_record ?? entry?.pnnRecord ?? 0)
      if (!recordId) continue
      const name = pickNameRecord(pnn.find((item) => Number(item?.record) === recordId))
      if (name) return name
    }
  }

  if (Array.isArray(pnn)) {
    for (const entry of pnn) {
      const name = pickNameRecord(entry)
      if (name) return name
    }
  }

  return String(modem.operator ?? '').trim()
}

export function normalizeDeviceOverview(raw = {}, device = {}) {
  const root = unwrapOverviewRoot(raw?.overview || raw?.data || raw || {})
  const runtime = device.vowifi_runtime || root.vowifi_runtime || {}
  const running = root.running || root.wificall || root.wifi_calling || root.status || runtime || root
  const modem = root.modem || device.modem || {}
  const sim = root.sim || root.device || modem || device
  const network = root.network || root.net || root.connectivity || {}
  const modemOperator = resolveOperatorFromModem(modem)

  const stages = [
    { key: 'sim', label: 'SIM', ready: stageReady(runtime, ['sim_ready', 'simReady']) || stageReady(running, ['sim', 'sim_ready', 'simReady']) || stageReady(running?.stages, ['sim']) },
    { key: 'access', label: 'Access', ready: stageReady(runtime, ['access_ready', 'accessReady']) || stageReady(running, ['access', 'access_ready', 'accessReady']) || stageReady(running?.stages, ['access']) },
    { key: 'tunnel', label: 'Tunnel', ready: stageReady(runtime, ['tunnel_ready', 'tunnelReady']) || stageReady(running, ['tunnel', 'tunnel_ready', 'tunnelReady']) || stageReady(running?.stages, ['tunnel']) },
    { key: 'ims', label: 'IMS', ready: stageReady(runtime, ['ims_ready', 'imsReady']) || stageReady(running, ['ims', 'ims_ready', 'imsReady']) || stageReady(running?.stages, ['ims']) },
    {
      key: 'policy',
      label: '卡策略',
      ready: stageReady(runtime, ['sms_ready', 'smsReady', 'policy_ready', 'policyReady'])
        || stageReady(running, ['sms', 'policy', 'card_policy', 'sms_ready', 'policy_ready'])
        || stageReady(running?.stages, ['policy', 'sms']),
    },
  ]

  const allReady = pickBool(
    runtime.sms_ready,
    running.all_ready,
    running.allReady,
    running.ready,
    stages.every((stage) => stage.ready) && stages.some((stage) => stage.ready),
  )

  const wificallLabel = allReady
    ? 'WiFi-Calling · 全部就绪'
    : pickText(running.label, running.status_text, running.statusText, 'WiFi-Calling')

  const operatorFallback = plmnFromMccMnc(modem) || plmnFromMccMnc(sim)

  const dataEnabled = network.data_enabled ?? network.dataEnabled ?? network.mobile_data ?? device.network_enabled ?? device.data_connected
  const networkRows = [
    { label: '运营商', value: pickText(modemOperator, network.operator, network.carrier, sim.operator, sim.carrier, modem.operator) },
    { label: '信号', value: pickText(modem.signal_dbm && `${modem.signal_dbm} dBm`, modem.signal_rsrp && `${modem.signal_rsrp} dBm`, network.signal_dbm && `${network.signal_dbm} dBm`, network.signal, network.rsrp, device.signal && `${device.signal} dBm`, sim.signal_dbm && `${sim.signal_dbm} dBm`) },
    { label: '公网 IP', value: pickText(network.public_ip, network.publicIp, device.publicIp) },
    { label: '接口', value: pickText(network.interface, network.iface, device.interface) },
    { label: '网络模式', value: pickText(modem.network_mode, runtime.network_mode, sim.network_mode, network.network_mode) },
  ].filter((row) => row.value !== '—')

  return {
    wificallLabel,
    wificallReady: allReady,
    stages,
    dataPlane: pickText(runtime.dataplane_mode, running.data_plane, running.dataPlane, running.plane),
    lastReason: pickText(runtime.last_reason, running.last_reason, running.lastReason, running.reason),
    errorCategory: pickText(runtime.last_error_class, running.error_category, running.errorCategory, running.error),
    imei: pickText(modem.imei, sim.imei, device.imei),
    iccid: pickText(runtime.iccid, modem.iccid, sim.iccid, device.iccid),
    imsi: pickText(runtime.imsi, modem.imsi, sim.imsi, sim.IMSI),
    phone: pickText(modem.phone, sim.phone, sim.msisdn, sim.number, device.phone),
    esimProfile: pickText(sim.esim_profile, sim.esimProfile, sim.current_esim, sim.currentEsim, runtime.iccid && `ICCID ${runtime.iccid.slice(-4)}`),
    operator: pickText(modemOperator, sim.operator, sim.carrier, sim.original_operator, sim.originalOperator, modem.operator, operatorFallback),
    firmware: pickText(modem.firmware, sim.firmware, sim.firmware_version, sim.firmwareVersion, device.firmware),
    flightMode: pickBool(sim.flight_mode, sim.flightMode, sim.airplane_mode, device.flightMode),
    runningMode: formatRunningMode(
      sim.qmi_mode,
      sim.qmiMode,
      runtime.qmi_mode,
      runtime.qmiMode,
      sim.running_mode,
      sim.runningMode,
      sim.mode,
      device.qmi_mode,
      device.esim_transport,
    ),
    vowifiActive: pickBool(device.vowifi_enabled, runtime.phase, running.vowifi, running.vo_wifi, running.vowifi_active, running.vowifiActive),
    dataEnabled: dataEnabled == null ? null : pickBool(dataEnabled),
    networkRows,
    hasNetwork: dataEnabled === true || networkRows.length > 0,
  }
}

const IP_VERSIONS = new Set(['v4', 'v6', 'v4v6'])

export function normalizeCardPolicy(raw = {}) {
  const ip = String(raw.ip_version ?? raw.ipVersion ?? 'v4').toLowerCase()
  return {
    ipVersion: IP_VERSIONS.has(ip) ? ip : 'v4',
    apn: String(raw.apn ?? '').trim(),
    networkEnabled: Boolean(raw.network_enabled ?? raw.networkEnabled),
    vowifiEnabled: Boolean(raw.vowifi_enabled ?? raw.vowifiEnabled),
    airplaneEnabled: Boolean(raw.airplane_enabled ?? raw.airplaneEnabled),
  }
}

export function cardPolicyToPayload(policy = {}) {
  return {
    ip_version: policy.ipVersion || 'v4',
    apn: policy.apn || '',
    network_enabled: Boolean(policy.networkEnabled),
    vowifi_enabled: Boolean(policy.vowifiEnabled),
    airplane_enabled: Boolean(policy.airplaneEnabled),
  }
}

export function resolveActiveIccid(overview, esimProfiles = []) {
  const active = esimProfiles.find((profile) => profile.active)
  const iccid = active?.iccid || overview?.iccid
  const text = String(iccid || '').trim()
  return text && text !== '—' ? text : ''
}

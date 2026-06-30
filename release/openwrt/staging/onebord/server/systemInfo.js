import os from 'os'
import fs from 'fs'

let lastCpuSample = null
let lastNetworkSample = null

function procPath(file) {
  const root = String(process.env.ONEBORD_PROC_ROOT || '/proc').replace(/[\\/]+$/, '')
  return `${root}/${file.replace(/^\/+/, '')}`
}

function diskPath() {
  return process.env.ONEBORD_DISK_PATH || '/'
}

function readFirstMatch(file, regex) {
  try {
    const content = fs.readFileSync(file, 'utf8')
    return content.match(regex)?.[1]?.trim() || null
  } catch {
    return null
  }
}

function readProcCpu() {
  try {
    const line = fs.readFileSync(procPath('stat'), 'utf8').split('\n')[0]
    const parts = line.split(/\s+/).slice(1).map(Number)
    const idle = parts[3] + (parts[4] || 0)
    const total = parts.reduce((sum, n) => sum + n, 0)
    return { idle, total }
  } catch {
    return null
  }
}

function readDiskUsagePct() {
  try {
    if (typeof fs.statfsSync === 'function') {
      const stat = fs.statfsSync(diskPath())
      const total = stat.blocks * stat.bsize
      const free = stat.bavail * stat.bsize
      if (total > 0) return ((total - free) / total) * 100
    }
  } catch {
    /* Windows / restricted env */
  }
  return null
}

function readProcMemory() {
  try {
    const meminfo = fs.readFileSync(procPath('meminfo'), 'utf8')
    const values = Object.fromEntries(
      meminfo.split('\n').map((line) => {
        const match = line.match(/^(\w+):\s+(\d+)/)
        return match ? [match[1], Number(match[2]) * 1024] : null
      }).filter(Boolean),
    )
    const total = values.MemTotal || 0
    const available = values.MemAvailable || values.MemFree || 0
    if (!total) return null
    return {
      total,
      free: available,
      usedPct: ((total - available) / total) * 100,
    }
  } catch {
    return null
  }
}

function readNetworkCounters() {
  try {
    const content = fs.readFileSync(procPath('net/dev'), 'utf8')
    const devices = {}
    for (const line of content.split('\n').slice(2)) {
      const [namePart, statsPart] = line.split(':')
      const name = namePart?.trim()
      if (!name || !statsPart || name === 'lo') continue
      const parts = statsPart.trim().split(/\s+/).map(Number)
      devices[name] = {
        rxBytes: parts[0] || 0,
        txBytes: parts[8] || 0,
      }
    }
    return devices
  } catch {
    return null
  }
}

function calcNetworkUsage() {
  const interfaces = os.networkInterfaces()
  const addresses = Object.entries(interfaces).flatMap(([name, entries = []]) =>
    entries
      .filter((entry) => !entry.internal)
      .map((entry) => ({
        name,
        family: entry.family,
        address: entry.address,
        mac: entry.mac,
      })),
  )

  const counters = readNetworkCounters()
  if (!counters) return { addresses, interfaces: [], rxBytes: 0, txBytes: 0, rxRate: 0, txRate: 0 }

  const now = Date.now()
  const rxBytes = Object.values(counters).reduce((sum, item) => sum + item.rxBytes, 0)
  const txBytes = Object.values(counters).reduce((sum, item) => sum + item.txBytes, 0)
  let rxRate = 0
  let txRate = 0
  if (lastNetworkSample) {
    const seconds = Math.max(0.001, (now - lastNetworkSample.at) / 1000)
    rxRate = Math.max(0, (rxBytes - lastNetworkSample.rxBytes) / seconds)
    txRate = Math.max(0, (txBytes - lastNetworkSample.txBytes) / seconds)
  }
  lastNetworkSample = { at: now, rxBytes, txBytes }

  return {
    addresses,
    interfaces: Object.entries(counters).map(([name, item]) => ({ name, ...item })),
    rxBytes,
    txBytes,
    rxRate: Math.round(rxRate),
    txRate: Math.round(txRate),
  }
}

function calcCpuUsage() {
  const sample = readProcCpu()
  if (!sample) return null

  if (!lastCpuSample) {
    lastCpuSample = sample
    return 0
  }

  const idleDelta = sample.idle - lastCpuSample.idle
  const totalDelta = sample.total - lastCpuSample.total
  lastCpuSample = sample

  if (totalDelta <= 0) return 0
  return Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100))
}

export function getSystemInfo() {
  const hostname = os.hostname()
  const cpus = os.cpus()
  const cpuModel = readFirstMatch(procPath('cpuinfo'), /^model name\s*:\s*(.+)$/m)
    || readFirstMatch(procPath('cpuinfo'), /^Hardware\s*:\s*(.+)$/m)
    || cpus[0]?.model?.trim()
    || 'Unknown CPU'
  const procMem = readProcMemory()
  const totalMem = procMem?.total || os.totalmem()
  const freeMem = procMem?.free || os.freemem()
  const memoryUsed = procMem?.usedPct ?? (totalMem > 0 ? ((totalMem - freeMem) / totalMem) * 100 : 0)
  const cpuFromProc = calcCpuUsage()
  const diskFromFs = readDiskUsagePct()
  const network = calcNetworkUsage()

  return {
    hostname,
    cpuModel,
    cpu: Math.round((cpuFromProc ?? 0) * 10) / 10,
    memory: Math.round(memoryUsed * 10) / 10,
    memoryTotal: Math.round((totalMem / 1024 / 1024 / 1024) * 10) / 10,
    disk: Math.round((diskFromFs ?? 0) * 10) / 10,
    platform: os.platform(),
    arch: os.arch(),
    os: `${os.platform()} ${os.arch()}`,
    source: cpuFromProc != null ? 'proc' : 'os',
    procRoot: process.env.ONEBORD_PROC_ROOT || '/proc',
    diskPath: diskPath(),
    uptime: Math.round(os.uptime()),
    loadavg: os.loadavg(),
    network,
  }
}

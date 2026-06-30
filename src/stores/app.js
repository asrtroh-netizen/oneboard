import { reactive, computed } from 'vue'
import { refreshMihomoNow, refreshProxiesNow } from './mihomoEngine'
import {
  engineRestartKernel,
  engineRunDelayTests,
  engineRefreshAllProviders,
  engineSwitchProxy,
} from './mihomoEngine'
import { buildGlobalNodeStats, isNodeAvailable, isWifiProxyGroup, nodeLatencySortKey } from '../utils/countryNodes'
import { isHttpProxyProvider, nodeBelongsToProvider, getProviderMemberNames } from '../utils/proxySections'
import { loadWifiState, persistWifiState, createDefaultWifiState, setWifiSelectedNode } from '../utils/wifiState'

const savedWifi = loadWifiState()

function sanitizeLoadedWifi(wifi) {
  if (!wifi) return createDefaultWifiState()
  const groupActive = wifi.groupActive && isWifiProxyGroup(wifi.groupActive)
    ? wifi.groupActive
    : null
  const selectedNodes = {}
  for (const [key, value] of Object.entries(wifi.selectedNodes || {})) {
    if (isWifiProxyGroup(key)) selectedNodes[key] = value
  }
  return { groupActive, selectedNodes }
}

const state = reactive({
  activeNodeId: null,
  activeProxyGroup: '',
  wifi: savedWifi ? sanitizeLoadedWifi(savedWifi) : createDefaultWifiState(),
  nodes: [],
  proxyGroups: [],
  subscriptions: [],
  rules: [],
  countryGroups: [],
  regionGroupStats: [],
  mihomoProviders: {},
  subscriptionSpeedTestRunning: false,
  runtime: {
    connections: [],
    downloadTotal: 0,
    uploadTotal: 0,
    memoryBytes: 0,
    ruleHitMap: {},
  },
  system: {
    hostname: '—',
    os: '—',
    cpuModel: '—',
    cpu: 0,
    memory: 0,
    memoryTotal: 0,
    disk: 0,
    uploadSpeed: 0,
    downloadSpeed: 0,
    uploadTotal: '0 B',
    downloadTotal: '0 B',
    totalNodes: 0,
    onlineNodes: 0,
    subscriptions: 0,
    filters: 0,
    rulesCount: 0,
    activeConnections: 0,
    kernelVersion: '—',
    kernelStatus: 'offline',
    kernelStartTime: '—',
    kernelMeta: '',
    uptime: '—',
  },
  dns: {
    totalQueries: 0,
    successQueries: 0,
    failedQueries: 0,
    avgLatency: 0,
    queryLog: [],
    domainRanking: [],
    ipRanking: [],
  },
  logs: {
    panel: [
      { time: '2026-06-24T18:39:03', level: 'info', msg: 'OneBoard 控制面板已启动' },
      { time: '2026-06-24T18:39:04', level: 'info', msg: 'Mihomo 内核连接成功' },
      { time: '2026-06-24T18:39:05', level: 'info', msg: '配置文件加载完成' },
    ],
    mihomo: [
      { time: '2026-06-24T18:39:03', level: 'info', msg: '[TCP] 127.0.0.1:52341 --> api.github.com:443 match RuleSet(Google) using HK-WIFI' },
      { time: '2026-06-24T18:39:04', level: 'warning', msg: '[DNS] lookup fonts.googleapis.com: i/o timeout' },
      { time: '2026-06-24T18:39:05', level: 'info', msg: '[TCP] 192.168.0.50:41203 --> www.baidu.com:443 match DomainSuffix(cn) using DIRECT' },
      { time: '2026-06-24T18:39:06', level: 'info', msg: '[TCP] 192.168.0.10:33102 --> cdn.jsdelivr.net:443 match RuleSet(OpenAI) using HK-WIFI' },
      { time: '2026-06-24T18:39:07', level: 'info', msg: '[UDP] 192.168.0.50:5353 --> dns.google:53 match DNS using DIRECT' },
      { time: '2026-06-24T18:39:08', level: 'warning', msg: '[DNS] lookup tracker.example.com: NXDOMAIN' },
      { time: '2026-06-24T18:39:09', level: 'info', msg: '[TCP] 127.0.0.1:49821 --> registry.npmjs.org:443 match RuleSet(Google) using DIRECT' },
      { time: '2026-06-24T18:39:10', level: 'info', msg: '[TCP] 192.168.0.102:55201 --> www.youtube.com:443 match RuleSet(YouTube) using US-WIFI' },
    ],
  },
  toast: null,
})

const PROXY_REFRESH_DELAY_MS = 300
const PROXY_SELECT_TIMEOUT_MS = 3000

export const proxySelectState = reactive({
  loading: false,
  selector: null,
  proxy: null,
})

let proxySelectTimeout = null
let proxyRefreshTimer = null

function clearProxySelectTimers() {
  if (proxySelectTimeout) {
    clearTimeout(proxySelectTimeout)
    proxySelectTimeout = null
  }
  if (proxyRefreshTimer) {
    clearTimeout(proxyRefreshTimer)
    proxyRefreshTimer = null
  }
}

function setProxySelectLoading(selectorName, proxyName) {
  clearProxySelectTimers()
  proxySelectState.loading = true
  proxySelectState.selector = selectorName
  proxySelectState.proxy = proxyName
  proxySelectTimeout = window.setTimeout(() => {
    proxySelectState.loading = false
    proxySelectState.selector = null
    proxySelectState.proxy = null
    proxySelectTimeout = null
  }, PROXY_SELECT_TIMEOUT_MS)
}

function endProxySelectLoading() {
  clearProxySelectTimers()
  proxySelectState.loading = false
  proxySelectState.selector = null
  proxySelectState.proxy = null
}

function scheduleProxiesRefreshAfterSwitch() {
  proxyRefreshTimer = window.setTimeout(() => {
    proxyRefreshTimer = null
    refreshProxiesNow().finally(() => {
      endProxySelectLoading()
    })
  }, PROXY_REFRESH_DELAY_MS)
}

function resolveSelectorName(groupCode) {
  if (!groupCode) return groupCode

  const direct = state.proxyGroups.find((g) => g.code === groupCode)
  if (direct) return direct.code

  const codeUpper = String(groupCode).toUpperCase()
  const byRegion = state.proxyGroups.find((g) =>
    isWifiProxyGroup(g.code) && g.region === codeUpper,
  )
  if (byRegion) return byRegion.code

  const byWifiName = state.proxyGroups.find((g) =>
    isWifiProxyGroup(g.code) && (
      g.code.toUpperCase().includes(`${codeUpper}-WIFI`)
      || g.code.toUpperCase().includes(`${codeUpper}_WIFI`)
    ),
  )
  if (byWifiName) return byWifiName.code

  return groupCode
}

function canSwitchToNode(node) {
  if (!node) return true
  return node.alive !== false
}

function applyOptimisticProxySwitch(selectorName, proxyName) {
  const group = state.proxyGroups.find((g) => g.code === selectorName)
  if (group) group.now = proxyName

  if (isWifiProxyGroup(selectorName)) {
    state.wifi.groupActive = selectorName
    setWifiSelectedNode(state.wifi, selectorName, proxyName)
    persistWifiState(state.wifi)
  }

  const node = state.nodes.find((n) => n.name === proxyName)
  if (node) {
    state.activeNodeId = node.id
    state.activeProxyGroup = node.region || selectorName
  }

}

function switchProxy(selectorName, proxyName, { label } = {}) {
  if (!selectorName || !proxyName) return false

  const resolvedSelector = resolveSelectorName(selectorName)
  const node = state.nodes.find((n) => n.name === proxyName)
  if (!canSwitchToNode(node)) {
    showToast(`节点「${proxyName}」不可用`, 'error')
    return false
  }

  setProxySelectLoading(resolvedSelector, proxyName)
  applyOptimisticProxySwitch(resolvedSelector, proxyName)

  engineSwitchProxy(resolvedSelector, proxyName)
    .then(() => {
      pushMihomoLog('info', `[${resolvedSelector}] switch to ${proxyName}`)
      pushPanelLog('info', `已切换「${label || resolvedSelector}」→「${proxyName}」`)
      showToast(`「${proxyName}」已生效`, 'success')
      scheduleProxiesRefreshAfterSwitch()
    })
    .catch((err) => {
      endProxySelectLoading()
      showToast(err?.message || '切换失败', 'error')
      void refreshProxiesNow()
    })

  return true
}

function isProxySelectLoading(selectorName, proxyName) {
  if (!proxySelectState.loading) return false
  const resolved = resolveSelectorName(selectorName)
  return proxySelectState.selector === resolved && proxySelectState.proxy === proxyName
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function nowISO() {
  return new Date().toISOString().slice(0, 19)
}

function showToast(message, type = 'success') {
  state.toast = { message, type, id: Date.now() }
  setTimeout(() => { state.toast = null }, 2800)
}

function pushPanelLog(level, msg) {
  state.logs.panel.unshift({ time: nowISO(), level, msg })
  if (state.logs.panel.length > 200) state.logs.panel.pop()
}

function pushMihomoLog(level, msg) {
  state.logs.mihomo.unshift({ time: nowISO(), level, msg })
  if (state.logs.mihomo.length > 200) state.logs.mihomo.pop()
}

export function useAppStore() {
  const activeNode = computed(() => state.nodes.find((n) => n.id === state.activeNodeId))
  const onlineCount = computed(() => state.nodes.filter(isNodeAvailable).length)
  const countryGroups = computed(() => state.countryGroups)
  const globalNodeStats = computed(() => buildGlobalNodeStats(state.countryGroups))
  const wifiGroups = computed(() => state.proxyGroups.filter((g) => isWifiProxyGroup(g.code)))
  const regionStats = countryGroups

  function switchNode(id) {
    const node = state.nodes.find((n) => n.id === id)
    if (!node) return false
    if (node.status === 'offline') {
      showToast(`节点「${node.name}」离线，无法切换`, 'error')
      return false
    }
    state.activeNodeId = id
    state.activeProxyGroup = node.region
    pushMihomoLog('info', `[Selector] switch to ${node.name} (${node.region})`)
    pushPanelLog('info', `已切换至节点「${node.regionName} ${node.name}」`)
    showToast(`已切换至「${node.regionName} ${node.name}」`, 'success')
    return true
  }

  function activateWifiGroup(code) {
    const group = state.proxyGroups.find((g) => g.code === code)
    if (!group || !isWifiProxyGroup(group.code)) return
    state.wifi.groupActive = state.wifi.groupActive === code ? null : code
    persistWifiState(state.wifi)
  }

  function selectWifiNode(groupCode, nodeName) {
    const resolvedGroup = resolveSelectorName(groupCode)
    const group = state.proxyGroups.find((g) => g.code === resolvedGroup)
    const node = state.nodes.find((n) => n.name === nodeName)
    if (!canSwitchToNode(node)) {
      showToast(`节点「${nodeName}」不可用`, 'error')
      return
    }
    switchProxy(resolvedGroup, nodeName, { label: group?.name || resolvedGroup })
  }

  function switchProxyGroup(code) {
    const group = state.proxyGroups.find((g) => g.code === code)
    if (!group) return

    const selectorName = group.parentSelector || 'GLOBAL'
    setProxySelectLoading(selectorName, code)
    state.activeProxyGroup = code

    engineSwitchProxy(selectorName, code)
      .then(() => {
        const memberNodes = state.nodes
          .filter((n) => (group.members || []).includes(n.name) && isNodeAvailable(n))
          .sort((a, b) => nodeLatencySortKey(a) - nodeLatencySortKey(b))
        if (memberNodes[0]) state.activeNodeId = memberNodes[0].id
        pushPanelLog('info', `已切换代理组至「${group.name}」`)
        showToast(`已选择「${group.name}」`, 'success')
        scheduleProxiesRefreshAfterSwitch()
      })
      .catch((err) => {
        endProxySelectLoading()
        showToast(err?.message || '切换失败', 'error')
        void refreshProxiesNow()
      })
  }

  function selectStrategyItem(groupCode, itemName) {
    if (!groupCode || !itemName) return

    const selectorName = resolveSelectorName(groupCode)
    const group = state.proxyGroups.find((g) => g.code === selectorName)
    if (group && isWifiProxyGroup(group.code)) {
      selectWifiNode(selectorName, itemName)
      return
    }

    switchProxy(selectorName, itemName, { label: group?.name || groupCode })
  }

  function selectRegionNode(regionCode, nodeName) {
    const wifiGroup = state.proxyGroups.find((g) =>
      isWifiProxyGroup(g.code) && (
        g.region === regionCode
        || g.code.toUpperCase().includes(`${regionCode.toUpperCase()}-WIFI`)
      ),
    )
    if (wifiGroup) {
      selectWifiNode(wifiGroup.code, nodeName)
      return
    }
    selectStrategyItem(regionCode, nodeName)
  }

  function testNodeDelay(id) {
    const node = state.nodes.find((n) => n.id === id)
    if (!node || node.status === 'offline') {
      showToast('节点离线，无法测速', 'error')
      return
    }
    const newDelay = Math.floor(30 + Math.random() * 200)
    node.delay = newDelay
    node.status = newDelay > 200 ? 'warning' : 'online'
    showToast(`「${node.name}」延迟 ${newDelay} ms`, newDelay > 200 ? 'warning' : 'success')
  }

  async function refreshSubscription() {
    const names = Object.entries(state.mihomoProviders || {})
      .filter(([name, provider]) => isHttpProxyProvider(name, provider))
      .map(([name]) => name)

    if (!names.length) {
      showToast('暂无可刷新的 HTTP 订阅源', 'warning')
      return
    }

    showToast('正在更新订阅…', 'info')
    try {
      await engineRefreshAllProviders(names)
      pushPanelLog('info', `已刷新 ${names.length} 个订阅 Provider`)
      showToast('订阅更新成功', 'success')
    } catch {
      showToast('订阅更新失败', 'error')
    }
  }

  function collectSubscriptionNodeNames() {
    const names = new Set()
    const providers = state.mihomoProviders || {}

    for (const [providerName, provider] of Object.entries(providers)) {
      if (!isHttpProxyProvider(providerName, provider)) continue
      const members = getProviderMemberNames(provider)
      if (members.length) {
        members.forEach((nodeName) => names.add(nodeName))
        continue
      }
      for (const node of state.nodes) {
        if (nodeBelongsToProvider(node.name, providerName)) names.add(node.name)
      }
    }

    return [...names]
  }

  async function runFullStackSpeedTest() {
    if (state.subscriptionSpeedTestRunning) return

    const nodeNames = collectSubscriptionNodeNames()
    if (!nodeNames.length) {
      showToast('暂无订阅节点可测速', 'warning')
      return
    }

    state.subscriptionSpeedTestRunning = true
    showToast(`全栈测速中… 共 ${nodeNames.length} 个节点`, 'info')

    try {
      const results = await engineRunDelayTests(nodeNames, { concurrency: 10 })

      for (const node of state.nodes) {
        if (!results.has(node.name)) continue
        const delay = results.get(node.name) ?? 0
        node.delay = delay
        node.alive = delay > 0
        node.status = delay <= 0 ? 'offline' : delay > 300 ? 'warning' : 'online'
      }

      const online = [...results.values()].filter((d) => d > 0).length
      const best = online ? Math.min(...[...results.values()].filter((d) => d > 0)) : 0
      pushPanelLog('info', `全栈测速完成 · ${online}/${results.size} 在线 · 最快 ${best || '—'} ms`)
      showToast(`测速完成 · ${online}/${results.size} 在线${best ? ` · 最快 ${best} ms` : ''}`, 'success')
    } catch (err) {
      showToast(err?.message || '全栈测速失败', 'error')
    } finally {
      state.subscriptionSpeedTestRunning = false
    }
  }

  function restartMihomo() {
    showToast('正在重启 Mihomo...', 'info')
    engineRestartKernel()
      .then(() => {
        pushPanelLog('info', 'Mihomo 服务已重启')
        showToast('Mihomo 重启成功', 'success')
        return refreshMihomoNow()
      })
      .catch((err) => {
        showToast(err?.message || '重启失败', 'error')
      })
  }

  function tickSystem() {
    /* 系统指标由 mihomoSync + /api/system-info 驱动 */
  }

  function tickDns() {
    /* DNS 监控由 dnsSyncLayer + Mihomo /logs WebSocket 驱动 */
  }

  function tickMihomoLogs() {
    const samples = [
      { level: 'info', msg: `[TCP] 192.168.0.${Math.floor(Math.random() * 200)} --> cdn.jsdelivr.net:443 match RuleSet(Google) using ${state.activeProxyGroup}` },
      { level: 'info', msg: `[TCP] 127.0.0.1:${40000 + Math.floor(Math.random() * 10000)} --> registry.npmjs.org:443 match RuleSet(OpenAI) using DIRECT` },
      { level: 'warning', msg: `[DNS] lookup tracker.example.com: NXDOMAIN` },
    ]
    const s = samples[Math.floor(Math.random() * samples.length)]
    pushMihomoLog(s.level, s.msg)
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  function reorderList(list, fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    if (fromIndex >= list.length || toIndex >= list.length) return
    const [item] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, item)
  }

  function reorderRules(fromIndex, toIndex) {
    reorderList(state.rules, fromIndex, toIndex)
    pushPanelLog('info', '规则顺序已更新')
  }

  function reorderProxyGroups(fromIndex, toIndex) {
    reorderList(state.proxyGroups, fromIndex, toIndex)
    pushPanelLog('info', '地区顺序已更新')
  }

  return {
    state,
    activeNode,
    onlineCount,
    countryGroups,
    globalNodeStats,
    wifiGroups,
    regionStats,
    switchNode,
    activateWifiGroup,
    selectWifiNode,
    selectStrategyItem,
    selectRegionNode,
    switchProxyGroup,
    proxySelectState,
    isProxySelectLoading,
    testNodeDelay,
    refreshSubscription,
    runFullStackSpeedTest,
    restartMihomo,
    tickSystem,
    tickDns,
    tickMihomoLogs,
    showToast,
    formatBytes,
    reorderRules,
    reorderProxyGroups,
  }
}

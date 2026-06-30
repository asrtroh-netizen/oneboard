import { STORAGE_KEYS } from './storageKeys'

const STORAGE_KEY = STORAGE_KEYS.wifiState

function migrateLegacy(data) {
  if (data?.selectedNodes && typeof data.selectedNodes === 'object') {
    return {
      groupActive: data.groupActive ?? null,
      selectedNodes: { ...data.selectedNodes },
    }
  }

  const selectedNodes = {}
  if (data?.nodeSelected && data?.nodeSelectedGroup) {
    selectedNodes[data.nodeSelectedGroup] = data.nodeSelected
  }

  return {
    groupActive: data?.groupActive ?? null,
    selectedNodes,
  }
}

export function loadWifiState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return migrateLegacy(JSON.parse(raw))
  } catch {
    return null
  }
}

export function persistWifiState(wifi) {
  if (!wifi) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      groupActive: wifi.groupActive,
      selectedNodes: wifi.selectedNodes || {},
    }))
  } catch {
    /* private mode / quota */
  }
}

export function createDefaultWifiState() {
  return {
    groupActive: null,
    selectedNodes: {},
  }
}

export function getWifiSelectedNode(wifi, groupCode) {
  return wifi?.selectedNodes?.[groupCode] || null
}

export function setWifiSelectedNode(wifi, groupCode, nodeName) {
  if (!wifi.selectedNodes) wifi.selectedNodes = {}
  if (nodeName) {
    wifi.selectedNodes[groupCode] = nodeName
  } else {
    delete wifi.selectedNodes[groupCode]
  }
}

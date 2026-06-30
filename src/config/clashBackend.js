/** Clash 系后端配置 — Mihomo / OpenClash / Nikki 共用 external-controller API */

import { STORAGE_KEYS } from '../utils/storageKeys'

export const CLASH_BACKEND_STORAGE_KEY = STORAGE_KEYS.clashBackend

export const DEFAULT_CLASH_PORT = 9090

export const DEFAULT_BACKEND_TYPE = 'mihomo'

/** @typedef {'mihomo'|'openclash'|'nikki'} ClashBackendType */

/** @type {Record<ClashBackendType, {
 *   id: ClashBackendType,
 *   label: string,
 *   shortLabel: string,
 *   icon: string,
 *   panelClass: string,
 *   subtitle: string,
 *   features: {
 *     upgrade: boolean,
 *     storage: boolean,
 *     memory: boolean,
 *     latestVersion: boolean,
 *     dnsQuery: boolean,
 *   },
 * }>} */
export const CLASH_BACKENDS = {
  mihomo: {
    id: 'mihomo',
    label: 'Mihomo',
    shortLabel: 'Mihomo',
    icon: 'dns',
    panelClass: 'panel-green',
    subtitle: 'Meta 内核 · Clash external-controller',
    features: {
      upgrade: true,
      storage: true,
      memory: true,
      latestVersion: true,
      dnsQuery: true,
    },
  },
  openclash: {
    id: 'openclash',
    label: 'OpenClash',
    shortLabel: 'OpenClash',
    icon: 'router',
    panelClass: 'panel-blue',
    subtitle: 'OpenWrt 插件 · Clash API',
    features: {
      upgrade: false,
      storage: false,
      memory: false,
      latestVersion: false,
      dnsQuery: true,
    },
  },
  nikki: {
    id: 'nikki',
    label: 'Nikki',
    shortLabel: 'Nikki',
    icon: 'hub',
    panelClass: 'panel-purple',
    subtitle: 'Clash Meta 分支 · Clash API',
    features: {
      upgrade: false,
      storage: false,
      memory: true,
      latestVersion: false,
      dnsQuery: true,
    },
  },
}

export const CLASH_BACKEND_LIST = Object.values(CLASH_BACKENDS)

export function getClashBackendProfile(type) {
  return CLASH_BACKENDS[type] || CLASH_BACKENDS[DEFAULT_BACKEND_TYPE]
}

export function isClashBackendType(value) {
  return value === 'mihomo' || value === 'openclash' || value === 'nikki'
}

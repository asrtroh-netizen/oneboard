/** 控制台级 Sidebar 模块导航 */

export const NAV_MODULES = [
  {
    id: 'monitor',
    label: '监控模块',
    items: [
      { path: '/dashboard', label: '仪表盘', icon: 'space_dashboard', module: 'monitor' },
      { path: '/vohive-devices', label: 'Vohive设备', icon: 'smartphone', module: 'monitor' },
      { path: '/sms', label: '短信中心', icon: 'sms', module: 'monitor' },
      { path: '/dns', label: 'DNS 监控', icon: 'dns', module: 'monitor' },
    ],
  },
  {
    id: 'control',
    label: '控制模块',
    core: true,
    items: [
      { path: '/nodes', label: 'WIFICALL', icon: 'hub', module: 'control' },
      { path: '/rules', label: '规则', icon: 'rule', module: 'control' },
      { path: '/subscriptions', label: '订阅', icon: 'cloud_download', module: 'control' },
      { path: '/proxy', label: 'Proxy', icon: 'lan', module: 'control' },
    ],
  },
  {
    id: 'system',
    label: '系统模块',
    items: [
      { path: '/settings', label: '设置', icon: 'settings', module: 'system' },
      { path: '/logs', label: '日志', icon: 'article', module: 'system' },
    ],
  },
]

export const NAV_AUXILIARY = [
  { id: 'help', label: '帮助 / 关于', icon: 'help_outline', href: '#' },
  { id: 'logout', label: '退出登录', icon: 'logout', action: 'logout' },
]

export function matchNavItem(routePath, item) {
  if (item.matchPrefix) return routePath.startsWith(item.matchPrefix)
  return routePath === item.path
}

export function activeModuleId(routePath) {
  for (const group of NAV_MODULES) {
    if (group.items.some((item) => matchNavItem(routePath, item))) {
      return group.id
    }
  }
  return null
}

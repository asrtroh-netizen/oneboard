/**
 * 从 Mihomo / Clash / Nikki 远程 REST API 快照拼装最小 config YAML。
 * 标准 external-controller 不导出完整 YAML，此快照仅用于编辑与 PUT payload 同步。
 */

const GROUP_TYPES = new Set([
  'Selector',
  'URLTest',
  'Fallback',
  'LoadBalance',
  'Relay',
])

function yamlScalar(value) {
  const s = String(value ?? '')
  if (!s) return '""'
  if (/[:#\[\]{}&*!|>'"%@`]/.test(s) || /\s/.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return s
}

function normalizeRuleType(type) {
  if (!type) return 'UNKNOWN'
  return String(type)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toUpperCase()
}

function apiRuleToClashLine(rule) {
  if (!rule) return null
  const type = normalizeRuleType(rule.type)
  const proxy = rule.proxy || 'DIRECT'
  if (type === 'MATCH') return `- MATCH,${proxy}`
  const payload = String(rule.payload || '').trim()
  if (!payload) return null
  return `- ${type},${payload},${proxy}`
}

function buildProxyGroupsSection(proxiesData) {
  const proxies = proxiesData?.proxies || {}
  const lines = ['proxy-groups:']
  let count = 0

  for (const [name, proxy] of Object.entries(proxies)) {
    if (!GROUP_TYPES.has(proxy?.type)) continue
    count += 1
    lines.push(`  - name: ${yamlScalar(name)}`)
    lines.push(`    type: ${String(proxy.type || 'select').toLowerCase()}`)
    const members = Array.isArray(proxy.all) ? proxy.all : []
    if (members.length) {
      lines.push('    proxies:')
      for (const member of members) {
        lines.push(`      - ${yamlScalar(member)}`)
      }
    }
  }

  return count ? lines : []
}

function buildRulesSection(rulesData) {
  const rules = rulesData?.rules || []
  const lines = ['rules:']
  let count = 0

  for (const rule of rules) {
    const line = apiRuleToClashLine(rule)
    if (!line) continue
    count += 1
    lines.push(`  ${line}`)
  }

  return count ? lines : []
}

function buildProxyProvidersSection(providersData) {
  const providers = providersData?.providers || {}
  const names = Object.keys(providers)
  if (!names.length) return []

  const lines = ['proxy-providers:']
  for (const name of names.sort()) {
    const provider = providers[name] || {}
    lines.push(`  ${yamlScalar(name)}:`)
    lines.push(`    type: ${yamlScalar(provider.type || provider.vehicleType || 'http')}`)
    if (provider.url) lines.push(`    url: ${yamlScalar(provider.url)}`)
    if (provider.path) lines.push(`    path: ${yamlScalar(provider.path)}`)
    if (provider.interval != null) lines.push(`    interval: ${Number(provider.interval) || 3600}`)
  }
  return lines
}

export function buildYamlFromRemoteSnapshot({ proxies, rules, providers } = {}) {
  const sections = [
    buildProxyProvidersSection(providers),
    buildProxyGroupsSection(proxies),
    buildRulesSection(rules),
  ].filter((section) => section.length > 0)

  if (!sections.length) return ''
  return `${sections.map((section) => section.join('\n')).join('\n\n')}\n`
}

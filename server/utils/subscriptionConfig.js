/**
 * proxy-providers 段 YAML 解析 / 序列化（Clash/Mihomo 订阅源配置）
 */

const DEFAULT_HEALTH_CHECK = {
  enable: true,
  interval: 600,
  url: 'http://www.gstatic.com/generate_204',
}

export function defaultProviderConfig(name = '') {
  return {
    type: 'http',
    url: '',
    path: name ? `./providers/${name}.yaml` : '',
    interval: 10800,
    proxy: 'DIRECT',
    healthCheck: { ...DEFAULT_HEALTH_CHECK },
  }
}

function unquote(value) {
  const s = String(value ?? '').trim()
  if (
    (s.startsWith('"') && s.endsWith('"'))
    || (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1)
  }
  return s
}

function yamlScalar(value) {
  const s = String(value ?? '')
  if (!s) return '""'
  if (/[:#\[\]{}&*!|>'"%@`]/.test(s) || /\s/.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return s
}

/** @param {string[]} lines 4-space indented provider body lines */
export function parseProviderBlock(lines) {
  const config = defaultProviderConfig()
  let section = 'root'

  for (const line of lines) {
    if (!line.trim()) continue
    const content = line.trim()

    if (content === 'health-check:') {
      section = 'healthCheck'
      continue
    }

    const match = content.match(/^([^:]+):\s*(.*)$/)
    if (!match) continue

    const key = match[1].trim()
    const rawVal = unquote(match[2])

    if (section === 'healthCheck') {
      if (key === 'enable') config.healthCheck.enable = rawVal === 'true'
      else if (key === 'interval') config.healthCheck.interval = Number(rawVal) || 600
      else if (key === 'url') config.healthCheck.url = rawVal
      continue
    }

    if (key === 'type') config.type = rawVal
    else if (key === 'url') config.url = rawVal
    else if (key === 'path') config.path = rawVal
    else if (key === 'interval') config.interval = Number(rawVal) || 3600
    else if (key === 'proxy') config.proxy = rawVal
  }

  return config
}

export function serializeProxyProvider(name, config) {
  const hc = config.healthCheck || DEFAULT_HEALTH_CHECK
  return [
    `  ${name}:`,
    `    type: ${config.type || 'http'}`,
    `    url: ${yamlScalar(config.url)}`,
    `    path: ${yamlScalar(config.path)}`,
    `    interval: ${Number(config.interval) || 3600}`,
    '    health-check:',
    `      enable: ${hc.enable ? 'true' : 'false'}`,
    `      interval: ${Number(hc.interval) || 600}`,
    `      url: ${yamlScalar(hc.url || DEFAULT_HEALTH_CHECK.url)}`,
    `    proxy: ${config.proxy || 'DIRECT'}`,
  ]
}

/**
 * @returns {{ providers: Record<string, object>, order: string[], sectionStart: number, sectionEnd: number, lines: string[] }}
 */
export function parseProxyProvidersYaml(yamlText) {
  const lines = String(yamlText || '').split(/\r?\n/)
  let sectionStart = -1
  let sectionEnd = lines.length

  for (let i = 0; i < lines.length; i += 1) {
    if (/^proxy-providers:\s*$/.test(lines[i])) {
      sectionStart = i
      continue
    }
    if (sectionStart >= 0 && /^[^\s#].+:/.test(lines[i])) {
      sectionEnd = i
      break
    }
  }

  const providers = {}
  const order = []

  if (sectionStart < 0) {
    return { providers, order, sectionStart, sectionEnd, lines }
  }

  let i = sectionStart + 1
  while (i < sectionEnd) {
    const nameMatch = lines[i].match(/^  ([A-Za-z0-9_-]+):\s*$/)
    if (!nameMatch) {
      i += 1
      continue
    }

    const name = nameMatch[1]
    order.push(name)
    const blockStart = i + 1
    i += 1

    while (i < sectionEnd && !/^  [A-Za-z0-9_-]+:\s*$/.test(lines[i])) {
      i += 1
    }

    providers[name] = parseProviderBlock(lines.slice(blockStart, i))
  }

  return { providers, order, sectionStart, sectionEnd, lines }
}

export function applyProviderToYaml(yamlText, providerName, config) {
  const parsed = parseProxyProvidersYaml(yamlText)
  const { providers, order, sectionStart, sectionEnd, lines } = parsed

  providers[providerName] = normalizeProviderConfig(config)
  const nextOrder = order.includes(providerName) ? [...order] : [...order, providerName]

  const sectionLines = ['proxy-providers:']
  for (const name of nextOrder) {
    if (!providers[name]) continue
    sectionLines.push(...serializeProxyProvider(name, providers[name]))
    sectionLines.push('')
  }

  if (sectionStart < 0) {
    const trimmed = lines.join('\n').replace(/\s+$/, '')
    return `${trimmed}\n\n${sectionLines.join('\n').replace(/\s+$/, '')}\n`
  }

  const before = lines.slice(0, sectionStart)
  const after = lines.slice(sectionEnd)
  const merged = [...before, ...sectionLines, ...after].join('\n').replace(/\n{3,}/g, '\n\n')
  return merged.endsWith('\n') ? merged : `${merged}\n`
}

export function normalizeProviderConfig(input = {}) {
  const hc = input.healthCheck || {}
  return {
    type: String(input.type || 'http').toLowerCase(),
    url: String(input.url || '').trim(),
    path: String(input.path || '').trim(),
    interval: Math.max(60, Number(input.interval) || 3600),
    proxy: String(input.proxy || 'DIRECT').trim() || 'DIRECT',
    healthCheck: {
      enable: Boolean(hc.enable),
      interval: Math.max(30, Number(hc.interval) || 600),
      url: String(hc.url || DEFAULT_HEALTH_CHECK.url).trim() || DEFAULT_HEALTH_CHECK.url,
    },
  }
}

export function providerConfigEquals(a, b) {
  return JSON.stringify(normalizeProviderConfig(a)) === JSON.stringify(normalizeProviderConfig(b))
}

export function formFromProviderConfig(config) {
  const normalized = normalizeProviderConfig(config)
  return {
    type: normalized.type,
    url: normalized.url,
    path: normalized.path,
    interval: normalized.interval,
    proxy: normalized.proxy,
    healthCheckEnable: normalized.healthCheck.enable,
    healthCheckInterval: normalized.healthCheck.interval,
    healthCheckUrl: normalized.healthCheck.url,
  }
}

export function providerConfigFromForm(form) {
  return normalizeProviderConfig({
    type: form.type,
    url: form.url,
    path: form.path,
    interval: form.interval,
    proxy: form.proxy,
    healthCheck: {
      enable: form.healthCheckEnable,
      interval: form.healthCheckInterval,
      url: form.healthCheckUrl,
    },
  })
}

export function validateProviderConfig(config) {
  const normalized = normalizeProviderConfig(config)
  if (!normalized.url) return '订阅 URL 不能为空'
  if (!normalized.path) return 'path 不能为空'
  if (!/^https?:\/\//i.test(normalized.url)) return 'URL 需以 http:// 或 https:// 开头'
  return ''
}

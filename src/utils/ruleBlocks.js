/**
 * Clash/Mihomo flat rules → UI block structure.
 * Does not mutate YAML; only produces a view model for the frontend.
 */

export const RULE_BLOCK_DEFS = [
  {
    id: 'network-opt',
    name: '网络优化',
    description: 'QUIC / UDP / DNS',
    order: 1,
  },
  {
    id: 'cn-direct',
    name: '国内直连',
    description: '抖音 / 小红书',
    order: 2,
  },
  {
    id: 'apple',
    name: 'Apple 服务',
    description: 'Apple AI / News / 苹果服务',
    order: 3,
  },
  {
    id: 'proxy-wifi',
    name: '代理规则',
    description: 'HK-WIFI / US-WIFI / VoWiFi',
    order: 4,
  },
  {
    id: 'other',
    name: '其他自定义规则',
    description: '规则集 / 兜底 / 加速',
    order: 5,
  },
]

const DOUYIN_XHS_DOMAINS = new Set([
  'douyin.com',
  'iesdouyin.com',
  'snssdk.com',
  'amemv.com',
  'byteimg.com',
  'ixigua.com',
  'xiaohongshu.com',
  'xhscdn.com',
  'xhscdn.net',
])

const WIFI_OUTBOUND_RE = /📱\s*(?:HK|UK|DE|US|NZ|Bk|DR|TAG)-WIFI/u

function normalizeRuleType(type) {
  if (!type) return 'UNKNOWN'
  return String(type)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toUpperCase()
}

function toUiRule(base, index) {
  return {
    id: base.id || `rule-${index}`,
    index,
    type: normalizeRuleType(base.type),
    value: base.value ?? '',
    outbound: base.outbound ?? '—',
    modifiers: base.modifiers || [],
    raw: base.raw || '',
    enabled: base.enabled !== false,
  }
}

/** Parse a single Clash YAML rule line, e.g. `- DOMAIN-SUFFIX,douyin.com,DIRECT` */
export function parseRawClashRule(raw, index = 0) {
  if (!raw || typeof raw !== 'string') return null
  const line = raw.trim().replace(/^-\s*/, '')
  if (!line || line.startsWith('#')) return null

  const upper = line.toUpperCase()

  if (upper.startsWith('AND,')) {
    const lastComma = line.lastIndexOf(',')
    if (lastComma <= 4) return null
    return toUiRule({
      type: 'AND',
      value: line.slice(4, lastComma).trim(),
      outbound: line.slice(lastComma + 1).trim(),
      raw: line,
    }, index)
  }

  if (upper.startsWith('MATCH,')) {
    return toUiRule({
      type: 'MATCH',
      value: '',
      outbound: line.slice(6).trim(),
      raw: line,
    }, index)
  }

  const parts = line.split(',')
  if (parts.length < 2) return null

  const type = parts[0].trim()
  let tail = parts.slice(1)
  const modifiers = []

  while (tail.length > 1 && ['NO-RESOLVE', 'SRC'].includes(tail[tail.length - 1].trim().toUpperCase())) {
    modifiers.unshift(tail.pop().trim().toLowerCase())
  }

  const outbound = tail.pop()?.trim() || '—'
  const value = tail.join(',').trim()

  return toUiRule({ type, value, outbound, modifiers, raw: line }, index)
}

/** Parse Mihomo `/rules` API item */
export function parseApiRule(rule, index = 0) {
  if (!rule) return null
  const type = normalizeRuleType(rule.type)
  const outbound = rule.proxy || rule.outbound || '—'
  const value = rule.payload ?? rule.pattern ?? rule.name ?? ''
  const modifiers = []
  if (rule['no-resolve'] || rule.noResolve) modifiers.push('no-resolve')

  const raw = rule.raw
    || [type, value, outbound, ...modifiers.map((m) => m.toUpperCase())].filter(Boolean).join(',')

  return toUiRule({
    id: rule.id != null ? String(rule.id) : `rule-${index}`,
    type,
    value: String(value),
    outbound: String(outbound),
    modifiers,
    raw,
    enabled: rule.enabled !== false,
  }, index)
}

export function categorizeRule(rule) {
  const type = normalizeRuleType(rule.type)
  const value = String(rule.value || '')
  const valueLower = value.toLowerCase()
  const outbound = String(rule.outbound || '')

  if (type === 'AND') {
    const cond = value.toUpperCase()
    if (cond.includes('NETWORK,UDP') && cond.includes('443')) return 'network-opt'
    if (cond.includes('DNS')) return 'network-opt'
  }

  if (type === 'DOMAIN-SUFFIX' || type === 'DOMAIN') {
    const host = valueLower.replace(/^\+\./, '')
    if (DOUYIN_XHS_DOMAINS.has(host) && outbound.toUpperCase() === 'DIRECT') {
      return 'cn-direct'
    }
  }

  if (type === 'RULE-SET') {
    if (/^APPLE/i.test(value)) return 'apple'
  }

  if (/Apple\s*Pro|苹果服务/u.test(outbound)) {
    if (type === 'RULE-SET' && /^APPLE/i.test(value)) return 'apple'
  }

  if (WIFI_OUTBOUND_RE.test(outbound)) return 'proxy-wifi'

  return 'other'
}

export function buildRuleBlocks(parsedRules) {
  const buckets = Object.fromEntries(
    RULE_BLOCK_DEFS.map((def) => [def.id, { ...def, rules: [] }]),
  )

  parsedRules.forEach((rule, index) => {
    if (!rule) return
    const uiRule = rule.raw != null && rule.type
      ? toUiRule(rule, rule.index ?? index)
      : parseApiRule(rule, index) || parseRawClashRule(rule, index)
    if (!uiRule) return
    const blockId = categorizeRule(uiRule)
    buckets[blockId].rules.push(uiRule)
  })

  return {
    blocks: RULE_BLOCK_DEFS
      .map((def) => buckets[def.id])
      .filter((block) => block.rules.length > 0),
  }
}

export function buildRuleBlocksFromRawLines(lines) {
  const parsed = []
  let index = 0
  for (const line of lines) {
    const rule = parseRawClashRule(line, index)
    if (rule) {
      parsed.push(rule)
      index += 1
    }
  }
  return buildRuleBlocks(parsed)
}

export function buildRuleBlocksFromApiRules(apiRules) {
  const parsed = (apiRules || [])
    .map((rule, index) => parseApiRule(rule, index))
    .filter(Boolean)
  return buildRuleBlocks(parsed)
}

/** Flatten blocks back to ordered rule list (for future YAML sync). */
export function flattenRuleBlocks(blocksPayload) {
  const blocks = blocksPayload?.blocks || []
  return blocks.flatMap((block) => block.rules || [])
}

/** UI card model merged with block metadata */
export function toRuleCardModel(uiRule, index) {
  const name = uiRule.value || uiRule.type
  const outbound = uiRule.outbound
  let watermark = { type: 'emoji', value: '⚡' }

  if (/^APPLE/i.test(uiRule.value)) watermark = { type: 'emoji', value: '🍎' }
  else if (WIFI_OUTBOUND_RE.test(outbound)) watermark = { type: 'emoji', value: '📱' }
  else if (outbound.toUpperCase() === 'DIRECT') watermark = { type: 'emoji', value: '🎯' }
  else if (outbound.toUpperCase() === 'REJECT') watermark = { type: 'emoji', value: '🛑' }

  return {
    id: uiRule.id || index + 1,
    index: uiRule.index ?? index,
    name,
    type: uiRule.type,
    value: uiRule.value,
    count: 1,
    matchMode: uiRule.type,
    outbound: outbound === 'DIRECT' ? '直连' : outbound,
    outboundTarget: outbound,
    enabled: uiRule.enabled !== false,
    icon: 'rule',
    watermark,
    raw: uiRule.raw,
    modifiers: uiRule.modifiers || [],
    blockId: categorizeRule(uiRule),
  }
}

export function buildRuleBlockCards(blocksPayload) {
  return {
    blocks: (blocksPayload?.blocks || []).map((block) => ({
      ...block,
      rules: (block.rules || []).map((rule, i) => toRuleCardModel(rule, i)),
    })),
  }
}

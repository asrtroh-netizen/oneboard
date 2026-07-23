/**
 * Rules IDE: DSL skeleton + API merge + Clash YAML serialize/parse.
 */

import { STORAGE_KEYS } from './storageKeys'

const STORAGE_KEY = STORAGE_KEYS.rulesEditor

const WIFI_OUTBOUND_RE = /📱\s*(?:HK|UK|DE|US|NZ|Bk|DR|TAG)-WIFI/u

function normalizeRuleType(type) {
  if (!type) return 'UNKNOWN'
  return String(type)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toUpperCase()
}

/** Mihomo API RuleType → Clash YAML rule type */
const CLASH_RULE_TYPES = {
  DOMAIN: 'DOMAIN',
  DOMAINSUFFIX: 'DOMAIN-SUFFIX',
  'DOMAIN-SUFFIX': 'DOMAIN-SUFFIX',
  DOMAINKEYWORD: 'DOMAIN-KEYWORD',
  'DOMAIN-KEYWORD': 'DOMAIN-KEYWORD',
  DOMAINREGEX: 'DOMAIN-REGEX',
  'DOMAIN-REGEX': 'DOMAIN-REGEX',
  DOMAINWILDCARD: 'DOMAIN-WILDCARD',
  'DOMAIN-WILDCARD': 'DOMAIN-WILDCARD',
  GEOSITE: 'GEOSITE',
  'GEO-SITE': 'GEOSITE',
  GEOIP: 'GEOIP',
  'GEO-IP': 'GEOIP',
  SRCGEOIP: 'SRC-GEOIP',
  'SRC-GEOIP': 'SRC-GEOIP',
  IPASN: 'IP-ASN',
  'IP-ASN': 'IP-ASN',
  SRCIPASN: 'SRC-IP-ASN',
  'SRC-IP-ASN': 'SRC-IP-ASN',
  IPCIDR: 'IP-CIDR',
  'IP-CIDR': 'IP-CIDR',
  SRCIPCIDR: 'SRC-IP-CIDR',
  'SRC-IP-CIDR': 'SRC-IP-CIDR',
  IPSUFFIX: 'IP-SUFFIX',
  'IP-SUFFIX': 'IP-SUFFIX',
  SRCIPSUFFIX: 'SRC-IP-SUFFIX',
  'SRC-IP-SUFFIX': 'SRC-IP-SUFFIX',
  SRCPORT: 'SRC-PORT',
  'SRC-PORT': 'SRC-PORT',
  DSTPORT: 'DST-PORT',
  'DST-PORT': 'DST-PORT',
  INPORT: 'IN-PORT',
  'IN-PORT': 'IN-PORT',
  INUSER: 'IN-USER',
  'IN-USER': 'IN-USER',
  INNAME: 'IN-NAME',
  'IN-NAME': 'IN-NAME',
  INTYPE: 'IN-TYPE',
  'IN-TYPE': 'IN-TYPE',
  PROCESSNAME: 'PROCESS-NAME',
  'PROCESS-NAME': 'PROCESS-NAME',
  PROCESSPATH: 'PROCESS-PATH',
  'PROCESS-PATH': 'PROCESS-PATH',
  PROCESSNAMEREGEX: 'PROCESS-NAME-REGEX',
  'PROCESS-NAME-REGEX': 'PROCESS-NAME-REGEX',
  PROCESSPATHREGEX: 'PROCESS-PATH-REGEX',
  'PROCESS-PATH-REGEX': 'PROCESS-PATH-REGEX',
  PROCESSNAMEWILDCARD: 'PROCESS-NAME-WILDCARD',
  'PROCESS-NAME-WILDCARD': 'PROCESS-NAME-WILDCARD',
  PROCESSPATHWILDCARD: 'PROCESS-PATH-WILDCARD',
  'PROCESS-PATH-WILDCARD': 'PROCESS-PATH-WILDCARD',
  RULESET: 'RULE-SET',
  'RULE-SET': 'RULE-SET',
  NETWORK: 'NETWORK',
  DSCP: 'DSCP',
  UID: 'UID',
  SUBRULES: 'SUB-RULES',
  'SUB-RULES': 'SUB-RULES',
  MATCH: 'MATCH',
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
}

export function toClashRuleType(type) {
  const normalized = normalizeRuleType(type)
  return CLASH_RULE_TYPES[normalized] || normalized
}

function normalizePayload(payload) {
  return String(payload ?? '').trim().replace(/\s+/g, ' ')
}

function normalizeProxyName(proxy) {
  return String(proxy ?? 'DIRECT').trim()
}

function normalizeRulePayload(type, payload) {
  const clashType = toClashRuleType(type)
  let value = normalizePayload(payload)

  if (clashType === 'RULE-SET') {
    if (value.includes('/')) {
      value = value.split('/').pop()?.replace(/\.(yaml|yml)$/i, '') || value
    }
    if (value.toLowerCase().startsWith('ruleset/')) {
      value = value.slice('ruleset/'.length)
    }
  }

  if (clashType === 'AND' || clashType === 'OR' || clashType === 'NOT') {
    value = value.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
  }

  return value
}

export function buildRuleRaw({ type, payload, proxy, noResolve }) {
  const clashType = toClashRuleType(type)
  const parts = [clashType]
  if (clashType !== 'MATCH') {
    parts.push(normalizeRulePayload(type, payload))
  }
  parts.push(normalizeProxyName(proxy))
  if (noResolve) parts.push('no-resolve')
  return parts.join(',')
}

/** 比较用 canonical key（忽略 no-resolve 差异） */
export function canonicalRuleKey(input) {
  let parsed = null
  if (typeof input === 'string') {
    parsed = parseRawClashLine(input)
  } else if (input) {
    parsed = normalizeApiRule(input, 0)
  }
  if (!parsed) return ''
  return buildRuleRaw(parsed).replace(/,no-resolve$/i, '')
}

function parseMarker(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('#')) return null
  const content = trimmed.slice(1).trim()

  const blockMatch = content.match(/^={3,}\s*(.*?)\s*={3,}$/)
  if (blockMatch) {
    return { kind: 'block', name: blockMatch[1].trim() || '未命名区块' }
  }

  const groupMatch = content.match(/^==\s*(.*?)\s*==$/)
  if (groupMatch) {
    return { kind: 'group', name: groupMatch[1].trim() || '未命名分组' }
  }

  return null
}

export function parseRulesDsl(text) {
  const lines = String(text || '').split(/\r?\n/)
  const blocks = []
  let currentBlock = null
  let currentGroup = null
  let slotCount = 0

  function ensureBlock(name = '未命名区块') {
    if (!currentBlock) {
      currentBlock = {
        id: `block-${blocks.length}`,
        name,
        groups: [],
      }
      blocks.push(currentBlock)
    }
  }

  function ensureGroup(name = '默认') {
    ensureBlock()
    if (!currentGroup) {
      currentGroup = {
        id: `${currentBlock.id}-group-${currentBlock.groups.length}`,
        name,
        slotCount: 0,
        expectedRaws: [],
      }
      currentBlock.groups.push(currentGroup)
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line === 'rules:') continue

    const marker = parseMarker(line)
    if (marker?.kind === 'block') {
      currentBlock = {
        id: `block-${blocks.length}`,
        name: marker.name,
        groups: [],
      }
      blocks.push(currentBlock)
      currentGroup = null
      continue
    }

    if (marker?.kind === 'group') {
      ensureBlock()
      currentGroup = {
        id: `${currentBlock.id}-group-${currentBlock.groups.length}`,
        name: marker.name,
        slotCount: 0,
        expectedRaws: [],
      }
      currentBlock.groups.push(currentGroup)
      continue
    }

    if (line.startsWith('-')) {
      ensureGroup()
      const body = line.replace(/^-\s*/, '').trim()
      currentGroup.expectedRaws.push(body)
      currentGroup.slotCount += 1
      slotCount += 1
    }
  }

  return { blocks, slotCount }
}

/** Parse Clash rule line (without leading `-`). */
export function parseRawClashLine(line) {
  const trimmed = String(line || '').trim().replace(/^-\s*/, '')
  if (!trimmed || trimmed.startsWith('#')) return null

  const upper = trimmed.toUpperCase()

  if (upper.startsWith('AND,')) {
    const lastComma = trimmed.lastIndexOf(',')
    if (lastComma <= 4) return null
    return {
      type: 'AND',
      payload: trimmed.slice(4, lastComma).trim(),
      proxy: trimmed.slice(lastComma + 1).trim(),
      raw: trimmed,
      noResolve: false,
    }
  }

  if (upper.startsWith('MATCH,')) {
    return {
      type: 'MATCH',
      payload: '',
      proxy: trimmed.slice(6).trim(),
      raw: trimmed,
      noResolve: false,
    }
  }

  const parts = trimmed.split(',')
  if (parts.length < 2) return null

  const type = normalizeRuleType(parts[0].trim())
  let tail = parts.slice(1)
  let noResolve = false

  while (tail.length > 1 && tail[tail.length - 1].trim().toUpperCase() === 'NO-RESOLVE') {
    noResolve = true
    tail.pop()
  }

  const proxy = tail.pop()?.trim() || 'DIRECT'
  const payload = tail.join(',').trim()

  return { type, payload, proxy, raw: trimmed, noResolve }
}

export function normalizeApiRule(rule, index) {
  if (!rule) return null

  const type = normalizeRuleType(rule.type)
  const proxy = String(rule.proxy || rule.outbound || 'DIRECT')
  const payload = String(rule.payload ?? rule.pattern ?? '')
  const noResolve = Boolean(rule['no-resolve'] || rule.noResolve)

  const raw = buildRuleRaw({
    type: rule.type || type,
    payload,
    proxy,
    noResolve,
  })

  return {
    index,
    type: toClashRuleType(type),
    payload,
    proxy,
    raw,
    noResolve,
  }
}

export function toRuleDisplayModel(rule, index) {
  const base = normalizeApiRule(rule, index) || rule
  if (!base) return null

  const outboundRaw = base.proxy || 'DIRECT'
  const name = base.payload || base.type
  let watermark = { type: 'emoji', value: '⚡' }

  if (/^APPLE/i.test(base.payload || '')) watermark = { type: 'emoji', value: '🍎' }
  else if (WIFI_OUTBOUND_RE.test(outboundRaw)) watermark = { type: 'emoji', value: '📱' }
  else if (String(outboundRaw).toUpperCase() === 'DIRECT') watermark = { type: 'emoji', value: '🎯' }
  else if (String(outboundRaw).toUpperCase() === 'REJECT') watermark = { type: 'emoji', value: '🛑' }

  return {
    id: base.id || `rule-${base.index ?? index}`,
    index: base.index ?? index,
    type: base.type,
    payload: base.payload,
    proxy: base.proxy,
    raw: base.raw,
    noResolve: base.noResolve,
    name,
    matchMode: base.type,
    count: 1,
    outbound: outboundRaw === 'DIRECT' ? '直连' : outboundRaw,
    outboundTarget: outboundRaw,
    enabled: base.enabled !== false,
    watermark,
    icon: 'rule',
  }
}

export function ruleToYamlLine(rule) {
  const raw = rule?.raw || ''
  if (!raw) return ''
  return `- ${raw}`
}

export function rulesToYaml(rules) {
  return (rules || [])
    .map(ruleToYamlLine)
    .filter(Boolean)
    .join('\n')
}

export function parseYamlRulesText(text) {
  const lines = String(text || '').split(/\r?\n/)
  const parsed = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const body = line.startsWith('-') ? line.slice(1).trim() : line
    const rule = parseRawClashLine(body)
    if (rule) parsed.push(rule)
  }

  return parsed
}

export function mergeDslWithApiRules(dsl, apiRules) {
  const rules = apiRules || []
  const used = new Set()

  /** @type {Map<string, number[]>} */
  const byKey = new Map()
  for (let i = 0; i < rules.length; i += 1) {
    const key = canonicalRuleKey(rules[i])
    if (!key) continue
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(i)
  }

  function takeByKey(key) {
    const list = byKey.get(key)
    if (!list?.length) return null
    while (list.length) {
      const idx = list.shift()
      if (used.has(idx)) continue
      used.add(idx)
      return { rule: rules[idx], index: idx }
    }
    return null
  }

  function takeByLoose(expectedRaw) {
    const expected = parseRawClashLine(expectedRaw)
    if (!expected) return null
    const wantType = toClashRuleType(expected.type)
    const wantPayload = normalizeRulePayload(expected.type, expected.payload).toLowerCase()
    const wantProxy = normalizeProxyName(expected.proxy).toLowerCase()

    const logicType = wantType === 'AND' || wantType === 'OR' || wantType === 'NOT'
    const normLogic = (payload) =>
      String(payload || '')
        .toLowerCase()
        .replace(/&&/g, ',')
        .replace(/[^a-z0-9,]/g, '')

    for (let i = 0; i < rules.length; i += 1) {
      if (used.has(i)) continue
      const api = normalizeApiRule(rules[i], i)
      if (!api) continue
      if (toClashRuleType(api.type) !== wantType) continue
      const apiProxy = normalizeProxyName(api.proxy).toLowerCase()
      if (apiProxy !== wantProxy) continue

      if (logicType) {
        const a = normLogic(api.payload)
        const b = normLogic(wantPayload)
        if (a && b && (a === b || a.includes(b) || b.includes(a))) {
          used.add(i)
          return { rule: rules[i], index: i }
        }
        continue
      }

      const apiPayload = normalizeRulePayload(api.type, api.payload).toLowerCase()
      if (apiPayload !== wantPayload) continue
      used.add(i)
      return { rule: rules[i], index: i }
    }
    return null
  }

  const blocks = (dsl?.blocks || []).map((block) => {
    const groups = block.groups.map((group) => {
      const expectedRaws = group.expectedRaws || []
      const groupRules = []

      for (const raw of expectedRaws) {
        const key = canonicalRuleKey(raw)
        const hit = (key && takeByKey(key)) || takeByLoose(raw)
        if (hit) {
          groupRules.push(toRuleDisplayModel(normalizeApiRule(hit.rule, hit.index), hit.index))
        }
      }

      return {
        ...group,
        slotCount: expectedRaws.length || group.slotCount || groupRules.length,
        rules: groupRules,
      }
    })

    return {
      ...block,
      groups,
      ruleCount: groups.reduce((sum, group) => sum + group.rules.length, 0),
    }
  })

  const overflow = rules
    .map((rule, i) => ({ rule, i }))
    .filter(({ i }) => !used.has(i))
    .map(({ rule, i }) => toRuleDisplayModel(normalizeApiRule(rule, i), i))
    .filter(Boolean)

  const mappedCount = used.size

  return {
    blocks,
    overflow,
    stats: {
      totalApi: rules.length,
      mappedCount,
      slotCount: dsl?.slotCount || 0,
    },
  }
}

export function flattenBlocksToApiRules(blocks, overflow = []) {
  const flat = []
  for (const block of blocks || []) {
    for (const group of block.groups || []) {
      for (const rule of group.rules || []) {
        flat.push({ ...rule, index: flat.length })
      }
    }
  }
  for (const rule of overflow || []) {
    flat.push({ ...rule, index: flat.length })
  }
  return flat
}

export function applyGroupYamlEdit(blocks, groupId, yamlText) {
  let updated = false

  const nextBlocks = (blocks || []).map((block) => ({
    ...block,
    groups: block.groups.map((group) => {
      if (group.id !== groupId) return group
      updated = true
      const rules = parseYamlRulesText(yamlText).map((rule, i) =>
        toRuleDisplayModel(rule, i),
      )
      return { ...group, rules, slotCount: rules.length }
    }),
    ruleCount: undefined,
  }))

  for (const block of nextBlocks) {
    block.ruleCount = block.groups.reduce((sum, g) => sum + (g.rules?.length || 0), 0)
  }

  return { blocks: nextBlocks, updated }
}

export function buildRulesPageView(dslText, apiRules) {
  const dsl = parseRulesDsl(dslText)
  return mergeDslWithApiRules(dsl, apiRules)
}

/**
 * 直接从配置 YAML 的 rules: 段（含 # === / # == 注释）生成可编辑分组。
 * 分组结构 = YAML 注释，规则内容 = YAML 行——与文件一一对应。
 */
export function buildRulesPageViewFromYaml(yamlText) {
  const text = String(yamlText || '')
  const lines = text.split(/\r?\n/)
  let sectionStart = -1
  let sectionEnd = lines.length
  for (let i = 0; i < lines.length; i += 1) {
    if (/^rules:\s*$/.test(lines[i])) {
      sectionStart = i
      for (let j = i + 1; j < lines.length; j += 1) {
        if (/^[a-zA-Z][\w-]*:\s*$/.test(lines[j]) && !lines[j].startsWith('rules:')) {
          sectionEnd = j
          break
        }
      }
      break
    }
  }

  const slice =
    sectionStart >= 0
      ? lines.slice(sectionStart, sectionEnd).join('\n')
      : text

  const blocks = []
  let currentBlock = null
  let currentGroup = null
  let ruleIndex = 0

  function ensureBlock(name = '未命名区块') {
    if (!currentBlock) {
      currentBlock = { id: `block-${blocks.length}`, name, groups: [] }
      blocks.push(currentBlock)
    }
  }

  function ensureGroup(name = '默认') {
    ensureBlock()
    if (!currentGroup) {
      currentGroup = {
        id: `${currentBlock.id}-group-${currentBlock.groups.length}`,
        name,
        slotCount: 0,
        expectedRaws: [],
        rules: [],
      }
      currentBlock.groups.push(currentGroup)
    }
  }

  for (const rawLine of slice.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line === 'rules:') continue

    const marker = parseMarker(line)
    if (marker?.kind === 'block') {
      currentBlock = { id: `block-${blocks.length}`, name: marker.name, groups: [] }
      blocks.push(currentBlock)
      currentGroup = null
      continue
    }
    if (marker?.kind === 'group') {
      ensureBlock()
      currentGroup = {
        id: `${currentBlock.id}-group-${currentBlock.groups.length}`,
        name: marker.name,
        slotCount: 0,
        expectedRaws: [],
        rules: [],
      }
      currentBlock.groups.push(currentGroup)
      continue
    }

    if (line.startsWith('-') || (line.startsWith('#') && line.includes('-'))) {
      let body = line
      let enabled = true
      if (line.startsWith('#')) {
        const uncommented = line.replace(/^#\s*/, '')
        if (!uncommented.startsWith('-')) continue
        body = uncommented
        enabled = false
      }
      const parsed = parseRawClashLine(body.replace(/^-\s*/, ''))
      if (!parsed) continue
      ensureGroup()
      const display = toRuleDisplayModel({ ...parsed, enabled, index: ruleIndex }, ruleIndex)
      if (display) {
        currentGroup.rules.push(display)
        currentGroup.expectedRaws.push(parsed.raw)
        currentGroup.slotCount += 1
        ruleIndex += 1
      }
    }
  }

  for (const block of blocks) {
    block.ruleCount = block.groups.reduce((sum, g) => sum + (g.rules?.length || 0), 0)
  }

  return {
    blocks,
    overflow: [],
    stats: {
      totalApi: ruleIndex,
      mappedCount: ruleIndex,
      slotCount: ruleIndex,
    },
    source: 'yaml',
  }
}

export function loadRulesEditorStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveRulesEditorStore(blocks, overflow) {
  try {
    const flat = flattenBlocksToApiRules(blocks, overflow)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      flatRules: flat,
      groupOverrides: collectGroupYaml(blocks),
    }))
  } catch {
    /* quota / private mode */
  }
}

function collectGroupYaml(blocks) {
  const overrides = {}
  for (const block of blocks || []) {
    for (const group of block.groups || []) {
      overrides[group.id] = rulesToYaml(group.rules)
    }
  }
  return overrides
}

export function applyEditorStoreToView(view, store) {
  if (!store?.groupOverrides) return view

  let blocks = view.blocks
  for (const [groupId, yaml] of Object.entries(store.groupOverrides)) {
    const result = applyGroupYamlEdit(blocks, groupId, yaml)
    if (result.updated) blocks = result.blocks
  }

  const flat = flattenBlocksToApiRules(blocks, view.overflow)
  return {
    ...view,
    blocks,
    stats: {
      ...view.stats,
      mappedCount: Math.min(view.stats.mappedCount, view.stats.totalApi),
    },
  }
}

export function exportFullRulesYaml(blocks, overflow) {
  const sections = []
  for (const block of blocks || []) {
    sections.push(`# === ${block.name} ===`)
    for (const group of block.groups || []) {
      sections.push(`# == ${group.name} ==`)
      const yaml = rulesToYaml(group.rules)
      if (yaml) sections.push(yaml)
      sections.push('')
    }
  }
  if (overflow?.length) {
    sections.push('# === 未映射规则 ===')
    sections.push(rulesToYaml(overflow))
  }
  return sections.join('\n').trim()
}

export function shortGroupLabel(name) {
  const text = String(name || '').trim()
  if (!text) return '—'
  const region = text.match(/^(HK|UK|DE|US|NZ|Bk|DR|TAG)$/i)
  if (region) return region[1].toUpperCase()
  if (text.length <= 18) return text
  return `${text.slice(0, 16)}…`
}

export { WIFI_OUTBOUND_RE }

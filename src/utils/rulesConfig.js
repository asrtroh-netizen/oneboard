/**
 * Mihomo config YAML — rules: 段解析 / 写入
 */
import {
  flattenBlocksToApiRules,
  parseRawClashLine,
  ruleToYamlLine,
  canonicalRuleKey,
} from './rulesDsl'

const TOP_LEVEL_SECTION_RE = /^[a-zA-Z][\w-]*:\s*$/

export function findRulesSection(lines) {
  const list = Array.isArray(lines) ? lines : String(lines || '').split(/\r?\n/)
  let sectionStart = -1
  let sectionEnd = list.length

  for (let i = 0; i < list.length; i += 1) {
    if (/^rules:\s*$/.test(list[i])) {
      sectionStart = i
      for (let j = i + 1; j < list.length; j += 1) {
        if (TOP_LEVEL_SECTION_RE.test(list[j]) && !list[j].startsWith('rules:')) {
          sectionEnd = j
          break
        }
      }
      break
    }
  }

  return { sectionStart, sectionEnd, lines: list }
}

function pushRuleLine(sectionLines, rule) {
  const line = ruleToYamlLine(rule)
  if (!line) return
  if (rule?.enabled === false) {
    sectionLines.push(`# ${line}`)
    return
  }
  sectionLines.push(line)
}

export function buildRulesSectionLines(blocks, overflow = []) {
  const sectionLines = ['rules:']

  for (const block of blocks || []) {
    sectionLines.push(`# === ${block.name} ===`)
    for (const group of block.groups || []) {
      sectionLines.push(`# == ${group.name} ==`)
      for (const rule of group.rules || []) {
        pushRuleLine(sectionLines, rule)
      }
      sectionLines.push('')
    }
  }

  if (overflow?.length) {
    sectionLines.push('# === 未映射规则 ===')
    for (const rule of overflow) {
      pushRuleLine(sectionLines, rule)
    }
  }

  while (sectionLines.length > 1 && sectionLines[sectionLines.length - 1] === '') {
    sectionLines.pop()
  }

  return sectionLines
}

export function applyRulesSectionToConfigYaml(yamlText, blocks, overflow = []) {
  const { sectionStart, sectionEnd, lines } = findRulesSection(yamlText)
  const sectionLines = buildRulesSectionLines(blocks, overflow)

  if (sectionStart < 0) {
    const trimmed = lines.join('\n').replace(/\s+$/, '')
    const text = `${trimmed}\n\n${sectionLines.join('\n')}\n`
    return text
  }

  const before = lines.slice(0, sectionStart)
  const after = lines.slice(sectionEnd)
  const merged = [...before, ...sectionLines, ...after].join('\n').replace(/\n{3,}/g, '\n\n')
  return merged.endsWith('\n') ? merged : `${merged}\n`
}

export function extractRuleRawsFromConfigYaml(yamlText) {
  const { sectionStart, sectionEnd, lines } = findRulesSection(yamlText)
  if (sectionStart < 0) return []

  const raws = []
  for (let i = sectionStart + 1; i < sectionEnd; i += 1) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const body = trimmed.startsWith('-') ? trimmed.slice(1).trim() : trimmed
    const rule = parseRawClashLine(body)
    if (rule?.raw) raws.push(rule.raw)
  }
  return raws
}

function multisetDiff(leftKeys, rightKeys) {
  const count = (keys) => {
    const map = new Map()
    for (const key of keys) {
      map.set(key, (map.get(key) || 0) + 1)
    }
    return map
  }

  const leftMap = count(leftKeys)
  const rightMap = count(rightKeys)
  const onlyLeft = []
  const onlyRight = []

  for (const [key, leftCount] of leftMap) {
    const diff = leftCount - (rightMap.get(key) || 0)
    for (let i = 0; i < diff; i += 1) onlyLeft.push(key)
  }

  for (const [key, rightCount] of rightMap) {
    const diff = rightCount - (leftMap.get(key) || 0)
    for (let i = 0; i < diff; i += 1) onlyRight.push(key)
  }

  return { onlyLeft, onlyRight }
}

export function compareRulesSync(apiRules, yamlText) {
  const runtimeKeys = (apiRules || [])
    .map((rule) => canonicalRuleKey(rule))
    .filter(Boolean)

  const storageKeys = extractRuleRawsFromConfigYaml(yamlText)
    .map((raw) => canonicalRuleKey(raw))
    .filter(Boolean)

  const { onlyLeft: onlyRuntime, onlyRight: onlyStorage } = multisetDiff(runtimeKeys, storageKeys)

  return {
    inSync: onlyRuntime.length === 0 && onlyStorage.length === 0,
    runtimeCount: runtimeKeys.length,
    storageCount: storageKeys.length,
    onlyRuntime,
    onlyStorage,
  }
}

export function flattenEditorRules(blocks, overflow = []) {
  return flattenBlocksToApiRules(blocks, overflow)
}

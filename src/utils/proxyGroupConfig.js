/**
 * proxy-groups 段 YAML 解析 / 序列化（Clash/Mihomo 代理组 filter）
 */

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

function yamlSingleQuoted(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`
}

function yamlScalar(value) {
  const s = String(value ?? '')
  if (!s) return '""'
  if (/[:#\[\]{}&*!|>'"%@`]/.test(s) || /\s/.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return s
}

export function normalizeGroupName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim()
}

export function groupNamesMatch(a, b) {
  const na = normalizeGroupName(a)
  const nb = normalizeGroupName(b)
  if (na === nb) return true

  const strip = (s) => s.replace(/[^\w-]/g, '').toUpperCase()
  if (strip(na) === strip(nb)) return true

  const wifiA = na.match(/([A-Z]{2})-WIFI/i)
  const wifiB = nb.match(/([A-Z]{2})-WIFI/i)
  if (wifiA && wifiB) {
    const codeA = wifiA[1].toUpperCase() === 'UK' ? 'GB' : wifiA[1].toUpperCase()
    const codeB = wifiB[1].toUpperCase() === 'UK' ? 'GB' : wifiB[1].toUpperCase()
    return codeA === codeB
  }

  return false
}

const LIST_ITEM_NAME_RE = /^(\s*)- name:\s*(.+)$/

function parseListItemLine(line) {
  const match = String(line || '').match(LIST_ITEM_NAME_RE)
  if (!match) return null
  return {
    indent: match[1].length,
    name: unquote(match[2]),
  }
}

function detectListIndent(lines, sectionStart, sectionEnd) {
  for (let i = sectionStart + 1; i < sectionEnd; i += 1) {
    const item = parseListItemLine(lines[i])
    if (item) return item.indent
  }
  return 2
}

function isSiblingListItem(line, listIndent) {
  const item = parseListItemLine(line)
  return Boolean(item && item.indent === listIndent)
}

function parseGroupBlock(lines, startIdx, endIdx, listIndent) {
  const item = parseListItemLine(lines[startIdx])
  const group = {
    name: item?.name || '',
    type: 'select',
    filter: '',
    excludeFilter: '',
    use: [],
  }

  let i = startIdx + 1
  while (i < endIdx) {
    const line = lines[i]
    if (!line.trim()) {
      i += 1
      continue
    }

    if (isSiblingListItem(line, listIndent)) {
      break
    }

    const trimmed = line.trim()
    if (trimmed === 'use:') {
      i += 1
      while (i < endIdx) {
        if (isSiblingListItem(lines[i], listIndent)) break

        const useMatch = lines[i].match(/^\s+-\s+(.+)$/)
        if (useMatch) {
          group.use.push(unquote(useMatch[1]))
          i += 1
          continue
        }

        if (lines[i].trim() && !/^\s+-\s+/.test(lines[i])) break
        i += 1
      }
      continue
    }

    const match = trimmed.match(/^([^:]+):\s*(.*)$/)
    if (!match) {
      i += 1
      continue
    }

    const key = match[1].trim()
    const rawVal = unquote(match[2])

    if (key === 'type') group.type = rawVal || 'select'
    else if (key === 'filter') group.filter = rawVal
    else if (key === 'exclude-filter') group.excludeFilter = rawVal

    i += 1
  }

  return group
}

function isTopLevelYamlKey(line) {
  const text = String(line || '')
  if (!text || /^\s/.test(text) || /^-\s/.test(text)) return false
  return /^[^\s#][^:]*:\s*/.test(text)
}

/**
 * @returns {{ groups: Array<object>, sectionStart: number, sectionEnd: number, lines: string[] }}
 */
export function parseProxyGroupsYaml(yamlText) {
  const lines = String(yamlText || '').split(/\r?\n/)
  let sectionStart = -1
  let sectionEnd = lines.length

  for (let i = 0; i < lines.length; i += 1) {
    if (/^proxy-groups:\s*$/.test(lines[i])) {
      sectionStart = i
      continue
    }
    if (sectionStart >= 0 && i > sectionStart && isTopLevelYamlKey(lines[i])) {
      sectionEnd = i
      break
    }
  }

  const groups = []

  if (sectionStart < 0) {
    return { groups, sectionStart, sectionEnd, lines, listIndent: 2 }
  }

  let i = sectionStart + 1
  const listIndent = detectListIndent(lines, sectionStart, sectionEnd)

  while (i < sectionEnd) {
    if (!isSiblingListItem(lines[i], listIndent)) {
      i += 1
      continue
    }

    const blockStart = i
    i += 1
    while (i < sectionEnd && !isSiblingListItem(lines[i], listIndent)) {
      i += 1
    }

    groups.push(parseGroupBlock(lines, blockStart, i, listIndent))
  }

  return { groups, sectionStart, sectionEnd, lines, listIndent }
}

export function serializeProxyGroup(group, listIndent = 2) {
  const pad = ' '.repeat(listIndent)
  const propPad = ' '.repeat(listIndent + 2)
  const lines = [`${pad}- name: ${yamlScalar(group.name)}`]

  if (group.type) {
    lines.push(`${propPad}type: ${group.type}`)
  }

  if (group.use?.length) {
    lines.push(`${propPad}use:`)
    for (const item of group.use) {
      lines.push(`${propPad}- ${yamlScalar(item)}`)
    }
  }

  if (group.filter) {
    lines.push(`${propPad}filter: ${yamlSingleQuoted(group.filter)}`)
  }

  if (group.excludeFilter) {
    lines.push(`${propPad}exclude-filter: ${yamlScalar(group.excludeFilter)}`)
  }

  return lines
}

function buildProxyGroupsSection(groups, listIndent = 2) {
  const sectionLines = ['proxy-groups:']
  for (const group of groups) {
    sectionLines.push(...serializeProxyGroup(group, listIndent))
    sectionLines.push('')
  }
  return sectionLines
}

function insertProxyGroupsSection(lines, groups, listIndent = 0) {
  const sectionLines = buildProxyGroupsSection(groups, listIndent)
  const rulesIdx = lines.findIndex((line) => /^rules:\s*$/.test(line))
  if (rulesIdx >= 0) {
    const merged = [
      ...lines.slice(0, rulesIdx),
      ...sectionLines,
      '',
      ...lines.slice(rulesIdx),
    ]
    const text = merged.join('\n').replace(/\n{3,}/g, '\n\n')
    return text.endsWith('\n') ? text : `${text}\n`
  }

  const trimmed = lines.join('\n').replace(/\s+$/, '')
  const text = `${sectionLines.join('\n')}\n\n${trimmed}\n`
  return text
}

export function proxyGroupsToMap(groups) {
  const map = {}
  for (const group of groups) {
    if (!group?.name) continue
    map[group.name] = {
      name: group.name,
      type: group.type || 'select',
      filter: group.filter || '',
      excludeFilter: group.excludeFilter || '',
      use: [...(group.use || [])],
    }
  }
  return map
}

export function findProxyGroupConfig(proxyGroupsMap, groupName) {
  const map = proxyGroupsMap || {}
  if (map[groupName]) return map[groupName]

  const key = Object.keys(map).find((name) => groupNamesMatch(name, groupName))
  return key ? map[key] : null
}

export function applyProxyGroupFilter(yamlText, groupName, { filter = '', excludeFilter = '' } = {}) {
  const parsed = parseProxyGroupsYaml(yamlText)
  const { groups, sectionStart, sectionEnd, lines, listIndent = 2 } = parsed
  const nextGroups = [...groups]
  const idx = nextGroups.findIndex((g) => groupNamesMatch(g.name, groupName))

  if (idx >= 0) {
    nextGroups[idx] = {
      ...nextGroups[idx],
      filter: String(filter ?? ''),
      excludeFilter: String(excludeFilter ?? ''),
    }
  } else {
    nextGroups.push({
      name: groupName,
      type: 'select',
      use: [],
      filter: String(filter ?? ''),
      excludeFilter: String(excludeFilter ?? ''),
    })
  }

  const sectionIndent = sectionStart >= 0 ? listIndent : 0
  const sectionLines = buildProxyGroupsSection(nextGroups, sectionIndent)

  if (sectionStart < 0) {
    return insertProxyGroupsSection(lines, nextGroups, 0)
  }

  const before = lines.slice(0, sectionStart)
  const after = lines.slice(sectionEnd)
  const merged = [...before, ...sectionLines, ...after].join('\n').replace(/\n{3,}/g, '\n\n')
  return merged.endsWith('\n') ? merged : `${merged}\n`
}

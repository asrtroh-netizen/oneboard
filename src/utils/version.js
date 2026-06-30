export function formatVersion(value) {
  const text = String(value || '').trim()
  if (!text || text === '—') return '—'
  return text.startsWith('v') ? text : `v${text}`
}

export function parseVersionParts(value) {
  const raw = String(value || '').trim().replace(/^v/i, '')
  const match = raw.match(/^(\d+(?:\.\d+)*)(?:-([0-9A-Za-z.-]+))?/)
  if (!match) return null
  const nums = match[1].split('.').map((n) => Number.parseInt(n, 10) || 0)
  return { nums, suffix: match[2] || '' }
}

export function compareVersions(a, b) {
  const left = parseVersionParts(a)
  const right = parseVersionParts(b)
  if (!left || !right) return 0
  const len = Math.max(left.nums.length, right.nums.length)
  for (let i = 0; i < len; i += 1) {
    const diff = (left.nums[i] || 0) - (right.nums[i] || 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  if (left.suffix === right.suffix) return 0
  if (!left.suffix) return 1
  if (!right.suffix) return -1
  return left.suffix.localeCompare(right.suffix)
}

export function isUpdateAvailable(current, latest) {
  if (!current || !latest || current === '—' || latest === '—') return false
  return compareVersions(current, latest) < 0
}

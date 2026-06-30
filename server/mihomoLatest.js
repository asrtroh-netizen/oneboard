const VERSION_SOURCES = {
  release: [
    'https://github.com/MetaCubeX/mihomo/releases/latest/download/version.txt',
    'https://api.github.com/repos/MetaCubeX/mihomo/releases/latest',
  ],
  alpha: [
    'https://github.com/MetaCubeX/mihomo/releases/download/Prerelease-Alpha/version.txt',
    'https://api.github.com/repos/MetaCubeX/mihomo/releases/tags/Prerelease-Alpha',
  ],
}

const FETCH_TIMEOUT_MS = 20000

function normalizeVersion(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''
  return text.startsWith('v') ? text : `v${text}`
}

function parseVersionFromPayload(url, body) {
  const trimmed = String(body || '').trim()
  if (!trimmed) return ''

  if (url.includes('api.github.com')) {
    try {
      const json = JSON.parse(trimmed)
      return normalizeVersion(json.tag_name || json.name || '')
    } catch {
      return ''
    }
  }

  return normalizeVersion(trimmed.split(/\s+/)[0])
}

async function fetchVersionFromUrl(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: url.includes('api.github.com')
      ? {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'OneBoard',
        }
      : undefined,
  })

  if (!res.ok) {
    throw new Error(`mihomo latest → ${res.status} (${url})`)
  }

  const version = parseVersionFromPayload(url, await res.text())
  if (!version) {
    throw new Error(`mihomo latest → empty version (${url})`)
  }

  return version
}

export async function getMihomoLatestRemote(channel = 'release') {
  const key = channel === 'alpha' ? 'alpha' : 'release'
  const urls = VERSION_SOURCES[key] || VERSION_SOURCES.release
  const errors = []

  for (const url of urls) {
    try {
      const version = await fetchVersionFromUrl(url)
      return { version, channel: key, source: url }
    } catch (err) {
      errors.push(err?.message || String(err))
    }
  }

  throw new Error(errors.join(' · ') || 'mihomo latest unavailable')
}

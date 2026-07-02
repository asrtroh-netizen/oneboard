import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocket, WebSocketServer } from 'ws'
import { createOneBordAgent } from './agent/onebordAgent.js'
import { getOnebordVersionInfo } from './onebordVersion.js'
import { getMihomoLatestRemote } from './mihomoLatest.js'
import { handleRateLimitedLogin, handleLogoutRequest } from './loginAuth.js'
import { handleChangePasswordRequest } from './changePassword.js'
import { parseBearerToken, getSession } from './sessionStore.js'
import { ensureUserDb } from './userDb.js'
import {
  getMihomoConfigPath,
  readMihomoConfigYaml,
  writeProviderConfig,
  writeMihomoConfigYamlToDisk,
} from './mihomoConfig.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isPkg = typeof process.pkg !== 'undefined'
const rootDir = process.env.ONEBORD_APP_ROOT
  ? path.resolve(process.env.ONEBORD_APP_ROOT)
  : isPkg
    ? path.dirname(process.execPath)
    : path.resolve(__dirname, '..')
const distDir = process.env.ONEBORD_DIST_DIR
  ? path.resolve(process.env.ONEBORD_DIST_DIR)
  : path.resolve(rootDir, 'dist')
const port = Number(process.env.ONEBORD_PORT || process.env.PORT || 8866)
const host = process.env.ONEBORD_HOST || '0.0.0.0'

const agent = createOneBordAgent()
agent.start()

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function normalizeOrigin(value = '') {
  return String(value || '').trim().replace(/\/api$/i, '').replace(/\/+$/, '')
}

function resolveMihomoUpstream(req) {
  const header = normalizeOrigin(req.headers['x-onebord-clash-upstream'])
  if (header) return header
  try {
    const url = new URL(req.url || '', 'http://localhost')
    const upstream = url.searchParams.get('upstream')
    if (upstream) return normalizeOrigin(decodeURIComponent(upstream))
  } catch {
    /* ignore */
  }
  return agent.mihomoUpstream
}

function resolveVoHiveUpstream(req) {
  const header = normalizeOrigin(req.headers['x-onebord-vohive-upstream'])
  if (header) return header
  try {
    const url = new URL(req.url || '', 'http://localhost')
    const upstream = url.searchParams.get('__vohive_up')
    if (upstream) return normalizeOrigin(decodeURIComponent(upstream))
  } catch {
    /* ignore */
  }
  return agent.vohiveUpstream
}

function proxyHttp(req, res, { upstream, prefix, rewritePrefix, authHeader }) {
  let target
  try {
    target = new URL(upstream)
  } catch {
    sendJson(res, 502, { error: `Invalid upstream: ${upstream}` })
    return
  }

  const transport = target.protocol === 'https:' ? https : http
  const pathName = (req.url || '/').replace(new RegExp(`^${prefix}`), rewritePrefix)
  const headers = { ...req.headers, host: target.host, 'cache-control': 'no-cache' }
  delete headers['x-onebord-clash-upstream']
  delete headers['x-onebord-vohive-upstream']
  if (authHeader && !headers.authorization) headers.authorization = authHeader

  const proxyReq = transport.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: pathName,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.statusCode = proxyRes.statusCode || 502
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined) res.setHeader(key, value)
      }
      proxyRes.pipe(res)
    },
  )

  proxyReq.setTimeout(15000, () => proxyReq.destroy(new Error('upstream timeout')))
  proxyReq.on('error', (err) => {
    if (!res.headersSent) sendJson(res, 502, { error: err?.message || 'proxy failed' })
    else res.destroy(err)
  })
  req.pipe(proxyReq)
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.html') return 'text/html; charset=utf-8'
  if (ext === '.js') return 'text/javascript; charset=utf-8'
  if (ext === '.css') return 'text/css; charset=utf-8'
  if (ext === '.json') return 'application/json; charset=utf-8'
  if (ext === '.webmanifest') return 'application/manifest+json; charset=utf-8'
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.webp') return 'image/webp'
  return 'application/octet-stream'
}

function serveStatic(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  const requested = decodeURIComponent(url.pathname)
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, '')
  let filePath = path.join(distDir, safePath)
  if (!filePath.startsWith(distDir)) {
    sendJson(res, 403, { error: 'Forbidden' })
    return
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html')
  }
  fs.createReadStream(filePath)
    .on('open', () => {
      res.statusCode = 200
      res.setHeader('Content-Type', contentType(filePath))
    })
    .on('error', () => sendJson(res, 404, { error: 'Not found' }))
    .pipe(res)
}

async function handleApi(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  try {
    if (url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true, mode: agent.mode, ts: Date.now() })
      return
    }
    if (url.pathname === '/api/system-info') {
      sendJson(res, 200, agent.getSnapshot().system || {})
      return
    }
    if (url.pathname === '/api/agent/snapshot' || url.pathname === '/api/control-plane/snapshot') {
      sendJson(res, 200, agent.getSnapshot())
      return
    }
    if (url.pathname === '/api/version') {
      sendJson(res, 200, getOnebordVersionInfo())
      return
    }
    if (url.pathname === '/api/mihomo-latest') {
      const channel = url.searchParams.get('channel') || 'release'
      sendJson(res, 200, await getMihomoLatestRemote(channel))
      return
    }
    if (url.pathname === '/api/login') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })
      return sendJson(res, 200, handleRateLimitedLogin(req, await readJsonBody(req)))
    }
    if (url.pathname === '/api/logout') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })
      return sendJson(res, 200, handleLogoutRequest(parseBearerToken(req)))
    }
    if (url.pathname === '/api/change-password') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })
      return sendJson(res, 200, handleChangePasswordRequest(parseBearerToken(req), await readJsonBody(req)))
    }
    if (url.pathname === '/api/mihomo-config-path') {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })
      return sendJson(res, 200, { path: getMihomoConfigPath() })
    }
    if (url.pathname === '/api/mihomo-config') {
      if (req.method === 'GET') {
        const data = readMihomoConfigYaml()
        return sendJson(res, 200, { path: data.path, order: data.order, providers: data.providers })
      }
      const session = getSession(parseBearerToken(req))
      if (!session) return sendJson(res, 401, { message: '未登录' })
      if (req.method === 'PUT') {
        const body = await readJsonBody(req)
        const result = writeProviderConfig(String(body.name || '').trim(), body.config)
        return sendJson(res, 200, { ok: true, path: result.path, providerName: result.providerName })
      }
      return sendJson(res, 405, { error: 'Method not allowed' })
    }
    if (url.pathname === '/api/mihomo-config-yaml') {
      if (req.method === 'GET') {
        const data = readMihomoConfigYaml()
        return sendJson(res, 200, { path: data.path, yaml: data.yaml })
      }
      const session = getSession(parseBearerToken(req))
      if (!session) return sendJson(res, 401, { message: '未登录' })
      if (req.method === 'PUT') {
        const body = await readJsonBody(req)
        const result = writeMihomoConfigYamlToDisk(String(body.yaml || '').trim())
        return sendJson(res, 200, { ok: true, path: result.path })
      }
      return sendJson(res, 405, { error: 'Method not allowed' })
    }
    sendJson(res, 404, { error: 'Not found' })
  } catch (err) {
    sendJson(res, err.status || 500, { message: err?.message || 'api failed' })
  }
}

ensureUserDb()

const server = http.createServer((req, res) => {
  const url = req.url || '/'
  if (url.startsWith('/api/')) {
    void handleApi(req, res)
    return
  }
  if (url.startsWith('/mihomo')) {
    const authHeader = agent.mihomoSecret ? `Bearer ${agent.mihomoSecret}` : ''
    proxyHttp(req, res, {
      upstream: resolveMihomoUpstream(req),
      prefix: '/mihomo',
      rewritePrefix: '',
      authHeader,
    })
    return
  }
  if (url.startsWith('/vohive/')) {
    const authHeader = agent.vohiveToken ? `Bearer ${agent.vohiveToken}` : ''
    proxyHttp(req, res, {
      upstream: resolveVoHiveUpstream(req),
      prefix: '/vohive',
      rewritePrefix: '/api',
      authHeader,
    })
    return
  }
  serveStatic(req, res)
})

const agentWss = new WebSocketServer({ noServer: true })
const proxyWss = new WebSocketServer({ noServer: true })

agentWss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'control.snapshot', ts: Date.now(), snapshot: agent.getSnapshot() }))
  const onEvent = (event) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event))
  }
  agent.on('event', onEvent)
  ws.on('close', () => agent.off('event', onEvent))
})

function proxyWebSocket(req, socket, head, { upstream, prefix, rewritePrefix, authHeader }) {
  let targetUrl
  try {
    const requestUrl = new URL(req.url || '/', 'http://localhost')
    const base = new URL(upstream)
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
    base.pathname = requestUrl.pathname.replace(new RegExp(`^${prefix}`), rewritePrefix)
    base.search = requestUrl.search
    targetUrl = base.toString()
  } catch {
    socket.destroy()
    return
  }

  proxyWss.handleUpgrade(req, socket, head, (clientWs) => {
    const upstreamWs = new WebSocket(targetUrl, {
      headers: authHeader ? { Authorization: authHeader } : {},
    })
    upstreamWs.on('open', () => {
      clientWs.on('message', (data) => {
        if (upstreamWs.readyState === WebSocket.OPEN) upstreamWs.send(data)
      })
      upstreamWs.on('message', (data) => {
        if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data)
      })
    })
    const closeBoth = () => {
      try { clientWs.close() } catch { /* noop */ }
      try { upstreamWs.close() } catch { /* noop */ }
    }
    clientWs.on('close', closeBoth)
    upstreamWs.on('close', closeBoth)
    upstreamWs.on('error', closeBoth)
  })
}

server.on('upgrade', (req, socket, head) => {
  const url = req.url || ''
  if (url === '/api/agent/ws' || url === '/api/control-plane/ws') {
    agentWss.handleUpgrade(req, socket, head, (ws) => agentWss.emit('connection', ws, req))
    return
  }
  if (url.startsWith('/mihomo')) {
    const authHeader = agent.mihomoSecret ? `Bearer ${agent.mihomoSecret}` : ''
    proxyWebSocket(req, socket, head, {
      upstream: resolveMihomoUpstream(req),
      prefix: '/mihomo',
      rewritePrefix: '',
      authHeader,
    })
    return
  }
  socket.destroy()
})

server.listen(port, host, () => {
  console.log(`[oneboard] gateway listening on http://${host}:${port} (${agent.mode})`)
})

server.on('error', (err) => {
  console.error(`[oneboard] gateway failed to bind ${host}:${port}:`, err.message)
  process.exit(1)
})

function shutdown() {
  agent.stop()
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

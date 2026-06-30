import { getSystemInfo } from './systemInfo.js'
import { getOnebordVersionInfo } from './onebordVersion.js'
import { getMihomoLatestRemote } from './mihomoLatest.js'
import { handleLoginRequest, handleLogoutRequest } from './loginAuth.js'
import { handleChangePasswordRequest } from './changePassword.js'
import { parseBearerToken, getSession } from './sessionStore.js'
import { ensureUserDb } from './userDb.js'
import {
  getMihomoConfigPath,
  readMihomoConfigYaml,
  writeProviderConfig,
  writeMihomoConfigYamlToDisk,
} from './mihomoConfig.js'

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

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function attachSystemInfoRoute(server) {
  server.middlewares.use('/api/system-info', (_req, res) => {
    try {
      const data = getSystemInfo()
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(data))
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err?.message || 'system-info failed' }))
    }
  })
}

function attachVersionRoute(server) {
  server.middlewares.use('/api/version', (_req, res) => {
    try {
      const data = getOnebordVersionInfo()
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(data))
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err?.message || 'version failed' }))
    }
  })
}

function attachMihomoLatestRoute(server) {
  server.middlewares.use('/api/mihomo-latest', async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      const channel = url.searchParams.get('channel') || 'release'
      const data = await getMihomoLatestRemote(channel)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(data))
    } catch (err) {
      res.statusCode = 502
      res.end(JSON.stringify({ error: err?.message || 'mihomo-latest failed' }))
    }
  })
}

function attachLoginRoutes(server) {
  ensureUserDb()

  server.middlewares.use('/api/login', async (req, res) => {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }
    try {
      const body = await readJsonBody(req)
      const data = handleLoginRequest(body)
      sendJson(res, 200, data)
    } catch (err) {
      sendJson(res, err.status || 401, { message: err?.message || '登录失败' })
    }
  })

  server.middlewares.use('/api/logout', async (req, res) => {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }
    const token = parseBearerToken(req)
    sendJson(res, 200, handleLogoutRequest(token))
  })

  server.middlewares.use('/api/change-password', async (req, res) => {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }
    try {
      const token = parseBearerToken(req)
      const body = await readJsonBody(req)
      const data = handleChangePasswordRequest(token, body)
      sendJson(res, 200, data)
    } catch (err) {
      sendJson(res, err.status || 400, { message: err?.message || '修改密码失败' })
    }
  })
}

function attachMihomoConfigRoutes(server) {
  server.middlewares.use('/api/mihomo-config', async (req, res) => {
    try {
      if (req.method === 'GET') {
        const data = readMihomoConfigYaml()
        sendJson(res, 200, {
          path: data.path,
          order: data.order,
          providers: data.providers,
        })
        return
      }

      const token = parseBearerToken(req)
      const session = getSession(token)
      if (!session) {
        sendJson(res, 401, { message: '未登录' })
        return
      }

      if (req.method === 'PUT') {
        const body = await readJsonBody(req)
        const providerName = String(body.name || '').trim()
        const config = body.config
        if (!providerName || !config) {
          sendJson(res, 400, { message: '缺少 name 或 config' })
          return
        }

        const result = writeProviderConfig(providerName, config)
        sendJson(res, 200, {
          ok: true,
          path: result.path,
          providerName: result.providerName,
        })
        return
      }

      sendJson(res, 405, { error: 'Method not allowed' })
    } catch (err) {
      sendJson(res, err.status || 500, { message: err?.message || 'mihomo-config failed' })
    }
  })

  server.middlewares.use('/api/mihomo-config-path', (req, res) => {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }
    sendJson(res, 200, { path: getMihomoConfigPath() })
  })

  server.middlewares.use('/api/mihomo-config-yaml', async (req, res) => {
    try {
      if (req.method === 'GET') {
        const data = readMihomoConfigYaml()
        sendJson(res, 200, {
          path: data.path,
          yaml: data.yaml,
        })
        return
      }

      const token = parseBearerToken(req)
      const session = getSession(token)
      if (!session) {
        sendJson(res, 401, { message: '未登录' })
        return
      }

      if (req.method === 'PUT') {
        const body = await readJsonBody(req)
        const yaml = String(body.yaml || '').trim()
        if (!yaml) {
          sendJson(res, 400, { message: '缺少 yaml' })
          return
        }
        const result = writeMihomoConfigYamlToDisk(yaml)
        sendJson(res, 200, {
          ok: true,
          path: result.path,
        })
        return
      }

      sendJson(res, 405, { error: 'Method not allowed' })
    } catch (err) {
      sendJson(res, err.status || 500, { message: err?.message || 'mihomo-config-yaml failed' })
    }
  })
}

function attachApiRoutes(server) {
  attachSystemInfoRoute(server)
  attachVersionRoute(server)
  attachMihomoLatestRoute(server)
  attachLoginRoutes(server)
  attachMihomoConfigRoutes(server)
}

export function systemInfoPlugin() {
  return {
    name: 'onebord-system-info',
    configureServer(server) {
      attachApiRoutes(server)
    },
    configurePreviewServer(server) {
      attachApiRoutes(server)
    },
  }
}

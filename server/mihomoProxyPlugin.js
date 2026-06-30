/**
 * Mihomo / Clash API 动态代理 — 按请求头 X-OneBord-Clash-Upstream 转发。
 *
 * Vite 使用的 http-proxy-3 会忽略 `router`，导致设置页配置的主机/端口无效，
 * 所有 /mihomo 请求仍打到 127.0.0.1:9090。此处与 VoHive 一样用 Connect 中间件逐请求路由。
 */
import http from 'node:http'
import https from 'node:https'

function normalizeOrigin(host = '') {
  return String(host || '').trim().replace(/\/+$/, '')
}

function resolveUpstream(req, env) {
  const header = normalizeOrigin(req.headers['x-onebord-clash-upstream'])
  if (header) return header

  try {
    const u = new URL(req.url || '', 'http://localhost')
    const q = u.searchParams.get('upstream')
    if (q) return normalizeOrigin(decodeURIComponent(q))
  } catch {
    /* ignore */
  }

  const envHost = normalizeOrigin(env.VITE_MIHOMO_HOST)
  if (envHost) return envHost

  return ''
}

function upstreamPath(url = '') {
  try {
    const u = new URL(url, 'http://localhost')
    u.searchParams.delete('upstream')
    const path = u.pathname.replace(/^\/mihomo/, '') || '/'
    const search = u.search
    return `${path}${search}`
  } catch {
    return url.replace(/^\/mihomo/, '') || '/'
  }
}

function buildProxyHeaders(req, target, env) {
  const headers = { ...req.headers }
  headers.host = target.host
  delete headers['x-onebord-clash-upstream']

  const clientAuth = req.headers?.authorization
  const envSecret = String(env.VITE_MIHOMO_SECRET || '').trim()
  if (clientAuth) {
    headers.authorization = clientAuth
  } else if (envSecret) {
    headers.authorization = `Bearer ${envSecret}`
  }

  return headers
}

function sendProxyError(res, upstream, err) {
  if (res.headersSent) return
  res.statusCode = 502
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({
    message: `无法连接 Mihomo（${upstream}）：${err.message}`,
  }))
}

function swallowSocketError(socket) {
  if (!socket || socket.destroyed) return
  socket.on('error', () => {
    try {
      socket.destroy()
    } catch {
      /* ignore */
    }
  })
}

function attachMihomoProxy(server, env) {
  server.middlewares.stack.unshift({
    route: '',
    handle: (req, res, next) => {
      const url = req.url || ''
      if (!url.startsWith('/mihomo')) return next()

      const upstream = resolveUpstream(req, env)
      if (!upstream) {
        res.statusCode = 503
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ message: 'Mihomo upstream not configured' }))
        return
      }

      let target
      try {
        target = new URL(upstream)
      } catch {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ message: `Mihomo 上游地址非法: ${upstream}` }))
        return
      }

      const isHttps = target.protocol === 'https:'
      const agent = isHttps ? https : http
      const port = target.port || (isHttps ? 443 : 80)
      const path = upstreamPath(url)

      const proxyReq = agent.request(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port,
          path,
          method: req.method,
          headers: buildProxyHeaders(req, target, env),
        },
        (proxyRes) => {
          res.statusCode = proxyRes.statusCode || 502
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value !== undefined) res.setHeader(key, value)
          }
          proxyRes.on('error', () => {
            if (!res.headersSent) sendProxyError(res, upstream, new Error('上游响应中断'))
            else res.destroy()
          })
          proxyRes.pipe(res)
        },
      )

      proxyReq.setTimeout(15000, () => {
        proxyReq.destroy(new Error('Mihomo 上游超时'))
      })
      proxyReq.on('error', (err) => {
        sendProxyError(res, upstream, err)
      })
      req.on('aborted', () => {
        proxyReq.destroy()
      })

      req.pipe(proxyReq)
    },
  })

  const httpServer = server.httpServer
  if (!httpServer || httpServer.__oneboardMihomoWsAttached) return
  httpServer.__oneboardMihomoWsAttached = true

  httpServer.on('upgrade', (req, socket, head) => {
    const url = req.url || ''
    if (!url.startsWith('/mihomo')) return

    swallowSocketError(socket)

    const upstream = resolveUpstream(req, env)
    if (!upstream) {
      socket.destroy()
      return
    }

    let target
    try {
      target = new URL(upstream)
    } catch {
      socket.destroy()
      return
    }

    const isHttps = target.protocol === 'https:'
    const agent = isHttps ? https : http
    const port = target.port || (isHttps ? 443 : 80)
    const path = upstreamPath(url)

    const proxyReq = agent.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port,
      path,
      method: 'GET',
      headers: buildProxyHeaders(req, target, env),
    })

    proxyReq.on('response', (res) => {
      if (res.statusCode !== 101) {
        res.resume()
        socket.destroy()
      }
    })

    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      swallowSocketError(proxySocket)

      const keys = Object.keys(proxyRes.headers)
      let header = 'HTTP/1.1 101 Switching Protocols\r\n'
      for (const key of keys) {
        const value = proxyRes.headers[key]
        if (value !== undefined) {
          header += `${key}: ${value}\r\n`
        }
      }
      header += '\r\n'

      try {
        socket.write(header)
        if (proxyHead?.length) socket.write(proxyHead)
        proxySocket.pipe(socket)
        socket.pipe(proxySocket)
      } catch {
        socket.destroy()
        proxySocket.destroy()
      }
    })

    proxyReq.on('error', () => {
      socket.destroy()
    })
    proxyReq.end()
  })
}

export function mihomoProxyPlugin(env = {}) {
  return {
    name: 'oneboard-mihomo-proxy',
    configureServer(server) {
      attachMihomoProxy(server, env)
    },
    configurePreviewServer(server) {
      attachMihomoProxy(server, env)
    },
  }
}

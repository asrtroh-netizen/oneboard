/**
 * VoHive 动态代理 — 按「每个请求」的上游路由，支持多容器（1.5 / 1.88 …）同时独立请求。
 *
 * 背景：Vite 用的 http-proxy-3 不支持 `router` 选项（会被忽略），server.proxy 只会把
 * 所有 /vohive 请求打到一个固定 target，导致不同后端的数据互相串（"1.5 阴魂不散"）。
 * 这里用 Node 原生 http/https 按请求头 X-OneBord-VoHive-Upstream 动态转发，彻底隔离。
 */
import http from 'node:http'
import https from 'node:https'

function normalizeOrigin(host = '') {
  let base = String(host || '').trim().replace(/\/+$/, '')
  if (!base) return ''
  base = base.replace(/\/api$/i, '')
  return base.replace(/\/+$/, '')
}

function resolveUpstream(req, env) {
  const header = normalizeOrigin(req.headers['x-onebord-vohive-upstream'])
  if (header) return header

  try {
    const u = new URL(req.url || '', 'http://localhost')
    const q = u.searchParams.get('__vohive_up')
    if (q) return normalizeOrigin(decodeURIComponent(q))
  } catch {
    /* ignore */
  }

  const envHost = normalizeOrigin(env.VITE_VOHIVE_HOST)
  if (envHost) return envHost

  const pageHost = String(req.headers.host || '').split(':')[0].toLowerCase()
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(pageHost)
    || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(pageHost)) {
    return `http://${pageHost}:7575`
  }
  const m = pageHost.match(/^172\.(\d{1,2})\.\d{1,3}\.\d{1,3}$/)
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) {
    return `http://${pageHost}:7575`
  }
  return 'http://127.0.0.1:7575'
}

function attachVoHiveProxy(server, env) {
  server.middlewares.use((req, res, next) => {
    const url = req.url || ''
    if (!url.startsWith('/vohive/')) return next()

    const upstream = resolveUpstream(req, env)
    let target
    try {
      target = new URL(upstream)
    } catch {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ status: 'error', message: `VoHive 上游地址非法: ${upstream}` }))
      return
    }

    const isHttps = target.protocol === 'https:'
    const agent = isHttps ? https : http
    const port = target.port || (isHttps ? 443 : 80)
    const path = url.replace(/^\/vohive/, '/api')

    const headers = { ...req.headers }
    headers.host = target.host
    delete headers['x-onebord-vohive-upstream']
    headers['cache-control'] = 'no-cache'

    const proxyReq = agent.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port,
        path,
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

    proxyReq.setTimeout(15000, () => {
      proxyReq.destroy(new Error('VoHive 上游超时'))
    })
    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({
          status: 'error',
          message: `无法连接 VoHive（${upstream}）：${err.message}`,
        }))
      } else {
        res.destroy(err)
      }
    })

    req.pipe(proxyReq)
  })
}

export function vohiveProxyPlugin(env = {}) {
  return {
    name: 'onebord-vohive-proxy',
    configureServer(server) {
      attachVoHiveProxy(server, env)
    },
    configurePreviewServer(server) {
      attachVoHiveProxy(server, env)
    },
  }
}

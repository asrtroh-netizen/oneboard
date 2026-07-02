import {
  findUserByUsername,
  verifyPassword,
  toPublicUser,
  ensureUserDb,
} from './userDb.js'
import { createSession, deleteSession } from './sessionStore.js'
import {
  checkLoginAllowed,
  registerLoginFailure,
  registerLoginSuccess,
  getClientIp,
} from './loginRateLimit.js'

ensureUserDb()

export function handleLoginRequest(body = {}) {
  ensureUserDb()

  const username = String(body.username || '').trim()
  const password = String(body.password || '')

  if (!username || !password) {
    const err = new Error('请输入用户名和密码')
    err.status = 400
    throw err
  }

  const user = findUserByUsername(username)
  if (!user || !verifyPassword(password, user.password_hash)) {
    const err = new Error('用户名或密码错误')
    err.status = 401
    throw err
  }

  const token = createSession(user)
  return {
    token,
    user: toPublicUser(user),
  }
}

/**
 * 带暴力破解防护的登录入口（gateway 与 Vite 开发插件共用）：
 * 锁定期直接 429；凭据错误计一次失败，成功则清零该 IP 记录
 */
export function handleRateLimitedLogin(req, body = {}) {
  const ip = getClientIp(req)
  const gate = checkLoginAllowed(ip)
  if (gate.locked) {
    const err = new Error(`尝试过于频繁，请 ${gate.retryAfterSec} 秒后再试`)
    err.status = 429
    throw err
  }
  try {
    const result = handleLoginRequest(body)
    registerLoginSuccess(ip)
    return result
  } catch (err) {
    if (err?.status === 401) registerLoginFailure(ip)
    throw err
  }
}

export function handleLogoutRequest(token) {
  if (token) deleteSession(token)
  return { ok: true }
}

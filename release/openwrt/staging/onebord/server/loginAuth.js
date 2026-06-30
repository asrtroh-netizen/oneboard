import {
  findUserByUsername,
  verifyPassword,
  toPublicUser,
  ensureUserDb,
} from './userDb.js'
import { createSession, deleteSession } from './sessionStore.js'

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

export function handleLogoutRequest(token) {
  if (token) deleteSession(token)
  return { ok: true }
}

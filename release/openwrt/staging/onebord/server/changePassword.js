import {
  findUserById,
  hashPassword,
  verifyPassword,
  updateUser,
  toPublicUser,
} from './userDb.js'
import { getSession, updateSession } from './sessionStore.js'

const MIN_PASSWORD_LENGTH = 8
const FORBIDDEN_PASSWORDS = new Set(['admin'])

function validateNewPassword(password) {
  const next = String(password || '')
  if (next.length < MIN_PASSWORD_LENGTH) {
    const err = new Error(`新密码至少 ${MIN_PASSWORD_LENGTH} 位`)
    err.status = 400
    throw err
  }
  if (FORBIDDEN_PASSWORDS.has(next.toLowerCase())) {
    const err = new Error('不能使用默认密码，请设置更安全的密码')
    err.status = 400
    throw err
  }
  return next
}

export function handleChangePasswordRequest(token, body = {}) {
  const session = getSession(token)
  if (!session) {
    const err = new Error('未登录或会话已过期')
    err.status = 401
    throw err
  }

  const user = findUserById(session.userId)
  if (!user) {
    const err = new Error('用户不存在')
    err.status = 404
    throw err
  }

  const newPassword = validateNewPassword(body.newPassword)
  const confirmPassword = String(body.confirmPassword || '')

  if (newPassword !== confirmPassword) {
    const err = new Error('两次输入的新密码不一致')
    err.status = 400
    throw err
  }

  const mustChange = Boolean(user.must_change_password)
  const currentPassword = String(body.currentPassword || '')

  if (!mustChange) {
    if (!currentPassword) {
      const err = new Error('请输入当前密码')
      err.status = 400
      throw err
    }
    if (!verifyPassword(currentPassword, user.password_hash)) {
      const err = new Error('当前密码错误')
      err.status = 401
      throw err
    }
  }

  if (verifyPassword(newPassword, user.password_hash)) {
    const err = new Error('新密码不能与当前密码相同')
    err.status = 400
    throw err
  }

  const updated = updateUser(user.id, {
    password_hash: hashPassword(newPassword),
    must_change_password: false,
  })

  updateSession(token, { mustChangePassword: false })

  return {
    ok: true,
    user: toPublicUser(updated),
  }
}

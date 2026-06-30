import crypto from 'crypto'

/** @type {Map<string, { userId: string, username: string, role: string, mustChangePassword: boolean }>} */
const sessions = new Map()

export function createSession(user) {
  const token = `ob-${crypto.randomBytes(24).toString('hex')}`
  sessions.set(token, {
    userId: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: Boolean(user.must_change_password),
  })
  return token
}

export function getSession(token) {
  if (!token) return null
  return sessions.get(token) || null
}

export function updateSession(token, patch) {
  const session = getSession(token)
  if (!session) return null
  const next = { ...session, ...patch }
  sessions.set(token, next)
  return next
}

export function deleteSession(token) {
  sessions.delete(token)
}

export function parseBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

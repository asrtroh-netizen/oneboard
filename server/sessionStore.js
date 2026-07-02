import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

/**
 * 会话存储：TTL 过期 + 滚动续期 + 磁盘持久化
 *
 * 设计动机（替代旧版纯内存 Map）：
 *  - 旧版 token 永不过期（重启前一直有效），且进程重启全员掉线
 *  - 现改为：默认 7 天 TTL；剩余寿命过半时访问自动续期（滚动会话）；
 *    落盘到数据目录，重启后会话仍在
 *  - 写盘防抖合并 + tmp 文件原子替换（路由器断电场景不写坏文件）
 */

const SESSION_TTL_MS = Number(process.env.ONEBORD_SESSION_TTL_MS) > 0
  ? Number(process.env.ONEBORD_SESSION_TTL_MS)
  : 7 * 24 * 60 * 60 * 1000

const DATA_DIR = process.env.ONEBORD_DATA_DIR
  ? path.resolve(process.env.ONEBORD_DATA_DIR)
  : path.join(process.cwd(), '.onebord', 'data')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')
const SAVE_DEBOUNCE_MS = 500

/** @type {Map<string, { userId: string, username: string, role: string, mustChangePassword: boolean, expiresAt: number }>} */
const sessions = new Map()
let loaded = false
let saveTimer = null

function loadFromDisk() {
  if (loaded) return
  loaded = true
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf8')
    const data = JSON.parse(raw)
    const now = Date.now()
    for (const [token, session] of Object.entries(data?.sessions || {})) {
      // 只恢复未过期的会话；历史数据无 expiresAt 的按已过期处理
      if (session && Number(session.expiresAt) > now) {
        sessions.set(token, session)
      }
    }
  } catch {
    /* 文件不存在或损坏：从空会话表启动即可，不阻塞服务 */
  }
}

function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      const payload = { sessions: Object.fromEntries(sessions) }
      const tmpFile = `${SESSIONS_FILE}.tmp`
      fs.writeFileSync(tmpFile, JSON.stringify(payload), 'utf8')
      fs.renameSync(tmpFile, SESSIONS_FILE)
    } catch {
      /* 只读文件系统等场景：降级为内存会话，不影响在线功能 */
    }
  }, SAVE_DEBOUNCE_MS)
  // 不阻止进程正常退出
  if (typeof saveTimer.unref === 'function') saveTimer.unref()
}

function pruneExpired(now = Date.now()) {
  let dirty = false
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) {
      sessions.delete(token)
      dirty = true
    }
  }
  if (dirty) scheduleSave()
}

export function createSession(user, now = Date.now()) {
  loadFromDisk()
  pruneExpired(now)
  const token = `ob-${crypto.randomBytes(24).toString('hex')}`
  sessions.set(token, {
    userId: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: Boolean(user.must_change_password),
    expiresAt: now + SESSION_TTL_MS,
  })
  scheduleSave()
  return token
}

export function getSession(token, now = Date.now()) {
  loadFromDisk()
  if (!token) return null
  const session = sessions.get(token)
  if (!session) return null
  if (session.expiresAt <= now) {
    sessions.delete(token)
    scheduleSave()
    return null
  }
  // 滚动续期：剩余寿命不足一半时刷新，活跃用户永不掉线
  if (session.expiresAt - now < SESSION_TTL_MS / 2) {
    session.expiresAt = now + SESSION_TTL_MS
    scheduleSave()
  }
  return session
}

export function updateSession(token, patch) {
  const session = getSession(token)
  if (!session) return null
  const next = { ...session, ...patch }
  sessions.set(token, next)
  scheduleSave()
  return next
}

export function deleteSession(token) {
  loadFromDisk()
  if (sessions.delete(token)) scheduleSave()
}

export function parseBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

/** 仅供测试：清空内存态并允许重新从磁盘加载 */
export function resetSessionStoreForTest() {
  sessions.clear()
  loaded = false
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
}

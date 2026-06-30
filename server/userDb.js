import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

const DATA_DIR = path.join(process.cwd(), '.onebord', 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const BCRYPT_ROUNDS = 12

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin',
  role: 'admin',
}

function readStore() {
  ensureUserDb()
  const raw = fs.readFileSync(USERS_FILE, 'utf8')
  return JSON.parse(raw)
}

function writeStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2), 'utf8')
}

export function hashPassword(plain) {
  return bcrypt.hashSync(String(plain), BCRYPT_ROUNDS)
}

export function verifyPassword(plain, passwordHash) {
  return bcrypt.compareSync(String(plain), passwordHash)
}

/**
 * 首次启动时初始化默认管理员（password 仅用于 hash，不落盘明文）
 */
export function ensureUserDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true })

  if (fs.existsSync(USERS_FILE)) {
    return false
  }

  const admin = {
    id: '1',
    username: DEFAULT_ADMIN.username,
    password_hash: hashPassword(DEFAULT_ADMIN.password),
    role: DEFAULT_ADMIN.role,
    must_change_password: true,
  }

  writeStore({ users: [admin] })
  console.log('[onebord] Default admin user initialized (username: admin, must change password on first login)')
  return true
}

export function listUsers() {
  return readStore().users
}

export function findUserByUsername(username) {
  const name = String(username || '').trim().toLowerCase()
  return listUsers().find((u) => u.username.toLowerCase() === name) || null
}

export function findUserById(id) {
  return listUsers().find((u) => u.id === id) || null
}

export function updateUser(id, patch) {
  const store = readStore()
  const index = store.users.findIndex((u) => u.id === id)
  if (index < 0) {
    const err = new Error('用户不存在')
    err.status = 404
    throw err
  }
  store.users[index] = { ...store.users[index], ...patch }
  writeStore(store)
  return store.users[index]
}

export function toPublicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: Boolean(user.must_change_password),
  }
}

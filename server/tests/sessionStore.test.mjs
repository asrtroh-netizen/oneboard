import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

// 隔离数据目录必须在模块加载前注入（sessionStore 读取环境变量决定落盘路径）
const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onebord-session-test-'))
process.env.ONEBORD_DATA_DIR = tmpDataDir

const {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  parseBearerToken,
  resetSessionStoreForTest,
} = await import('../sessionStore.js')

const USER = { id: '1', username: 'admin', role: 'admin', must_change_password: false }
const TTL = 7 * 24 * 60 * 60 * 1000

test.beforeEach(() => {
  resetSessionStoreForTest()
  fs.rmSync(path.join(tmpDataDir, 'sessions.json'), { force: true })
})

test('创建后可读取，token 带 ob- 前缀', () => {
  const token = createSession(USER)
  assert.match(token, /^ob-[0-9a-f]{48}$/)
  const session = getSession(token)
  assert.equal(session?.username, 'admin')
})

test('过期会话读取返回 null 并被清除', () => {
  const now = 1_000_000
  const token = createSession(USER, now)
  assert.equal(getSession(token, now + TTL + 1), null)
})

test('剩余寿命过半时滚动续期', () => {
  const now = 1_000_000
  const token = createSession(USER, now)
  // 前半程访问：不续期
  const midEarly = now + TTL * 0.4
  getSession(token, midEarly)
  // 后半程访问：应续到 访问时刻+TTL，故在原过期点之后仍有效
  const midLate = now + TTL * 0.6
  getSession(token, midLate)
  assert.ok(getSession(token, now + TTL + 1000), '续期后原过期点之后应仍有效')
})

test('updateSession 合并补丁', () => {
  const token = createSession(USER)
  updateSession(token, { mustChangePassword: true })
  assert.equal(getSession(token)?.mustChangePassword, true)
})

test('deleteSession 立即失效', () => {
  const token = createSession(USER)
  deleteSession(token)
  assert.equal(getSession(token), null)
})

test('会话持久化：写盘后重载仍在，过期的不恢复', async () => {
  const now = Date.now()
  const alive = createSession(USER, now)
  const dead = createSession(USER, now - TTL - 1000)
  await sleep(700) // 等待防抖写盘（500ms）
  assert.ok(fs.existsSync(path.join(tmpDataDir, 'sessions.json')), '应已落盘')

  resetSessionStoreForTest() // 模拟进程重启
  assert.ok(getSession(alive), '有效会话重启后应恢复')
  assert.equal(getSession(dead), null, '过期会话不应恢复')
})

test('parseBearerToken 解析大小写与空白', () => {
  assert.equal(parseBearerToken({ headers: { authorization: 'Bearer abc123' } }), 'abc123')
  assert.equal(parseBearerToken({ headers: { authorization: 'bearer  xyz ' } }), 'xyz')
  assert.equal(parseBearerToken({ headers: {} }), '')
})

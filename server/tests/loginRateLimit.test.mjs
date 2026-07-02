import test from 'node:test'
import assert from 'node:assert/strict'
import {
  checkLoginAllowed,
  registerLoginFailure,
  registerLoginSuccess,
  resetLoginRateLimit,
} from '../loginRateLimit.js'

const IP = '192.168.1.100'

test.beforeEach(() => {
  resetLoginRateLimit()
})

test('前 4 次失败不锁定', () => {
  const now = 1_000_000
  for (let i = 0; i < 4; i += 1) registerLoginFailure(IP, now)
  const gate = checkLoginAllowed(IP, now)
  assert.equal(gate.locked, false)
})

test('第 5 次失败触发 30 秒锁定', () => {
  const now = 1_000_000
  for (let i = 0; i < 5; i += 1) registerLoginFailure(IP, now)
  const gate = checkLoginAllowed(IP, now)
  assert.equal(gate.locked, true)
  assert.equal(gate.retryAfterSec, 30)
})

test('持续失败锁定时长指数增长且 15 分钟封顶', () => {
  const now = 1_000_000
  // 5+3=8 次失败：30s * 2^3 = 240s
  for (let i = 0; i < 8; i += 1) registerLoginFailure(IP, now)
  assert.equal(checkLoginAllowed(IP, now).retryAfterSec, 240)
  // 再狂失败 20 次：应被 900s 封顶
  for (let i = 0; i < 20; i += 1) registerLoginFailure(IP, now)
  assert.equal(checkLoginAllowed(IP, now).retryAfterSec, 900)
})

test('锁定到期后自动放行', () => {
  const now = 1_000_000
  for (let i = 0; i < 5; i += 1) registerLoginFailure(IP, now)
  const after = now + 31 * 1000
  assert.equal(checkLoginAllowed(IP, after).locked, false)
})

test('登录成功清零该 IP 记录', () => {
  const now = 1_000_000
  for (let i = 0; i < 5; i += 1) registerLoginFailure(IP, now)
  registerLoginSuccess(IP)
  assert.equal(checkLoginAllowed(IP, now).locked, false)
})

test('不同 IP 互不影响', () => {
  const now = 1_000_000
  for (let i = 0; i < 5; i += 1) registerLoginFailure(IP, now)
  assert.equal(checkLoginAllowed('10.0.0.2', now).locked, false)
})

test('闲置超 30 分钟的失败记录被遗忘', () => {
  const now = 1_000_000
  for (let i = 0; i < 4; i += 1) registerLoginFailure(IP, now)
  const later = now + 31 * 60 * 1000
  assert.equal(checkLoginAllowed(IP, later).locked, false)
  // 记录已清除：再失败从头计数
  registerLoginFailure(IP, later)
  assert.equal(checkLoginAllowed(IP, later).locked, false)
})

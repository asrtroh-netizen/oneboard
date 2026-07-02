/**
 * 登录暴力破解防护：按客户端 IP 的失败计数 + 指数退避锁定
 *
 * 策略（业内常规基线）：
 *  - 同一 IP 连续失败 5 次进入锁定；此后每多失败一次锁定时长翻倍
 *  - 锁定时长 30s 起步、15min 封顶；登录成功即清零
 *  - 纯内存实现（面板为单进程部署），惰性清理 + 容量上限防内存滥用
 *
 * 所有函数接受可选 now 参数（毫秒时间戳），便于单测注入时钟。
 */

const MAX_FREE_ATTEMPTS = 5
const BASE_LOCK_MS = 30 * 1000
const MAX_LOCK_MS = 15 * 60 * 1000
/** 无锁定且超过此时长未再失败的记录视为过期 */
const ENTRY_IDLE_MS = 30 * 60 * 1000
/** 容量上限：极端扫段攻击下丢弃最旧记录，防 Map 无限膨胀 */
const MAX_ENTRIES = 10000

/** @type {Map<string, { fails: number, lockUntil: number, lastFailAt: number }>} */
const entries = new Map()

function normalizeKey(ip) {
  return String(ip || 'unknown').trim() || 'unknown'
}

function pruneIfNeeded(now) {
  if (entries.size <= MAX_ENTRIES) return
  for (const [key, entry] of entries) {
    if (entries.size <= MAX_ENTRIES) break
    if (entry.lockUntil <= now) entries.delete(key)
  }
  // 仍超限（全在锁定期）则按插入序丢最旧，保证有界
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value
    entries.delete(oldest)
  }
}

/**
 * 查询该 IP 当前是否处于锁定期
 * @returns {{ locked: boolean, retryAfterSec: number }}
 */
export function checkLoginAllowed(ip, now = Date.now()) {
  const key = normalizeKey(ip)
  const entry = entries.get(key)
  if (!entry) return { locked: false, retryAfterSec: 0 }

  // 惰性过期：闲置过久的失败记录直接遗忘
  if (entry.lockUntil <= now && now - entry.lastFailAt > ENTRY_IDLE_MS) {
    entries.delete(key)
    return { locked: false, retryAfterSec: 0 }
  }

  if (entry.lockUntil > now) {
    return { locked: true, retryAfterSec: Math.ceil((entry.lockUntil - now) / 1000) }
  }
  return { locked: false, retryAfterSec: 0 }
}

/** 记录一次登录失败；达到阈值后按 2^n 指数延长锁定 */
export function registerLoginFailure(ip, now = Date.now()) {
  const key = normalizeKey(ip)
  const entry = entries.get(key) || { fails: 0, lockUntil: 0, lastFailAt: 0 }
  entry.fails += 1
  entry.lastFailAt = now
  if (entry.fails >= MAX_FREE_ATTEMPTS) {
    const exponent = entry.fails - MAX_FREE_ATTEMPTS
    const lockMs = Math.min(BASE_LOCK_MS * 2 ** exponent, MAX_LOCK_MS)
    entry.lockUntil = now + lockMs
  }
  entries.set(key, entry)
  pruneIfNeeded(now)
  return entry
}

/** 登录成功：清除该 IP 的失败记录 */
export function registerLoginSuccess(ip) {
  entries.delete(normalizeKey(ip))
}

/** 提取客户端 IP（面板通常直连或单层反代，仅取 socket 地址，防伪造 XFF） */
export function getClientIp(req) {
  return req?.socket?.remoteAddress || 'unknown'
}

/** 仅供测试：清空全部状态 */
export function resetLoginRateLimit() {
  entries.clear()
}

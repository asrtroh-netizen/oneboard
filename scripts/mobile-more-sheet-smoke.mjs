import fs from 'node:fs'
import bcrypt from 'bcryptjs'
import { chromium } from 'playwright'

const usersPath = '.onebord/data/users.json'
const original = fs.readFileSync(usersPath, 'utf8')
const store = JSON.parse(original)
const smokePwd = 'SmokeTest#390'
store.users[0].password_hash = bcrypt.hashSync(smokePwd, 12)
store.users[0].must_change_password = false
fs.writeFileSync(usersPath, JSON.stringify(store, null, 2))

const results = []

try {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.fill('input[name=username]', 'admin')
  await page.fill('input[name=password]', smokePwd)
  await page.click('button[type=submit]')
  await page.waitForURL((u) => u.pathname.includes('/dashboard'), { timeout: 10000 })
  await page.waitForTimeout(600)

  async function openMore() {
    // 路由切换会关抽屉；leave 过渡期间 DOM 仍短暂存在，需等干净再开
    await page
      .waitForFunction(() => !document.querySelector('.lg-sheet'), { timeout: 2500 })
      .catch(() => {})
    await page.locator('.lg-tab', { hasText: '更多' }).click()
    await page.waitForSelector('.lg-sheet', { timeout: 3000 })
    await page.waitForTimeout(450)
  }

  await openMore()
  await page.screenshot({ path: 'release/mobile-smoke/more-sheet.png', fullPage: false })

  const hitTest = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.lg-sheet__item, .lg-sheet__aux-btn')]
    const tab = document.querySelector('.lg-tabbar')
    const tabR = tab?.getBoundingClientRect()
    return {
      tabZ: tab ? getComputedStyle(tab).zIndex : null,
      backdropZ: getComputedStyle(document.querySelector('.lg-sheet-backdrop')).zIndex,
      sheetOpenClass: tab?.classList.contains('lg-tabbar--sheet-open'),
      allHit: items.every((el) => {
        const r = el.getBoundingClientRect()
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return top && (el === top || el.contains(top))
      }),
      covered: items.some((el) => tabR && el.getBoundingClientRect().bottom > tabR.top + 2),
      helpHref: [...document.querySelectorAll('.lg-sheet__aux-btn')].find((el) =>
        el.textContent.includes('帮助'),
      )?.getAttribute('href'),
    }
  })
  results.push({ step: 'hit', ...hitTest, ok: hitTest.allHit && !hitTest.covered && hitTest.helpHref === '/settings' })

  for (const [label, expectPath] of [
    ['DNS 监控', '/dns'],
    ['规则', '/rules'],
    ['订阅', '/subscriptions'],
    ['Proxy', '/proxy'],
    ['设置', '/settings'],
    ['日志', '/logs'],
    ['帮助 / 关于', '/settings'],
  ]) {
    await openMore()
    const clicked = await page.evaluate((text) => {
      const el = [...document.querySelectorAll('.lg-sheet a, .lg-sheet button')].find((node) =>
        node.textContent.replace(/\s+/g, ' ').includes(text),
      )
      if (!el) return false
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
      return true
    }, label)
    await page.waitForURL((u) => u.pathname === expectPath, { timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(150)
    const path = new URL(page.url()).pathname
    results.push({ label, path, clicked, ok: clicked && path === expectPath })
  }

  console.log(JSON.stringify({ results }, null, 2))
  const failed = results.filter((r) => r.ok === false)
  await browser.close()
  process.exit(failed.length ? 2 : 0)
} finally {
  fs.writeFileSync(usersPath, original)
  console.log('users restored')
}

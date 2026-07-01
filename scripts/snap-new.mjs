// Verification pass for the new sections. Usage: node scripts/snap-new.mjs [outPrefix]
import { chromium } from 'playwright-core'

const prefix = process.argv[2] ?? '/tmp/half-new'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const consoleMsgs = []
page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text().slice(0, 300)}`))
page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${String(e).slice(0, 300)}`))

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(6500) // loader exit + world fade-in

const stops = [
  ['services-mid', 0.3],
  ['references-1', 0.47],
  ['references-2', 0.55],
  ['aiready', 0.62],
  ['cta-demo', 0.78],
  ['cta-audit', 0.875],
]

for (const [name, p] of stops) {
  await page.evaluate((pp) => {
    const max = document.documentElement.scrollHeight - innerHeight
    scrollTo(0, max * pp)
  }, p)
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `${prefix}-${name}.png` })
}

// audit interaction: click 4 chips, then screenshot the log/total
await page.evaluate(() => {
  const max = document.documentElement.scrollHeight - innerHeight
  scrollTo(0, max * 0.875)
})
await page.waitForTimeout(2000)
const chips = page.locator('#cta button')
const n = await chips.count()
for (const i of [0, 1, 4, 7]) {
  if (i < n) await chips.nth(i).click({ force: true }).catch(() => {})
  await page.waitForTimeout(600)
}
await page.waitForTimeout(1200)
await page.screenshot({ path: `${prefix}-cta-audit-filled.png` })

console.log('--- console output ---')
for (const m of consoleMsgs) console.log(m)
console.log('done')
await browser.close()
